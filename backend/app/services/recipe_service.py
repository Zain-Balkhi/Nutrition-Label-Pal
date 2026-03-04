"""
User-scoped recipe CRUD service.
"""

import json

from sqlalchemy.orm import Session

from app.database import IngredientRow, RecipeNutritionRow, RecipeRow


def save_recipe(session: Session, user_id: int, data: dict) -> RecipeRow:
    """Create a new recipe with ingredients and nutrition for a user."""
    recipe = RecipeRow(
        user_id=user_id,
        recipe_name=data["recipe_name"],
        raw_text=data["raw_text"],
        servings=data["servings"],
        serving_size=data["serving_size"],
        label_json=json.dumps([n for n in data.get("nutrients_raw", [])]),
    )
    session.add(recipe)
    session.flush()

    for idx, ing in enumerate(data.get("ingredients", [])):
        session.add(IngredientRow(
            recipe_id=recipe.id,
            name=ing["name"],
            quantity=ing["quantity"],
            unit=ing["unit"],
            preparation=ing.get("preparation"),
            original_text=ing["original_text"],
            fdc_id=ing.get("fdc_id"),
            matched_description=ing.get("matched_description"),
            gram_weight=ing.get("gram_weight"),
            sort_order=idx,
        ))

    for nut in data.get("nutrients", []):
        session.add(RecipeNutritionRow(
            recipe_id=recipe.id,
            nutrient_name=nut["name"],
            amount=nut["amount"],
            unit=nut["unit"],
            daily_value_percent=nut.get("daily_value_percent"),
            display_value=nut.get("display_value"),
        ))

    return recipe


def list_recipes(session: Session, user_id: int) -> list[RecipeRow]:
    """List all recipes for a user, newest first."""
    return (
        session.query(RecipeRow)
        .filter_by(user_id=user_id)
        .order_by(RecipeRow.created_at.desc())
        .all()
    )


def get_recipe(session: Session, recipe_id: int, user_id: int) -> RecipeRow | None:
    """Get a single recipe if it belongs to the user."""
    return (
        session.query(RecipeRow)
        .filter_by(id=recipe_id, user_id=user_id)
        .first()
    )


def update_recipe(session: Session, recipe: RecipeRow, data: dict) -> RecipeRow:
    """Update a recipe's fields, ingredients, and/or nutrition."""
    for field in ("recipe_name", "raw_text", "servings", "serving_size"):
        if field in data and data[field] is not None:
            setattr(recipe, field, data[field])

    if data.get("ingredients") is not None:
        # Replace all ingredients
        session.query(IngredientRow).filter_by(recipe_id=recipe.id).delete()
        for idx, ing in enumerate(data["ingredients"]):
            session.add(IngredientRow(
                recipe_id=recipe.id,
                name=ing["name"],
                quantity=ing["quantity"],
                unit=ing["unit"],
                preparation=ing.get("preparation"),
                original_text=ing["original_text"],
                fdc_id=ing.get("fdc_id"),
                matched_description=ing.get("matched_description"),
                gram_weight=ing.get("gram_weight"),
                sort_order=idx,
            ))

    if data.get("nutrients") is not None:
        # Replace all nutrition rows
        session.query(RecipeNutritionRow).filter_by(recipe_id=recipe.id).delete()
        for nut in data["nutrients"]:
            session.add(RecipeNutritionRow(
                recipe_id=recipe.id,
                nutrient_name=nut["name"],
                amount=nut["amount"],
                unit=nut["unit"],
                daily_value_percent=nut.get("daily_value_percent"),
                display_value=nut.get("display_value"),
            ))
        # Update the label_json cache
        recipe.label_json = json.dumps([n for n in data["nutrients"]])

    session.flush()
    return recipe


def delete_recipe(session: Session, recipe_id: int, user_id: int) -> bool:
    """Delete a recipe if it belongs to the user. Returns True if deleted."""
    recipe = (
        session.query(RecipeRow)
        .filter_by(id=recipe_id, user_id=user_id)
        .first()
    )
    if recipe is None:
        return False
    session.delete(recipe)
    return True
