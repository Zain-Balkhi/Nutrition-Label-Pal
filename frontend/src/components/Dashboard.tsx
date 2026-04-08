import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { RecipeSummary, Tag } from '../types';
import TagBadge from './TagBadge';
import TagManager from './TagManager';
import './Tags.css';

interface DashboardProps {
  onViewRecipe: (id: number) => void;
  onNewRecipe: () => void;
}

export default function Dashboard({ onViewRecipe, onNewRecipe }: DashboardProps) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<Set<number>>(new Set());
  const [showTagManager, setShowTagManager] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [recipesData, tagsData] = await Promise.all([
        api.recipes.list(),
        api.tags.list(),
      ]);
      setRecipes(recipesData);
      setTags(tagsData);
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

  function toggleFilter(tagId: number) {
    setFilterTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  const filteredRecipes =
    filterTagIds.size === 0
      ? recipes
      : recipes.filter(r =>
          r.tags?.some(t => filterTagIds.has(t.id)),
        );

  async function handleCreateTag(name: string, color: string) {
    try {
      const tag = await api.tags.create(name, color);
      setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  }

  async function handleUpdateTag(id: number, data: { name?: string; color?: string }) {
    try {
      const updated = await api.tags.update(id, data);
      setTags(prev => prev.map(t => (t.id === id ? updated : t)));
      setRecipes(prev =>
        prev.map(r => ({
          ...r,
          tags: r.tags?.map(t => (t.id === id ? updated : t)),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    }
  }

  async function handleDeleteTag(id: number) {
    try {
      await api.tags.delete(id);
      setTags(prev => prev.filter(t => t.id !== id));
      setRecipes(prev =>
        prev.map(r => ({
          ...r,
          tags: r.tags?.filter(t => t.id !== id),
        })),
      );
      setFilterTagIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {tags.length > 0 && (
          <div className="tag-filter-bar" style={{ marginBottom: 0 }}>
            <span className="tag-filter-label">Filter:</span>
            {tags.map(tag => (
              <span
                key={tag.id}
                className={`tag-filter-chip ${filterTagIds.has(tag.id) ? 'tag-filter-chip-active' : ''}`}
                style={{ backgroundColor: tag.color, color: '#fff' }}
                onClick={() => toggleFilter(tag.id)}
              >
                {tag.name}
              </span>
            ))}
            {filterTagIds.size > 0 && (
              <button className="tag-filter-clear" onClick={() => setFilterTagIds(new Set())}>
                Clear
              </button>
            )}
          </div>
        )}
        <button className="btn-manage-tags" onClick={() => setShowTagManager(true)}>
          Manage Tags
        </button>
      </div>

      <div className="recipe-grid">
        <div className="recipe-card recipe-card-new" onClick={onNewRecipe}>
          <span className="recipe-card-new-icon">+</span>
          <h3 className="recipe-card-title">Add New Recipe</h3>
        </div>
        {filteredRecipes.map(recipe => (
          <div
            key={recipe.id}
            className="recipe-card"
            onClick={() => onViewRecipe(recipe.id)}
          >
            <h3 className="recipe-card-title">{recipe.recipe_name}</h3>
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="recipe-card-tags">
                {recipe.tags.map(tag => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            )}
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

      {showTagManager && (
        <TagManager
          tags={tags}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
          onCreate={handleCreateTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}
