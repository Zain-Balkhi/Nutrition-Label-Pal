import type { NutritionResult } from '../types';

interface NutritionDisplayProps {
  result: NutritionResult;
  onBack: () => void;
}

export default function NutritionDisplay({ result, onBack }: NutritionDisplayProps) {
  return (
    <div className="nutrition-display">
      <h2>Nutrition Results</h2>
      <pre className="nutrition-json">
        {JSON.stringify(result, null, 2)}
      </pre>

      {result.skipped_ingredients && result.skipped_ingredients.length > 0 && (
        <div className="skipped-ingredients">
          <h3>⚠ Skipped Ingredients</h3>
          <p>The following ingredients could not be matched in the USDA database and are <strong>not</strong> included in the nutrition totals:</p>
          <ul>
            {result.skipped_ingredients.map((item, idx) => (
              <li key={idx}>
                <strong>{item.original_text}</strong> — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onBack} className="secondary">
        Start Over
      </button>
    </div>
  );
}
