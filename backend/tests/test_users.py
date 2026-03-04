"""
Tests for the user profile endpoints: GET/PUT/DELETE /api/users/me.

All tests use an in-memory SQLite database and the FastAPI TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_session, UserRow, RecipeRow
from app.main import app
from app.services.auth_service import hash_password


# ── In-memory database fixture ───────────────────────────────────────────────

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


# ── Helpers ──────────────────────────────────────────────────────────────────

def _existing_user(session, email="user@example.com", full_name="Test User"):
    user = UserRow(
        email=email,
        hashed_password=hash_password("password123"),
        full_name=full_name,
    )
    session.add(user)
    session.commit()
    return user


def _auth_header(client, email="user@example.com", password="password123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── GET /api/users/me ────────────────────────────────────────────────────────

class TestGetProfile:
    def test_get_profile_success(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        resp = client.get("/api/users/me", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "user@example.com"
        assert body["full_name"] == "Test User"
        assert "created_at" in body
        assert "id" in body
        # Password must not be exposed
        assert "password" not in body
        assert "hashed_password" not in body

    def test_get_profile_unauthorized(self, client):
        resp = client.get("/api/users/me")
        assert resp.status_code == 403

    def test_get_profile_invalid_token(self, client):
        resp = client.get("/api/users/me", headers={"Authorization": "Bearer badtoken"})
        assert resp.status_code == 401


# ── PUT /api/users/me ────────────────────────────────────────────────────────

class TestUpdateProfile:
    def test_update_name_success(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        resp = client.put("/api/users/me", headers=headers, json={"full_name": "New Name"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["full_name"] == "New Name"
        assert body["email"] == "user@example.com"
        assert body["id"] is not None

        # Verify persisted
        resp2 = client.get("/api/users/me", headers=headers)
        assert resp2.json()["full_name"] == "New Name"

    def test_update_empty_name_rejected(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        resp = client.put("/api/users/me", headers=headers, json={"full_name": "   "})
        assert resp.status_code == 422

    def test_update_name_trimmed(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        resp = client.put("/api/users/me", headers=headers, json={"full_name": "  Trimmed  "})
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Trimmed"

    def test_update_unauthorized(self, client):
        resp = client.put("/api/users/me", json={"full_name": "No Auth"})
        assert resp.status_code == 403


# ── DELETE /api/users/me ─────────────────────────────────────────────────────

class TestDeleteAccount:
    def test_delete_success(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        resp = client.delete("/api/users/me", headers=headers)
        assert resp.status_code == 204

    def test_delete_cascades_recipes(self, client, db_session):
        user = _existing_user(db_session)
        recipe = RecipeRow(
            user_id=user.id,
            recipe_name="Test Recipe",
            raw_text="1 cup flour",
            servings=1,
            serving_size="1 serving",
        )
        db_session.add(recipe)
        db_session.commit()

        headers = _auth_header(client)
        resp = client.delete("/api/users/me", headers=headers)
        assert resp.status_code == 204

        # Verify recipe is gone
        assert db_session.query(RecipeRow).filter_by(user_id=user.id).first() is None

    def test_delete_unauthorized(self, client):
        resp = client.delete("/api/users/me")
        assert resp.status_code == 403

    def test_token_invalid_after_deletion(self, client, db_session):
        _existing_user(db_session)
        headers = _auth_header(client)
        client.delete("/api/users/me", headers=headers)
        # Token should no longer work
        resp = client.get("/api/users/me", headers=headers)
        assert resp.status_code == 401
