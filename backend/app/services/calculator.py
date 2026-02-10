from app.config import get_settings
from app.models.schemas import (
    IngredientWithMatch,
    NutrientValue,
    NutritionResult,
)
from app.services.usda_service import USDAService
from app.utils.unit_converter import convert_to_grams
from app.utils.fda_rounding import (
    round_calories,
    round_fat,
    round_cholesterol,
    round_sodium,
    round_carb_fiber_sugar_protein,
    round_percent_dv,
)

# Display names and units for nutrients
NUTRIENT_DISPLAY = {
    "energy": ("Calories", "kcal"),
    "total_fat": ("Total Fat", "g"),
    "saturated_fat": ("Saturated Fat", "g"),
    "trans_fat": ("Trans Fat", "g"),
    "cholesterol": ("Cholesterol", "mg"),
    "sodium": ("Sodium", "mg"),
    "carbohydrate": ("Total Carbohydrate", "g"),
    "fiber": ("Dietary Fiber", "g"),
    "total_sugars": ("Total Sugars", "g"),
    "protein": ("Protein", "g"),
    "vitamin_d": ("Vitamin D", "mcg"),
    "calcium": ("Calcium", "mg"),
    "iron": ("Iron", "mg"),
    "potassium": ("Potassium", "mg"),
}


def _extract_nutrients_per_100g(food_data: dict) -> dict[str, float]:
    """Extract nutrient values per 100g from USDA food data."""
    settings = get_settings()
    nutrient_map = settings.NUTRIENT_IDS
    nutrients: dict[str, float] = {}

    food_nutrients = food_data.get("foodNutrients", [])
    for fn in food_nutrients:
        nutrient_id = fn.get("nutrient", {}).get("id") or fn.get("nutrientId")
        amount = fn.get("amount", 0.0)
        for key, nid in nutrient_map.items():
            if nutrient_id == nid:
                nutrients[key] = amount
                break

    return nutrients


def _apply_rounding(key: str, value: float) -> float:
    """Apply FDA rounding rules based on nutrient type."""
    if key == "energy":
        rounded = round_calories(value)
    elif key in ("total_fat", "saturated_fat", "trans_fat"):
        rounded = round_fat(value)
    elif key == "cholesterol":
        rounded = round_cholesterol(value)
    elif key == "sodium":
        rounded = round_sodium(value)
    elif key in ("carbohydrate", "fiber", "total_sugars", "protein"):
        rounded = round_carb_fiber_sugar_protein(value)
    else:
        rounded = round(value, 1)

    # Handle string returns like "less than 1g" by returning the numeric threshold
    if isinstance(rounded, str):
        if "less than" in rounded:
            return 0.0
        # Strip non-numeric suffixes
        numeric = "".join(c for c in rounded if c.isdigit() or c == ".")
        return float(numeric) if numeric else 0.0

    return float(rounded)


async def calculate_nutrition(
    ingredients: list[IngredientWithMatch],
    servings: int,
    serving_size: str,
    recipe_name: str,
    usda_service: USDAService,
) -> NutritionResult:
    settings = get_settings()

    # Accumulate total nutrients across all ingredients
    totals: dict[str, float] = {key: 0.0 for key in settings.NUTRIENT_IDS}

    for ingredient in ingredients:
        fdc_id = ingredient.selected_fdc_id
        if fdc_id is None:
            continue

        food_data = await usda_service.get_food_details(fdc_id)
        nutrients_per_100g = _extract_nutrients_per_100g(food_data)

        # Get portions for unit conversion
        portions = food_data.get("foodPortions", [])
        gram_weight = convert_to_grams(
            ingredient.parsed.quantity,
            ingredient.parsed.unit,
            portions,
        )

        # Scale from per-100g to actual amount
        scale = gram_weight / 100.0
        for key in totals:
            totals[key] += nutrients_per_100g.get(key, 0.0) * scale

    # Divide by servings
    per_serving = {key: val / max(servings, 1) for key, val in totals.items()}

    # Build nutrient values with FDA rounding and %DV
    nutrient_values: list[NutrientValue] = []
    for key, (display_name, unit) in NUTRIENT_DISPLAY.items():
        raw_value = per_serving.get(key, 0.0)
        rounded_value = _apply_rounding(key, raw_value)

        dv_percent = None
        if key in settings.FDA_DAILY_VALUES and key != "energy":
            dv = settings.FDA_DAILY_VALUES[key]
            dv_percent = round_percent_dv(raw_value / dv * 100)

        nutrient_values.append(
            NutrientValue(
                name=display_name,
                amount=rounded_value,
                unit=unit,
                daily_value_percent=dv_percent,
            )
        )

    return NutritionResult(
        recipe_name=recipe_name,
        servings=servings,
        serving_size=serving_size,
        nutrients=nutrient_values,
    )
