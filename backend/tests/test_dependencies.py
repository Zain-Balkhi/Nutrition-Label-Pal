"""
Tests for auth dependencies: get_current_user, get_optional_user.
"""

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, UserRow, get_session
from app.dependencies import get_current_user, get_optional_user
from app.services.auth_service import create_access_token, hash_password


# ── Test app with protected routes ─────────────────────────────────────────

_app = FastAPI()


@_app.get("/protected")
def protected_route(user: UserRow = Depends(get_current_user)):
    return {"user_id": user.id, "email": user.email}


@_app.get("/optional")
def optional_route(user: UserRow | None = Depends(get_optional_user)):
    if user is None:
        return {"user_id": None}
    return {"user_id": user.id, "email": user.email}


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
def test_user(db_session):
    user = UserRow(
        email="test@example.com",
        hashed_password=hash_password("password123"),
        full_name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def client(db_session):
    def _override():
        return db_session

    _app.dependency_overrides[get_session] = _override
    yield TestClient(_app)
    _app.dependency_overrides.clear()


# ── get_current_user tests ─────────────────────────────────────────────────

class TestGetCurrentUser:
    def test_valid_token_returns_user(self, client, test_user):
        token = create_access_token(test_user.id, test_user.email)
        response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["user_id"] == test_user.id
        assert response.json()["email"] == "test@example.com"

    def test_missing_token_returns_403(self, client):
        response = client.get("/protected")
        assert response.status_code == 403

    def test_invalid_token_returns_401(self, client):
        response = client.get("/protected", headers={"Authorization": "Bearer invalid.token.here"})
        assert response.status_code == 401
        assert "Invalid or expired" in response.json()["detail"]

    def test_expired_token_returns_401(self, client, test_user):
        from unittest.mock import patch
        from app.config import Settings

        mock_settings = Settings(
            USDA_API_KEY="test",
            OPENAI_API_KEY="test",
            ACCESS_TOKEN_EXPIRE_HOURS=-1,
        )
        with patch("app.services.auth_service.get_settings", return_value=mock_settings):
            token = create_access_token(test_user.id, test_user.email)

        response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401

    def test_nonexistent_user_returns_401(self, client):
        token = create_access_token(99999, "ghost@example.com")
        response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
        assert "User not found" in response.json()["detail"]

    def test_inactive_user_returns_401(self, client, test_user, db_session):
        test_user.is_active = False
        db_session.commit()
        token = create_access_token(test_user.id, test_user.email)
        response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401


# ── get_optional_user tests ────────────────────────────────────────────────

class TestGetOptionalUser:
    def test_valid_token_returns_user(self, client, test_user):
        token = create_access_token(test_user.id, test_user.email)
        response = client.get("/optional", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["user_id"] == test_user.id

    def test_no_token_returns_none(self, client):
        response = client.get("/optional")
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_invalid_token_returns_none(self, client):
        response = client.get("/optional", headers={"Authorization": "Bearer bad.token"})
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_nonexistent_user_returns_none(self, client):
        token = create_access_token(99999, "ghost@example.com")
        response = client.get("/optional", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["user_id"] is None
