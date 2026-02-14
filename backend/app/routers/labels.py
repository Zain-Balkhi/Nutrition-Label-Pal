"""Router for saved nutrition labels (CRUD)."""

import logging
from fastapi import APIRouter, HTTPException

from app.database import (
    save_recipe_label,
    get_recipe_label,
    list_recipe_labels,
    delete_recipe_label,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/labels")
async def list_labels():
    """List all saved nutrition labels."""
    try:
        return {"labels": list_recipe_labels()}
    except Exception as e:
        logger.error("Failed to list labels: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/labels/{recipe_id}")
async def get_label(recipe_id: int):
    """Retrieve a saved nutrition label by ID."""
    label = get_recipe_label(recipe_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return label


@router.delete("/labels/{recipe_id}")
async def delete_label(recipe_id: int):
    """Delete a saved nutrition label."""
    deleted = delete_recipe_label(recipe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": f"Recipe {recipe_id} deleted"}
