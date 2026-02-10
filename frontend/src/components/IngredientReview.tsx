import type { IngredientWithMatch } from '../types';

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
  recipeName,
  servings,
  servingSize,
  onUpdateIngredient,
  onCalculate,
  onBack,
  loading,
}: IngredientReviewProps) {
  return (
    <div className="ingredient-review">
      <h2>{recipeName}</h2>
      <p>{servings} serving(s) — {servingSize}</p>

      <table>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Amount</th>
            <th>USDA Match</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, i) => (
            <tr key={i}>
              <td>{ing.parsed.original_text}</td>
              <td>{ing.parsed.quantity} {ing.parsed.unit}</td>
              <td>
                {ing.matches.length > 0 ? (
                  <select
                    value={ing.selected_fdc_id ?? ''}
                    onChange={e => onUpdateIngredient(i, Number(e.target.value))}
                  >
                    {ing.matches.map(m => (
                      <option key={m.fdc_id} value={m.fdc_id}>
                        {m.description} ({m.data_type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="no-match">No match found</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="button-row">
        <button type="button" onClick={onBack} className="secondary">
          Back
        </button>
        <button type="button" onClick={onCalculate} disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Nutrition'}
        </button>
      </div>
    </div>
  );
}
