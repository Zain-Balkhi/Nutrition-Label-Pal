import base64
import json
import logging

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.models.schemas import ParsedRecipe

logger = logging.getLogger(__name__)

OCR_SYSTEM_PROMPT = """You are a recipe transcription assistant. Transcribe ONLY the text that is actually visible in the provided image. Output the transcribed text exactly as it appears — do not reformat, reorder, summarize, or add anything.

Strict rules:
- If the image contains no readable text (e.g. a photo of a dog, landscape, or blank page), output an empty response.
- Never invent or guess ingredients, quantities, or instructions. If something is illegible, skip it or write [illegible].
- Preserve line breaks between ingredients/steps.
- Do not add commentary, headers, or markdown. Plain text only."""

SYSTEM_PROMPT = """You are a recipe parsing assistant. Given raw recipe text, extract structured data.

Return a JSON object with these fields:
- recipe_name: string (infer a name from the ingredients if none is given)
- servings: integer (default to 1 if not specified)
- serving_size: string (default to "1 serving" if not specified)
- ingredients: array of objects, each with:
  - name: string (the food item, e.g. "chicken breast")
  - quantity: number (e.g. 2.0)
  - unit: string (e.g. "cups", "tbsp", "oz", "g", "each")
  - preparation: string or null (e.g. "diced", "minced", null)
  - original_text: string (the original line from the recipe)
- allergens: array of strings containing any common dietary allergens present in the ingredients. Choose from "Milk", "Eggs", "Fish", "Crustacean shellfish", "Tree nuts", "Peanuts", "Wheat", "Soybeans", "Sesame". Leave empty if none are found.

Rules:
- Convert written numbers to digits (e.g. "two" -> 2)
- Normalize units (e.g. "tablespoons" -> "tbsp", "teaspoons" -> "tsp")
- If no unit is specified, use "each"
- Separate the food name from preparation methods
- Return ONLY valid JSON, no markdown formatting"""


async def parse_recipe(raw_text: str) -> ParsedRecipe:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": raw_text},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    content = response.choices[0].message.content

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON: %s", content)
        raise ValueError(f"Failed to parse LLM response as JSON: {e}") from e

    try:
        return ParsedRecipe(**data)
    except ValidationError as e:
        logger.error("LLM response failed validation: %s", e)
        raise ValueError(f"LLM response missing or invalid fields: {e}") from e


async def transcribe_recipe_image(image_bytes: bytes, mime_type: str) -> str:
    """Send an image to gpt-4o-mini vision and return the transcribed recipe text.

    Returns an empty string if the image contains no readable text.
    """
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:{mime_type};base64,{b64}"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": OCR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Transcribe the recipe in this image."},
                    {"type": "image_url", "image_url": {"url": data_uri, "detail": "high"}},
                ],
            },
        ],
        temperature=0.0,
        max_tokens=1500,
    )

    content = response.choices[0].message.content or ""
    return content.strip()
