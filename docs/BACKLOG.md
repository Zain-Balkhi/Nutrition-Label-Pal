# Product Backlog

The items below are what need to be implemented into Nutrition Label Pal, ordered by priority. Higher items should be tackled first based on user impact, dependency chains, and implementation readiness.

---

## Priority 1: Voice Input for Recipe

Add an optional voice input button to the recipe text area that transcribes spoken ingredients into text. Build with production in mind (graceful degradation, proper error handling).

**Scope:**
- Integrate the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) in `RecipeInput.tsx`
- Add a microphone button next to the textarea
- Append transcribed text to the textarea content
- Handle microphone permissions and browser support gracefully (Chrome/Edge have full support; Safari/Firefox are limited)

## Priority 2: Ingredient Input via OCR

Allow users to upload an image or PDF of a recipe and extract ingredient text via OCR. Build with production in mind (proper error handling, no hardcoded config).

**Scope:**
- Add file upload input (accepts PNG, JPG, PDF) to `RecipeInput.tsx`
- Integrate an OCR library (e.g., `tesseract.js` for client-side, or a backend service)
- Optionally support camera capture via `getUserMedia`
- Extract text and populate the recipe textarea
- Handle poor-quality scans gracefully (show extracted text for user review/editing)

## Priority 3: Production Launch Preparation

Audit and modify the codebase for a production deployment. Done last so the audit covers the final feature-complete codebase. Needs planning.

**Scope (needs planning):**
- **Database:** Migrate from SQLite to PostgreSQL (Supabase). Update DATABASE_URL, test all queries, handle async sessions
- **Environment/Config:** Ensure SECRET_KEY is set from env (not default), audit all config values, set up .env.production
- **CORS:** Restrict allowed origins to production domain (currently allows localhost only)
- **Auth:** Evaluate token expiry strategy, consider refresh tokens for production
- **Error handling:** Add proper error logging (not just print/traceback), structured logging for production
- **Security:** Audit for exposed API keys, ensure .env is gitignored, add rate limiting on auth endpoints
- **Static assets:** Configure frontend build for production (proper base URL, asset hashing)
- **Deployment:** Choose hosting (e.g., Railway, Fly.io, Vercel+Supabase), set up CI/CD, health check endpoint already exists
- **Performance:** Connection pooling for PostgreSQL, evaluate caching strategy for USDA API calls
- **Monitoring:** Error tracking (Sentry or similar), uptime monitoring
