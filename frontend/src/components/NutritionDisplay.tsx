import { useEffect, useRef, useState } from 'react';
import type { NutritionResult, LabelFormat } from '../types';
import StepIndicator from './StepIndicator';
import LabelPreview from './labels/LabelPreview';
import ExportModal from './ExportModal';
import ImageCropperModal from './ImageCropperModal';
import { compressImage } from '../utils/imageCompress';

const NOTES_MAX_LENGTH = 2000;

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
  // Notes + image (optional)
  notes?: string;
  imageDataUrl?: string | null;
  onNotesChange?: (value: string) => void;
  onImageChange?: (dataUrl: string | null) => void;
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
  notes,
  imageDataUrl,
  onNotesChange,
  onImageChange,
}: NutritionDisplayProps) {
  const [format, setFormat] = useState<LabelFormat>('vertical');
  const [showExport, setShowExport] = useState(false);

  // Image upload + cropping
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropperSourceUrl, setCropperSourceUrl] = useState<string | null>(null);

  // Revoke the temporary blob URL when the cropper closes
  useEffect(() => {
    return () => {
      if (cropperSourceUrl && cropperSourceUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cropperSourceUrl);
      }
    };
  }, [cropperSourceUrl]);

  async function handleImageFileSelected(file: File) {
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }
    setImageUploading(true);
    try {
      // Downscale very large photos before handing to the cropper so pan/zoom
      // stays responsive; the final crop is re-encoded to 800x600 anyway.
      const shrunk = await compressImage(file, 1600, 0.9);
      const blobUrl = URL.createObjectURL(shrunk);
      setCropperSourceUrl(blobUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to load image');
    } finally {
      setImageUploading(false);
    }
  }

  function handleCropperSave(dataUrl: string) {
    onImageChange?.(dataUrl);
    closeCropper();
  }

  function closeCropper() {
    if (cropperSourceUrl && cropperSourceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cropperSourceUrl);
    }
    setCropperSourceUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemoveImage() {
    onImageChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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
          {onImageChange && !editing && (
            <div className="recipe-photo-card">
              <div className="recipe-photo-card-title">Recipe Photo</div>
              {imageDataUrl ? (
                <div className="recipe-photo-preview">
                  <img
                    src={imageDataUrl}
                    alt="Recipe"
                    className="recipe-photo-thumb"
                  />
                  <div className="recipe-photo-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={handleRemoveImage}
                      disabled={imageUploading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="recipe-photo-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  {imageUploading ? 'Uploading…' : '+ Add Photo'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageFileSelected(f);
                }}
                style={{ display: 'none' }}
              />
              {imageError && <div className="recipe-photo-error">{imageError}</div>}
            </div>
          )}
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

      {onNotesChange && !editing && (
        <div className="recipe-notes-panel">
          <h3 className="recipe-notes-title">Recipe Notes</h3>
          <div className="recipe-notes-textarea-wrap">
            <textarea
              className="recipe-notes-textarea"
              placeholder="Add preparation tips, variations, or reminders for this recipe…"
              value={notes ?? ''}
              onChange={e => onNotesChange(e.target.value.slice(0, NOTES_MAX_LENGTH))}
              maxLength={NOTES_MAX_LENGTH}
              rows={5}
            />
            <div
              className={
                'recipe-notes-counter' +
                ((notes?.length ?? 0) >= NOTES_MAX_LENGTH ? ' recipe-notes-counter-max' : '')
              }
            >
              {notes?.length ?? 0} / {NOTES_MAX_LENGTH}
            </div>
          </div>
        </div>
      )}

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

      {cropperSourceUrl && (
        <ImageCropperModal
          sourceUrl={cropperSourceUrl}
          onSave={handleCropperSave}
          onCancel={closeCropper}
        />
      )}
    </div>
  );
}
