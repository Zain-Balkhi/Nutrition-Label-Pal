from pydantic import BaseModel


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
