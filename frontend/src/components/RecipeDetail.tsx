import { useEffect, useState } from 'react';
import { api } from '../services/api';
import NutritionDisplay from './NutritionDisplay';
import type { RecipeDetail as RecipeDetailType, NutritionResult } from '../types';

interface RecipeDetailProps {
  recipeId: number;
  onBack: () => void;
  onEdit: (recipe: RecipeDetailType) => void;
  onDelete: () => void;
}

function recipeToNutritionResult(recipe: RecipeDetailType): NutritionResult {
  return {
    recipe_name: recipe.recipe_name,
    servings: recipe.servings,
    serving_size: recipe.serving_size,
    nutrients: recipe.nutrients.map(n => ({
      name: n.nutrient_name,
      amount: n.amount,
      unit: n.unit,
      daily_value_percent: n.daily_value_percent !== null
        ? Math.round(n.daily_value_percent)
        : null,
      display_value: n.display_value,
    })),
    skipped_ingredients: [],
  };
}

export default function RecipeDetail({
  recipeId,
  onBack,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<RecipeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.recipes.get(recipeId);
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [recipeId]);

  async function handleDelete() {
    if (!recipe) return;
    if (!window.confirm(`Delete "${recipe.recipe_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.recipes.delete(recipeId);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="recipe-detail">
        <p className="dashboard-loading">Loading recipe...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="recipe-detail">
        <div className="error">{error ?? 'Recipe not found'}</div>
        <button className="btn-secondary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const nutritionResult = recipeToNutritionResult(recipe);

  return (
    <div className="recipe-detail">
      <button className="btn-back-link" onClick={onBack}>
        &larr; Back to Dashboard
      </button>

      <NutritionDisplay
        result={nutritionResult}
        onBack={() => onEdit(recipe)}
        saveDisabled
        saveLabel="Saved"
        onViewSaved={onBack}
      />

      <div className="detail-actions">
        <button className="btn-primary" onClick={() => onEdit(recipe)}>
          Edit Recipe
        </button>
        <button
          className="btn-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Recipe'}
        </button>
      </div>
    </div>
  );
}
