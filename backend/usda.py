import requests
import json
import sys
from typing import List, Dict, Any

class USDANutritionFetcher:
    """Fetches nutritional information from USDA FoodData Central API"""
    
    def __init__(self, api_key: str):
        """
        Initialize with USDA API key
        Get your free API key at: https://fdc.nal.usda.gov/api-key-signup.html
        """
        self.api_key = api_key
        self.base_url = "https://api.nal.usda.gov/fdc/v1"
    
    def search_food(self, query: str, page_size: int = 5) -> List[Dict[str, Any]]:
        """Search for a food item by name"""
        url = f"{self.base_url}/foods/search"
        params = {
            "api_key": self.api_key,
            "query": query,
            "pageSize": page_size,
            "dataType": ["Survey (FNDDS)", "Foundation", "SR Legacy"]
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get('foods', [])
        except requests.exceptions.RequestException as e:
            print(f"Error searching for '{query}': {e}")
            return []
    
    def get_food_details(self, fdc_id: int) -> Dict[str, Any]:
        """Get detailed nutritional information for a specific food by FDC ID"""
        url = f"{self.base_url}/food/{fdc_id}"
        params = {"api_key": self.api_key}
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting details for FDC ID {fdc_id}: {e}")
            return {}
    
    def extract_nutrients(self, food_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key nutritional information from food data"""
        nutrients = {}
        
        if 'foodNutrients' in food_data:
            for nutrient in food_data['foodNutrients']:
                nutrient_name = nutrient.get('nutrient', {}).get('name', 'Unknown')
                nutrient_value = nutrient.get('amount', 0)
                nutrient_unit = nutrient.get('nutrient', {}).get('unitName', '')
                
                nutrients[nutrient_name] = {
                    'value': nutrient_value,
                    'unit': nutrient_unit
                }
        
        return nutrients


def process_recipe(input_file: str, output_file: str, api_key: str):
    """
    Process a recipe JSON file and fetch nutritional information
    
    Input JSON format:
    {
        "recipe_name": "Example Recipe",
        "ingredients": [
            {"name": "chicken breast", "amount": "200g"},
            {"name": "olive oil", "amount": "2 tbsp"}
        ]
    }
    """
    # Load recipe data
    try:
        with open(input_file, 'r') as f:
            recipe_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found")
        return
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in '{input_file}'")
        return
    
    # Initialize USDA fetcher
    fetcher = USDANutritionFetcher(api_key)
    
    # Process each ingredient
    recipe_name = recipe_data.get('recipe_name', 'Unknown Recipe')
    ingredients = recipe_data.get('ingredients', [])
    
    print(f"Processing recipe: {recipe_name}")
    print(f"Found {len(ingredients)} ingredients\n")
    
    nutrition_data = {
        'recipe_name': recipe_name,
        'ingredients_nutrition': []
    }
    
    for idx, ingredient in enumerate(ingredients, 1):
        ingredient_name = ingredient.get('name', '')
        ingredient_amount = ingredient.get('amount', '')
        
        print(f"[{idx}/{len(ingredients)}] Searching for: {ingredient_name}")
        
        # Search for the ingredient
        search_results = fetcher.search_food(ingredient_name)
        
        if not search_results:
            print(f"  ⚠ No results found for '{ingredient_name}'")
            nutrition_data['ingredients_nutrition'].append({
                'name': ingredient_name,
                'amount': ingredient_amount,
                'status': 'not_found',
                'nutrition': {}
            })
            continue
        
        # Use the first (most relevant) result
        top_result = search_results[0]
        fdc_id = top_result.get('fdcId')
        food_description = top_result.get('description', '')
        
        print(f"  ✓ Found: {food_description} (FDC ID: {fdc_id})")
        
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
    
    # Save results to output file
    try:
        with open(output_file, 'w') as f:
            json.dump(nutrition_data, f, indent=2)
        print(f"\n✓ Nutritional data saved to '{output_file}'")
    except Exception as e:
        print(f"\nError saving output file: {e}")


def main():
    """Main function to run the script"""
    # You need to get a free API key from: https://fdc.nal.usda.gov/api-key-signup.html
    API_KEY = "YOUR_API_KEY_HERE"  # Replace with your actual API key
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("Error: Please set your USDA API key in the script")
        print("Get a free key at: https://fdc.nal.usda.gov/api-key-signup.html")
        return
    
    # Default file names
    input_file = "recipe.json"
    output_file = "recipe_nutrition.json"
    
    # Allow command line arguments
    if len(sys.argv) >= 2:
        input_file = sys.argv[1]
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    
    print("=" * 60)
    print("USDA Nutritional Information Fetcher")
    print("=" * 60)
    print(f"Input file:  {input_file}")
    print(f"Output file: {output_file}")
    print("=" * 60 + "\n")
    
    process_recipe(input_file, output_file, API_KEY)


if __name__ == "__main__":
    main()
