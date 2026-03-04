"""
Tests for user-scoped recipe CRUD endpoints: /api/recipes.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, UserRow, get_session
from app.main import app
from app.services.auth_service import create_access_token, hash_password


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session):
    def _override():
        return db_session

    app.dependency_overrides[get_session] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()


def _create_user(session, email="user@example.com", full_name="Test User"):
    user = UserRow(
        email=email,
        hashed_password=hash_password("password123"),
        full_name=full_name,
    )
    session.add(user)
    session.commit()
    return user


def _auth_header(user):
    token = create_access_token(user.id, user.email)
    return {"Authorization": f"Bearer {token}"}


def _sample_recipe():
    return {
        "recipe_name": "Test Pasta",
        "raw_text": "2 cups pasta\n1 tbsp olive oil",
        "servings": 4,
        "serving_size": "1 cup",
        "ingredients": [
            {
                "name": "pasta",
                "quantity": 2.0,
                "unit": "cups",
                "preparation": None,
                "original_text": "2 cups pasta",
                "fdc_id": 168874,
                "matched_description": "Pasta, dry",
                "gram_weight": 200.0,
            },
            {
                "name": "olive oil",
                "quantity": 1.0,
                "unit": "tbsp",
                "preparation": None,
                "original_text": "1 tbsp olive oil",
                "fdc_id": 171413,
                "matched_description": "Olive oil",
                "gram_weight": 13.5,
            },
        ],
        "nutrients": [
            {"name": "Calories", "amount": 350.0, "unit": "kcal", "daily_value_percent": None, "display_value": "350"},
            {"name": "Total Fat", "amount": 8.0, "unit": "g", "daily_value_percent": 10.0, "display_value": "8g"},
            {"name": "Sodium", "amount": 5.0, "unit": "mg", "daily_value_percent": 0.0, "display_value": "5mg"},
        ],
    }


# ── Create recipe tests ───────────────────────────────────────────────────

class TestCreateRecipe:
    def test_create_recipe_success(self, client, db_session):
        user = _create_user(db_session)
        response = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        assert response.status_code == 201
        body = response.json()
        assert body["recipe_name"] == "Test Pasta"
        assert body["servings"] == 4
        assert body["serving_size"] == "1 cup"
        assert body["raw_text"] == "2 cups pasta\n1 tbsp olive oil"
        assert len(body["ingredients"]) == 2
        assert len(body["nutrients"]) == 3
        assert body["ingredients"][0]["name"] == "pasta"
        assert body["ingredients"][0]["fdc_id"] == 168874
        assert body["nutrients"][0]["nutrient_name"] == "Calories"
        assert body["nutrients"][0]["amount"] == 350.0
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body

    def test_create_recipe_no_auth_returns_403(self, client):
        response = client.post("/api/recipes", json=_sample_recipe())
        assert response.status_code == 403

    def test_create_recipe_invalid_token_returns_401(self, client):
        response = client.post(
            "/api/recipes",
            json=_sample_recipe(),
            headers={"Authorization": "Bearer bad.token"},
        )
        assert response.status_code == 401

    def test_create_recipe_missing_fields_returns_422(self, client, db_session):
        user = _create_user(db_session)
        response = client.post(
            "/api/recipes",
            json={"recipe_name": "Incomplete"},
            headers=_auth_header(user),
        )
        assert response.status_code == 422


# ── List recipes tests ─────────────────────────────────────────────────────

class TestListRecipes:
    def test_list_empty(self, client, db_session):
        user = _create_user(db_session)
        response = client.get("/api/recipes", headers=_auth_header(user))
        assert response.status_code == 200
        assert response.json() == []

    def test_list_returns_own_recipes(self, client, db_session):
        user = _create_user(db_session)
        client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe2 = _sample_recipe()
        recipe2["recipe_name"] = "Test Salad"
        client.post("/api/recipes", json=recipe2, headers=_auth_header(user))

        response = client.get("/api/recipes", headers=_auth_header(user))
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) == 2
        # Newest first
        assert recipes[0]["recipe_name"] == "Test Salad"
        assert recipes[1]["recipe_name"] == "Test Pasta"

    def test_list_does_not_show_other_users_recipes(self, client, db_session):
        user1 = _create_user(db_session, email="user1@example.com")
        user2 = _create_user(db_session, email="user2@example.com")
        client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user1))

        response = client.get("/api/recipes", headers=_auth_header(user2))
        assert response.status_code == 200
        assert response.json() == []

    def test_list_no_auth_returns_403(self, client):
        response = client.get("/api/recipes")
        assert response.status_code == 403

    def test_list_recipe_summary_fields(self, client, db_session):
        user = _create_user(db_session)
        client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))

        response = client.get("/api/recipes", headers=_auth_header(user))
        recipe = response.json()[0]
        assert "id" in recipe
        assert "recipe_name" in recipe
        assert "servings" in recipe
        assert "serving_size" in recipe
        assert "created_at" in recipe
        assert "updated_at" in recipe
        # Summary should NOT include ingredients or nutrients
        assert "ingredients" not in recipe
        assert "nutrients" not in recipe


# ── Get recipe tests ───────────────────────────────────────────────────────

class TestGetRecipe:
    def test_get_own_recipe(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = create_resp.json()["id"]

        response = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user))
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == recipe_id
        assert body["recipe_name"] == "Test Pasta"
        assert len(body["ingredients"]) == 2
        assert len(body["nutrients"]) == 3

    def test_get_other_users_recipe_returns_404(self, client, db_session):
        user1 = _create_user(db_session, email="owner@example.com")
        user2 = _create_user(db_session, email="intruder@example.com")
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user1))
        recipe_id = create_resp.json()["id"]

        response = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user2))
        assert response.status_code == 404

    def test_get_nonexistent_recipe_returns_404(self, client, db_session):
        user = _create_user(db_session)
        response = client.get("/api/recipes/99999", headers=_auth_header(user))
        assert response.status_code == 404

    def test_get_no_auth_returns_403(self, client):
        response = client.get("/api/recipes/1")
        assert response.status_code == 403


# ── Update recipe tests ───────────────────────────────────────────────────

class TestUpdateRecipe:
    def test_update_recipe_name(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = create_resp.json()["id"]

        response = client.put(
            f"/api/recipes/{recipe_id}",
            json={"recipe_name": "Updated Pasta"},
            headers=_auth_header(user),
        )
        assert response.status_code == 200
        assert response.json()["recipe_name"] == "Updated Pasta"
        # Other fields unchanged
        assert response.json()["servings"] == 4

    def test_update_ingredients(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = create_resp.json()["id"]

        new_ingredients = [
            {
                "name": "rice",
                "quantity": 1.0,
                "unit": "cup",
                "preparation": None,
                "original_text": "1 cup rice",
                "fdc_id": 169756,
                "matched_description": "Rice, white",
                "gram_weight": 185.0,
            },
        ]
        response = client.put(
            f"/api/recipes/{recipe_id}",
            json={"ingredients": new_ingredients},
            headers=_auth_header(user),
        )
        assert response.status_code == 200
        assert len(response.json()["ingredients"]) == 1
        assert response.json()["ingredients"][0]["name"] == "rice"

    def test_update_other_users_recipe_returns_404(self, client, db_session):
        user1 = _create_user(db_session, email="owner@example.com")
        user2 = _create_user(db_session, email="intruder@example.com")
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user1))
        recipe_id = create_resp.json()["id"]

        response = client.put(
            f"/api/recipes/{recipe_id}",
            json={"recipe_name": "Hijacked"},
            headers=_auth_header(user2),
        )
        assert response.status_code == 404

    def test_update_nonexistent_recipe_returns_404(self, client, db_session):
        user = _create_user(db_session)
        response = client.put(
            "/api/recipes/99999",
            json={"recipe_name": "Ghost"},
            headers=_auth_header(user),
        )
        assert response.status_code == 404

    def test_update_no_auth_returns_403(self, client):
        response = client.put("/api/recipes/1", json={"recipe_name": "Nope"})
        assert response.status_code == 403


# ── Delete recipe tests ───────────────────────────────────────────────────

class TestDeleteRecipe:
    def test_delete_own_recipe(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = create_resp.json()["id"]

        response = client.delete(f"/api/recipes/{recipe_id}", headers=_auth_header(user))
        assert response.status_code == 204

        # Confirm it's gone
        get_resp = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user))
        assert get_resp.status_code == 404

    def test_delete_other_users_recipe_returns_404(self, client, db_session):
        user1 = _create_user(db_session, email="owner@example.com")
        user2 = _create_user(db_session, email="intruder@example.com")
        create_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user1))
        recipe_id = create_resp.json()["id"]

        response = client.delete(f"/api/recipes/{recipe_id}", headers=_auth_header(user2))
        assert response.status_code == 404

        # Original should still exist
        get_resp = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user1))
        assert get_resp.status_code == 200

    def test_delete_nonexistent_recipe_returns_404(self, client, db_session):
        user = _create_user(db_session)
        response = client.delete("/api/recipes/99999", headers=_auth_header(user))
        assert response.status_code == 404

    def test_delete_no_auth_returns_403(self, client):
        response = client.delete("/api/recipes/1")
        assert response.status_code == 403
