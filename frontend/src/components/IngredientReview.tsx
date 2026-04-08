import type { IngredientWithMatch } from '../types';
import StepIndicator from './StepIndicator';

interface IngredientReviewProps {
  ingredients: IngredientWithMatch[];
  recipeName: string;
  servings: number;
  servingSize: string;
  onUpdateIngredient: (index: number, fcId: number | null) => void;
  onCalculate: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function IngredientReview({
  ingredients,
  onUpdateIngredient,
  onCalculate,
  onBack,
  loading,
}: IngredientReviewProps) {
  return (
    <div className="ingredient-review">
      <h2 className="page-title">Ingredient Review</h2>
      <StepIndicator currentStep={2} />

      <p className="compliance-notice">
        ⚠ Only exclude ingredients that are discarded during cooking (e.g. bay leaves,
        drained marinade) or never consumed. Skipping consumed ingredients will produce
        an inaccurate, non-compliant nutrition label.
      </p>

      <div className="review-table-wrapper">
        <table className="review-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Parsed Amt.</th>
              <th>USDA Match</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, i) => (
              <tr key={i}>
                <td className="ingredient-name">
                  {ing.parsed.name || ing.parsed.original_text}
                </td>
                <td>
                  {ing.parsed.quantity} {ing.parsed.unit}
                </td>
                <td>
                  {ing.matches.length > 0 ? (
                    <select
                      className="usda-select"
                      value={ing.selected_fdc_id ?? ''}
                      onChange={e =>
                        onUpdateIngredient(i, e.target.value === '' ? null : Number(e.target.value))
                      }
                    >
                      <option value="">— Not consumed / Discard —</option>
                      {ing.matches.map(m => (
                        <option key={m.fdc_id} value={m.fdc_id}>
                          {m.description}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="no-match">No match</span>
                  )}
                </td>
                <td className="status-cell">
                  {ing.matches.length > 0 ? (
                    <span className="status-ok" title="Matched">
                      ✅
                    </span>
                  ) : (
                    <span className="status-err" title="No match">
                      ❌
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(() => {
        const excluded = ingredients.filter(ing => ing.selected_fdc_id === null);
        if (excluded.length === 0) return null;
        return (
          <div className="excluded-warning">
            <strong>Note:</strong> The following{' '}
            {excluded.length === 1 ? 'ingredient' : 'ingredients'} will not be included
            in the nutrition calculation:
            <ul>
              {excluded.map((ing, idx) => (
                <li key={idx}>
                  <em>{ing.parsed.name || ing.parsed.original_text}</em>
                  {ing.matches.length === 0 ? ' — no USDA match found' : ' — marked as not consumed'}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="button-row">
        <button type="button" onClick={onBack} className="btn-secondary">
          Edit recipe parts
        </button>
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Calculating...' : 'Calculate Nutrition'}
        </button>
      </div>
    </div>
  );
}