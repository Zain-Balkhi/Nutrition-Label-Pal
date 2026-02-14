from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    USDA_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./nutrition_pal.db"

    USDA_BASE_URL: str = "https://api.nal.usda.gov/fdc/v1"

    # USDA nutrient ID mapping
    NUTRIENT_IDS: dict[str, int] = {
        "energy": 1008,
        "protein": 1003,
        "total_fat": 1004,
        "carbohydrate": 1005,
        "fiber": 1079,
        "total_sugars": 2000,
        "saturated_fat": 1258,
        "trans_fat": 1257,
        "cholesterol": 1253,
        "sodium": 1093,
        "vitamin_d": 1114,
        "calcium": 1087,
        "iron": 1089,
        "potassium": 1092,
    }

    # FDA Daily Reference Values
    FDA_DAILY_VALUES: dict[str, float] = {
        "total_fat": 78.0,       # g
        "saturated_fat": 20.0,   # g
        "cholesterol": 300.0,    # mg
        "sodium": 2300.0,        # mg
        "carbohydrate": 275.0,   # g
        "fiber": 28.0,           # g
        "protein": 50.0,         # g
        "vitamin_d": 20.0,       # mcg
        "calcium": 1300.0,       # mg
        "iron": 18.0,            # mg
        "potassium": 4700.0,     # mg
    }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
