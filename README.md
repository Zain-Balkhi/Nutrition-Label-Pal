# Nutrition Label Pal

A web application that helps small food businesses generate FDA-compliant nutrition labels from recipes. Input a raw recipe, get parsed ingredients matched against the USDA FoodData Central database, and receive per-serving nutrition data with FDA-standard rounding.

## Project Structure

```
Nutrition-Label-Pal/
├── backend/              # FastAPI server
│   ├── app/
│   │   ├── main.py       # FastAPI app, CORS, router mounting
│   │   ├── config.py     # Environment variables, FDA constants
│   │   ├── models/       # Pydantic request/response schemas
│   │   ├── routers/      # API endpoints (health, recipes)
│   │   ├── services/     # Business logic (USDA, LLM, calculator)
│   │   └── utils/        # Unit conversion, FDA rounding rules
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx       # Main app with 3-step flow
│   │   ├── components/   # RecipeInput, IngredientReview, NutritionDisplay
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
├── docs/                 # Documentation
│   ├── LOCAL_SETUP.md
│   ├── API_KEYS.md
│   ├── DATABASE_SCHEMA.md
│   └── ACCOUNTS.md
└── README.md
```

## Quick Start

See [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for full setup instructions.

```bash
# Backend (Terminal 1)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your API keys
uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## API Keys Required

- **USDA FoodData Central** — free, sign up at https://fdc.nal.usda.gov/api-key-signup.html
- **OpenAI** — for recipe parsing with GPT-4o-mini, see https://platform.openai.com

See [docs/API_KEYS.md](docs/API_KEYS.md) for detailed instructions.

## How It Works

1. **Input** — Paste recipe ingredients as free-form text
2. **Parse** — GPT-4o-mini extracts structured ingredients (name, quantity, unit)
3. **Match** — Each ingredient is matched to USDA FoodData Central entries
4. **Review** — Verify or change USDA matches for each ingredient
5. **Calculate** — Per-serving nutrition data with FDA 21 CFR 101.9 rounding

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/parse-recipe` | Parse raw recipe text and return USDA-matched ingredients |
| POST | `/api/calculate-nutrition` | Calculate per-serving nutrition from confirmed ingredients |

## Tech Stack

- **Backend:** FastAPI + Uvicorn
- **Frontend:** React 18 + TypeScript + Vite
- **LLM:** OpenAI GPT-4o-mini
- **Nutrition Data:** USDA FoodData Central API
