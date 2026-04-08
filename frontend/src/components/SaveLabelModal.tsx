import { useState } from 'react';

interface SaveLabelModalProps {
  defaultTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function SaveLabelModal({
  defaultTitle,
  onSave,
  onCancel,
  saving,
}: SaveLabelModalProps) {
  const [title, setTitle] = useState(defaultTitle);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) onSave(title.trim());
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Save Recipe</h2>
        <form onSubmit={handleSubmit}>
          <label className="modal-label" htmlFor="recipe-title">
            Recipe Title
          </label>
          <input
            id="recipe-title"
            className="modal-input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Grandma's Pasta"
            autoFocus
          />
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!title.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
