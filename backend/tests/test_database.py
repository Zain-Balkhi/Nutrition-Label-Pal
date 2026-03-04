"""
Tests for the SQLAlchemy database layer.

Uses an in-memory SQLite database for each test.
"""

import sys
import os
import json
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(autouse=True)
def reset_db_globals():
    """Reset the module-level engine between tests so each gets a fresh DB."""
    import app.database as db_mod
    db_mod._engine = None
    db_mod._SessionLocal = None
    yield
    db_mod._engine = None
    db_mod._SessionLocal = None


@pytest.fixture()
def db(tmp_path):
    """Provide a fresh database backed by a temp-file SQLite."""
    db_path = str(tmp_path / "test.db")

    from app.config import Settings

    mock_settings = Settings(
        USDA_API_KEY="fake",
        OPENAI_API_KEY="fake",
        DATABASE_URL=f"sqlite:///{db_path}",
    )

    with patch("app.database.get_settings", return_value=mock_settings), \
         patch("app.config.get_settings", return_value=mock_settings):
        from app.database import init_db
        init_db()
        yield


@pytest.fixture()
def sample_ingredients():
    return [
        {
            "name": "chicken breast",
            "quantity": 2,
            "unit": "cups",
            "preparation": "diced",
            "original_text": "2 cups chicken breast, diced",
            "fdc_id": 171077,
            "matched_description": "Chicken, breast, meat only, cooked, roasted",
        },
        {
            "name": "olive oil",
            "quantity": 1,
            "unit": "tbsp",
            "preparation": None,
            "original_text": "1 tbsp olive oil",
            "fdc_id": 171413,
            "matched_description": "Oil, olive, salad or cooking",
        },
    ]


@pytest.fixture()
def sample_label():
    return {
        "recipe_name": "Chicken Salad",
        "servings": 2,
        "serving_size": "1 bowl",
        "nutrients": [
            {"name": "Calories", "amount": 350, "unit": "kcal", "daily_value_percent": None},
            {"name": "Total Fat", "amount": 18, "unit": "g", "daily_value_percent": 23},
            {"name": "Protein", "amount": 42, "unit": "g", "daily_value_percent": 84},
        ],
    }


class TestSaveAndRetrieve:
    def test_save_returns_id(self, db, sample_ingredients, sample_label):
        from app.database import save_recipe_label
        rid = save_recipe_label(
            recipe_name="Chicken Salad",
            raw_text="2 cups chicken, 1 tbsp oil",
            servings=2,
            serving_size="1 bowl",
            ingredients=sample_ingredients,
            label_data=sample_label,
        )
        assert isinstance(rid, int)
        assert rid > 0

    def test_round_trip(self, db, sample_ingredients, sample_label):
        from app.database import save_recipe_label, get_recipe_label
        rid = save_recipe_label(
            recipe_name="Chicken Salad",
            raw_text="2 cups chicken, 1 tbsp oil",
            servings=2,
            serving_size="1 bowl",
            ingredients=sample_ingredients,
            label_data=sample_label,
        )
        loaded = get_recipe_label(rid)
        assert loaded is not None
        assert loaded["recipe_name"] == "Chicken Salad"
        assert loaded["servings"] == 2
        assert loaded["id"] == rid
        assert loaded["label"]["nutrients"][0]["name"] == "Calories"

    def test_get_nonexistent(self, db):
        from app.database import get_recipe_label
        assert get_recipe_label(9999) is None


class TestListRecipes:
    def test_empty(self, db):
        from app.database import list_recipe_labels
        assert list_recipe_labels() == []

    def test_multiple(self, db, sample_ingredients, sample_label):
        from app.database import save_recipe_label, list_recipe_labels
        save_recipe_label("Recipe A", "", 1, "1 serving", [], sample_label)
        save_recipe_label("Recipe B", "", 2, "1 bowl", sample_ingredients, sample_label)
        results = list_recipe_labels()
        assert len(results) == 2
        names = {r["recipe_name"] for r in results}
        assert "Recipe A" in names
        assert "Recipe B" in names


class TestDelete:
    def test_delete_existing(self, db, sample_ingredients, sample_label):
        from app.database import save_recipe_label, delete_recipe_label, get_recipe_label
        rid = save_recipe_label("Del Test", "", 1, "1 serving", sample_ingredients, sample_label)
        assert delete_recipe_label(rid) is True
        assert get_recipe_label(rid) is None

    def test_delete_nonexistent(self, db):
        from app.database import delete_recipe_label
        assert delete_recipe_label(9999) is False

    def test_cascade(self, db, sample_ingredients, sample_label):
        """Deleting a recipe should also delete its ingredients."""
        from app.database import save_recipe_label, delete_recipe_label, get_session
        from app.database import IngredientRow
        rid = save_recipe_label("Cascade", "", 1, "x", sample_ingredients, sample_label)

        session = get_session()
        count_before = session.query(IngredientRow).filter_by(recipe_id=rid).count()
        session.close()
        assert count_before == 2

        delete_recipe_label(rid)

        session = get_session()
        count_after = session.query(IngredientRow).filter_by(recipe_id=rid).count()
        session.close()
        assert count_after == 0
