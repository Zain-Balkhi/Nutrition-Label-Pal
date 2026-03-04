import { useState } from 'react';
import type { NutritionResult, LabelFormat } from '../types';
import StepIndicator from './StepIndicator';
import LabelPreview from './labels/LabelPreview';
import ExportModal from './ExportModal';

interface NutritionDisplayProps {
  result: NutritionResult;
  onBack: () => void;
  onSave?: () => void;
  onViewSaved?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
}

export default function NutritionDisplay({
  result,
  onBack,
  onSave,
  onViewSaved,
  saveDisabled = false,
  saveLabel = 'Save Label',
}: NutritionDisplayProps) {
  const [format, setFormat] = useState<LabelFormat>('vertical');
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="nutrition-display">
      <h2 className="page-title">Label Results</h2>
      <StepIndicator currentStep={3} />

      <div className="results-layout">
        <LabelPreview
          format={format}
          onFormatChange={setFormat}
          nutrients={result.nutrients}
          servings={result.servings}
          serving_size={result.serving_size}
        />

        <div className="results-actions">
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

      {showExport && (
        <ExportModal
          format={format}
          recipe_name={result.recipe_name}
          servings={result.servings}
          serving_size={result.serving_size}
          nutrients={result.nutrients}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
