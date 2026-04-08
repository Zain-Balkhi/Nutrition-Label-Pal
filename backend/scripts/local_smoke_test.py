"""
Local smoke test — hits the running backend at localhost:8000 with hardcoded data.

Prerequisites:
    Backend running:  uvicorn app.main:app --port 8000
    Valid OPENAI_API_KEY and USDA_API_KEY in backend/.env

Run from repo root:
    cd backend
    .\\venv\\Scripts\\python.exe scripts/local_smoke_test.py

No CI/CD integration. No destructive cleanup.
"""

import json
import sys
import time

import httpx

BASE = "http://127.0.0.1:8000/api"

# ── Hardcoded test data ─────────────────────────────────────────────────────

EMAIL = "manual.qa@example.com"
PASSWORD = "Password123!"
FULL_NAME = "Manual QA User"

RAW_RECIPE = (
    "Grilled Cheese Smoke Test\n"
    "2 slices white bread\n"
    "1 slice cheddar cheese\n"
    "1 tbsp butter\n"
)
SERVINGS = 1
SERVING_SIZE = "1 sandwich"

LABEL_FORMATS = [
    ("vertical", 2.75, 5.0),
    ("tabular", 4.5, 2.0),
    ("linear", 3.5, 1.5),
    ("dual_column", 3.25, 5.5),
]

# ── Helpers ──────────────────────────────────────────────────────────────────

passed = 0
failed = 0
results: list[tuple[str, bool, str]] = []


def ok(name: str, detail: str = ""):
    global passed
    passed += 1
    tag = f" — {detail}" if detail else ""
    results.append((name, True, detail))
    print(f"  PASS  {name}{tag}")


def fail(name: str, detail: str = "", response: httpx.Response | None = None):
    global failed
    failed += 1
    extra = ""
    if response is not None:
        extra = f" [{response.status_code}]"
        try:
            extra += f" {json.dumps(response.json(), indent=None)[:200]}"
        except Exception:
            extra += f" {response.text[:200]}"
    results.append((name, False, f"{detail}{extra}"))
    print(f"  FAIL  {name} — {detail}{extra}")


def section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    client = httpx.Client(base_url=BASE, timeout=90.0)
    token: str | None = None
    headers: dict[str, str] = {}

    def auth_headers():
        h = {"Content-Type": "application/json"}
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    # ── 1. Health ────────────────────────────────────────────────────────
    section("1. Health Check")
    try:
        r = client.get("/health")
        if r.status_code == 200 and r.json().get("status") == "healthy":
            ok("GET /health")
        else:
            fail("GET /health", "unexpected response", r)
    except httpx.ConnectError:
        fail("GET /health", "backend not reachable at localhost:8000")
        print("\nBackend must be running. Aborting.")
        sys.exit(1)

    # ── 2. Auth ──────────────────────────────────────────────────────────
    section("2. Auth — Register or Login")

    r = client.post(
        "/auth/register",
        json={"email": EMAIL, "password": PASSWORD, "full_name": FULL_NAME},
    )
    if r.status_code == 201:
        token = r.json()["access_token"]
        ok("POST /auth/register", "new account created")
    elif r.status_code == 400 and "already exists" in r.json().get("detail", ""):
        # Account exists → log in
        r = client.post(
            "/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
        )
        if r.status_code == 200:
            token = r.json()["access_token"]
            ok("POST /auth/login", "existing account")
        else:
            fail("POST /auth/login", "could not log in", r)
    else:
        fail("POST /auth/register", "unexpected", r)

    headers = auth_headers()

    # ── 3. User profile ─────────────────────────────────────────────────
    section("3. User Profile")

    r = client.get("/users/me", headers=headers)
    if r.status_code == 200 and r.json().get("email") == EMAIL.lower():
        ok("GET /users/me")
    else:
        fail("GET /users/me", "unexpected", r)

    # Negative: no auth
    r = client.get("/users/me")
    if r.status_code in (401, 403):
        ok("GET /users/me (no auth)", f"{r.status_code}")
    else:
        fail("GET /users/me (no auth)", "expected 401/403", r)

    # ── 4. Parse recipe ─────────────────────────────────────────────────
    section("4. Parse Recipe (calls OpenAI + USDA)")

    t0 = time.time()
    r = client.post(
        "/parse-recipe",
        json={"raw_text": RAW_RECIPE, "servings": SERVINGS, "serving_size": SERVING_SIZE},
        headers=headers,
    )
    elapsed = time.time() - t0
    if r.status_code == 200:
        parsed = r.json()
        n_ing = len(parsed.get("ingredients", []))
        ok("POST /parse-recipe", f"{n_ing} ingredients, {elapsed:.1f}s")
    else:
        fail("POST /parse-recipe", f"status {r.status_code}", r)
        print("\n  Cannot continue without parsed recipe. Aborting.")
        _print_summary()
        sys.exit(1)

    # ── 5. Calculate nutrition ───────────────────────────────────────────
    section("5. Calculate Nutrition (calls USDA)")

    t0 = time.time()
    r = client.post(
        "/calculate-nutrition",
        json={
            "recipe_name": parsed["recipe_name"],
            "servings": parsed["servings"],
            "serving_size": parsed["serving_size"],
            "ingredients": parsed["ingredients"],
        },
        headers=headers,
    )
    elapsed = time.time() - t0
    if r.status_code == 200:
        nutrition = r.json()
        n_nut = len(nutrition.get("nutrients", []))
        skipped = len(nutrition.get("skipped_ingredients", []))
        ok("POST /calculate-nutrition", f"{n_nut} nutrients, {skipped} skipped, {elapsed:.1f}s")
    else:
        fail("POST /calculate-nutrition", f"status {r.status_code}", r)
        print("\n  Cannot continue without nutrition data. Aborting.")
        _print_summary()
        sys.exit(1)

    # ── 6. Save recipe ──────────────────────────────────────────────────
    section("6. Save Recipe (authenticated)")

    save_payload = {
        "recipe_name": parsed["recipe_name"],
        "raw_text": RAW_RECIPE,
        "servings": parsed["servings"],
        "serving_size": parsed["serving_size"],
        "ingredients": [
            {
                "name": ing["parsed"]["name"],
                "quantity": ing["parsed"]["quantity"],
                "unit": ing["parsed"]["unit"],
                "preparation": ing["parsed"].get("preparation"),
                "original_text": ing["parsed"]["original_text"],
                "fdc_id": ing["selected_fdc_id"],
                "matched_description": next(
                    (m["description"] for m in ing["matches"] if m["fdc_id"] == ing["selected_fdc_id"]),
                    None,
                ),
                "gram_weight": None,
            }
            for ing in parsed["ingredients"]
            if ing["selected_fdc_id"] is not None
        ],
        "nutrients": [
            {
                "name": n["name"],
                "amount": n["amount"],
                "unit": n["unit"],
                "daily_value_percent": n.get("daily_value_percent"),
                "display_value": n.get("display_value"),
            }
            for n in nutrition["nutrients"]
        ],
    }

    r = client.post("/recipes", json=save_payload, headers=headers)
    if r.status_code == 201:
        recipe = r.json()
        recipe_id = recipe["id"]
        ok("POST /recipes", f"id={recipe_id}")
    else:
        fail("POST /recipes", "save failed", r)
        recipe_id = None

    # Negative: no auth
    r = client.post("/recipes", json=save_payload)
    if r.status_code in (401, 403):
        ok("POST /recipes (no auth)", f"{r.status_code}")
    else:
        fail("POST /recipes (no auth)", "expected 401/403", r)

    # ── 7. List recipes ─────────────────────────────────────────────────
    section("7. List Recipes")

    r = client.get("/recipes", headers=headers)
    if r.status_code == 200:
        count = len(r.json())
        ok("GET /recipes", f"{count} recipe(s)")
    else:
        fail("GET /recipes", "unexpected", r)

    # ── 8. Get recipe detail ────────────────────────────────────────────
    section("8. Get Recipe Detail")

    if recipe_id:
        r = client.get(f"/recipes/{recipe_id}", headers=headers)
        if r.status_code == 200:
            detail = r.json()
            n_ing = len(detail.get("ingredients", []))
            n_nut = len(detail.get("nutrients", []))
            ok(f"GET /recipes/{recipe_id}", f"{n_ing} ingredients, {n_nut} nutrients")
        else:
            fail(f"GET /recipes/{recipe_id}", "unexpected", r)
    else:
        fail("GET /recipes/{id}", "skipped — no recipe_id from save step")

    # Negative: nonexistent ID
    r = client.get("/recipes/99999", headers=headers)
    if r.status_code == 404:
        ok("GET /recipes/99999", "404 as expected")
    else:
        fail("GET /recipes/99999", "expected 404", r)

    # ── 9. Label export ─────────────────────────────────────────────────
    section("9. Label Export (PDF)")

    for fmt, w, h in LABEL_FORMATS:
        export_payload = {
            "format": fmt,
            "width_inches": w,
            "height_inches": h,
            "recipe_name": nutrition["recipe_name"],
            "servings": nutrition["servings"],
            "serving_size": nutrition["serving_size"],
            "nutrients": nutrition["nutrients"],
        }
        r = client.post("/labels/export", json=export_payload, headers=headers)
        if r.status_code == 200 and r.headers.get("content-type") == "application/pdf":
            size_kb = len(r.content) / 1024
            ok(f"POST /labels/export ({fmt})", f"{size_kb:.1f} KB PDF")
        elif r.status_code == 503:
            fail(f"POST /labels/export ({fmt})", "WeasyPrint unavailable (system libs missing)", r)
        else:
            fail(f"POST /labels/export ({fmt})", "unexpected", r)

    # Negative: bad dimensions
    r = client.post(
        "/labels/export",
        json={**export_payload, "width_inches": -1, "height_inches": 5},
        headers=headers,
    )
    if r.status_code == 422:
        ok("POST /labels/export (negative width)", "422 as expected")
    else:
        fail("POST /labels/export (negative width)", "expected 422", r)

    # Negative: bad format
    r = client.post(
        "/labels/export",
        json={**export_payload, "format": "nonexistent"},
        headers=headers,
    )
    if r.status_code == 422:
        ok("POST /labels/export (bad format)", "422 as expected")
    else:
        fail("POST /labels/export (bad format)", "expected 422", r)

    # ── 10. Nutrient snapshot ────────────────────────────────────────────
    section("10. Nutrient Snapshot (for hand comparison)")

    print()
    print(f"  Recipe:       {nutrition['recipe_name']}")
    print(f"  Servings:     {nutrition['servings']}")
    print(f"  Serving size: {nutrition['serving_size']}")
    print()
    print(f"  {'Nutrient':<25} {'Amount':>10} {'Unit':<6} {'%DV':>6} {'Display':<12}")
    print(f"  {'─' * 65}")
    for n in nutrition["nutrients"]:
        dv = f"{n['daily_value_percent']}%" if n.get("daily_value_percent") is not None else "—"
        disp = n.get("display_value") or ""
        print(f"  {n['name']:<25} {n['amount']:>10.2f} {n['unit']:<6} {dv:>6} {disp:<12}")

    if nutrition.get("skipped_ingredients"):
        print()
        print("  Skipped ingredients:")
        for s in nutrition["skipped_ingredients"]:
            print(f"    • {s['name']} — {s['reason']}")

    print()
    print("  ↑ Compare these values against a manual USDA worksheet")
    print("    (see docs/LOCAL_MANUAL_TEST_PLAN.md § 15)")

    # ── Summary ──────────────────────────────────────────────────────────
    _print_summary()
    client.close()
    sys.exit(0 if failed == 0 else 1)


def _print_summary():
    section("Summary")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Total:  {passed + failed}")
    if failed:
        print()
        print("  Failed tests:")
        for name, ok_flag, detail in results:
            if not ok_flag:
                print(f"    ✗ {name}: {detail}")
    print()


if __name__ == "__main__":
    main()
