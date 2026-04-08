import { useEffect, useState } from 'react';
import { api } from '../services/api';
import NutritionDisplay from './NutritionDisplay';
import TagInput from './TagInput';
import type { RecipeDetail as RecipeDetailType, NutritionResult, Tag } from '../types';
import './Tags.css';

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
    allergens: recipe.allergens || [],
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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      setLoading(true);
      setError(null);
      try {
        const [data, tagsData] = await Promise.all([
          api.recipes.get(recipeId),
          api.tags.list(),
        ]);
        setRecipe(data);
        setAllTags(tagsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [recipeId]);

  async function handleAddTag(tag: Tag) {
    if (!recipe) return;
    try {
      await api.tags.addToRecipe(recipe.id, tag.id);
      setRecipe(prev =>
        prev ? { ...prev, tags: [...(prev.tags ?? []), tag] } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    }
  }

  async function handleRemoveTag(tag: Tag) {
    if (!recipe) return;
    try {
      await api.tags.removeFromRecipe(recipe.id, tag.id);
      setRecipe(prev =>
        prev
          ? { ...prev, tags: (prev.tags ?? []).filter(t => t.id !== tag.id) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  }

  async function handleCreateTag(name: string, color: string) {
    if (!recipe) return;
    try {
      const tag = await api.tags.create(name, color);
      setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      await api.tags.addToRecipe(recipe.id, tag.id);
      setRecipe(prev =>
        prev ? { ...prev, tags: [...(prev.tags ?? []), tag] } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  }

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
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading recipe...</span>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="recipe-detail">
        <div className="error">{error ?? 'Recipe not found'}</div>
        <button className="btn-secondary" onClick={onBack}>Back to Recipes</button>
      </div>
    );
  }

  const nutritionResult = recipeToNutritionResult(recipe);

  return (
    <div className="recipe-detail">
      <button className="btn-back-link" onClick={onBack}>
        &larr; Back to Recipes
      </button>

      <div className="recipe-detail-tags">
        <div className="recipe-detail-tags-title">Tags</div>
        <TagInput
          availableTags={allTags}
          selectedTags={recipe.tags ?? []}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          onCreate={handleCreateTag}
        />
      </div>

      <NutritionDisplay
        result={nutritionResult}
        onBack={() => onEdit(recipe)}
        onViewSaved={onBack}
        ingredientNames={recipe.ingredients.map(i => i.name)}
        onEditLabel={async (updates) => {
          const result = await api.calculateNutrition(
            recipe.ingredients.filter(i => i.fdc_id).map(i => ({
              parsed: { name: i.name, quantity: i.quantity, unit: i.unit, preparation: i.preparation, original_text: i.original_text },
              status: 'matched',
              matches: i.fdc_id && i.matched_description ? [{ fdc_id: i.fdc_id, description: i.matched_description, data_type: '' }] : [],
              selected_fdc_id: i.fdc_id,
            })),
            updates.servings,
            updates.serving_size,
            recipe.recipe_name,
            recipe.allergens || [],
          );
          await api.recipes.update(recipe.id, {
            servings: updates.servings,
            serving_size: updates.serving_size,
            nutrients: result.nutrients.map(n => ({
              name: n.name, amount: n.amount, unit: n.unit,
              daily_value_percent: n.daily_value_percent,
              display_value: n.display_value,
            })),
          });
          setRecipe(prev => prev ? { ...prev, servings: updates.servings, serving_size: updates.serving_size } : prev);
        }}
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
