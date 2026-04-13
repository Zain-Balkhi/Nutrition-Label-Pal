from enum import Enum

from pydantic import BaseModel, EmailStr, field_validator


class RawRecipeInput(BaseModel):
    raw_text: str
    servings: int | None = None
    serving_size: str | None = None


class TranscribeImageResponse(BaseModel):
    raw_text: str


class ParsedIngredient(BaseModel):
    name: str
    quantity: float
    unit: str
    preparation: str | None = None
    original_text: str


class ParsedRecipe(BaseModel):
    recipe_name: str
    servings: int
    serving_size: str
    ingredients: list[ParsedIngredient]
    allergens: list[str] = []


class USDAMatch(BaseModel):
    fdc_id: int
    description: str
    data_type: str


class IngredientWithMatch(BaseModel):
    parsed: ParsedIngredient
    status: str
    matches: list[USDAMatch]
    selected_fdc_id: int | None = None


class ParseRecipeResponse(BaseModel):
    recipe_name: str
    servings: int
    serving_size: str
    ingredients: list[IngredientWithMatch]
    allergens: list[str] = []


class NutrientValue(BaseModel):
    name: str
    amount: float
    unit: str
    daily_value_percent: int | None = None
    display_value: str | None = None


class SkippedIngredient(BaseModel):
    name: str
    original_text: str
    reason: str


class CalculateNutritionRequest(BaseModel):
    ingredients: list[IngredientWithMatch]
    servings: int
    serving_size: str
    recipe_name: str = "My Recipe"
    allergens: list[str] = []


class NutritionResult(BaseModel):
    recipe_name: str
    servings: int
    serving_size: str
    nutrients: list[NutrientValue]
    skipped_ingredients: list[SkippedIngredient] = []
    allergens: list[str] = []


# ── Auth schemas ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: str


class UpdateUserRequest(BaseModel):
    full_name: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class UserProfileUpdated(BaseModel):
    id: int
    email: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Tag schemas ───────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str
    color: str = "#f5a623"


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class TagOut(BaseModel):
    id: int
    name: str
    color: str


# ── Recipe CRUD schemas ────────────────────────────────────────────────────

class SaveIngredientInput(BaseModel):
    name: str
    quantity: float
    unit: str
    preparation: str | None = None
    original_text: str
    fdc_id: int | None = None
    matched_description: str | None = None
    gram_weight: float | None = None


class SaveNutrientInput(BaseModel):
    name: str
    amount: float
    unit: str
    daily_value_percent: float | None = None
    display_value: str | None = None


RECIPE_NOTES_MAX_LENGTH = 2000


class SaveRecipeRequest(BaseModel):
    recipe_name: str
    raw_text: str
    servings: int
    serving_size: str
    ingredients: list[SaveIngredientInput]
    nutrients: list[SaveNutrientInput]
    allergens: list[str] = []
    notes: str | None = None
    image_data_url: str | None = None

    @field_validator("notes")
    @classmethod
    def notes_max_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > RECIPE_NOTES_MAX_LENGTH:
            raise ValueError(
                f"Notes must be {RECIPE_NOTES_MAX_LENGTH} characters or fewer"
            )
        return v


class UpdateRecipeRequest(BaseModel):
    recipe_name: str | None = None
    raw_text: str | None = None
    servings: int | None = None
    serving_size: str | None = None
    ingredients: list[SaveIngredientInput] | None = None
    nutrients: list[SaveNutrientInput] | None = None
    allergens: list[str] | None = None
    notes: str | None = None
    image_data_url: str | None = None

    @field_validator("notes")
    @classmethod
    def notes_max_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > RECIPE_NOTES_MAX_LENGTH:
            raise ValueError(
                f"Notes must be {RECIPE_NOTES_MAX_LENGTH} characters or fewer"
            )
        return v


class RecipeIngredientOut(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    preparation: str | None = None
    original_text: str
    fdc_id: int | None = None
    matched_description: str | None = None
    gram_weight: float | None = None
    sort_order: int


class RecipeNutrientOut(BaseModel):
    id: int
    nutrient_name: str
    amount: float
    unit: str
    daily_value_percent: float | None = None
    display_value: str | None = None


class RecipeSummary(BaseModel):
    id: int
    recipe_name: str
    servings: int
    serving_size: str
    created_at: str
    updated_at: str
    tags: list[TagOut] = []
    image_data_url: str | None = None


class RecipeDetail(BaseModel):
    id: int
    recipe_name: str
    raw_text: str
    servings: int
    serving_size: str
    ingredients: list[RecipeIngredientOut]
    nutrients: list[RecipeNutrientOut]
    allergens: list[str] = []
    created_at: str
    updated_at: str
    tags: list[TagOut] = []
    notes: str | None = None
    image_data_url: str | None = None


# ── Label export schemas ──────────────────────────────────────────────────

class LabelFormat(str, Enum):
    vertical = "vertical"
    tabular = "tabular"
    linear = "linear"
    dual_column = "dual_column"


class LabelExportRequest(BaseModel):
    format: LabelFormat
    width_inches: float = 2.75
    height_inches: float = 5.0
    recipe_name: str
    servings: int
    serving_size: str
    nutrients: list[NutrientValue]
    allergens: list[str] = []
    show_allergens: bool = False
    allergen_text: str = ""
    show_ingredients: bool = False
    ingredient_list_text: str = ""
