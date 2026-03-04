"""FDA 21 CFR 101.9 rounding rules for nutrition labeling."""


def round_calories(value: float) -> float | str:
    """Round calorie values per FDA rules."""
    if value < 5:
        return 0.0
    if value <= 50:
        return float(round(value / 5) * 5)
    return float(round(value / 10) * 10)


def round_fat(value: float) -> float | str:
    """Round fat values (total, saturated, trans) per FDA rules."""
    if value < 0.5:
        return 0.0
    if value < 5:
        return round(value * 2) / 2  # nearest 0.5g
    return float(round(value))


def round_cholesterol(value: float) -> float | str:
    """Round cholesterol values per FDA rules."""
    if value < 2:
        return 0.0
    if value <= 5:
        return "less than 5mg"
    return float(round(value / 5) * 5)


def round_sodium(value: float) -> float | str:
    """Round sodium values per FDA rules."""
    if value < 5:
        return 0.0
    if value <= 140:
        return float(round(value / 5) * 5)
    return float(round(value / 10) * 10)


def round_carb_fiber_sugar_protein(value: float) -> float | str:
    """Round carbohydrate, fiber, sugar, and protein per FDA rules."""
    if value < 0.5:
        return 0.0
    if value < 1:
        return "less than 1g"
    return float(round(value))


def round_percent_dv(value: float) -> int:
    """Round percent daily value to nearest whole number."""
    return round(value)
