import type { IngredientWithMatch } from '../types';
import StepIndicator from './StepIndicator';

interface IngredientReviewProps {
  ingredients: IngredientWithMatch[];
  recipeName: string;
  servings: number;
  servingSize: string;
  onUpdateIngredient: (index: number, fcId: number) => void;
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
                        onUpdateIngredient(i, Number(e.target.value))
                      }
                    >
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