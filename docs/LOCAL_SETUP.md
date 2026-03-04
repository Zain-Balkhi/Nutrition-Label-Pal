# Local Development Setup

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate        # macOS/Linux
   # venv\Scripts\activate          # Windows (or use python directly — see note below)
   ```

   > **Windows note:** If PowerShell blocks `activate` due to execution policy, call the venv Python directly:
   > ```powershell
   > .\venv\Scripts\python.exe -m pip install -r requirements.txt
   > .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   > ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

5. Add your API keys to `backend/.env` (see [API_KEYS.md](./API_KEYS.md) for details):
   ```
   USDA_API_KEY=your_usda_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   DATABASE_URL=sqlite:///./nutrition_pal.db
   ```

6. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - Backend runs at http://localhost:8000
   - Swagger docs available at http://localhost:8000/docs
   - ReDoc available at http://localhost:8000/redoc
   - The SQLite database (`nutrition_pal.db`) is auto-created on first startup

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   - Frontend runs at http://localhost:5173
   - API requests to `/api/*` are proxied to the backend at localhost:8000

## Running Both Services

Both the backend and frontend must run simultaneously in separate terminal windows for full functionality.

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

All tests use mocks — no API keys or network access required to run the test suite.

## Inspecting the Database

```bash
cd backend
python show_db.py        # show all saved recipes & nutrition labels
python show_db.py 2      # show only recipe #2
```

## Building for Production

```bash
cd frontend
npm run build
```

The production build output will be in `frontend/dist/`.
