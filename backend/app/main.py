import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, health, label_export, labels, recipes, tags, user_recipes, users
from app.database import init_db

settings = get_settings()

if settings.ENVIRONMENT == "production" and settings.SECRET_KEY == "change-me-in-production":
    raise RuntimeError("SECRET_KEY must be set in production — never use the default value")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app = FastAPI(
    title="Nutrition Label Pal",
    description="Generate FDA-compliant nutrition labels from recipes",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("CORS origins: %s", origins)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(labels.router, prefix="/api")
app.include_router(label_export.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(tags._recipe_tag_router, prefix="/api")
app.include_router(user_recipes.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    init_db()
