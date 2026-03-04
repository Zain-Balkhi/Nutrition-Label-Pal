# Weight conversions to grams
WEIGHT_TO_GRAMS = {
    "g": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "kilogram": 1000.0,
    "kilograms": 1000.0,
    "oz": 28.3495,
    "ounce": 28.3495,
    "ounces": 28.3495,
    "lb": 453.592,
    "lbs": 453.592,
    "pound": 453.592,
    "pounds": 453.592,
}

# Volume conversions to milliliters
VOLUME_TO_ML = {
    "cup": 236.588,
    "cups": 236.588,
    "tbsp": 14.787,
    "tablespoon": 14.787,
    "tablespoons": 14.787,
    "tsp": 4.929,
    "teaspoon": 4.929,
    "teaspoons": 4.929,
    "ml": 1.0,
    "milliliter": 1.0,
    "milliliters": 1.0,
    "l": 1000.0,
    "liter": 1000.0,
    "liters": 1000.0,
    "fl oz": 29.5735,
    "fluid ounce": 29.5735,
    "fluid ounces": 29.5735,
}

# Count-based units
COUNT_UNITS = {"each", "medium", "large", "small", "whole", "piece", "pieces", "clove", "cloves"}


def _find_portion_gram_weight(unit: str, portions: list[dict]) -> float | None:
    """Try to find a matching gram weight from USDA portion data."""
    unit_lower = unit.lower()
    for portion in portions:
        modifier = (portion.get("modifier") or "").lower()
        measure_unit = (portion.get("measureUnit", {}) or {})
        measure_name = (measure_unit.get("name") or "").lower() if isinstance(measure_unit, dict) else ""
        portion_desc = (portion.get("portionDescription") or "").lower()

        gram_weight = portion.get("gramWeight")
        if gram_weight is None:
            continue

        # Check if the unit appears in any portion field
        if unit_lower in modifier or unit_lower in measure_name or unit_lower in portion_desc:
            return float(gram_weight)

    return None


def convert_to_grams(quantity: float, unit: str, food_portions: list[dict] | None = None) -> float:
    """Convert a quantity + unit to grams.

    Uses direct conversion for weight units, USDA portion data for
    volume/count units when available, and water-based approximation
    as a fallback for volume units.
    """
    unit_lower = unit.lower().strip()
    portions = food_portions or []

    # Direct weight conversion
    if unit_lower in WEIGHT_TO_GRAMS:
        return quantity * WEIGHT_TO_GRAMS[unit_lower]

    # Try USDA portions for volume units
    if unit_lower in VOLUME_TO_ML:
        portion_grams = _find_portion_gram_weight(unit_lower, portions)
        if portion_grams is not None:
            return quantity * portion_grams
        # Fallback: approximate using water density (1 ml ≈ 1 g)
        ml = quantity * VOLUME_TO_ML[unit_lower]
        return ml

    # Count-based units: try USDA portions
    if unit_lower in COUNT_UNITS:
        portion_grams = _find_portion_gram_weight(unit_lower, portions)
        if portion_grams is not None:
            return quantity * portion_grams
        # Fallback: check for any "medium" or generic portion
        for portion in portions:
            gram_weight = portion.get("gramWeight")
            if gram_weight is not None:
                return quantity * float(gram_weight)
        # Last resort: assume 100g per unit
        return quantity * 100.0

    # Unknown unit: try USDA portions, then default
    portion_grams = _find_portion_gram_weight(unit_lower, portions)
    if portion_grams is not None:
        return quantity * portion_grams

    return quantity * 100.0
