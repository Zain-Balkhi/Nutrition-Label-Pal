# Database Schema (Phase 3 — Design Only)

This schema will be implemented in Phase 3 using PostgreSQL (production) and SQLite (local development) with SQLAlchemy 2.0 and Alembic migrations.

## Tables

### `users`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### `recipes`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | FOREIGN KEY -> users(id) ON DELETE CASCADE, NOT NULL |
| recipe_name | VARCHAR(255) | NOT NULL |
| raw_text | TEXT | NOT NULL |
| servings | INTEGER | NOT NULL, DEFAULT 1 |
| serving_size | VARCHAR(100) | NOT NULL, DEFAULT '1 serving' |
| scale_factor | FLOAT | NOT NULL, DEFAULT 1.0 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### `recipe_ingredients`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| recipe_id | UUID | FOREIGN KEY -> recipes(id) ON DELETE CASCADE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| quantity | FLOAT | NOT NULL |
| unit | VARCHAR(50) | NOT NULL |
| preparation | VARCHAR(100) | NULLABLE |
| original_text | TEXT | NOT NULL |
| fdc_id | INTEGER | NULLABLE |
| matched_description | VARCHAR(255) | NULLABLE |
| gram_weight | FLOAT | NULLABLE |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 |

### `usda_nutrition_cache`

| Column | Type | Constraints |
|--------|------|------------|
| fdc_id | INTEGER | PRIMARY KEY |
| description | VARCHAR(255) | NOT NULL |
| data_type | VARCHAR(50) | NOT NULL |
| nutrients_json | JSONB | NOT NULL |
| fetched_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### `recipe_nutrition`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| recipe_id | UUID | FOREIGN KEY -> recipes(id) ON DELETE CASCADE, UNIQUE, NOT NULL |
| label_data_json | JSONB | NOT NULL |
| calculated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

## Indexes

- `idx_recipes_user_id` on `recipes(user_id)`
- `idx_recipe_ingredients_recipe_id` on `recipe_ingredients(recipe_id)`
- `idx_recipe_ingredients_fdc_id` on `recipe_ingredients(fdc_id)`
- `idx_recipe_nutrition_recipe_id` on `recipe_nutrition(recipe_id)`
- `idx_usda_cache_fetched_at` on `usda_nutrition_cache(fetched_at)`

## Entity-Relationship Diagram

```
users 1──* recipes 1──* recipe_ingredients
                   1──1 recipe_nutrition

usda_nutrition_cache (standalone, keyed by fdc_id)
```

- A user has many recipes
- A recipe has many ingredients
- A recipe has one nutrition result
- USDA cache is independent, used for reducing redundant API calls
