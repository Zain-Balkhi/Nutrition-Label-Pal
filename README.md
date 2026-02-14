# Nutrition Label Pal

A web application that helps small food businesses generate FDA-compliant nutrition labels from recipes. Input a raw recipe, get parsed ingredients matched against the USDA FoodData Central database, and receive per-serving nutrition data with FDA-standard rounding.

## Project Structure

```
Nutrition-Label-Pal/
├── backend/                  # FastAPI server
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router mounting
│   │   ├── config.py         # Environment variables, FDA constants
│   │   ├── database.py       # SQLAlchemy models & CRUD helpers
│   │   ├── models/           # Pydantic request/response schemas
│   │   ├── routers/          # API endpoints (health, recipes, labels)
│   │   ├── services/         # Business logic (USDA, LLM, calculator)
│   │   └── utils/            # Unit conversion, FDA rounding rules
│   ├── tests/                # pytest test suite (68+ tests)
│   │   ├── test_unit_converter.py
│   │   ├── test_fda_rounding.py
│   │   ├── test_llm_service.py
│   │   ├── test_calculator.py
│   │   ├── test_database.py
│   │   ├── test_api.py
│   │   └── test_recipes/     # Sample recipe text files
│   ├── show_db.py            # CLI tool to inspect saved recipes & labels
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx           # Main app with 3-step flow
│   │   ├── components/       # RecipeInput, IngredientReview, NutritionDisplay
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System architecture & data flow
│   ├── LOCAL_SETUP.md        # Development environment setup
│   ├── API_KEYS.md           # API key configuration
│   ├── DATABASE_SCHEMA.md    # Database schema reference
│   └── ACCOUNTS.md           # Account system design (Phase 3)
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
6. **Save** — Labels are automatically saved to the database for later retrieval

Ingredients that can't be found in the USDA database are reported as "skipped" in the output so you know exactly what's missing from the totals.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/parse-recipe` | Parse raw recipe text and return USDA-matched ingredients |
| POST | `/api/calculate-nutrition` | Calculate per-serving nutrition from confirmed ingredients |
| GET | `/api/labels` | List all saved nutrition labels |
| GET | `/api/labels/{id}` | Retrieve a saved nutrition label by ID |
| DELETE | `/api/labels/{id}` | Delete a saved nutrition label |

## Database

SQLite is used for local development (auto-created at `backend/nutrition_pal.db`). PostgreSQL is supported for production (e.g. Supabase). See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).

Inspect saved recipes from the command line:

```bash
cd backend
python show_db.py        # show all recipes
python show_db.py 2      # show only recipe #2
```

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

68+ tests covering unit conversion, FDA rounding rules, LLM parsing (mocked), nutrition calculation, database CRUD, and API endpoints.

## Tech Stack

- **Backend:** FastAPI + Uvicorn + SQLAlchemy
- **Frontend:** React 18 + TypeScript + Vite
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **LLM:** OpenAI GPT-4o-mini
- **Nutrition Data:** USDA FoodData Central API
- **Testing:** pytest + pytest-asyncio
