"""
FastAPI dependencies for shared request-scoped resources.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.database import get_session, UserRow
from app.services.auth_service import decode_access_token, get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRow:
    """
    Decode the Bearer token and return the authenticated user.
    Raises 401 if the token is missing, invalid, or the user no longer exists.
    Use this as a dependency on any protected route:

        @router.get("/protected")
        async def protected(user: UserRow = Depends(get_current_user)):
            ...
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    session = get_session()
    try:
        user = get_user_by_id(session, int(user_id))
    finally:
        session.close()

    if user is None or not user.is_active:
        raise credentials_error

    return user
