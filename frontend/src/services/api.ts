import type {
  IngredientWithMatch,
  LoginRequest,
  NutritionResult,
  ParseRecipeResponse,
  RegisterRequest,
  TokenResponse,
} from '../types';

const API_BASE = '/api';

/** Returns the stored JWT token, if any. */
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/** Build headers, injecting Authorization when a token is available. */
function headers(extra?: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

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
      headers: headers(),
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
      headers: headers(),
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

  auth: {
    register: (data: RegisterRequest): Promise<TokenResponse> =>
      fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Registration failed');
        }
        return r.json();
      }),

    login: (data: LoginRequest): Promise<TokenResponse> =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Login failed');
        }
        return r.json();
      }),
  },
};
