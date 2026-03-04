import json
import logging

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.models.schemas import ParsedRecipe

logger = logging.getLogger(__name__)

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
