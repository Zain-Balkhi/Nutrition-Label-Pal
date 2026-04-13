import type {
  IngredientWithMatch,
  LabelExportRequest,
  LoginRequest,
  NutritionResult,
  ParseRecipeResponse,
  RecipeDetail,
  RecipeSummary,
  RegisterRequest,
  SaveRecipeRequest,
  Tag,
  TokenResponse,
  UpdateRecipeRequest,
  UserProfile,
  UserProfileUpdated,
} from '../types';
import { clearAuth, getToken, isTokenExpired } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** Build headers, injecting Authorization when a token is available. */
function headers(extra?: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

/**
 * Wrapper around fetch that treats a 401 on an authenticated request as an
 * expired session. Clears stored credentials and fires the auth:expired event
 * so App.tsx can redirect to /login. We only clear when a token was actually
 * attached — a 401 from /auth/login means bad credentials, not expiry.
 */
async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const hadToken = getToken() !== null;
  // Proactively clear a token we already know is expired so we don't waste a
  // round trip and so the auth:expired event fires immediately.
  if (hadToken && isTokenExpired(getToken())) {
    clearAuth();
  }
  const response = await fetch(input, init);
  if (response.status === 401 && hadToken) {
    clearAuth();
  }
  return response;
}

export const api = {
  health: (): Promise<{ status: string; service: string }> =>
    apiFetch(`${API_BASE}/health`).then(r => r.json()),

  parseRecipe: (
    rawText: string,
    servings?: number,
    servingSize?: string,
  ): Promise<ParseRecipeResponse> =>
    apiFetch(`${API_BASE}/parse-recipe`, {
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

  transcribeRecipeImage: (file: File): Promise<{ raw_text: string }> => {
    const form = new FormData();
    form.append('image', file);
    const token = getToken();
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return apiFetch(`${API_BASE}/transcribe-recipe-image`, {
      method: 'POST',
      headers: h,
      body: form,
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail ?? `Transcription failed: ${r.statusText}`);
      }
      return r.json();
    });
  },

  calculateNutrition: (
    ingredients: IngredientWithMatch[],
    servings: number,
    servingSize: string,
    recipeName: string,
    allergens: string[],
  ): Promise<NutritionResult> =>
    apiFetch(`${API_BASE}/calculate-nutrition`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        ingredients,
        servings,
        serving_size: servingSize,
        recipe_name: recipeName,
        allergens,
      }),
    }).then(r => {
      if (!r.ok) throw new Error(`Calculation failed: ${r.statusText}`);
      return r.json();
    }),

  auth: {
    register: (data: RegisterRequest): Promise<TokenResponse> =>
      apiFetch(`${API_BASE}/auth/register`, {
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
      apiFetch(`${API_BASE}/auth/login`, {
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

  users: {
    getMe: (): Promise<UserProfile> =>
      apiFetch(`${API_BASE}/users/me`, {
        headers: headers(),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to load profile');
        }
        return r.json();
      }),

    updateMe: (full_name: string): Promise<UserProfileUpdated> =>
      apiFetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ full_name }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to update profile');
        }
        return r.json();
      }),

    deleteMe: (): Promise<void> =>
      apiFetch(`${API_BASE}/users/me`, {
        method: 'DELETE',
        headers: headers(),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to delete account');
      }),
  },

  recipes: {
    save: (data: SaveRecipeRequest): Promise<RecipeDetail> =>
      apiFetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to save recipe');
        }
        return r.json();
      }),

    list: (): Promise<RecipeSummary[]> =>
      apiFetch(`${API_BASE}/recipes`, {
        headers: headers(),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to load recipes');
        }
        return r.json();
      }),

    get: (id: number): Promise<RecipeDetail> =>
      apiFetch(`${API_BASE}/recipes/${id}`, {
        headers: headers(),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to load recipe');
        }
        return r.json();
      }),

    update: (id: number, data: UpdateRecipeRequest): Promise<RecipeDetail> =>
      apiFetch(`${API_BASE}/recipes/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to update recipe');
        }
        return r.json();
      }),

    delete: (id: number): Promise<void> =>
      apiFetch(`${API_BASE}/recipes/${id}`, {
        method: 'DELETE',
        headers: headers(),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to delete recipe');
      }),
  },

  tags: {
    list: (): Promise<Tag[]> =>
      apiFetch(`${API_BASE}/tags`, {
        headers: headers(),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to load tags');
        }
        return r.json();
      }),

    create: (name: string, color: string): Promise<Tag> =>
      apiFetch(`${API_BASE}/tags`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name, color }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to create tag');
        }
        return r.json();
      }),

    update: (id: number, data: { name?: string; color?: string }): Promise<Tag> =>
      apiFetch(`${API_BASE}/tags/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Failed to update tag');
        }
        return r.json();
      }),

    delete: (id: number): Promise<void> =>
      apiFetch(`${API_BASE}/tags/${id}`, {
        method: 'DELETE',
        headers: headers(),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to delete tag');
      }),

    addToRecipe: (recipeId: number, tagId: number): Promise<void> =>
      apiFetch(`${API_BASE}/recipes/${recipeId}/tags/${tagId}`, {
        method: 'POST',
        headers: headers(),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to assign tag');
      }),

    removeFromRecipe: (recipeId: number, tagId: number): Promise<void> =>
      apiFetch(`${API_BASE}/recipes/${recipeId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: headers(),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to remove tag');
      }),
  },

  exportLabel: (request: LabelExportRequest): Promise<Blob> =>
    apiFetch(`${API_BASE}/labels/export`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(request),
    }).then(r => {
      if (!r.ok) throw new Error(`Export failed: ${r.statusText}`);
      return r.blob();
    }),
};
