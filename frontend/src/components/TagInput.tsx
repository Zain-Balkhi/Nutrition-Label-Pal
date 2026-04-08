import { useState, useRef, useEffect } from 'react';
import type { Tag } from '../types';
import TagBadge from './TagBadge';
import ColorPicker from './ColorPicker';
import './Tags.css';

interface TagInputProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onAdd: (tag: Tag) => void;
  onRemove: (tag: Tag) => void;
  onCreate: (name: string, color: string) => void;
}

export default function TagInput({
  availableTags,
  selectedTags,
  onAdd,
  onRemove,
  onCreate,
}: TagInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newColor, setNewColor] = useState('#f5a623');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedIds = new Set(selectedTags.map(t => t.id));
  const filtered = availableTags.filter(
    t => !selectedIds.has(t.id) && t.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = availableTags.some(
    t => t.name.toLowerCase() === query.trim().toLowerCase(),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(tag: Tag) {
    onAdd(tag);
    setQuery('');
    setOpen(false);
  }

  function handleCreateClick() {
    if (showCreate) {
      const name = query.trim();
      if (name) {
        onCreate(name, newColor);
        setQuery('');
        setShowCreate(false);
        setOpen(false);
        setNewColor('#f5a623');
      }
    } else {
      setShowCreate(true);
    }
  }

  return (
    <div className="tag-input" ref={wrapperRef}>
      {selectedTags.length > 0 && (
        <div className="tag-input-selected">
          {selectedTags.map(tag => (
            <TagBadge key={tag.id} tag={tag} onRemove={() => onRemove(tag)} size="sm" />
          ))}
        </div>
      )}
      <input
        className="tag-input-field"
        type="text"
        placeholder="Search or add tags..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setShowCreate(false);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (filtered.length > 0 || query.trim()) && (
        <div className="tag-dropdown">
          {filtered.map(tag => (
            <div
              key={tag.id}
              className="tag-dropdown-item"
              onClick={() => handleSelect(tag)}
            >
              <span
                className="tag-dropdown-item-swatch"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </div>
          ))}
          {query.trim() && !exactMatch && (
            <>
              {showCreate && (
                <div style={{ padding: '8px 12px' }}>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>
              )}
              <div
                className="tag-dropdown-item tag-dropdown-create"
                onClick={handleCreateClick}
              >
                {showCreate ? `Create "${query.trim()}"` : `+ Create "${query.trim()}"...`}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
