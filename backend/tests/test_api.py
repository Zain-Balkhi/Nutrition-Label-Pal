"""
Tests for FastAPI endpoints.

Uses httpx.AsyncClient with the FastAPI app directly (no real server).
"""

import sys
import os
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture()
def transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "nutrition-label-pal"


@pytest.mark.asyncio
class TestParseRecipeEndpoint:
    @patch("app.routers.recipes.USDAService")
    @patch("app.routers.recipes.parse_recipe")
    async def test_parse_recipe_success(self, mock_parse, MockUSDA, transport):
        """Full parse-recipe endpoint with mocked LLM + USDA."""
        from app.models.schemas import ParsedRecipe, ParsedIngredient

        mock_parse.return_value = ParsedRecipe(
            recipe_name="Test",
            servings=1,
            serving_size="1 serving",
            ingredients=[
                ParsedIngredient(
                    name="chicken breast",
                    quantity=2,
                    unit="cups",
                    preparation="diced",
                    original_text="2 cups chicken breast, diced",
                )
            ],
        )

        mock_usda_instance = AsyncMock()
        MockUSDA.return_value = mock_usda_instance
        mock_usda_instance.search_food.return_value = [
            {"fdcId": 171077, "description": "Chicken, breast", "dataType": "SR Legacy"}
        ]

        # Need API keys to be set
        from app.config import Settings
        mock_settings = Settings(
            USDA_API_KEY="fake_key",
            OPENAI_API_KEY="fake_key",
            DATABASE_URL="sqlite:///./test_temp.db",
        )

        with patch("app.routers.recipes.get_settings", return_value=mock_settings):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post("/api/parse-recipe", json={
                    "raw_text": "2 cups chicken breast, diced",
                    "servings": 1,
                    "serving_size": "1 serving",
                })

        assert resp.status_code == 200
        data = resp.json()
        assert data["recipe_name"] == "Test"
        assert len(data["ingredients"]) == 1
        assert data["ingredients"][0]["status"] == "matched"

    async def test_parse_recipe_no_api_key(self, transport):
        """Should return 500 if OpenAI key is empty."""
        from app.config import Settings
        mock_settings = Settings(
            USDA_API_KEY="fake",
            OPENAI_API_KEY="",
            DATABASE_URL="sqlite:///./test_temp.db",
        )
        with patch("app.routers.recipes.get_settings", return_value=mock_settings):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.post("/api/parse-recipe", json={
                    "raw_text": "2 cups chicken",
                })
        assert resp.status_code == 500
        assert "OpenAI" in resp.json()["detail"]


@pytest.mark.asyncio
class TestLabelsEndpoint:
    async def test_list_labels_empty(self, transport):
        with patch("app.routers.labels.list_recipe_labels", return_value=[]):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/api/labels")
        assert resp.status_code == 200
        assert resp.json()["labels"] == []

    async def test_get_label_not_found(self, transport):
        with patch("app.routers.labels.get_recipe_label", return_value=None):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.get("/api/labels/999")
        assert resp.status_code == 404

    async def test_delete_label_not_found(self, transport):
        with patch("app.routers.labels.delete_recipe_label", return_value=False):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.delete("/api/labels/999")
        assert resp.status_code == 404

    async def test_delete_label_success(self, transport):
        with patch("app.routers.labels.delete_recipe_label", return_value=True):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                resp = await ac.delete("/api/labels/1")
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"]
