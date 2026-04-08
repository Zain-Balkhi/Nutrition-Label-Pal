# Local Manual Test Plan — Nutrition Label Pal

> **Purpose:** validate end-to-end user flows locally without CI/CD.
> Run with both servers up (`localhost:8000` backend, `localhost:5173` frontend).

---

## Hardcoded Test Data

### Test Account

| Field     | Value                     |
|-----------|---------------------------|
| Email     | `manual.qa@example.com`   |
| Password  | `Password123!`            |
| Full name | `Manual QA User`          |

### Primary Recipe — Grilled Cheese

```text
Grilled Cheese Smoke Test
2 slices white bread
1 slice cheddar cheese
1 tbsp butter
```

- Servings: `1`
- Serving size: `1 sandwich`

### Secondary Recipe — Simple Pancakes

```text
Simple Pancake Check
1 cup all-purpose flour
1 tbsp sugar
1 tsp baking powder
1/4 tsp salt
1 cup milk
1 large egg
2 tbsp melted butter
```

- Servings: `4`
- Serving size: `1 pancake`

### Negative Input — Unknown Ingredients

```text
Mystery Test
1 scoop moon dust
2 pinches dragon salt
```

- Servings: `1`
- Serving size: `1 serving`

---

## 1. Startup Smoke

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 1.1 | Open `http://localhost:5173` | Home page renders; no blank screen | |
| 1.2 | Open browser dev-tools Console tab | No fatal JS errors | |
| 1.3 | Click **Generate** nav link | App step = input, recipe text area visible | |
| 1.4 | Click logo / brand text | Returns to home page | |

---

## 2. Home & Navigation

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 2.1 | Click **Get Started** | Navigates to Register page | |
| 2.2 | Click **Try Now** | Navigates to app input step | |
| 2.3 | Click browser Back | Returns to home page | |
| 2.4 | Click browser Forward | Returns to previous page | |
| 2.5 | Click **Login** nav link | Login page renders | |
| 2.6 | Click **Register** link from login page | Register page renders | |

---

## 3. Registration

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 3.1 | Register with test account credentials | 201 — logged in, header shows user | |
| 3.2 | Register same email again | Error: "already exists" | |
| 3.3 | Register with email `not-an-email` | 422 validation error | |
| 3.4 | Register with password `short` (< 8 chars) | 422 validation error | |
| 3.5 | Register with blank full name (spaces only) | 422 validation error | |

---

## 4. Login / Logout

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 4.1 | Log out | Header returns to unauthenticated state | |
| 4.2 | Log in with correct credentials | Token returned, header shows user | |
| 4.3 | Log in with wrong password | Error: "Invalid email or password" | |
| 4.4 | Log in with unknown email | Same generic error (no user enumeration) | |
| 4.5 | Log in with email in ALL CAPS | Succeeds (case-insensitive) | |

---

## 5. Parse Recipe

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 5.1 | Paste **Primary Recipe** text, servings=1, serving size="1 sandwich" | Ingredient review step loads | |
| 5.2 | Confirm recipe name populated | Non-empty recipe name string | |
| 5.3 | All ingredients listed with USDA matches or explicit no-match | At least bread, cheese, butter shown | |
| 5.4 | Parse **Secondary Recipe** | 7 ingredients shown with match options | |
| 5.5 | Parse **Negative Input** | Graceful handling — ingredients shown as no_match or with "skipped" note | |
| 5.6 | Submit blank recipe text (if UI allows) | Error message, no crash | |

---

## 6. Ingredient Review

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 6.1 | On Primary Recipe review, note default selected USDA match for each ingredient | Matches look reasonable for bread, cheese, butter | |
| 6.2 | Change selected USDA match for one ingredient via dropdown | New selection sticks; UI updates | |
| 6.3 | Deselect a match (set to null/none if UI allows) | Ingredient marked as skipped during calculation | |
| 6.4 | Click Back | Returns to input step with previous text preserved | |
| 6.5 | Click Calculate | Proceeds to nutrition results | |

---

## 7. Calculate Nutrition

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 7.1 | Results page loads after Calculate | Nutrient list displayed | |
| 7.2 | Calories displayed | Non-zero number | |
| 7.3 | Core nutrients present: Total Fat, Saturated Fat, Trans Fat, Cholesterol, Sodium, Total Carbohydrate, Dietary Fiber, Total Sugars, Protein | All listed | |
| 7.4 | Micronutrients present: Vitamin D, Calcium, Iron, Potassium | All listed | |
| 7.5 | Skipped ingredients section appears if any ingredient was deselected | Shows name + reason | |
| 7.6 | Click **Start Over** | Resets to input step; text area empty | |

---

## 8. Save Recipe (Logged In)

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 8.1 | Generate a label from Primary Recipe while logged in | Results page visible | |
| 8.2 | Click **Save Label** | Save modal opens with default title | |
| 8.3 | Modify title if desired, confirm save | "Saved!" confirmation; button disables | |
| 8.4 | Navigate to Dashboard | Saved recipe appears in list | |
| 8.5 | Open saved recipe detail | Ingredients, nutrients, raw text all correct | |

---

## 9. Save While Logged Out → Auto-Save

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 9.1 | Log out | Unauthenticated state | |
| 9.2 | Generate a label from Secondary Recipe | Results page visible | |
| 9.3 | Click **Save Label** | Redirects to Login page | |
| 9.4 | Log in with test account | Auto-saves pending recipe; redirects to recipe detail | |
| 9.5 | Verify recipe appears in Dashboard | Recipe listed | |

---

## 10. Dashboard — List / Detail / Edit / Delete

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 10.1 | Dashboard shows all saved recipes, newest first | Order correct | |
| 10.2 | Summary cards show name, servings, serving size, dates | All fields present | |
| 10.3 | Click a recipe → detail view | Ingredients and nutrients displayed | |
| 10.4 | Click **Edit** on a recipe detail | Returns to input step pre-filled with recipe data | |
| 10.5 | Change servings, re-parse & recalculate | New results reflect changed servings | |
| 10.6 | Click **Update Recipe** | Saves over existing recipe; no duplicate created | |
| 10.7 | Delete a recipe from detail view | Recipe removed; returns to Dashboard | |
| 10.8 | Reopen Dashboard | Deleted recipe is gone | |

---

## 11. Account Page

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 11.1 | Open Account page | Email, full name, created-at displayed | |
| 11.2 | Update full name to `QA Updated Name` | 200 response; name reflects immediately | |
| 11.3 | Refresh page | Updated name persists | |
| 11.4 | (Last test) Delete account | 204; session invalidated; redirects to app input | |
| 11.5 | Try using old token (API call or refresh) | 401 Unauthorized | |

> ⚠ Run account deletion **last** — it destroys the test user and cascades recipes.

---

## 12. PDF Label Export

For each format, export from the results page of the Primary Recipe.

| # | Format | Default Size | Expected | Pass? |
|---|--------|-------------|----------|-------|
| 12.1 | `vertical` | 2.75 × 5.0 in | PDF downloads; "Nutrition Facts" title, correct layout | |
| 12.2 | `tabular` | 4.5 × 2.0 in | PDF downloads; horizontal table layout | |
| 12.3 | `linear` | 3.5 × 1.5 in | PDF downloads; comma-separated compact text | |
| 12.4 | `dual_column` | 3.25 × 5.5 in | PDF downloads; per-serving + per-container columns | |
| 12.5 | Open each PDF in a viewer | Text not clipped, layout not broken | |
| 12.6 | Filename contains recipe name | e.g. `Grilled Cheese Smoke Test_label.pdf` | |

---

## 13. Browser History / Edge Cases

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 13.1 | Navigate input → review → results, then press Back twice | Returns to input with text intact | |
| 13.2 | On results page, refresh browser | Falls back gracefully (review or input) | |
| 13.3 | On Dashboard, refresh browser | Dashboard reloads (auth persists via localStorage) | |
| 13.4 | Open `/api/health` directly | JSON: `{"status":"healthy","service":"nutrition-label-pal"}` | |
| 13.5 | Hit `/api/recipes` without auth header | 403 Forbidden | |

---

## 14. Negative / Error Cases

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 14.1 | POST `/api/parse-recipe` with empty `raw_text` | 422 or descriptive error | |
| 14.2 | POST `/api/labels/export` with `width_inches: -1` | 422 | |
| 14.3 | POST `/api/labels/export` with `format: "nonexistent"` | 422 | |
| 14.4 | GET `/api/recipes/99999` while authenticated | 404 | |
| 14.5 | PUT `/api/users/me` with `full_name: "   "` | 422 | |
| 14.6 | POST `/api/auth/register` missing `password` field | 422 | |

---

## 15. Hand Comparison — Label vs Manual Worksheet

Use one **finalized saved recipe** (Primary Recipe: Grilled Cheese) for this section.

### Step 1: Capture App Output

After calculating nutrition for the Primary Recipe:
- Screenshot or record the nutrient values from the Results page.
- Export as PDF (vertical format).

### Step 2: Build Manual Worksheet

For each selected ingredient, look up the **USDA FoodData Central** source data:

| Ingredient | USDA Match Description | FDC ID | Qty | Unit | Assumed g | Cal/100g | Fat/100g | SatFat/100g | Sodium/100g | Carb/100g | Fiber/100g | Sugars/100g | Protein/100g |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| white bread | | | 2 | slices | | | | | | | | | |
| cheddar cheese | | | 1 | slice | | | | | | | | | |
| butter | | | 1 | tbsp | | | | | | | | | |

### Step 3: Manual Calculation

For each ingredient:
1. Convert quantity to grams using USDA serving weights
2. Multiply nutrient per-100g × (grams / 100)
3. Sum across all ingredients
4. Divide by servings (1)
5. Apply FDA 21 CFR 101.9 rounding rules

### Step 4: Comparison Table

| Nutrient | Manual (pre-round) | Manual (FDA-rounded) | App Value | Match? | Notes |
|---|---:|---:|---:|---|---|
| Calories | | | | | |
| Total Fat | | | | | |
| Saturated Fat | | | | | |
| Trans Fat | | | | | |
| Cholesterol | | | | | |
| Sodium | | | | | |
| Total Carbohydrate | | | | | |
| Dietary Fiber | | | | | |
| Total Sugars | | | | | |
| Protein | | | | | |
| Vitamin D | | | | | |
| Calcium | | | | | |
| Iron | | | | | |
| Potassium | | | | | |

**Pass criteria:** App values match manual FDA-rounded values, or any discrepancy is explainable by USDA item choice, gram conversion assumptions, or rounding threshold differences.

---

## Defect Log

| ID | Area | Steps to Reproduce | Expected | Actual | Severity | Screenshot/PDF |
|----|------|--------------------|----------|--------|----------|----------------|
| | | | | | | |
| | | | | | | |
| | | | | | | |

---

## Final Signoff

| Item | Status |
|------|--------|
| Smoke tests passed | ☐ Yes ☐ No |
| Full manual coverage complete | ☐ Yes ☐ No |
| Label hand comparison complete | ☐ Yes ☐ No |
| Open defects | |
| Tester | |
| Date | |
| Notes | |
