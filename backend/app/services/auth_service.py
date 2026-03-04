"""
Authentication service: password hashing, JWT creation/verification, user CRUD.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import UserRow
from app.models.schemas import UserCreate, UserOut


# ── Password helpers ────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ─────────────────────────────────────────────────────────────

def create_access_token(user_id: int, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    settings = get_settings()
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# ── User CRUD ───────────────────────────────────────────────────────────────

def get_user_by_email(session: Session, email: str) -> UserRow | None:
    return session.query(UserRow).filter_by(email=email.lower()).first()


def get_user_by_id(session: Session, user_id: int) -> UserRow | None:
    return session.query(UserRow).filter_by(id=user_id).first()


def create_user(session: Session, data: UserCreate) -> UserRow:
    """Create a new user. Caller is responsible for committing the session."""
    user = UserRow(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    session.add(user)
    session.flush()  # populate user.id without committing
    return user


def authenticate_user(session: Session, email: str, password: str) -> UserRow | None:
    """Return user if credentials are valid, None otherwise."""
    user = get_user_by_email(session, email)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def user_to_out(user: UserRow) -> UserOut:
    return UserOut(id=user.id, email=user.email, full_name=user.full_name)
