# Database Schema

Nutrition Label Pal uses SQLAlchemy 2.0 with SQLite for local development and PostgreSQL (e.g. Supabase) for production. The database is auto-created on server startup.

## Current Implementation

The database file is stored at `backend/nutrition_pal.db` (SQLite) by default. Configure `DATABASE_URL` in `backend/.env` to point to PostgreSQL for production.

### `recipes`

Stores recipe metadata and the computed nutrition label JSON.

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| recipe_name | VARCHAR(255) | NOT NULL |
| raw_text | TEXT | NOT NULL (original recipe input) |
| servings | INTEGER | NOT NULL, DEFAULT 1 |
| serving_size | VARCHAR(100) | NOT NULL, DEFAULT '1 serving' |
| label_json | TEXT | NOT NULL (full nutrition label as JSON) |
| created_at | DATETIME | NOT NULL, DEFAULT NOW() |
| updated_at | DATETIME | NOT NULL, DEFAULT NOW() |

### `recipe_ingredients`

Stores each parsed ingredient linked to a recipe, including its USDA match.

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| recipe_id | INTEGER | FOREIGN KEY → recipes(id) ON DELETE CASCADE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| quantity | FLOAT | NOT NULL |
| unit | VARCHAR(50) | NOT NULL |
| preparation | VARCHAR(100) | NULLABLE |
| original_text | TEXT | NOT NULL |
| fdc_id | INTEGER | NULLABLE (USDA FoodData Central ID) |
| matched_description | VARCHAR(255) | NULLABLE (USDA food description) |
| gram_weight | FLOAT | NULLABLE |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 |

### `usda_nutrition_cache`

Caches USDA API responses to reduce redundant calls (planned, table exists but not yet populated).

| Column | Type | Constraints |
|--------|------|-------------|
| fdc_id | INTEGER | PRIMARY KEY |
| description | VARCHAR(255) | NOT NULL |
| data_type | VARCHAR(50) | NOT NULL |
| nutrients_json | TEXT | NOT NULL |
| fetched_at | DATETIME | NOT NULL, DEFAULT NOW() |

## Entity-Relationship Diagram

```
recipes 1──* recipe_ingredients

usda_nutrition_cache (standalone, keyed by fdc_id)
```

- A recipe has many ingredients (cascade delete)
- Each ingredient optionally links to a USDA food item by `fdc_id`
- The `label_json` column on `recipes` holds the complete nutrition result including skipped ingredients

## Inspecting the Database

Use the `show_db.py` CLI tool:

```bash
cd backend
python show_db.py        # show all saved recipes with parsed ingredients & labels
python show_db.py 2      # show only recipe #2
```

## Future — Phase 3

- Add `users` table with JWT authentication
- Add `recipe_nutrition` table for versioned label history
- Populate `usda_nutrition_cache` to reduce API calls
- Migrate to PostgreSQL via Supabase for production
- Add Alembic for schema migrations
