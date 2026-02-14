from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, recipes, labels
from app.database import init_db

app = FastAPI(
    title="Nutrition Label Pal",
    description="Generate FDA-compliant nutrition labels from recipes",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(labels.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    init_db()
