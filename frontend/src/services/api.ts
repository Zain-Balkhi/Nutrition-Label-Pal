import type { ParseRecipeResponse, NutritionResult, IngredientWithMatch } from '../types';

const API_BASE = '/api';

export const api = {
  health: (): Promise<{ status: string; service: string }> =>
    fetch(`${API_BASE}/health`).then(r => r.json()),

  parseRecipe: (
    rawText: string,
    servings?: number,
    servingSize?: string,
  ): Promise<ParseRecipeResponse> =>
    fetch(`${API_BASE}/parse-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: rawText,
        servings,
        serving_size: servingSize,
      }),
    }).then(r => {
      if (!r.ok) throw new Error(`Parse failed: ${r.statusText}`);
      return r.json();
    }),

  calculateNutrition: (
    ingredients: IngredientWithMatch[],
    servings: number,
    servingSize: string,
    recipeName: string,
  ): Promise<NutritionResult> =>
    fetch(`${API_BASE}/calculate-nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients,
        servings,
        serving_size: servingSize,
        recipe_name: recipeName,
      }),
    }).then(r => {
      if (!r.ok) throw new Error(`Calculation failed: ${r.statusText}`);
      return r.json();
    }),
};
