export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  preparation: string | null;
  original_text: string;
}

export interface USDAMatch {
  fdc_id: number;
  description: string;
  data_type: string;
}

export interface IngredientWithMatch {
  parsed: ParsedIngredient;
  status: string;
  matches: USDAMatch[];
  selected_fdc_id: number | null;
}

export interface ParseRecipeResponse {
  recipe_name: string;
  servings: number;
  serving_size: string;
  ingredients: IngredientWithMatch[];
}

export interface NutrientValue {
  name: string;
  amount: number;
  unit: string;
  daily_value_percent: number | null;
  display_value: string | null;
}

export interface SkippedIngredient {
  name: string;
  original_text: string;
  reason: string;
}

export interface NutritionResult {
  recipe_name: string;
  servings: number;
  serving_size: string;
  nutrients: NutrientValue[];
  skipped_ingredients: SkippedIngredient[];
}

// ── Auth types ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}
