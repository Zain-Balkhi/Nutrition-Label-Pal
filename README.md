# Nutrition Label Pal

A monorepo application for fetching nutritional information from the USDA FoodData Central API.

## Project Structure

```
Nutrition-Label-Pal/
├── backend/          # Flask API server
│   ├── app.py        # Main Flask application
│   ├── usda.py       # USDA API integration
│   ├── requirements.txt
│   └── recipe.json   # Sample recipe
├── frontend/         # React application
│   ├── public/
│   ├── src/
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set your USDA API key as an environment variable:
   ```bash
   $env:USDA_API_KEY="your_api_key_here"  # Windows PowerShell
   ```
   Get a free API key at: https://fdc.nal.usda.gov/api-key-signup.html

5. Run the backend server:
   ```bash
   python app.py
   ```
   Backend will run on http://localhost:5000

### Frontend Setup

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
   npm start
   ```
   Frontend will run on http://localhost:3000

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/search` - Search for food items
- `GET /api/food/<fdc_id>` - Get food details
- `POST /api/recipe` - Process recipe and get nutrition data

## Development

Both frontend and backend run independently:
- Backend: Flask server with CORS enabled
- Frontend: React app with proxy to backend

The frontend is stateless and communicates with the backend via REST API.
