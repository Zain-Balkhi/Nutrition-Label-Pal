import os
from dataclasses import dataclass

from jinja2 import Environment, FileSystemLoader


# Map nutrient display names to template variable names
_NUTRIENT_VAR_MAP = {
    "Calories": "calories",
    "Total Fat": "total_fat",
    "Saturated Fat": "saturated_fat",
    "Trans Fat": "trans_fat",
    "Cholesterol": "cholesterol",
    "Sodium": "sodium",
    "Total Carbohydrate": "total_carb",
    "Dietary Fiber": "dietary_fiber",
    "Total Sugars": "total_sugars",
    "Protein": "protein",
    "Vitamin D": "vitamin_d",
    "Calcium": "calcium",
    "Iron": "iron",
    "Potassium": "potassium",
}


@dataclass
class TemplateNutrient:
    """Pre-formatted nutrient data for Jinja2 templates."""
    amount: float
    unit: str
    amount_str: str
    display: str  # FDA "less than" display string, or empty
    dv_str: str   # e.g. "10%" or empty
    # Per-container values (populated by _build_template_context)
    container_amount_str: str = ""
    container_dv_str: str = ""

    @classmethod
    def from_nutrient_dict(cls, n: dict, servings: int = 1) -> "TemplateNutrient":
        amount = n.get("amount", 0)
        unit = n.get("unit", "")
        display_value = n.get("display_value") or ""
        dv = n.get("daily_value_percent")

        amount_str = f"{amount}{unit}"
        dv_str = f"{dv}%" if dv is not None else ""

        # Per-container calculations
        container_amount = round(amount * servings)
        container_amount_str = f"{container_amount}{unit}"
        container_dv = round(dv * servings) if dv is not None else None
        container_dv_str = f"{container_dv}%" if container_dv is not None else ""

        return cls(
            amount=amount,
            unit=unit,
            amount_str=amount_str,
            display=display_value,
            dv_str=dv_str,
            container_amount_str=container_amount_str,
            container_dv_str=container_dv_str,
        )

    @classmethod
    def empty(cls) -> "TemplateNutrient":
        return cls(amount=0, unit="", amount_str="0", display="", dv_str="")


def _build_template_context(nutrition_data: dict, width: str, height: str) -> dict:
    """Transform NutritionResult-style dict into template variables."""
    nutrients_list = nutrition_data.get("nutrients", [])
    servings = nutrition_data.get("servings", 1)

    # Index nutrients by display name
    by_name: dict[str, dict] = {}
    for n in nutrients_list:
        by_name[n["name"]] = n

    # Build named template nutrients
    template_nutrients = {}
    for display_name, var_name in _NUTRIENT_VAR_MAP.items():
        raw = by_name.get(display_name)
        if raw:
            template_nutrients[var_name] = TemplateNutrient.from_nutrient_dict(
                raw, servings=servings
            )
        else:
            template_nutrients[var_name] = TemplateNutrient.empty()

    # Extract calories amount for the big display
    cal = template_nutrients.get("calories", TemplateNutrient.empty())
    calories_amount = int(cal.amount) if cal.amount == int(cal.amount) else cal.amount
    container_calories_amount = round(cal.amount * servings)

    return {
        "recipe_name": nutrition_data.get("recipe_name", ""),
        "servings": servings,
        "serving_size": nutrition_data.get("serving_size", ""),
        "calories_amount": calories_amount,
        "container_calories_amount": container_calories_amount,
        "width": width,
        "height": height,
        **template_nutrients,
    }


class LabelRenderer:
    """Renders nutrition label HTML templates to PDF via WeasyPrint."""

    def __init__(self) -> None:
        templates_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "templates", "labels"
        )
        self.env = Environment(loader=FileSystemLoader(templates_dir))

    def render_pdf(
        self,
        format: str,
        nutrition_data: dict,
        width_inches: float,
        height_inches: float,
    ) -> bytes:
        """Render a nutrition label as PDF bytes.

        Args:
            format: Template name ("vertical", "tabular", etc.)
            nutrition_data: NutritionResult-style dict with nutrients list
            width_inches: Label width in inches
            height_inches: Label height in inches

        Returns:
            PDF file content as bytes
        """
        width = f"{width_inches}in"
        height = f"{height_inches}in"

        context = _build_template_context(nutrition_data, width, height)
        template = self.env.get_template(f"{format}.html")
        html_str = template.render(**context)

        from weasyprint import HTML

        pdf_bytes = HTML(string=html_str).write_pdf()
        return pdf_bytes

    def render_html(
        self,
        format: str,
        nutrition_data: dict,
        width_inches: float,
        height_inches: float,
    ) -> str:
        """Render a nutrition label as HTML string (useful for debugging)."""
        width = f"{width_inches}in"
        height = f"{height_inches}in"

        context = _build_template_context(nutrition_data, width, height)
        template = self.env.get_template(f"{format}.html")
        return template.render(**context)
