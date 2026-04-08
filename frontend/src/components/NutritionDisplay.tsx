import { useState } from 'react';
import type { NutritionResult, LabelFormat } from '../types';
import StepIndicator from './StepIndicator';
import LabelPreview from './labels/LabelPreview';
import ExportModal from './ExportModal';

interface EditLabelUpdates {
  servings: number;
  serving_size: string;
}

interface NutritionDisplayProps {
  result: NutritionResult;
  onBack: () => void;
  onSave?: () => void;
  onViewSaved?: () => void;
  onEditLabel?: (updates: EditLabelUpdates) => Promise<void>;
  saveDisabled?: boolean;
  saveLabel?: string;
}

export default function NutritionDisplay({
  result,
  onBack,
  onSave,
  onViewSaved,
  onEditLabel,
  saveDisabled = false,
  saveLabel = 'Save Label',
}: NutritionDisplayProps) {
  const [format, setFormat] = useState<LabelFormat>('vertical');
  const [showExport, setShowExport] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editServings, setEditServings] = useState(result.servings);
  const [editServingSize, setEditServingSize] = useState(result.serving_size);
  const [editLoading, setEditLoading] = useState(false);

  // Values to display on the label (edited or original)
  const displayServings = editing ? editServings : result.servings;
  const displayServingSize = editing ? editServingSize : result.serving_size;

  function handleEditClick() {
    setEditServings(result.servings);
    setEditServingSize(result.serving_size);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditServings(result.servings);
    setEditServingSize(result.serving_size);
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!onEditLabel) return;
    setEditLoading(true);
    try {
      await onEditLabel({ servings: editServings, serving_size: editServingSize });
      setEditing(false);
    } catch {
      // Error is handled by the parent
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="nutrition-display">
      <h2 className="page-title">Label Results</h2>
      <StepIndicator currentStep={3} />

      <div className="results-layout">
        <LabelPreview
          format={format}
          onFormatChange={setFormat}
          nutrients={result.nutrients}
          servings={displayServings}
          serving_size={displayServingSize}
          allergens={result.allergens}
        />

        <div className="results-actions">
          {editing ? (
            <>
              <div className="edit-fields">
                <label className="edit-field-label">
                  Servings
                  <input
                    type="number"
                    min={1}
                    value={editServings}
                    onChange={e => setEditServings(Math.max(1, Number(e.target.value)))}
                    className="edit-field-input"
                  />
                </label>
                <label className="edit-field-label">
                  Serving Size
                  <input
                    type="text"
                    value={editServingSize}
                    onChange={e => setEditServingSize(e.target.value)}
                    className="edit-field-input"
                  />
                </label>
              </div>
              <button
                className="btn-save-label"
                onClick={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancelEdit}
                disabled={editLoading}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-edit-label"
                onClick={handleEditClick}
              >
                Edit Label
              </button>
              <button onClick={onBack} className="btn-start-new">
                Start New Recipe
              </button>
              <button
                className="btn-save-label"
                onClick={onSave}
                disabled={saveDisabled}
              >
                {saveLabel}
              </button>
              <button
                type="button"
                className="btn-download-pdf"
                onClick={() => setShowExport(true)}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="view-saved-link"
                onClick={onViewSaved}
              >
                View Saved Labels
              </button>
            </>
          )}
        </div>
      </div>

      {result.skipped_ingredients && result.skipped_ingredients.length > 0 && (
        <div className="skipped-ingredients">
          <h3>Skipped Ingredients</h3>
          <p>
            The following ingredients could not be matched and are{' '}
            <strong>not</strong> included in the totals:
          </p>
          <ul>
            {result.skipped_ingredients.map((item, idx) => (
              <li key={idx}>
                <strong>{item.original_text}</strong> — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.allergens && result.allergens.length > 0 && (
        <div className="allergens-warning" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', border: '1px solid #ffeeba' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.1rem' }}>Allergen Notice</h3>
          <p style={{ margin: 0 }}>
            This recipe includes common allergens: <strong>{result.allergens.join(', ')}</strong>.
            They have been automatically flagged on your nutrition label.
          </p>
        </div>
      )}

      {showExport && (
        <ExportModal
          format={format}
          recipe_name={result.recipe_name}
          servings={result.servings}
          serving_size={result.serving_size}
          nutrients={result.nutrients}
          allergens={result.allergens}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
