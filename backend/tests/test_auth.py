"""
Tests for the auth endpoints: register and login.

All tests use an in-memory SQLite database and the FastAPI TestClient.
No real database files are created or modified.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_session, UserRow
from app.main import app
from app.services.auth_service import hash_password


# ── In-memory database fixture ───────────────────────────────────────────────

@pytest.fixture()
def db_session():
    """
    Provide a clean in-memory SQLite session for each test.

    StaticPool forces all ORM access through a single connection so the
    in-memory database (which is per-connection) is shared correctly across
    the test session and the TestClient's request threads.
    """
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
    """TestClient with the real app wired to the in-memory session."""
    # Override get_session so the router receives the same session as the test
    def _override():
        return db_session

    app.dependency_overrides[get_session] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Helper ────────────────────────────────────────────────────────────────────

def _existing_user(session, email="existing@example.com"):
    user = UserRow(
        email=email,
        hashed_password=hash_password("password123"),
        full_name="Existing User",
    )
    session.add(user)
    session.commit()
    return user


# ── Register tests ─────────────────────────────────────────────────────────

class TestRegister:
    def test_register_success(self, client):
        response = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepass",
            "full_name": "New User",
        })
        assert response.status_code == 201
        body = response.json()
        assert body["token_type"] == "bearer"
        assert len(body["access_token"]) > 0
        assert body["user"]["email"] == "newuser@example.com"
        assert body["user"]["full_name"] == "New User"
        assert "id" in body["user"]
        # Password must not be exposed
        assert "password" not in body["user"]
        assert "hashed_password" not in body["user"]

    def test_register_email_is_lowercased(self, client):
        response = client.post("/api/auth/register", json={
            "email": "UPPER@EXAMPLE.COM",
            "password": "securepass",
            "full_name": "Upper User",
        })
        assert response.status_code == 201
        assert response.json()["user"]["email"] == "upper@example.com"

    def test_register_duplicate_email(self, client, db_session):
        _existing_user(db_session)
        response = client.post("/api/auth/register", json={
            "email": "existing@example.com",
            "password": "anotherpass",
            "full_name": "Duplicate User",
        })
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_register_duplicate_email_case_insensitive(self, client, db_session):
        _existing_user(db_session, email="casesensitive@example.com")
        response = client.post("/api/auth/register", json={
            "email": "CASESENSITIVE@EXAMPLE.COM",
            "password": "anotherpass",
            "full_name": "Duplicate User",
        })
        assert response.status_code == 400

    def test_register_invalid_email(self, client):
        response = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "password": "securepass",
            "full_name": "User",
        })
        assert response.status_code == 422

    def test_register_password_too_short(self, client):
        response = client.post("/api/auth/register", json={
            "email": "user@example.com",
            "password": "short",
            "full_name": "User",
        })
        assert response.status_code == 422

    def test_register_empty_full_name(self, client):
        response = client.post("/api/auth/register", json={
            "email": "user@example.com",
            "password": "securepass",
            "full_name": "   ",
        })
        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        response = client.post("/api/auth/register", json={
            "email": "user@example.com",
        })
        assert response.status_code == 422


# ── Login tests ────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, client, db_session):
        _existing_user(db_session)
        response = client.post("/api/auth/login", json={
            "email": "existing@example.com",
            "password": "password123",
        })
        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert len(body["access_token"]) > 0
        assert body["user"]["email"] == "existing@example.com"

    def test_login_wrong_password(self, client, db_session):
        _existing_user(db_session)
        response = client.post("/api/auth/login", json={
            "email": "existing@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_unknown_email(self, client):
        response = client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "password123",
        })
        # Same error as wrong password — no user enumeration
        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_inactive_user(self, client, db_session):
        user = _existing_user(db_session)
        user.is_active = False
        db_session.commit()
        response = client.post("/api/auth/login", json={
            "email": "existing@example.com",
            "password": "password123",
        })
        assert response.status_code == 401

    def test_login_email_case_insensitive(self, client, db_session):
        _existing_user(db_session)
        response = client.post("/api/auth/login", json={
            "email": "EXISTING@EXAMPLE.COM",
            "password": "password123",
        })
        assert response.status_code == 200


# ── Token validity tests ───────────────────────────────────────────────────

class TestToken:
    def test_token_is_valid_jwt(self, client):
        client.post("/api/auth/register", json={
            "email": "tokenuser@example.com",
            "password": "securepass",
            "full_name": "Token User",
        })
        response = client.post("/api/auth/login", json={
            "email": "tokenuser@example.com",
            "password": "securepass",
        })
        token = response.json()["access_token"]
        # Should be a 3-part dot-separated JWT
        assert token.count(".") == 2

    def test_token_contains_correct_user_id(self, client):
        reg = client.post("/api/auth/register", json={
            "email": "jwtcheck@example.com",
            "password": "securepass",
            "full_name": "JWT Check",
        })
        user_id = reg.json()["user"]["id"]
        token = reg.json()["access_token"]

        from app.services.auth_service import decode_access_token
        payload = decode_access_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["email"] == "jwtcheck@example.com"
