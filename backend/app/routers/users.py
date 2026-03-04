"""
User profile endpoints: view, update, and delete the current user's account.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import UserRow, get_session
from app.dependencies import get_current_user
from app.models.schemas import UpdateUserRequest, UserProfile, UserProfileUpdated

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
def get_my_profile(
    user: UserRow = Depends(get_current_user),
):
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.put("/me", response_model=UserProfileUpdated)
def update_my_profile(
    body: UpdateUserRequest,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user.full_name = body.full_name
    user.updated_at = datetime.now(timezone.utc)
    try:
        session.commit()
        session.refresh(user)
    except Exception:
        session.rollback()
        raise
    return UserProfileUpdated(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        session.delete(user)
        session.commit()
    except Exception:
        session.rollback()
        raise
