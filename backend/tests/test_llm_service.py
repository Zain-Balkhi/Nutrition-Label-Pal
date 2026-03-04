"""
Tests for the LLM recipe parsing service.

Uses a mock OpenAI client so tests run offline.
"""

import sys
import os
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Fake OpenAI response ──────────────────────────────────────────────────

SAMPLE_LLM_RESPONSE = json.dumps({
    "recipe_name": "Simple Chicken Salad",
    "servings": 2,
    "serving_size": "1 bowl",
    "ingredients": [
        {
            "name": "chicken breast",
            "quantity": 2,
            "unit": "cups",
            "preparation": "diced",
            "original_text": "2 cups chicken breast, diced"
        },
        {
            "name": "olive oil",
            "quantity": 1,
            "unit": "tbsp",
            "preparation": None,
            "original_text": "1 tbsp olive oil"
        },
        {
            "name": "romaine lettuce",
            "quantity": 3,
            "unit": "cups",
            "preparation": None,
            "original_text": "3 cups romaine lettuce"
        },
        {
            "name": "tomato",
            "quantity": 1,
            "unit": "each",
            "preparation": "chopped",
            "original_text": "1 medium tomato, chopped"
        }
    ]
})


def _make_mock_choice(content: str):
    """Build a fake OpenAI ChatCompletion choice."""
    choice = MagicMock()
    choice.message.content = content
    return choice


def _make_mock_response(content: str):
    resp = MagicMock()
    resp.choices = [_make_mock_choice(content)]
    return resp


@pytest.mark.asyncio
class TestLLMService:
    """Test parse_recipe with mocked OpenAI."""

    @patch("app.services.llm_service.AsyncOpenAI")
    async def test_parse_chicken_salad(self, MockOpenAI):
        mock_client = AsyncMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.return_value = _make_mock_response(SAMPLE_LLM_RESPONSE)

        from app.services.llm_service import parse_recipe
        result = await parse_recipe("2 cups chicken breast, diced\n1 tbsp olive oil\n3 cups romaine lettuce\n1 medium tomato, chopped")

        assert result.recipe_name == "Simple Chicken Salad"
        assert result.servings == 2
        assert len(result.ingredients) == 4
        assert result.ingredients[0].name == "chicken breast"
        assert result.ingredients[0].quantity == 2
        assert result.ingredients[0].unit == "cups"
        assert result.ingredients[0].preparation == "diced"

    @patch("app.services.llm_service.AsyncOpenAI")
    async def test_parse_invalid_json_raises(self, MockOpenAI):
        mock_client = AsyncMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.return_value = _make_mock_response("not valid json")

        from app.services.llm_service import parse_recipe
        with pytest.raises(ValueError, match="JSON"):
            await parse_recipe("some recipe text")

    @patch("app.services.llm_service.AsyncOpenAI")
    async def test_parse_missing_fields_raises(self, MockOpenAI):
        mock_client = AsyncMock()
        MockOpenAI.return_value = mock_client
        # Valid JSON but missing required fields
        mock_client.chat.completions.create.return_value = _make_mock_response('{"some": "data"}')

        from app.services.llm_service import parse_recipe
        with pytest.raises(ValueError):
            await parse_recipe("some recipe text")

    @patch("app.services.llm_service.AsyncOpenAI")
    async def test_ingredient_fields_complete(self, MockOpenAI):
        mock_client = AsyncMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.return_value = _make_mock_response(SAMPLE_LLM_RESPONSE)

        from app.services.llm_service import parse_recipe
        result = await parse_recipe("2 cups chicken, 1 tbsp oil")

        for ing in result.ingredients:
            assert ing.name is not None
            assert isinstance(ing.quantity, (int, float))
            assert ing.unit is not None
            assert ing.original_text is not None


@pytest.mark.asyncio
class TestLLMDifferentRecipes:
    """Test with different recipe formats."""

    @patch("app.services.llm_service.AsyncOpenAI")
    async def test_pancakes(self, MockOpenAI):
        pancake_response = json.dumps({
            "recipe_name": "Classic Pancakes",
            "servings": 4,
            "serving_size": "2 pancakes",
            "ingredients": [
                {"name": "all purpose flour", "quantity": 1.5, "unit": "cups", "preparation": None, "original_text": "1 1/2 cups all purpose flour"},
                {"name": "whole milk", "quantity": 1, "unit": "cups", "preparation": None, "original_text": "1 cup whole milk"},
                {"name": "egg", "quantity": 2, "unit": "each", "preparation": None, "original_text": "2 eggs"},
                {"name": "butter", "quantity": 2, "unit": "tbsp", "preparation": "melted", "original_text": "2 tbsp butter, melted"},
                {"name": "sugar", "quantity": 1, "unit": "tbsp", "preparation": None, "original_text": "1 tbsp sugar"},
                {"name": "baking powder", "quantity": 1, "unit": "tsp", "preparation": None, "original_text": "1 tsp baking powder"},
                {"name": "salt", "quantity": 0.5, "unit": "tsp", "preparation": None, "original_text": "1/2 tsp salt"},
            ]
        })
        mock_client = AsyncMock()
        MockOpenAI.return_value = mock_client
        mock_client.chat.completions.create.return_value = _make_mock_response(pancake_response)

        from app.services.llm_service import parse_recipe
        result = await parse_recipe("1 1/2 cups flour\n1 cup milk\n2 eggs\n2 tbsp butter, melted")

        assert result.recipe_name == "Classic Pancakes"
        assert result.servings == 4
        assert len(result.ingredients) == 7
        # Check flour parsed correctly
        flour = result.ingredients[0]
        assert flour.quantity == 1.5
        assert flour.unit == "cups"
