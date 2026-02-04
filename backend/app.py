from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from usda import USDANutritionFetcher

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Initialize USDA fetcher
API_KEY = os.environ.get('USDA_API_KEY', 'YOUR_API_KEY_HERE')
fetcher = USDANutritionFetcher(API_KEY)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'nutrition-label-pal'})


@app.route('/api/search', methods=['POST'])
def search_food():
    """Search for food items"""
    data = request.get_json()
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    results = fetcher.search_food(query)
    return jsonify({'results': results})


@app.route('/api/food/<int:fdc_id>', methods=['GET'])
def get_food_details(fdc_id):
    """Get detailed nutritional information for a specific food"""
    food_data = fetcher.get_food_details(fdc_id)
    
    if not food_data:
        return jsonify({'error': 'Food not found'}), 404
    
    nutrients = fetcher.extract_nutrients(food_data)
    return jsonify({
        'food_data': food_data,
        'nutrients': nutrients
    })


@app.route('/api/save', methods=['POST'])
def save_text():
    """Save text to a file in the backend"""
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    try:
        # Create a filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'saved_text_{timestamp}.txt'
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        # Save the text to file
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        
        return jsonify({
            'message': f'Text saved successfully as {filename}',
            'filename': filename
        })
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500


@app.route('/api/recipe', methods=['POST'])
def process_recipe():
    """Process a recipe and get nutritional information"""
    data = request.get_json()
    recipe_name = data.get('recipe_name', 'Unknown Recipe')
    ingredients = data.get('ingredients', [])
    
    nutrition_data = {
        'recipe_name': recipe_name,
        'ingredients_nutrition': []
    }
    
    for ingredient in ingredients:
        ingredient_name = ingredient.get('name', '')
        ingredient_amount = ingredient.get('amount', '')
        
        # Search for the ingredient
        search_results = fetcher.search_food(ingredient_name)
        
        if not search_results:
            nutrition_data['ingredients_nutrition'].append({
                'name': ingredient_name,
                'amount': ingredient_amount,
                'status': 'not_found',
                'nutrition': {}
            })
            continue
        
        # Use the first result
        top_result = search_results[0]
        fdc_id = top_result.get('fdcId')
        food_description = top_result.get('description', '')
        
        # Get detailed nutritional information
        food_details = fetcher.get_food_details(fdc_id)
        nutrients = fetcher.extract_nutrients(food_details)
        
        nutrition_data['ingredients_nutrition'].append({
            'name': ingredient_name,
            'amount': ingredient_amount,
            'matched_food': food_description,
            'fdc_id': fdc_id,
            'status': 'found',
            'nutrition': nutrients
        })
    
    return jsonify(nutrition_data)


if __name__ == '__main__':
    if API_KEY == 'YOUR_API_KEY_HERE':
        print("Warning: USDA_API_KEY not set. Set it as an environment variable.")
        print("Get a free key at: https://fdc.nal.usda.gov/api-key-signup.html")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
