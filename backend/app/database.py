"""
SQLAlchemy database models and session management.

Supports SQLite (local dev) and PostgreSQL (Supabase production).
Set DATABASE_URL in .env:
  - Local:  sqlite:///./nutrition_pal.db
  - Supabase: postgresql://user:pass@host:port/dbname
"""

import json
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Index,
    Integer,
    Float,
    String,
    Text,
    DateTime,
    ForeignKey,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker,
    relationship,
)

from app.config import get_settings


# ── Base ───────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Models ─────────────────────────────────────────────────────────────────
class UserRow(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    recipes = relationship("RecipeRow", back_populates="user",
                            cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_users_email", "email"),
    )


class RecipeRow(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    recipe_name = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False, default="")
    servings = Column(Integer, nullable=False, default=1)
    serving_size = Column(String(100), nullable=False, default="1 serving")
    label_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("UserRow", back_populates="recipes")
    ingredients = relationship("IngredientRow", back_populates="recipe",
                               cascade="all, delete-orphan")
    nutrition = relationship("RecipeNutritionRow", back_populates="recipe",
                             cascade="all, delete-orphan")


class IngredientRow(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    unit = Column(String(50), nullable=False, default="")
    preparation = Column(String(100), nullable=True)
    original_text = Column(Text, nullable=False, default="")
    fdc_id = Column(Integer, nullable=True)
    matched_description = Column(String(255), nullable=True)
    gram_weight = Column(Float, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    recipe = relationship("RecipeRow", back_populates="ingredients")


class RecipeNutritionRow(Base):
    __tablename__ = "recipe_nutrition"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    nutrient_name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    unit = Column(String(20), nullable=False, default="")
    daily_value_percent = Column(Float, nullable=True)
    display_value = Column(String(50), nullable=True)

    recipe = relationship("RecipeRow", back_populates="nutrition")


class USDANutritionCache(Base):
    __tablename__ = "usda_nutrition_cache"

    fdc_id = Column(Integer, primary_key=True)
    description = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False, default="")
    nutrients_json = Column(Text, nullable=False, default="{}")
    fetched_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


# ── Engine / Session factory ──────────────────────────────────────────────
_engine = None
_SessionLocal = None


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        url = settings.DATABASE_URL
        connect_args = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(url, connect_args=connect_args, echo=False)
    return _engine


def get_session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=_get_engine())
    return _SessionLocal()


def init_db():
    """Create all tables if they don't exist, and migrate existing ones."""
    engine = _get_engine()
    Base.metadata.create_all(engine)
    _migrate_existing_tables(engine)


def _migrate_existing_tables(engine):
    """Add columns/tables that create_all won't add to pre-existing tables."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)

    # Add user_id column to recipes if missing
    if "recipes" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("recipes")]
        if "user_id" not in columns:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE recipes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"
                ))


# ── CRUD helpers ───────────────────────────────────────────────────────────

def save_recipe_label(
    recipe_name: str,
    raw_text: str,
    servings: int,
    serving_size: str,
    ingredients: list[dict],
    label_data: dict,
    user_id: int | None = None,
) -> int:
    """Persist a nutrition label and its ingredients. Returns the recipe id."""
    session = get_session()
    try:
        row = RecipeRow(
            user_id=user_id,
            recipe_name=recipe_name,
            raw_text=raw_text,
            servings=servings,
            serving_size=serving_size,
            label_json=json.dumps(label_data),
        )
        session.add(row)
        session.flush()  # get row.id

        for idx, ing in enumerate(ingredients):
            session.add(IngredientRow(
                recipe_id=row.id,
                name=ing.get("name", ""),
                quantity=ing.get("quantity", 0),
                unit=ing.get("unit", ""),
                preparation=ing.get("preparation"),
                original_text=ing.get("original_text", ""),
                fdc_id=ing.get("fdc_id"),
                matched_description=ing.get("matched_description"),
                gram_weight=ing.get("gram_weight"),
                sort_order=idx,
            ))

        session.commit()
        return row.id
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_recipe_label(recipe_id: int) -> dict | None:
    """Retrieve a saved label by id."""
    session = get_session()
    try:
        row = session.query(RecipeRow).filter_by(id=recipe_id).first()
        if row is None:
            return None
        return {
            "id": row.id,
            "recipe_name": row.recipe_name,
            "servings": row.servings,
            "serving_size": row.serving_size,
            "label": json.loads(row.label_json),
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
    finally:
        session.close()


def list_recipe_labels() -> list[dict]:
    """List all saved labels (summary only)."""
    session = get_session()
    try:
        rows = session.query(RecipeRow).order_by(RecipeRow.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "recipe_name": r.recipe_name,
                "servings": r.servings,
                "serving_size": r.serving_size,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        session.close()


def delete_recipe_label(recipe_id: int) -> bool:
    """Delete a recipe and its ingredients. Returns True if found."""
    session = get_session()
    try:
        row = session.query(RecipeRow).filter_by(id=recipe_id).first()
        if row is None:
            return False
        session.delete(row)
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
