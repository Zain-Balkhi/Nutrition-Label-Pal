import type { Tag } from '../types';
import './Tags.css';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

/**
 * Determine whether to use light or dark text on the given background color.
 * Uses relative luminance per WCAG guidelines.
 */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2d2d2d' : '#ffffff';
}

export default function TagBadge({ tag, onRemove, size = 'md' }: TagBadgeProps) {
  const textColor = getContrastColor(tag.color);

  return (
    <span
      className={`tag-badge ${size === 'sm' ? 'tag-badge-sm' : ''}`}
      style={{ backgroundColor: tag.color, color: textColor }}
    >
      {tag.name}
      {onRemove && (
        <button
          className="tag-badge-remove"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${tag.name}`}
          style={{ color: textColor }}
        >
          &times;
        </button>
      )}
    </span>
  );
}
