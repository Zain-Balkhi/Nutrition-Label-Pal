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
      <button type="button" onClick={onBack} className="secondary">
        Start Over
      </button>
    </div>
  );
}
