"""
User-scoped recipe CRUD endpoints. All routes require authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import UserRow, get_session
from app.dependencies import get_current_user
from app.models.schemas import (
    RecipeDetail,
    RecipeIngredientOut,
    RecipeNutrientOut,
    RecipeSummary,
    SaveRecipeRequest,
    TagOut,
    UpdateRecipeRequest,
)
from app.services.recipe_service import (
    delete_recipe,
    get_recipe,
    list_recipes,
    save_recipe,
    update_recipe,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _tags_to_out(recipe) -> list[TagOut]:
    return [TagOut(id=t.id, name=t.name, color=t.color) for t in getattr(recipe, "tags", [])]


def _recipe_to_summary(recipe) -> RecipeSummary:
    return RecipeSummary(
        id=recipe.id,
        recipe_name=recipe.recipe_name,
        servings=recipe.servings,
        serving_size=recipe.serving_size,
        created_at=recipe.created_at.isoformat() if recipe.created_at else "",
        updated_at=recipe.updated_at.isoformat() if recipe.updated_at else "",
        tags=_tags_to_out(recipe),
        image_data_url=getattr(recipe, "image_data_url", None),
    )


def _recipe_to_detail(recipe) -> RecipeDetail:
    import json
    ingredients = sorted(recipe.ingredients, key=lambda i: i.sort_order)
    
    allergens = []
    if hasattr(recipe, "allergens_json") and recipe.allergens_json:
        try:
            allergens = json.loads(recipe.allergens_json)
        except json.JSONDecodeError:
            pass

    return RecipeDetail(
        id=recipe.id,
        recipe_name=recipe.recipe_name,
        raw_text=recipe.raw_text,
        servings=recipe.servings,
        serving_size=recipe.serving_size,
        ingredients=[
            RecipeIngredientOut(
                id=ing.id,
                name=ing.name,
                quantity=ing.quantity,
                unit=ing.unit,
                preparation=ing.preparation,
                original_text=ing.original_text,
                fdc_id=ing.fdc_id,
                matched_description=ing.matched_description,
                gram_weight=ing.gram_weight,
                sort_order=ing.sort_order,
            )
            for ing in ingredients
        ],
        nutrients=[
            RecipeNutrientOut(
                id=nut.id,
                nutrient_name=nut.nutrient_name,
                amount=nut.amount,
                unit=nut.unit,
                daily_value_percent=nut.daily_value_percent,
                display_value=nut.display_value,
            )
            for nut in recipe.nutrition
        ],
        allergens=allergens,
        created_at=recipe.created_at.isoformat() if recipe.created_at else "",
        updated_at=recipe.updated_at.isoformat() if recipe.updated_at else "",
        tags=_tags_to_out(recipe),
        notes=getattr(recipe, "notes", None),
        image_data_url=getattr(recipe, "image_data_url", None),
    )


@router.post("", response_model=RecipeDetail, status_code=status.HTTP_201_CREATED)
def create_recipe(
    body: SaveRecipeRequest,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    data = {
        "recipe_name": body.recipe_name,
        "raw_text": body.raw_text,
        "servings": body.servings,
        "serving_size": body.serving_size,
        "ingredients": [ing.model_dump() for ing in body.ingredients],
        "nutrients": [nut.model_dump() for nut in body.nutrients],
        "allergens": body.allergens,
        "notes": body.notes,
        "image_data_url": body.image_data_url,
    }
    try:
        recipe = save_recipe(session, user.id, data)
        session.commit()
        session.refresh(recipe)
    except Exception:
        session.rollback()
        raise
    return _recipe_to_detail(recipe)


@router.get("", response_model=list[RecipeSummary])
def list_user_recipes(
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipes = list_recipes(session, user.id)
    return [_recipe_to_summary(r) for r in recipes]


@router.get("/{recipe_id}", response_model=RecipeDetail)
def get_user_recipe(
    recipe_id: int,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = get_recipe(session, recipe_id, user.id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return _recipe_to_detail(recipe)


@router.put("/{recipe_id}", response_model=RecipeDetail)
def update_user_recipe(
    recipe_id: int,
    body: UpdateRecipeRequest,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = get_recipe(session, recipe_id, user.id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")

    update_data = {}
    for field in (
        "recipe_name", "raw_text", "servings", "serving_size",
        "allergens", "notes", "image_data_url",
    ):
        val = getattr(body, field, None)
        if val is not None:
            update_data[field] = val
    if body.ingredients is not None:
        update_data["ingredients"] = [ing.model_dump() for ing in body.ingredients]

    if body.nutrients is not None:
        update_data["nutrients"] = [nut.model_dump() for nut in body.nutrients]

    try:
        recipe = update_recipe(session, recipe, update_data)
        session.commit()
        session.refresh(recipe)
    except Exception:
        session.rollback()
        raise
    return _recipe_to_detail(recipe)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_recipe(
    recipe_id: int,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deleted = delete_recipe(session, recipe_id, user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
