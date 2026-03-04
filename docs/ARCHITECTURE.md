# Architecture & Data Flow

This document describes the system architecture, data flow, and key design decisions for Nutrition Label Pal.

## System Overview

```
┌──────────────────┐       ┌──────────────────────────────────────┐
│   React + Vite   │──────▶│  FastAPI Backend (port 8000)         │
│   (port 5173)    │◀──────│                                      │
│                  │ /api/* │  ┌────────────┐  ┌───────────────┐  │
│  RecipeInput     │───────▶│  │  Routers   │  │  Services     │  │
│  IngredientReview│       │  │  - health   │  │  - llm_service│  │
│  NutritionDisplay│◀──────│  │  - recipes  │  │  - usda_svc   │  │
│                  │       │  │  - labels   │  │  - calculator  │  │
└──────────────────┘       │  └────────────┘  └───────────────┘  │
                           │         │                │           │
                           │  ┌──────▼──────┐  ┌──────▼────────┐ │
                           │  │  SQLite DB  │  │  External APIs │ │
                           │  │  (SQLAlchemy)│  │  - OpenAI     │ │
                           │  └─────────────┘  │  - USDA FDC   │ │
                           │                   └───────────────┘ │
                           └──────────────────────────────────────┘
```

## Data Flow — Recipe to Nutrition Label

### Step 1: Parse Recipe

```
User pastes raw text ──▶ POST /api/parse-recipe
                              │
                              ▼
                         LLM Service (GPT-4o-mini)
                         Extracts: recipe_name, servings,
                         serving_size, ingredients[]
                              │
                              ▼
                         USDA Service (search_food)
                         Matches each ingredient name
                         to top 5 USDA FDC entries
                              │
                              ▼
                         Response: ParseRecipeResponse
                         {recipe_name, servings, serving_size,
                          ingredients: [{parsed, status, matches[], selected_fdc_id}]}
```

### Step 2: Review Ingredients

The frontend shows a table of parsed ingredients with their USDA matches. The user can change the selected match via dropdown before proceeding.

### Step 3: Calculate Nutrition

```
User clicks "Calculate" ──▶ POST /api/calculate-nutrition
                                  │
                                  ▼
                             For each ingredient:
                               1. Fetch USDA food details (fdc_id)
                               2. Extract nutrients per 100g
                               3. Convert quantity+unit to grams
                               4. Scale nutrients by gram weight
                                  │
                             If USDA lookup fails (404):
                               → Add to skipped_ingredients list
                                  │
                                  ▼
                             Divide totals by servings
                             Apply FDA 21 CFR 101.9 rounding
                             Compute % Daily Value
                                  │
                                  ▼
                             Auto-save to SQLite database
                                  │
                                  ▼
                             Response: NutritionResult
                             {recipe_name, servings, serving_size,
                              nutrients: [{name, amount, unit, daily_value_percent}],
                              skipped_ingredients: [{name, original_text, reason}]}
```

## Key Components

### Backend

| Component | File | Purpose |
|-----------|------|---------|
| FastAPI app | `app/main.py` | App init, CORS, router mounting, DB init on startup |
| Configuration | `app/config.py` | Pydantic Settings (.env), USDA nutrient ID mapping, FDA daily values |
| Database | `app/database.py` | SQLAlchemy models (RecipeRow, IngredientRow, USDANutritionCache), CRUD functions |
| Schemas | `app/models/schemas.py` | Pydantic models for all request/response payloads |
| Health router | `app/routers/health.py` | `GET /api/health` |
| Recipes router | `app/routers/recipes.py` | `POST /api/parse-recipe`, `POST /api/calculate-nutrition` |
| Labels router | `app/routers/labels.py` | `GET /api/labels`, `GET /api/labels/{id}`, `DELETE /api/labels/{id}` |
| LLM Service | `app/services/llm_service.py` | OpenAI GPT-4o-mini recipe parsing with structured JSON output |
| USDA Service | `app/services/usda_service.py` | Async HTTP client for USDA FoodData Central API |
| Calculator | `app/services/calculator.py` | Nutrient accumulation, FDA rounding, %DV computation, skipped ingredient tracking |
| Unit Converter | `app/utils/unit_converter.py` | Converts qty+unit to grams using USDA portions or fallback densities |
| FDA Rounding | `app/utils/fda_rounding.py` | 21 CFR 101.9 rounding rules for all nutrient types |

### Frontend

| Component | File | Purpose |
|-----------|------|---------|
| App shell | `src/App.tsx` | 3-step flow state machine (input → review → results) |
| Recipe Input | `src/components/RecipeInput.tsx` | Text area for raw recipe + servings/serving size fields |
| Ingredient Review | `src/components/IngredientReview.tsx` | Table showing parsed ingredients with USDA match dropdowns |
| Nutrition Display | `src/components/NutritionDisplay.tsx` | Nutrition label JSON + skipped ingredient warnings |
| API client | `src/services/api.ts` | `parseRecipe()` and `calculateNutrition()` fetch wrappers |
| Type defs | `src/types/index.ts` | TypeScript interfaces matching backend Pydantic schemas |
| Vite config | `vite.config.ts` | Dev server proxy: `/api/*` → `localhost:8000` |

## FDA Compliance — Rounding Rules

The calculator applies FDA 21 CFR 101.9 rounding rules:

| Nutrient | Rule |
|----------|------|
| Calories | <5 → 0; 5–50 → nearest 5; >50 → nearest 10 |
| Fat (total, sat, trans) | <0.5g → 0; 0.5–5g → nearest 0.5g; >5g → nearest 1g |
| Cholesterol | <2mg → 0; 2–5mg → "less than 5mg"; >5mg → nearest 5mg |
| Sodium | <5mg → 0; 5–140mg → nearest 5mg; >140mg → nearest 10mg |
| Carbs, fiber, sugars, protein | <0.5g → 0; 0.5–1g → "less than 1g"; >1g → nearest 1g |
| % Daily Value | Rounded to nearest integer |

## 14 Tracked Nutrients

| Key | Display Name | Unit | Has %DV |
|-----|-------------|------|---------|
| energy | Calories | kcal | No |
| total_fat | Total Fat | g | Yes (78g) |
| saturated_fat | Saturated Fat | g | Yes (20g) |
| trans_fat | Trans Fat | g | No |
| cholesterol | Cholesterol | mg | Yes (300mg) |
| sodium | Sodium | mg | Yes (2300mg) |
| carbohydrate | Total Carbohydrate | g | Yes (275g) |
| fiber | Dietary Fiber | g | Yes (28g) |
| total_sugars | Total Sugars | g | No |
| protein | Protein | g | Yes (50g) |
| vitamin_d | Vitamin D | mcg | Yes (20mcg) |
| calcium | Calcium | mg | Yes (1300mg) |
| iron | Iron | mg | Yes (18mg) |
| potassium | Potassium | mg | Yes (4700mg) |

## Skipped Ingredients

When an ingredient cannot be resolved, it is **not** silently dropped. Instead, it is tracked and returned in the `skipped_ingredients` array with a reason:

- `"No USDA match found"` — no `selected_fdc_id` was set
- `"USDA lookup failed (HTTP 404)"` — the FDC ID was not accessible via the USDA detail endpoint

The frontend displays these in a warning box so the user knows exactly which ingredients are missing from the nutrition totals.

## Test Suite

68+ tests across 6 files, all using mocks (no API keys or network needed):

| File | Tests | Scope |
|------|-------|-------|
| `test_unit_converter.py` | 17 | Weight, volume, count, unknown unit conversions |
| `test_fda_rounding.py` | 22 | All FDA rounding rule edge cases |
| `test_llm_service.py` | 5 | GPT parsing with mocked OpenAI client |
| `test_calculator.py` | 12 | Nutrient extraction, rounding, calculation, skipping |
| `test_database.py` | 8 | Save, retrieve, list, delete, cascade |
| `test_api.py` | 7 | Health, parse-recipe, labels CRUD endpoints |

Run with:
```bash
cd backend
python -m pytest tests/ -v
```
