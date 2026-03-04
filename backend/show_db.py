"""
show_db.py  —  Pretty-print every saved recipe in the database.

For each recipe it shows:
  • metadata (name, servings, serving size, created date)
  • parsed ingredients with their USDA matches
  • the full FDA nutrition label
  • any skipped ingredients

Usage:
    cd backend
    python show_db.py            # show all recipes
    python show_db.py 2          # show only recipe #2
"""

import json
import sys
from app.database import _get_engine
from sqlalchemy import text

SEP = "=" * 62
THIN = "-" * 62


def _print_recipe(conn, recipe_row):
    """Print one recipe with its ingredients and nutrition label."""
    rid, name, raw_text, servings, serving_size, label_json, created = recipe_row

    print(f"\n{SEP}")
    print(f"  RECIPE #{rid}: {name}")
    print(SEP)
    print(f"  Servings:      {servings}")
    print(f"  Serving size:  {serving_size}")
    print(f"  Created:       {created}")

    # --- raw text (if stored) ---
    if raw_text and raw_text.strip():
        print(f"\n  Raw input text:")
        for line in raw_text.strip().splitlines():
            print(f"    {line}")

    # --- parsed ingredients ---
    ingredients = conn.execute(text(
        "SELECT name, quantity, unit, preparation, original_text, "
        "fdc_id, matched_description "
        "FROM recipe_ingredients "
        "WHERE recipe_id = :rid ORDER BY sort_order"
    ), {"rid": rid}).fetchall()

    print(f"\n  Parsed Ingredients ({len(ingredients)}):")
    print(f"  {'#':<4} {'Qty':>6} {'Unit':<8} {'Ingredient':<22} {'USDA Match'}")
    print(f"  {THIN}")
    for i, ing in enumerate(ingredients, 1):
        ing_name, qty, unit, prep, orig, fdc_id, matched = ing
        prep_str = f" ({prep})" if prep else ""
        match_str = f"{matched} [fdc:{fdc_id}]" if matched else "(no match)"
        print(f"  {i:<4} {qty:>6g} {unit:<8} {ing_name}{prep_str:<22} {match_str}")

    # --- nutrition label ---
    label = json.loads(label_json) if label_json else {}
    nutrients = label.get("nutrients", [])
    skipped = label.get("skipped_ingredients", [])

    if nutrients:
        print(f"\n  Nutrition Facts (per {serving_size}):")
        print(f"  {THIN}")
        print(f"  {'Nutrient':<25} {'Amount':>10}  {'% DV':>6}")
        print(f"  {THIN}")
        for n in nutrients:
            amt = f"{n['amount']:.1f}{n['unit']}" if n["unit"] != "kcal" else f"{n['amount']:.0f}"
            dv = f"{n['daily_value_percent']}%" if n.get("daily_value_percent") is not None else ""
            print(f"  {n['name']:<25} {amt:>10}  {dv:>6}")
        print(f"  {THIN}")

    if skipped:
        print(f"\n  ⚠ Skipped Ingredients ({len(skipped)}):")
        for s in skipped:
            print(f"    • {s['original_text']} — {s['reason']}")

    print()


def main():
    engine = _get_engine()

    # Optional: filter to a single recipe ID from command-line arg
    filter_id = int(sys.argv[1]) if len(sys.argv) > 1 else None

    with engine.connect() as conn:
        query = (
            "SELECT id, recipe_name, raw_text, servings, serving_size, "
            "label_json, created_at FROM recipes"
        )
        params = {}
        if filter_id:
            query += " WHERE id = :rid"
            params["rid"] = filter_id
        query += " ORDER BY id"

        recipes = conn.execute(text(query), params).fetchall()

        if not recipes:
            print("No recipes found in the database.")
            return

        print(f"\n{'':>4}Nutrition Label Pal — Saved Recipes ({len(recipes)} total)")

        for recipe_row in recipes:
            _print_recipe(conn, recipe_row)

        # Summary footer
        cache_count = conn.execute(text(
            "SELECT COUNT(*) FROM usda_nutrition_cache"
        )).scalar()
        print(f"{SEP}")
        print(f"  USDA nutrition cache: {cache_count} entries")
        print(SEP)


if __name__ == "__main__":
    main()
