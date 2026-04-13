import logging

import httpx
import openai
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_session
from app.models.schemas import (
    RawRecipeInput,
    ParseRecipeResponse,
    CalculateNutritionRequest,
    NutritionResult,
    IngredientWithMatch,
    TranscribeImageResponse,
    USDAMatch,
)
from app.services.llm_service import parse_recipe, transcribe_recipe_image
from app.services.usda_service import USDAService
from app.services.calculator import calculate_nutrition
from app.config import get_settings

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/parse-recipe", response_model=ParseRecipeResponse)
async def parse_recipe_endpoint(
    input_data: RawRecipeInput,
    session: Session = Depends(get_session),
):
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    if not settings.USDA_API_KEY:
        raise HTTPException(status_code=500, detail="USDA API key not configured")

    try:
        parsed = await parse_recipe(input_data.raw_text)
    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key. Check your OPENAI_API_KEY in .env.")
    except openai.APIError as e:
        logger.error("OpenAI API error: %s", e)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")
    except ValueError as e:
        logger.error("Recipe parsing failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    if input_data.servings is not None:
        parsed.servings = input_data.servings
    if input_data.serving_size is not None:
        parsed.serving_size = input_data.serving_size

    usda = USDAService(db_session=session)
    ingredients_with_matches: list[IngredientWithMatch] = []

    try:
        for ingredient in parsed.ingredients:
            results = await usda.search_food(ingredient.name)
            matches = [
                USDAMatch(
                    fdc_id=item["fdcId"],
                    description=item.get("description", ""),
                    data_type=item.get("dataType", ""),
                )
                for item in results
            ]
            status = "matched" if matches else "no_match"
            selected_fdc_id = matches[0].fdc_id if matches else None

            ingredients_with_matches.append(
                IngredientWithMatch(
                    parsed=ingredient,
                    status=status,
                    matches=matches,
                    selected_fdc_id=selected_fdc_id,
                )
            )
    except Exception as e:
        logger.error("USDA API error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return ParseRecipeResponse(
        recipe_name=parsed.recipe_name,
        servings=parsed.servings,
        serving_size=parsed.serving_size,
        ingredients=ingredients_with_matches,
        allergens=parsed.allergens,
    )


@router.post("/transcribe-recipe-image", response_model=TranscribeImageResponse)
async def transcribe_recipe_image_endpoint(image: UploadFile = File(...)):
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    content_type = (image.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB size limit.")

    try:
        text = await transcribe_recipe_image(image_bytes, content_type)
    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key. Check your OPENAI_API_KEY in .env.")
    except openai.APIError as e:
        logger.error("OpenAI API error during OCR: %s", e)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    return TranscribeImageResponse(raw_text=text)


@router.post("/calculate-nutrition", response_model=NutritionResult)
async def calculate_nutrition_endpoint(
    request: CalculateNutritionRequest,
    session: Session = Depends(get_session)
):
    settings = get_settings()
    if not settings.USDA_API_KEY:
        raise HTTPException(status_code=500, detail="USDA API key not configured")

    usda = USDAService(db_session=session)
    try:
        result = await calculate_nutrition(
            ingredients=request.ingredients,
            servings=request.servings,
            serving_size=request.serving_size,
            recipe_name=request.recipe_name,
            allergens=request.allergens,
            usda_service=usda,
        )
    except httpx.HTTPStatusError as e:
        logger.error("USDA API error during calculation: %s", e)
        raise HTTPException(status_code=502, detail=f"USDA API error: {e.response.status_code} — {e.response.text}")
    except Exception as e:
        logger.error("Unexpected error during nutrition calculation: %s", e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during nutrition calculation.")

    return result
