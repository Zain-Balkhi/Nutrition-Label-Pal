# Software Architecture Diagram — Nutrition Label Pal

> **CIS4914 Senior Design — Presentation 1 (Feb 15, 2026)**
> This document is structured as a blueprint for visual diagrams (draw.io, Figma, slides). Each major section maps to one presentation slide.

---

## 1. High-Level System Diagram

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                         USER'S BROWSER                             │
 │   React 18 + TypeScript + Vite (Single-Page Application)          │
 └──────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS
                                ▼
 ┌──────────────┐      ┌───────────────────────────────────────────────┐
 │   Vercel     │      │            Railway                           │
 │  (Frontend   │─────▶│     FastAPI + Uvicorn (Python 3.11+)        │
 │   Hosting)   │ API  │                                              │
 │              │◀─────│  ┌──────────┐  ┌──────────────────────────┐  │
 │  Static SPA  │ JSON │  │ Routers  │  │ Services                 │  │
 │  build files │      │  │ /health  │  │ llm_service (OpenAI)     │  │
 └──────────────┘      │  │ /recipes │  │ usda_service (USDA API)  │  │
                       │  │ /labels  │  │ calculator (FDA rounding)│  │
                       │  └────┬─────┘  │ label_generator (PDF)    │  │
                       │       │        └──────────┬───────────────┘  │
                       │       │                   │                  │
                       │  ┌────▼────────────┐  ┌───▼────────────────┐ │
                       │  │ Supabase-hosted │  │  External APIs     │ │
                       │  │ PostgreSQL      │  │  ┌──────────────┐  │ │
                       │  │                 │  │  │ OpenAI API   │  │ │
                       │  │ users           │  │  │ GPT-4o-mini  │  │ │
                       │  │ recipes         │  │  └──────────────┘  │ │
                       │  │ recipe_         │  │  ┌──────────────┐  │ │
                       │  │  ingredients    │  │  │ USDA FDC API │  │ │
                       │  │ usda_nutrition_ │  │  │ FoodData     │  │ │
                       │  │  cache          │  │  │ Central      │  │ │
                       │  └─────────────────┘  │  └──────────────┘  │ │
                       │                       └────────────────────┘ │
                       └───────────────────────────────────────────────┘
```

### Component Summary

| Component | Technology | Hosting | Purpose |
|-----------|-----------|---------|---------|
| Frontend | React 18 + TypeScript + Vite | **Vercel** | Static SPA — recipe input, ingredient review, label display |
| Backend | FastAPI 0.109 + Uvicorn | **Railway** | REST API — parsing, calculation, CRUD, PDF generation |
| Database | PostgreSQL (SQLAlchemy 2.0) | **Supabase** | Persistent storage — users, recipes, ingredients, USDA cache |
| LLM | OpenAI GPT-4o-mini | **OpenAI API** | Recipe text parsing into structured ingredients |
| Nutrition Data | USDA FoodData Central | **USDA API** | Nutrient lookup per ingredient (per 100g) |
| PDF Generation | ReportLab | **Railway** (in-process) | FDA-formatted nutrition label PDF/PNG export |

---

## 2. Detailed Data Flows

### 2a. Recipe Input → Nutrition Label (Core Flow)

This is the primary user journey and the MVP flow.

```
┌──────────┐     ┌───────────────────────────────────────────────────────────┐
│  USER    │     │                    BACKEND (Railway)                      │
│ BROWSER  │     │                                                           │
└────┬─────┘     └───────────────────────────────────────────────────────────┘
     │
     │  1. User pastes raw recipe text
     │     (e.g. "2 cups flour, 1 cup sugar, 3 eggs...")
     │
     │  POST /api/parse-recipe
     │  {raw_text, servings?, serving_size?}
     │─────────────────────────────────────────────────────────────────▶│
     │                                                                  │
     │                           2. LLM Service calls OpenAI GPT-4o-mini
     │                              Extracts: recipe_name, servings,
     │                              serving_size, ingredients[]
     │                              (name, quantity, unit, preparation)
     │                                                                  │
     │                           3. USDA Service searches FoodData Central
     │                              For each ingredient → top 5 matches
     │                              Returns: fdc_id, description, score
     │                                                                  │
     │  ◀─────────────────────────────────────────────────────────────  │
     │  ParseRecipeResponse
     │  {recipe_name, servings, serving_size,
     │   ingredients: [{parsed, status, matches[], selected_fdc_id}]}
     │
     │  4. User reviews parsed ingredients
     │     Can change USDA match via dropdown
     │     Can adjust servings/serving size
     │
     │  POST /api/calculate-nutrition
     │  {ingredients[], servings, serving_size, recipe_name}
     │─────────────────────────────────────────────────────────────────▶│
     │                                                                  │
     │                           5. For each ingredient:
     │                              a. Fetch USDA food details (fdc_id)
     │                              b. Extract nutrients per 100g
     │                              c. Convert quantity+unit → grams
     │                              d. Scale nutrients by gram weight
     │                                                                  │
     │                           6. If USDA lookup fails (404):
     │                              → Add to skipped_ingredients
     │                                                                  │
     │                           7. Divide totals by servings
     │                              Apply FDA 21 CFR 101.9 rounding
     │                              Compute % Daily Values
     │                                                                  │
     │                           8. Auto-save to database
     │                                                                  │
     │  ◀─────────────────────────────────────────────────────────────  │
     │  NutritionResult
     │  {recipe_name, servings, serving_size,
     │   nutrients: [{name, amount, unit, daily_value_percent}],
     │   skipped_ingredients: [{name, original_text, reason}]}
     │
     │  9. Frontend displays nutrition data
     │     + skipped ingredient warnings
     │
```

### 2b. User Registration & Login (Phase 3 — Planned)

```
  REGISTER                                LOGIN
  ────────                                ─────
  User submits                            User submits
  {email, password, name}                 {email, password}
       │                                       │
       ▼                                       ▼
  POST /api/auth/register              POST /api/auth/login
       │                                       │
       ▼                                       ▼
  Validate input                        Lookup user by email
  Hash password (bcrypt, 12 rounds)     Verify password vs bcrypt hash
  Insert into users table                      │
       │                                       ▼
       ▼                                 On success:
  Generate JWT (HS256, 24h expiry)       Generate JWT (HS256, 24h expiry)
  Payload: {sub: user_id,               Return token
            email, exp}                  On failure:
       │                                 Return "invalid credentials"
       ▼
  Return JWT token

  TOKEN USAGE
  ───────────
  Authorization: Bearer <token>  (development)
  httpOnly secure cookie         (production)
```

### 2c. Recipe CRUD (Phase 3 — Planned)

```
  All /api/recipes/* endpoints require valid JWT

  LIST       GET /api/recipes              → user's saved recipes (summary)
  CREATE     POST /api/recipes             → save new recipe + label
  READ       GET /api/recipes/:id          → full recipe details + label
  UPDATE     PUT /api/recipes/:id          → modify recipe, recalculate
  DELETE     DELETE /api/recipes/:id        → remove recipe + cascade ingredients
```

### 2d. Label Generation (Phase 3 — Planned)

```
  User clicks "Download PDF"
       │
       ▼
  GET /api/labels/:id/pdf
       │
       ▼
  label_generator.py (ReportLab)
  Renders FDA-formatted nutrition label
  Returns PDF binary stream
       │
       ▼
  Browser downloads PDF file
```

---

## 3. Component Breakdown

### 3a. Frontend — Vercel (React + TypeScript + Vite)

```
frontend/
├── src/
│   ├── App.tsx                    ← 3-step state machine
│   │                                (input → review → results)
│   ├── components/
│   │   ├── RecipeInput.tsx        ← Raw recipe text + servings fields
│   │   ├── IngredientReview.tsx   ← Parsed ingredients + USDA match dropdowns
│   │   └── NutritionDisplay.tsx   ← Nutrition data display + skipped warnings
│   ├── services/
│   │   └── api.ts                 ← parseRecipe(), calculateNutrition() wrappers
│   └── types/
│       └── index.ts               ← TypeScript interfaces (mirrors backend schemas)
├── vite.config.ts                 ← Dev proxy: /api/* → localhost:8000
└── package.json
```

**Key Details:**
- Static SPA build deployed to Vercel
- In development: Vite dev server proxies `/api/*` to `http://localhost:8000`
- In production: Vercel rewrites `/api/*` to Railway backend URL

### 3b. Backend — Railway (FastAPI + Uvicorn)

```
backend/
├── app/
│   ├── main.py                    ← FastAPI app, CORS middleware, router mounting
│   ├── config.py                  ← pydantic-settings (.env), USDA nutrient IDs,
│   │                                FDA daily values
│   ├── database.py                ← SQLAlchemy models + CRUD helpers
│   ├── models/
│   │   └── schemas.py             ← Pydantic request/response models
│   ├── routers/
│   │   ├── health.py              ← GET /api/health
│   │   ├── recipes.py             ← POST /api/parse-recipe
│   │   │                            POST /api/calculate-nutrition
│   │   └── labels.py              ← GET/DELETE /api/labels, GET /api/labels/:id
│   ├── services/
│   │   ├── llm_service.py         ← OpenAI GPT-4o-mini recipe parsing
│   │   ├── usda_service.py        ← Async USDA FoodData Central client (httpx)
│   │   ├── calculator.py          ← Nutrient aggregation + FDA rounding + %DV
│   │   └── label_generator.py     ← [Phase 3] ReportLab PDF generation
│   └── utils/
│       ├── unit_converter.py      ← Recipe units → grams (USDA portions/densities)
│       └── fda_rounding.py        ← FDA 21 CFR 101.9 rounding rules
├── tests/                         ← 68+ tests (all mocked, no API keys needed)
├── requirements.txt
└── .env                           ← USDA_API_KEY, OPENAI_API_KEY, DATABASE_URL
```

**Environment Variables:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `USDA_API_KEY` | Yes | USDA FoodData Central API access |
| `OPENAI_API_KEY` | Yes | OpenAI GPT-4o-mini for recipe parsing |
| `DATABASE_URL` | No | Default: `sqlite:///./nutrition_pal.db`; production: Supabase PostgreSQL connection string |

### 3c. Database — Supabase-Hosted PostgreSQL

Supabase is used **purely as a managed PostgreSQL database** — we are not using Supabase Auth, Edge Functions, Realtime, or any other BaaS features. In diagrams, present this as "Supabase-hosted PostgreSQL."

- **Local development:** SQLite (`nutrition_pal.db`)
- **Production:** PostgreSQL via Supabase (set `DATABASE_URL` in Railway env)
- **ORM:** SQLAlchemy 2.0 with `DeclarativeBase`
- **Migrations:** Alembic (Phase 3 — needed for SQLite → PostgreSQL migration)

### 3d. External APIs

| API | Endpoint | Auth | Purpose |
|-----|----------|------|---------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | Bearer token (`OPENAI_API_KEY`) | GPT-4o-mini parses raw recipe text into structured JSON |
| USDA FoodData Central | `https://api.nal.usda.gov/fdc/v1` | Query param (`api_key`) | Search foods + fetch nutrient details per `fdc_id` |

---

## 4. Infrastructure / Deployment Diagram

```
                    ┌──────────────┐
                    │   User's     │
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTPS
                           ▼
                    ┌──────────────┐
                    │   Vercel     │
                    │   (CDN)      │
                    │              │
                    │ Static React │
                    │ SPA bundle   │
                    └──────┬───────┘
                           │ HTTPS (/api/* rewrite)
                           ▼
                    ┌──────────────┐       ┌──────────────────┐
                    │   Railway    │──────▶│  OpenAI API      │
                    │              │ HTTPS │  GPT-4o-mini     │
                    │  FastAPI +   │       └──────────────────┘
                    │  Uvicorn     │
                    │              │       ┌──────────────────┐
                    │  Python      │──────▶│  USDA FDC API    │
                    │  3.11+       │ HTTPS │  api.nal.usda.gov│
                    │              │       └──────────────────┘
                    └──────┬───────┘
                           │ PostgreSQL connection
                           │ (SSL)
                           ▼
                    ┌──────────────┐
                    │  Supabase    │
                    │  PostgreSQL  │
                    │              │
                    │  users       │
                    │  recipes     │
                    │  recipe_     │
                    │   ingredients│
                    │  usda_cache  │
                    └──────────────┘
```

**Network Flow Summary:**
1. Browser loads static SPA from **Vercel CDN**
2. SPA makes API calls to `/api/*` — Vercel rewrites these to **Railway**
3. Railway backend calls **OpenAI API** for recipe parsing (HTTPS)
4. Railway backend calls **USDA FDC API** for nutrition data (HTTPS)
5. Railway backend reads/writes to **Supabase PostgreSQL** (SSL connection)
6. All inter-service communication is over HTTPS/SSL

---

## 5. Database Entity-Relationship Diagram

### Current Schema (Phase 2 — Implemented)

```
┌─────────────────────────┐       ┌─────────────────────────────┐
│        recipes           │       │     recipe_ingredients       │
├─────────────────────────┤       ├─────────────────────────────┤
│ id          PK  INTEGER │──┐    │ id           PK  INTEGER    │
│ recipe_name     VARCHAR │  │    │ recipe_id    FK  INTEGER    │◀─┐
│ raw_text        TEXT    │  │    │ name             VARCHAR    │  │
│ servings        INTEGER │  └───▶│ quantity         FLOAT      │  │
│ serving_size    VARCHAR │  1:N  │ unit             VARCHAR    │  │
│ label_json      TEXT    │       │ preparation      VARCHAR    │  │
│ created_at      DATETIME│       │ original_text    TEXT       │  │
│ updated_at      DATETIME│       │ fdc_id           INTEGER    │  │
└─────────────────────────┘       │ matched_desc     VARCHAR    │  │
                                  │ gram_weight      FLOAT      │  │
                                  │ sort_order       INTEGER    │  │
                                  └─────────────────────────────┘  │
                                           CASCADE DELETE ─────────┘

┌─────────────────────────────┐
│    usda_nutrition_cache      │  (standalone, keyed by fdc_id)
├─────────────────────────────┤
│ fdc_id       PK  INTEGER    │
│ description      VARCHAR    │
│ data_type        VARCHAR    │
│ nutrients_json   TEXT       │
│ fetched_at       DATETIME   │
└─────────────────────────────┘
```

### Phase 3 Schema — With Users

```
┌─────────────────────────┐       ┌─────────────────────────┐
│         users            │       │        recipes           │
├─────────────────────────┤       ├─────────────────────────┤
│ id          PK  INTEGER │──┐    │ id          PK  INTEGER │──┐
│ email       UQ  VARCHAR │  │    │ user_id     FK  INTEGER │  │
│ password_hash   VARCHAR │  └───▶│ recipe_name     VARCHAR │  │
│ name            VARCHAR │  1:N  │ raw_text        TEXT    │  │
│ created_at      DATETIME│       │ servings        INTEGER │  │
│ updated_at      DATETIME│       │ serving_size    VARCHAR │  │
└─────────────────────────┘       │ label_json      TEXT    │  │
                                  │ created_at      DATETIME│  │
                                  │ updated_at      DATETIME│  │
                                  └─────────────────────────┘  │
                                                               │ 1:N
                                  ┌─────────────────────────────┤
                                  │     recipe_ingredients       │
                                  ├─────────────────────────────┤
                                  │ id           PK  INTEGER    │
                                  │ recipe_id    FK  INTEGER    │
                                  │ name             VARCHAR    │
                                  │ quantity         FLOAT      │
                                  │ unit             VARCHAR    │
                                  │ preparation      VARCHAR    │
                                  │ original_text    TEXT       │
                                  │ fdc_id           INTEGER    │
                                  │ matched_desc     VARCHAR    │
                                  │ gram_weight      FLOAT      │
                                  │ sort_order       INTEGER    │
                                  └─────────────────────────────┘

  users 1──* recipes 1──* recipe_ingredients
  usda_nutrition_cache (standalone)
```

---

## 6. Security Architecture

### Authentication Flow (Phase 3 — Planned)

```
  ┌────────┐                        ┌──────────┐                ┌──────────┐
  │ Client │                        │ FastAPI  │                │ Supabase │
  │ (SPA)  │                        │ (Railway)│                │ PostgreSQL│
  └───┬────┘                        └────┬─────┘                └────┬─────┘
      │                                  │                           │
      │  POST /api/auth/register         │                           │
      │  {email, password, name}         │                           │
      │─────────────────────────────────▶│                           │
      │                                  │  Validate input           │
      │                                  │  Hash pw (bcrypt 12 rnd)  │
      │                                  │  INSERT INTO users        │
      │                                  │──────────────────────────▶│
      │                                  │◀──────────────────────────│
      │                                  │  Generate JWT (HS256)     │
      │  ◀───────────────────────────────│  {sub, email, exp: 24h}  │
      │  {token}                         │                           │
      │                                  │                           │
      │  GET /api/recipes                │                           │
      │  Authorization: Bearer <token>   │                           │
      │─────────────────────────────────▶│                           │
      │                                  │  Decode & verify JWT      │
      │                                  │  Extract user_id from sub │
      │                                  │  SELECT WHERE user_id=... │
      │                                  │──────────────────────────▶│
      │                                  │◀──────────────────────────│
      │  ◀───────────────────────────────│                           │
      │  {recipes: [...]}                │                           │
```

**Key Security Decisions:**

| Decision | Detail |
|----------|--------|
| Auth method | Custom JWT (not Supabase Auth) — per class project requirements |
| Password hashing | bcrypt with 12 rounds (`passlib`) |
| Token signing | HS256 via `python-jose` |
| Token expiry | 24 hours |
| Token transport (dev) | `Authorization: Bearer <token>` header |
| Token transport (prod) | httpOnly secure cookie |
| Protected routes | All `/api/recipes/*` endpoints |
| Public routes | `/api/health`, `/api/parse-recipe`, `/api/calculate-nutrition` |

---

## 7. API Endpoint Map

| Method | Endpoint | Auth | Description | Phase |
|--------|----------|------|-------------|-------|
| GET | `/api/health` | None | Health check | 2 (done) |
| POST | `/api/parse-recipe` | None* | Parse raw recipe text via GPT-4o-mini + USDA match | 2 (done) |
| POST | `/api/calculate-nutrition` | None* | Calculate per-serving nutrition with FDA rounding | 2 (done) |
| GET | `/api/labels` | None | List saved labels | 2 (done) |
| GET | `/api/labels/:id` | None | Get saved label by ID | 2 (done) |
| DELETE | `/api/labels/:id` | None | Delete saved label | 2 (done) |
| POST | `/api/auth/register` | None | Create user account | 3 (planned) |
| POST | `/api/auth/login` | None | Login, receive JWT | 3 (planned) |
| GET | `/api/recipes` | JWT | List user's recipes | 3 (planned) |
| POST | `/api/recipes` | JWT | Save recipe | 3 (planned) |
| GET | `/api/recipes/:id` | JWT | Get recipe details | 3 (planned) |
| PUT | `/api/recipes/:id` | JWT | Update recipe | 3 (planned) |
| DELETE | `/api/recipes/:id` | JWT | Delete recipe | 3 (planned) |
| GET | `/api/labels/:id/pdf` | None | Download FDA-formatted PDF label | 3 (planned) |

*\*Will require auth + rate limiting before production deployment.*

---

## 8. 14 Tracked Nutrients (FDA Compliance)

| Key | Display Name | Unit | Daily Value | USDA Nutrient ID |
|-----|-------------|------|-------------|------------------|
| energy | Calories | kcal | — | 1008 |
| total_fat | Total Fat | g | 78g | 1004 |
| saturated_fat | Saturated Fat | g | 20g | 1258 |
| trans_fat | Trans Fat | g | — | 1257 |
| cholesterol | Cholesterol | mg | 300mg | 1253 |
| sodium | Sodium | mg | 2300mg | 1093 |
| carbohydrate | Total Carbohydrate | g | 275g | 1005 |
| fiber | Dietary Fiber | g | 28g | 1079 |
| total_sugars | Total Sugars | g | — | 2000 |
| protein | Protein | g | 50g | 1003 |
| vitamin_d | Vitamin D | mcg | 20mcg | 1114 |
| calcium | Calcium | mg | 1300mg | 1087 |
| iron | Iron | mg | 18mg | 1089 |
| potassium | Potassium | mg | 4700mg | 1092 |

---

## 9. Architecture Decisions & Trade-offs

### Current Limitations (Phase 2)

| # | Issue | Risk | Recommended Fix | Phase |
|---|-------|------|-----------------|-------|
| 1 | **Public endpoints cost money** — `parse-recipe` calls OpenAI on every request with no auth | Unbounded API spend if exposed publicly | Add JWT auth + per-user rate limiting before deploying to production | 3 |
| 2 | **Input validation** — No pre-check that input is actually a recipe | Prompt injection; wasted OpenAI credits on gibberish | Add a lightweight pre-check LLM call (or regex heuristic) to validate input before full parse | 3 |
| 3 | **SQLite → PostgreSQL migration** — No migration tooling | Manual schema changes risk data loss | Add Alembic for schema migrations when moving to Supabase PostgreSQL | 3 |
| 4 | **CORS hardcoded to localhost** — `allow_origins=["http://localhost:5173"]` | Frontend on Vercel can't reach backend on Railway | Make CORS origins env-configurable (`ALLOWED_ORIGINS`) | 3 |
| 5 | **JWT has no refresh tokens** — 24-hour expiry with no refresh endpoint | Users must re-login daily; poor UX | Add `/api/auth/refresh` endpoint with short-lived access + long-lived refresh tokens | 3 |
| 6 | **USDA cache unpopulated** — `usda_nutrition_cache` table exists but is never written to | Redundant USDA API calls for repeated ingredients | Populate cache on fetch; check cache before calling USDA API | 3 |
| 7 | **No production monitoring** — No error tracking or structured logging | Silent failures in production | Add Sentry for error tracking + structured logging for Railway | 3 |
| 8 | **Frontend error handling** — Minimal error states for API failures | Poor UX when backend is down or API calls fail | Add proper error boundaries, retry logic, and loading/error states | 3 |

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Supabase as database only** | We use Supabase purely as a managed PostgreSQL host. Auth, edge functions, and other BaaS features are not used — custom JWT auth is a class requirement. |
| **GPT-4o-mini for parsing** | Best balance of accuracy, speed, and cost for structured recipe extraction. Structured JSON output mode ensures reliable parsing. |
| **FDA 21 CFR 101.9 rounding** | Ensures generated labels are legally compliant for commercial food products. All 14 mandatory nutrients are tracked. |
| **ReportLab for PDF generation** | Python-native PDF library. Generates FDA-formatted Nutrition Facts labels as downloadable PDFs. |
| **SQLAlchemy with dual DB support** | Same models work with SQLite (local dev) and PostgreSQL (production) via `DATABASE_URL` configuration. |
| **Auto-save on calculate** | Nutrition results are automatically persisted to the database after calculation, making labels retrievable via the `/api/labels` endpoints. |

---

## 10. Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React 18 · TypeScript · Vite · Vercel (CDN)               │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                         │
│  FastAPI 0.109 · Uvicorn · Python 3.11+ · Railway          │
│  ┌─────────────┬───────────────┬──────────────────────────┐ │
│  │  Routers    │  Services     │  Utilities               │ │
│  │  health     │  llm_service  │  unit_converter          │ │
│  │  recipes    │  usda_service │  fda_rounding            │ │
│  │  labels     │  calculator   │                          │ │
│  │  auth*      │  label_gen*   │                          │ │
│  └─────────────┴───────────────┴──────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                │
│  SQLAlchemy 2.0 · PostgreSQL (Supabase) · Alembic*         │
├─────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                         │
│  OpenAI API (GPT-4o-mini) · USDA FoodData Central API      │
├─────────────────────────────────────────────────────────────┤
│                    SECURITY*                                 │
│  JWT (python-jose) · bcrypt (passlib) · httpOnly cookies    │
└─────────────────────────────────────────────────────────────┘

  * = Phase 3 (planned, not yet implemented)
```
