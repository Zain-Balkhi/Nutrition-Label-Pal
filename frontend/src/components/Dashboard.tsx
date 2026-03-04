import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { RecipeSummary } from '../types';

interface DashboardProps {
  onViewRecipe: (id: number) => void;
  onNewRecipe: () => void;
}

export default function Dashboard({ onViewRecipe, onNewRecipe }: DashboardProps) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.recipes.list();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.recipes.delete(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="dashboard">
        <h2 className="page-title">My Recipes</h2>
        <p className="dashboard-loading">Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="page-title">My Recipes</h2>

      {error && <div className="error">{error}</div>}

      {recipes.length === 0 ? (
        <div className="dashboard-empty">
          <p>You don't have any saved recipes yet.</p>
          <button className="btn-primary" onClick={onNewRecipe}>
            Create Your First Recipe
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => onViewRecipe(recipe.id)}
            >
              <h3 className="recipe-card-title">{recipe.recipe_name}</h3>
              <div className="recipe-card-meta">
                <span>{recipe.servings} servings</span>
                <span>{recipe.serving_size}</span>
              </div>
              <div className="recipe-card-date">
                {formatDate(recipe.created_at)}
              </div>
              <button
                className="recipe-card-delete"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(recipe.id, recipe.recipe_name);
                }}
                disabled={deletingId === recipe.id}
              >
                {deletingId === recipe.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
