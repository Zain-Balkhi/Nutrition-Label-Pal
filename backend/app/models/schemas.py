from pydantic import BaseModel, EmailStr, field_validator


class RawRecipeInput(BaseModel):
    raw_text: str
    servings: int | None = None
    serving_size: str | None = None


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


class NutritionResult(BaseModel):
    recipe_name: str
    servings: int
    serving_size: str
    nutrients: list[NutrientValue]
    skipped_ingredients: list[SkippedIngredient] = []


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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
