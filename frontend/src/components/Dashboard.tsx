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

      <div className="recipe-grid">
        <div className="recipe-card recipe-card-new" onClick={onNewRecipe}>
          <span className="recipe-card-new-icon">+</span>
          <h3 className="recipe-card-title">Add New Recipe</h3>
        </div>
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
              className="recipe-card-view"
              onClick={e => {
                e.stopPropagation();
                onViewRecipe(recipe.id);
              }}
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
