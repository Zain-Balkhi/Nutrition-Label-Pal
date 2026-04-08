"""
Tests for tag CRUD and recipe-tag assignment endpoints.
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
        "raw_text": "2 cups pasta",
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
        ],
        "nutrients": [
            {"name": "Calories", "amount": 350.0, "unit": "kcal", "daily_value_percent": None, "display_value": "350"},
        ],
    }


# ── Tag CRUD tests ─────────────────────────────────────────────────────────

class TestCreateTag:
    def test_create_tag_success(self, client, db_session):
        user = _create_user(db_session)
        response = client.post(
            "/api/tags",
            json={"name": "Vegetarian", "color": "#2ecc71"},
            headers=_auth_header(user),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "Vegetarian"
        assert body["color"] == "#2ecc71"
        assert "id" in body

    def test_create_tag_default_color(self, client, db_session):
        user = _create_user(db_session)
        response = client.post(
            "/api/tags",
            json={"name": "Quick"},
            headers=_auth_header(user),
        )
        assert response.status_code == 201
        assert response.json()["color"] == "#f5a623"

    def test_create_tag_no_auth_returns_403(self, client):
        response = client.post("/api/tags", json={"name": "Test"})
        assert response.status_code == 403


class TestListTags:
    def test_list_empty(self, client, db_session):
        user = _create_user(db_session)
        response = client.get("/api/tags", headers=_auth_header(user))
        assert response.status_code == 200
        assert response.json() == []

    def test_list_returns_own_tags(self, client, db_session):
        user = _create_user(db_session)
        client.post("/api/tags", json={"name": "Breakfast"}, headers=_auth_header(user))
        client.post("/api/tags", json={"name": "Dinner"}, headers=_auth_header(user))

        response = client.get("/api/tags", headers=_auth_header(user))
        assert response.status_code == 200
        tags = response.json()
        assert len(tags) == 2

    def test_list_does_not_show_other_users_tags(self, client, db_session):
        user1 = _create_user(db_session, email="user1@example.com")
        user2 = _create_user(db_session, email="user2@example.com")
        client.post("/api/tags", json={"name": "Private Tag"}, headers=_auth_header(user1))

        response = client.get("/api/tags", headers=_auth_header(user2))
        assert response.status_code == 200
        assert response.json() == []

    def test_list_no_auth_returns_403(self, client):
        response = client.get("/api/tags")
        assert response.status_code == 403


class TestUpdateTag:
    def test_update_tag_name(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post(
            "/api/tags",
            json={"name": "Old Name", "color": "#e74c3c"},
            headers=_auth_header(user),
        )
        tag_id = create_resp.json()["id"]

        response = client.put(
            f"/api/tags/{tag_id}",
            json={"name": "New Name"},
            headers=_auth_header(user),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"
        assert response.json()["color"] == "#e74c3c"  # unchanged

    def test_update_tag_color(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post(
            "/api/tags",
            json={"name": "Healthy"},
            headers=_auth_header(user),
        )
        tag_id = create_resp.json()["id"]

        response = client.put(
            f"/api/tags/{tag_id}",
            json={"color": "#9b59b6"},
            headers=_auth_header(user),
        )
        assert response.status_code == 200
        assert response.json()["color"] == "#9b59b6"
        assert response.json()["name"] == "Healthy"  # unchanged

    def test_update_other_users_tag_returns_404(self, client, db_session):
        user1 = _create_user(db_session, email="owner@example.com")
        user2 = _create_user(db_session, email="intruder@example.com")
        create_resp = client.post(
            "/api/tags",
            json={"name": "Secret Tag"},
            headers=_auth_header(user1),
        )
        tag_id = create_resp.json()["id"]

        response = client.put(
            f"/api/tags/{tag_id}",
            json={"name": "Hacked"},
            headers=_auth_header(user2),
        )
        assert response.status_code == 404

    def test_update_nonexistent_tag_returns_404(self, client, db_session):
        user = _create_user(db_session)
        response = client.put(
            "/api/tags/99999",
            json={"name": "Ghost"},
            headers=_auth_header(user),
        )
        assert response.status_code == 404


class TestDeleteTag:
    def test_delete_own_tag(self, client, db_session):
        user = _create_user(db_session)
        create_resp = client.post(
            "/api/tags",
            json={"name": "To Delete"},
            headers=_auth_header(user),
        )
        tag_id = create_resp.json()["id"]

        response = client.delete(f"/api/tags/{tag_id}", headers=_auth_header(user))
        assert response.status_code == 204

        # Confirm it's gone
        list_resp = client.get("/api/tags", headers=_auth_header(user))
        assert list_resp.json() == []

    def test_delete_other_users_tag_returns_404(self, client, db_session):
        user1 = _create_user(db_session, email="owner@example.com")
        user2 = _create_user(db_session, email="intruder@example.com")
        create_resp = client.post(
            "/api/tags",
            json={"name": "Protected"},
            headers=_auth_header(user1),
        )
        tag_id = create_resp.json()["id"]

        response = client.delete(f"/api/tags/{tag_id}", headers=_auth_header(user2))
        assert response.status_code == 404

    def test_delete_nonexistent_tag_returns_404(self, client, db_session):
        user = _create_user(db_session)
        response = client.delete("/api/tags/99999", headers=_auth_header(user))
        assert response.status_code == 404


# ── Recipe-tag assignment tests ──────────────────────────────────────────

class TestRecipeTagAssignment:
    def test_add_tag_to_recipe(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Favorite"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        response = client.post(
            f"/api/recipes/{recipe_id}/tags/{tag_id}",
            headers=_auth_header(user),
        )
        assert response.status_code == 201

    def test_add_tag_to_recipe_idempotent(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Favorite"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))
        response = client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))
        assert response.status_code == 201  # still succeeds

    def test_remove_tag_from_recipe(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Temp"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))
        response = client.delete(
            f"/api/recipes/{recipe_id}/tags/{tag_id}",
            headers=_auth_header(user),
        )
        assert response.status_code == 204

    def test_remove_unassigned_tag_returns_404(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Unlinked"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        response = client.delete(
            f"/api/recipes/{recipe_id}/tags/{tag_id}",
            headers=_auth_header(user),
        )
        assert response.status_code == 404

    def test_add_tag_to_nonexistent_recipe_returns_404(self, client, db_session):
        user = _create_user(db_session)
        tag_resp = client.post("/api/tags", json={"name": "Orphan"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        response = client.post(
            f"/api/recipes/99999/tags/{tag_id}",
            headers=_auth_header(user),
        )
        assert response.status_code == 404

    def test_add_nonexistent_tag_to_recipe_returns_404(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]

        response = client.post(
            f"/api/recipes/{recipe_id}/tags/99999",
            headers=_auth_header(user),
        )
        assert response.status_code == 404

    def test_tags_appear_in_recipe_detail(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Italian", "color": "#e74c3c"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))

        detail = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user))
        assert detail.status_code == 200
        tags = detail.json()["tags"]
        assert len(tags) == 1
        assert tags[0]["name"] == "Italian"
        assert tags[0]["color"] == "#e74c3c"

    def test_tags_appear_in_recipe_list(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Quick"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))

        list_resp = client.get("/api/recipes", headers=_auth_header(user))
        assert list_resp.status_code == 200
        recipes = list_resp.json()
        assert len(recipes) == 1
        assert len(recipes[0]["tags"]) == 1
        assert recipes[0]["tags"][0]["name"] == "Quick"

    def test_delete_tag_cascades_to_recipe_tags(self, client, db_session):
        user = _create_user(db_session)
        recipe_resp = client.post("/api/recipes", json=_sample_recipe(), headers=_auth_header(user))
        recipe_id = recipe_resp.json()["id"]
        tag_resp = client.post("/api/tags", json={"name": "Temp"}, headers=_auth_header(user))
        tag_id = tag_resp.json()["id"]

        client.post(f"/api/recipes/{recipe_id}/tags/{tag_id}", headers=_auth_header(user))
        client.delete(f"/api/tags/{tag_id}", headers=_auth_header(user))

        detail = client.get(f"/api/recipes/{recipe_id}", headers=_auth_header(user))
        assert detail.json()["tags"] == []
