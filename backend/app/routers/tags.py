"""
Tag CRUD and recipe-tag assignment endpoints. All routes require authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import RecipeRow, RecipeTagRow, TagRow, UserRow, get_session
from app.dependencies import get_current_user
from app.models.schemas import TagCreate, TagOut, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])


def _tag_to_out(tag: TagRow) -> TagOut:
    return TagOut(id=tag.id, name=tag.name, color=tag.color)


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    body: TagCreate,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = TagRow(user_id=user.id, name=body.name, color=body.color)
    session.add(tag)
    try:
        session.commit()
        session.refresh(tag)
    except Exception:
        session.rollback()
        raise
    return _tag_to_out(tag)


@router.get("", response_model=list[TagOut])
def list_tags(
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tags = (
        session.query(TagRow)
        .filter_by(user_id=user.id)
        .order_by(TagRow.name)
        .all()
    )
    return [_tag_to_out(t) for t in tags]


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(
    tag_id: int,
    body: TagUpdate,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = session.query(TagRow).filter_by(id=tag_id, user_id=user.id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if body.name is not None:
        tag.name = body.name
    if body.color is not None:
        tag.color = body.color
    try:
        session.commit()
        session.refresh(tag)
    except Exception:
        session.rollback()
        raise
    return _tag_to_out(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = session.query(TagRow).filter_by(id=tag_id, user_id=user.id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    try:
        session.delete(tag)
        session.commit()
    except Exception:
        session.rollback()
        raise


# ── Recipe-tag assignment endpoints ──────────────────────────────────────

_recipe_tag_router = APIRouter(prefix="/recipes", tags=["tags"])


@_recipe_tag_router.post("/{recipe_id}/tags/{tag_id}", status_code=status.HTTP_201_CREATED)
def add_tag_to_recipe(
    recipe_id: int,
    tag_id: int,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = session.query(RecipeRow).filter_by(id=recipe_id, user_id=user.id).first()
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    tag = session.query(TagRow).filter_by(id=tag_id, user_id=user.id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    existing = (
        session.query(RecipeTagRow)
        .filter_by(recipe_id=recipe_id, tag_id=tag_id)
        .first()
    )
    if existing:
        return {"detail": "Tag already assigned"}

    link = RecipeTagRow(recipe_id=recipe_id, tag_id=tag_id)
    session.add(link)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
    return {"detail": "Tag assigned"}


@_recipe_tag_router.delete("/{recipe_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tag_from_recipe(
    recipe_id: int,
    tag_id: int,
    user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = session.query(RecipeRow).filter_by(id=recipe_id, user_id=user.id).first()
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")

    link = (
        session.query(RecipeTagRow)
        .filter_by(recipe_id=recipe_id, tag_id=tag_id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not assigned to recipe")
    try:
        session.delete(link)
        session.commit()
    except Exception:
        session.rollback()
        raise
