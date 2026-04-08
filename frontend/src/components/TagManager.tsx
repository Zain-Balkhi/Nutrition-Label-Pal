import { useState } from 'react';
import type { Tag } from '../types';
import ColorPicker from './ColorPicker';
import './Tags.css';

interface TagManagerProps {
  tags: Tag[];
  onUpdate: (id: number, data: { name?: string; color?: string }) => void;
  onDelete: (id: number) => void;
  onCreate: (name: string, color: string) => void;
  onClose: () => void;
}

export default function TagManager({
  tags,
  onUpdate,
  onDelete,
  onCreate,
  onClose,
}: TagManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#f5a623');

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  }

  function saveEdit() {
    if (editingId === null) return;
    onUpdate(editingId, { name: editName, color: editColor });
    cancelEdit();
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name, newColor);
    setNewName('');
    setNewColor('#f5a623');
  }

  return (
    <div className="tag-manager-modal-overlay" onClick={onClose}>
      <div className="tag-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="tag-manager-modal-header">
          <h3 className="tag-manager-title">Manage Tags</h3>
          <button className="tag-manager-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="tag-manager-list">
          {tags.length === 0 && (
            <div className="tag-manager-empty">
              No tags yet. Create one below.
            </div>
          )}
          {tags.map(tag => (
            <div key={tag.id} className="tag-manager-item">
              {editingId === tag.id ? (
                <>
                  <span
                    className="tag-manager-item-preview"
                    style={{ backgroundColor: editColor }}
                  />
                  <input
                    className="tag-manager-item-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="tag-manager-actions">
                    <button className="tag-manager-btn tag-manager-btn-save" onClick={saveEdit}>
                      Save
                    </button>
                    <button className="tag-manager-btn tag-manager-btn-cancel" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="tag-manager-item-preview"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="tag-manager-item-name">{tag.name}</span>
                  <div className="tag-manager-actions">
                    <button
                      className="tag-manager-btn tag-manager-btn-edit"
                      onClick={() => startEdit(tag)}
                    >
                      Edit
                    </button>
                    <button
                      className="tag-manager-btn tag-manager-btn-delete"
                      onClick={() => onDelete(tag.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
              {editingId === tag.id && (
                <div style={{ width: '100%', marginTop: 8 }}>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="tag-manager-create">
          <input
            className="tag-manager-create-input"
            placeholder="New tag name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button className="tag-manager-create-btn" onClick={handleCreate}>
            Add
          </button>
        </div>
        {newName.trim() && (
          <div style={{ marginTop: 8 }}>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
        )}
      </div>
    </div>
  );
}
