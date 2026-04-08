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
  ingredientNames?: string[];
}

export default function NutritionDisplay({
  result,
  onBack,
  onSave,
  onViewSaved,
  onEditLabel,
  saveDisabled = false,
  saveLabel = 'Save Label',
  ingredientNames = [],
}: NutritionDisplayProps) {
  const [format, setFormat] = useState<LabelFormat>('vertical');
  const [showExport, setShowExport] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editServings, setEditServings] = useState(result.servings);
  const [editServingSize, setEditServingSize] = useState(result.serving_size);
  const [editLoading, setEditLoading] = useState(false);

  // Allergen toggle state (default: unchecked)
  const [showAllergens, setShowAllergens] = useState(false);
  const [allergenText, setAllergenText] = useState(
    result.allergens && result.allergens.length > 0
      ? `Contains: ${result.allergens.join(', ')}`
      : ''
  );

  // Ingredient list toggle state (default: unchecked)
  const [showIngredients, setShowIngredients] = useState(false);
  const [ingredientListText, setIngredientListText] = useState(
    ingredientNames.length > 0
      ? ingredientNames.join(', ') + '.'
      : ''
  );

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
          showAllergens={showAllergens}
          allergenText={allergenText}
          showIngredients={showIngredients}
          ingredientListText={ingredientListText}
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
              {result.allergens && result.allergens.length > 0 && (
                <label className="edit-toggle-label">
                  <input
                    type="checkbox"
                    checked={showAllergens}
                    onChange={e => setShowAllergens(e.target.checked)}
                  />
                  Show allergen notice on label
                </label>
              )}
              {showAllergens && (
                <textarea
                  className="edit-textarea"
                  value={allergenText}
                  onChange={e => setAllergenText(e.target.value)}
                  rows={2}
                />
              )}
              {ingredientNames.length > 0 && (
                <label className="edit-toggle-label">
                  <input
                    type="checkbox"
                    checked={showIngredients}
                    onChange={e => setShowIngredients(e.target.checked)}
                  />
                  Show ingredient list on label
                </label>
              )}
              {showIngredients && (
                <textarea
                  className="edit-textarea"
                  value={ingredientListText}
                  onChange={e => setIngredientListText(e.target.value)}
                  rows={3}
                />
              )}
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
              {onEditLabel && (
                <button
                  type="button"
                  className="btn-start-new"
                  onClick={handleEditClick}
                >
                  Edit Label
                </button>
              )}
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
              <button
                type="button"
                className="view-saved-link"
                onClick={onBack}
              >
                Start New Recipe
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
        <div className="allergens-warning">
          <h3 className="allergens-warning-title">Allergen Notice</h3>
          <p className="allergens-warning-text">
            This recipe contains common allergens: <strong>{result.allergens.join(', ')}</strong>.
            Use the Edit Label button to optionally include an allergen notice on your label.
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
          show_allergens={showAllergens}
          allergen_text={allergenText}
          show_ingredients={showIngredients}
          ingredient_list_text={ingredientListText}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
