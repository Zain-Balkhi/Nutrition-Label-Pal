# Product Backlog

The items below are what need to be implemented into Nutrition Label Pal, ordered by priority. Higher items should be tackled first based on user impact, dependency chains, and implementation readiness.

---

## Completed

### ~~Allergen Flagging~~
Implemented in commit `9d762e8`. LLM detects 9 FDA allergens during parsing. Allergen notice on labels is now opt-in via a toggle in Step 3 edit mode (default unchecked) with an editable textarea.

### ~~Session Tokens~~
Already implemented. JWT stored in localStorage (`auth_token` key), automatically injected as Bearer token on all API requests via `api.ts`. Persists across page reloads and tab switches. No refresh token logic yet — JWT lives until expiration or manual logout.

---

## Priority 1: Step 3 Edit/Save Mode

Add an Edit/Save button to Step 3 that unlocks all editable fields for the label. The UI should update dynamically as the user makes changes, but changes are only persisted to the database when the Save button is clicked.

**Scope:**
- Add an Edit button that reveals/unlocks all editable fields in Step 3 (servings, serving size, and future fields like allergens and ingredient list)
- All label previews update dynamically as values change (no separate "Recalculate" button — live preview)
- Add a Save button that persists changes to the database
- A Cancel button to discard unsaved changes and revert to the last saved state
- Also add to saved recipe detail view in the Recipes dashboard with the same edit/save pattern

**Why first:** Core UX pattern that all other Step 3 editing features (allergen toggle, ingredient list, tags) will build on. Must be in place before adding more editable fields.

## Priority 2: Allergen Flagging Toggle + Ingredient List Toggle

Make the allergen notice and ingredient list on labels optional via checkboxes in the Step 3 edit mode. Both follow the same UI pattern.

**Scope (allergen toggle):**
- Add a checkbox in Step 3 edit mode to show/hide the allergen notice on the label
- **Default unchecked** — user must opt in to show allergens on the label
- When checked, reveal an editable textarea prepopulated with the detected allergens
- Users can freely edit the allergen text (add, remove, reword)
- Pass the toggle state and text through to label templates and React label components

**Scope (ingredient list toggle):**
- Add a checkbox in Step 3 edit mode to show/hide the ingredient list on the label
- When checked, reveal an editable textarea prepopulated with ingredients
- Follow FDA formatting per 21 CFR 101.4: ingredients listed in descending order of predominance by weight, comma-separated, common names used
- Render the ingredient list in all 4 Jinja2 templates and their React counterparts

**Why here:** High impact FDA compliance features. The ingredient data pipeline already exists (parsed, matched, stored in DB) — only the rendering layer and editing UI are missing.

## Priority 3: Ingredient List on Nutrition Label

The rendering and formatting details for the ingredient list feature described in Priority 2.

**Scope:**
- Add an ingredients list field to the label rendering pipeline (backend templates + frontend components)
- Render in all 4 Jinja2 templates (`vertical.html`, `linear.html`, `tabular.html`, `dual_column.html`) and their React counterparts
- FDA formatting (21 CFR 101.4): descending order of predominance by weight, comma-separated, common/usual names
- Research any additional FDA requirements for ingredient list formatting and apply them

## Priority 4: Tag Creation

Give users the ability to create and manage tags for recipes. Tags help organize recipes in the Recipes dashboard (e.g., "Desserts", "Low Sodium", "Client: Acme Bakery").

**Design decisions:**
- Tags are text with a colored background
- Predefined color palette with an additional color picker for custom colors
- No maximum number of tags per recipe

**Scope:**
- New `tags` and `recipe_tags` tables in database (many-to-many relationship)
- Tag CRUD endpoints (create, list, delete, rename)
- Tag assignment/removal on recipes
- Tag UI in Step 3 edit mode (assign tags when saving a recipe) and in the Recipes dashboard (filter/manage tags)
- Intuitive UX: type-ahead/autocomplete for existing tags, inline creation of new tags
- Color picker component with predefined palette + custom color option

**Why here:** Organizational feature that becomes valuable as users accumulate recipes. Self-contained — no dependencies on other backlog items. Moderate complexity across all layers (DB, API, UI). Can be developed in parallel with Priorities 1-3 in a separate worktree.

## Priority 5: UI Polish Pass

A round of visual and UX improvements across the app.

**Scope:**
- **Rename Dashboard tab to "Recipes"**
- **Loading states:** Add spinners or skeleton loaders between API requests (recipe parsing, nutrition calculation, recipe saving). Currently the UI has no feedback during these async operations.
- **Animations:** Add subtle transitions between the 3-step flow (input, review, results) and when elements appear/disappear
- **Accounts page polish:** Clean up the accounts/profile page layout, improve form styling, add feedback for profile updates

**Why here:** Quality-of-life improvements that make the app feel polished. No new features or data model changes — purely frontend. Should come after Step 3 editing features are in place to avoid rework.

## Priority 6: Voice Input for Recipe

Add an optional voice input button to the recipe text area that transcribes spoken ingredients into text.

**Scope:**
- Integrate the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) in `RecipeInput.tsx`
- Add a microphone button next to the textarea
- Append transcribed text to the textarea content
- Handle microphone permissions and browser support gracefully (Chrome/Edge have full support; Safari/Firefox are limited)

**Why here:** Nice-to-have input method. Useful for hands-free recipe entry but not blocking any core functionality. Limited browser support means it can't be the primary input method.

## Priority 7: Ingredient Input via OCR

Allow users to upload an image or PDF of a recipe and extract ingredient text via OCR.

**Scope:**
- Add file upload input (accepts PNG, JPG, PDF) to `RecipeInput.tsx`
- Integrate an OCR library (e.g., `tesseract.js` for client-side, or a backend service)
- Optionally support camera capture via `getUserMedia`
- Extract text and populate the recipe textarea
- Handle poor-quality scans gracefully (show extracted text for user review/editing)

**Why last:** Highest complexity and most research needed. Requires evaluating OCR libraries, handling image quality edge cases, and potentially adding backend processing. Valuable but not urgent.
