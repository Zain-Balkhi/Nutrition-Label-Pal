"""
Tests for the calculator service.

Mocks the USDA service to avoid real API calls.
"""

import sys
import os
import pytest
from unittest.mock import AsyncMock

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.schemas import (
    IngredientWithMatch,
    ParsedIngredient,
    USDAMatch,
)
from app.services.calculator import calculate_nutrition, _extract_nutrients_per_100g, _apply_rounding


# ── Fake USDA food data ───────────────────────────────────────────────────

CHICKEN_BREAST_DETAILS = {
    "fdcId": 171077,
    "description": "Chicken, breast, meat only, cooked, roasted",
    "foodNutrients": [
        {"nutrient": {"id": 1008, "name": "Energy", "unitName": "kcal"}, "amount": 165},
        {"nutrient": {"id": 1003, "name": "Protein", "unitName": "g"}, "amount": 31},
        {"nutrient": {"id": 1004, "name": "Total lipid (fat)", "unitName": "g"}, "amount": 3.6},
        {"nutrient": {"id": 1005, "name": "Carbohydrate, by difference", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1079, "name": "Fiber, total dietary", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 2000, "name": "Sugars, total", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1258, "name": "Fatty acids, total saturated", "unitName": "g"}, "amount": 1.0},
        {"nutrient": {"id": 1257, "name": "Fatty acids, total trans", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1253, "name": "Cholesterol", "unitName": "mg"}, "amount": 85},
        {"nutrient": {"id": 1093, "name": "Sodium, Na", "unitName": "mg"}, "amount": 74},
        {"nutrient": {"id": 1114, "name": "Vitamin D", "unitName": "UG"}, "amount": 0.2},
        {"nutrient": {"id": 1087, "name": "Calcium, Ca", "unitName": "mg"}, "amount": 15},
        {"nutrient": {"id": 1089, "name": "Iron, Fe", "unitName": "mg"}, "amount": 1.04},
        {"nutrient": {"id": 1092, "name": "Potassium, K", "unitName": "mg"}, "amount": 256},
    ],
    "foodPortions": [
        {"gramWeight": 140.0, "modifier": "1 cup", "measureUnit": {"name": "cup"}, "portionDescription": "1 cup, chopped or diced"},
    ],
}

# Food with trace cholesterol (3mg/100g) — triggers "less than 5mg" rounding
TRACE_CHOLESTEROL_FOOD = {
    "fdcId": 999001,
    "description": "Trace Cholesterol Food",
    "foodNutrients": [
        {"nutrient": {"id": 1008, "name": "Energy", "unitName": "kcal"}, "amount": 50},
        {"nutrient": {"id": 1003, "name": "Protein", "unitName": "g"}, "amount": 5},
        {"nutrient": {"id": 1004, "name": "Total lipid (fat)", "unitName": "g"}, "amount": 1},
        {"nutrient": {"id": 1005, "name": "Carbohydrate, by difference", "unitName": "g"}, "amount": 5},
        {"nutrient": {"id": 1253, "name": "Cholesterol", "unitName": "mg"}, "amount": 3},
        {"nutrient": {"id": 1093, "name": "Sodium, Na", "unitName": "mg"}, "amount": 10},
    ],
    "foodPortions": [],
}

# Food with trace protein (0.25g/100g) — triggers "less than 1g" rounding at small serving
TRACE_PROTEIN_FOOD = {
    "fdcId": 999002,
    "description": "Trace Protein Food",
    "foodNutrients": [
        {"nutrient": {"id": 1008, "name": "Energy", "unitName": "kcal"}, "amount": 10},
        {"nutrient": {"id": 1003, "name": "Protein", "unitName": "g"}, "amount": 0.25},
        {"nutrient": {"id": 1004, "name": "Total lipid (fat)", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1005, "name": "Carbohydrate, by difference", "unitName": "g"}, "amount": 2},
        {"nutrient": {"id": 1253, "name": "Cholesterol", "unitName": "mg"}, "amount": 0},
        {"nutrient": {"id": 1093, "name": "Sodium, Na", "unitName": "mg"}, "amount": 0},
    ],
    "foodPortions": [],
}

OLIVE_OIL_DETAILS = {
    "fdcId": 171413,
    "description": "Oil, olive, salad or cooking",
    "foodNutrients": [
        {"nutrient": {"id": 1008, "name": "Energy", "unitName": "kcal"}, "amount": 884},
        {"nutrient": {"id": 1003, "name": "Protein", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1004, "name": "Total lipid (fat)", "unitName": "g"}, "amount": 100},
        {"nutrient": {"id": 1005, "name": "Carbohydrate, by difference", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1258, "name": "Fatty acids, total saturated", "unitName": "g"}, "amount": 13.8},
        {"nutrient": {"id": 1257, "name": "Fatty acids, total trans", "unitName": "g"}, "amount": 0},
        {"nutrient": {"id": 1253, "name": "Cholesterol", "unitName": "mg"}, "amount": 0},
        {"nutrient": {"id": 1093, "name": "Sodium, Na", "unitName": "mg"}, "amount": 2},
        {"nutrient": {"id": 1087, "name": "Calcium, Ca", "unitName": "mg"}, "amount": 1},
        {"nutrient": {"id": 1089, "name": "Iron, Fe", "unitName": "mg"}, "amount": 0.56},
        {"nutrient": {"id": 1092, "name": "Potassium, K", "unitName": "mg"}, "amount": 1},
    ],
    "foodPortions": [
        {"gramWeight": 13.5, "modifier": "1 tbsp", "measureUnit": {"name": "tbsp"}, "portionDescription": "1 tbsp"},
    ],
}


def _make_ingredient(name, qty, unit, fdc_id, prep=None):
    """Helper to build an IngredientWithMatch."""
    return IngredientWithMatch(
        parsed=ParsedIngredient(
            name=name,
            quantity=qty,
            unit=unit,
            preparation=prep,
            original_text=f"{qty} {unit} {name}",
        ),
        status="matched",
        matches=[USDAMatch(fdc_id=fdc_id, description=name, data_type="SR Legacy")],
        selected_fdc_id=fdc_id,
    )


def _make_mock_usda(food_map: dict):
    """Build a mock USDAService that returns data from food_map keyed by fdc_id."""
    mock = AsyncMock()

    async def mock_details(fdc_id):
        return food_map.get(fdc_id, {})

    mock.get_food_details = mock_details
    return mock


# ── Tests ──────────────────────────────────────────────────────────────────

class TestExtractNutrients:
    def test_chicken_breast(self):
        nutrients = _extract_nutrients_per_100g(CHICKEN_BREAST_DETAILS)
        assert nutrients["energy"] == 165
        assert nutrients["protein"] == 31
        assert nutrients["total_fat"] == 3.6

    def test_missing_nutrient_defaults_absent(self):
        sparse = {
            "foodNutrients": [
                {"nutrient": {"id": 1008}, "amount": 100},
            ]
        }
        nutrients = _extract_nutrients_per_100g(sparse)
        assert nutrients.get("energy") == 100
        assert nutrients.get("protein") is None


class TestApplyRounding:
    def test_calories(self):
        # Python banker's rounding: 165 -> 160 (round to even)
        amount, display = _apply_rounding("energy", 165)
        assert amount == 160.0
        assert display is None
        amount, display = _apply_rounding("energy", 167)
        assert amount == 170.0
        assert display is None

    def test_fat_small(self):
        amount, display = _apply_rounding("total_fat", 0.3)
        assert amount == 0.0
        assert display is None

    def test_protein_regular(self):
        amount, display = _apply_rounding("protein", 31.2)
        assert amount == 31.0
        assert display is None

    def test_apply_rounding_cholesterol_trace(self):
        """Cholesterol in 2–5mg range returns 0.0 with '< 5mg' display string."""
        amount, display = _apply_rounding("cholesterol", 3.0)
        assert amount == 0.0
        assert display == "< 5mg"

    def test_apply_rounding_protein_trace(self):
        """Protein in 0.5–1g range returns 0.0 with '< 1g' display string."""
        amount, display = _apply_rounding("protein", 0.7)
        assert amount == 0.0
        assert display == "< 1g"


@pytest.mark.asyncio
class TestCalculateNutrition:
    async def test_single_ingredient(self):
        ingredients = [_make_ingredient("chicken breast", 2, "cups", 171077, "diced")]
        usda = _make_mock_usda({171077: CHICKEN_BREAST_DETAILS})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=2,
            serving_size="1 bowl",
            recipe_name="Chicken Test",
            usda_service=usda,
        )

        assert result.recipe_name == "Chicken Test"
        assert result.servings == 2

        cal = next(n for n in result.nutrients if n.name == "Calories")
        assert cal.amount > 0

        protein = next(n for n in result.nutrients if n.name == "Protein")
        assert protein.amount > 0

    async def test_two_ingredients(self):
        ingredients = [
            _make_ingredient("chicken breast", 2, "cups", 171077, "diced"),
            _make_ingredient("olive oil", 1, "tbsp", 171413),
        ]
        usda = _make_mock_usda({171077: CHICKEN_BREAST_DETAILS, 171413: OLIVE_OIL_DETAILS})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="1 serving",
            recipe_name="Chicken + Oil",
            usda_service=usda,
        )

        cal = next(n for n in result.nutrients if n.name == "Calories")
        fat = next(n for n in result.nutrients if n.name == "Total Fat")

        # Should have calories from both ingredients
        assert cal.amount > 100
        # Should have fat from both
        assert fat.amount > 5

    async def test_skips_unmatched_ingredient(self):
        ingredient = IngredientWithMatch(
            parsed=ParsedIngredient(
                name="unicorn",
                quantity=1,
                unit="each",
                preparation=None,
                original_text="1 unicorn",
            ),
            status="no_match",
            matches=[],
            selected_fdc_id=None,
        )
        usda = _make_mock_usda({})

        result = await calculate_nutrition(
            ingredients=[ingredient],
            servings=1,
            serving_size="1 serving",
            recipe_name="Empty Test",
            usda_service=usda,
        )

        cal = next(n for n in result.nutrients if n.name == "Calories")
        assert cal.amount == 0

        # Should report the unmatched ingredient as skipped
        assert len(result.skipped_ingredients) == 1
        assert result.skipped_ingredients[0].name == "unicorn"
        assert "No USDA match" in result.skipped_ingredients[0].reason

    async def test_skips_ingredient_on_usda_404(self):
        """When USDA API returns 404 for an FDC ID, skip and report it."""
        ingredient = _make_ingredient("mystery spice", 1, "tsp", 999999)

        mock = AsyncMock()
        response_404 = httpx.Response(404, request=httpx.Request("GET", "http://test"))

        async def mock_details(fdc_id):
            raise httpx.HTTPStatusError("Not Found", request=response_404.request, response=response_404)

        mock.get_food_details = mock_details

        result = await calculate_nutrition(
            ingredients=[ingredient],
            servings=1,
            serving_size="1 serving",
            recipe_name="404 Test",
            usda_service=mock,
        )

        cal = next(n for n in result.nutrients if n.name == "Calories")
        assert cal.amount == 0

        assert len(result.skipped_ingredients) == 1
        assert result.skipped_ingredients[0].name == "mystery spice"
        assert "404" in result.skipped_ingredients[0].reason

    async def test_has_all_14_nutrients(self):
        ingredients = [_make_ingredient("chicken breast", 1, "cups", 171077)]
        usda = _make_mock_usda({171077: CHICKEN_BREAST_DETAILS})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="1 serving",
            recipe_name="Nutrient Count Test",
            usda_service=usda,
        )

        assert len(result.nutrients) == 14
        names = {n.name for n in result.nutrients}
        assert "Calories" in names
        assert "Total Fat" in names
        assert "Protein" in names
        assert "Sodium" in names

    async def test_daily_value_percent(self):
        ingredients = [_make_ingredient("chicken breast", 2, "cups", 171077)]
        usda = _make_mock_usda({171077: CHICKEN_BREAST_DETAILS})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="1 serving",
            recipe_name="DV Test",
            usda_service=usda,
        )

        fat = next(n for n in result.nutrients if n.name == "Total Fat")
        assert fat.daily_value_percent is not None
        assert isinstance(fat.daily_value_percent, int)

        # Calories should NOT have %DV
        cal = next(n for n in result.nutrients if n.name == "Calories")
        assert cal.daily_value_percent is None

    async def test_dv_percent_uses_rounded_value(self):
        """Trace protein that rounds to 0g must have 0% DV, not 1%."""
        # 0.25g/100g protein; 100g serving → 0.25g raw → rounds to 0.0g ("< 1g")
        ingredients = [_make_ingredient("trace protein food", 100, "g", 999002)]
        usda = _make_mock_usda({999002: TRACE_PROTEIN_FOOD})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="100g",
            recipe_name="DV Rounding Test",
            usda_service=usda,
        )

        protein = next(n for n in result.nutrients if n.name == "Protein")
        # Rounds to 0 (< 1g range), so %DV must also be 0
        assert protein.amount == 0.0
        assert protein.daily_value_percent == 0

    async def test_display_value_set_for_trace_cholesterol(self):
        """Cholesterol in 2–5mg range gets display_value='< 5mg' and amount=0.0."""
        # 3mg/100g cholesterol; 100g serving → 3mg raw → "less than 5mg"
        ingredients = [_make_ingredient("trace cholesterol food", 100, "g", 999001)]
        usda = _make_mock_usda({999001: TRACE_CHOLESTEROL_FOOD})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="100g",
            recipe_name="Cholesterol Display Test",
            usda_service=usda,
        )

        chol = next(n for n in result.nutrients if n.name == "Cholesterol")
        assert chol.amount == 0.0
        assert chol.display_value == "< 5mg"
        # %DV should be 0 since rounded amount is 0
        assert chol.daily_value_percent == 0

    async def test_daily_value_percentages(self):
        """%DV matches the rounded amount, not the raw amount."""
        ingredients = [_make_ingredient("chicken breast", 2, "cups", 171077)]
        usda = _make_mock_usda({171077: CHICKEN_BREAST_DETAILS})

        result = await calculate_nutrition(
            ingredients=ingredients,
            servings=1,
            serving_size="1 serving",
            recipe_name="DV Consistency Test",
            usda_service=usda,
        )

        from app.config import get_settings
        settings = get_settings()

        for nutrient in result.nutrients:
            if nutrient.daily_value_percent is None:
                continue
            # Find the key for this nutrient name
            from app.services.calculator import NUTRIENT_DISPLAY
            key = next(
                (k for k, (name, _) in NUTRIENT_DISPLAY.items() if name == nutrient.name),
                None,
            )
            if key is None or key not in settings.FDA_DAILY_VALUES:
                continue
            dv = settings.FDA_DAILY_VALUES[key]
            expected_dv = round(nutrient.amount / dv * 100)
            assert nutrient.daily_value_percent == expected_dv, (
                f"{nutrient.name}: %DV={nutrient.daily_value_percent} "
                f"but expected {expected_dv} from rounded amount {nutrient.amount}"
            )
