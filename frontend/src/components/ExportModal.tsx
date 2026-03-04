import { useState } from 'react';
import type { LabelFormat, NutrientValue, LabelExportRequest } from '../types';
import { LABEL_FORMAT_INFO } from '../types';
import { api } from '../services/api';
import './ExportModal.css';

interface ExportModalProps {
  format: LabelFormat;
  recipe_name: string;
  servings: number;
  serving_size: string;
  nutrients: NutrientValue[];
  onClose: () => void;
}

export default function ExportModal({
  format,
  recipe_name,
  servings,
  serving_size,
  nutrients,
  onClose,
}: ExportModalProps) {
  const defaults = LABEL_FORMAT_INFO[format];
  const [width, setWidth] = useState(defaults.default_width);
  const [height, setHeight] = useState(defaults.default_height);
  const [lockAspect, setLockAspect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectRatio = defaults.default_width / defaults.default_height;

  function handleWidthChange(newWidth: number) {
    setWidth(newWidth);
    if (lockAspect) {
      setHeight(Math.round((newWidth / aspectRatio) * 100) / 100);
    }
  }

  function handleHeightChange(newHeight: number) {
    setHeight(newHeight);
    if (lockAspect) {
      setWidth(Math.round(newHeight * aspectRatio * 100) / 100);
    }
  }

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const request: LabelExportRequest = {
        format,
        width_inches: width,
        height_inches: height,
        recipe_name,
        servings,
        serving_size,
        nutrients,
      };
      const blob = await api.exportLabel(request);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe_name}_${format}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card export-modal" onClick={e => e.stopPropagation()}>
        <h2>Download PDF</h2>
        <p className="export-format-info">
          Format: <b>{LABEL_FORMAT_INFO[format].name}</b>
        </p>

        <div className="export-dimensions">
          <div className="export-dim-field">
            <label htmlFor="export-width">Width (in)</label>
            <input
              id="export-width"
              type="number"
              min={0.5}
              max={12}
              step={0.25}
              value={width}
              onChange={e => handleWidthChange(Number(e.target.value))}
            />
          </div>
          <span className="export-dim-x">&times;</span>
          <div className="export-dim-field">
            <label htmlFor="export-height">Height (in)</label>
            <input
              id="export-height"
              type="number"
              min={0.5}
              max={12}
              step={0.25}
              value={height}
              onChange={e => handleHeightChange(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="export-lock-label">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={e => setLockAspect(e.target.checked)}
          />
          Lock aspect ratio
        </label>

        {error && <div className="export-error">{error}</div>}

        <div className="export-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
            disabled={loading || width <= 0 || height <= 0}
          >
            {loading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
