import type { NutritionResult, NutrientValue } from '../types';
import StepIndicator from './StepIndicator';

interface NutritionDisplayProps {
  result: NutritionResult;
  onBack: () => void;
}

function getN(nutrients: NutrientValue[], name: string): NutrientValue | null {
  return nutrients.find(n => n.name === name) ?? null;
}

function amt(n: NutrientValue | null): string {
  if (!n) return '0g';
  return `${n.amount}${n.unit}`;
}

function dv(n: NutrientValue | null): string {
  if (!n || n.daily_value_percent === null || n.daily_value_percent === undefined) return '';
  return `${n.daily_value_percent}%`;
}

function containerAmt(n: NutrientValue | null, servings: number): string {
  if (!n) return '0g';
  return `${Math.round(n.amount * servings)}${n.unit}`;
}

function containerDv(n: NutrientValue | null, servings: number): string {
  if (!n || n.daily_value_percent === null || n.daily_value_percent === undefined) return '';
  return `${Math.round(n.daily_value_percent * servings)}%`;
}

interface NutrientRowProps {
  label: string;
  n: NutrientValue | null;
  servings: number;
  bold?: boolean;
  indent?: number;
  showDv?: boolean;
}

function NutrientRow({ label, n, servings, bold = false, indent = 0, showDv = true }: NutrientRowProps) {
  const hasDv = showDv && n?.daily_value_percent !== null && n?.daily_value_percent !== undefined;
  return (
    <tr className={`nf-row ${bold ? 'nf-bold-row' : ''}`}>
      <td style={{ paddingLeft: `${8 + indent * 16}px` }}>
        {bold ? <b>{label}</b> : label}
      </td>
      <td>{amt(n)}</td>
      <td className="nf-dv">{hasDv ? dv(n) : ''}</td>
      <td>{containerAmt(n, servings)}</td>
      <td className="nf-dv">{hasDv ? containerDv(n, servings) : ''}</td>
    </tr>
  );
}

export default function NutritionDisplay({ result, onBack }: NutritionDisplayProps) {
  const { nutrients, servings } = result;

  const calories = getN(nutrients, 'Calories');
  const totalFat = getN(nutrients, 'Total Fat');
  const satFat = getN(nutrients, 'Saturated Fat');
  const transFat = getN(nutrients, 'Trans Fat');
  const cholesterol = getN(nutrients, 'Cholesterol');
  const sodium = getN(nutrients, 'Sodium');
  const totalCarb = getN(nutrients, 'Total Carbohydrate');
  const fiber = getN(nutrients, 'Dietary Fiber');
  const totalSugars = getN(nutrients, 'Total Sugars');
  const protein = getN(nutrients, 'Protein');
  const vitD = getN(nutrients, 'Vitamin D');
  const calcium = getN(nutrients, 'Calcium');
  const iron = getN(nutrients, 'Iron');
  const potassium = getN(nutrients, 'Potassium');

  const calPerServing = calories?.amount ?? 0;
  const calPerContainer = Math.round(calPerServing * servings);

  return (
    <div className="nutrition-display">
      <h2 className="page-title">Label Results</h2>
      <StepIndicator currentStep={3} />

      <div className="results-layout">
        <div className="label-container">
          <div className="nutrition-label">
            {/* Title */}
            <div className="nf-title">Nutrition Facts</div>

            {/* Servings info */}
            <div className="nf-servings-info">
              <div>{servings} servings per container</div>
              <div className="nf-serving-size-row">
                <span className="nf-bold">Serving size</span>
                <span className="nf-bold">{result.serving_size}</span>
              </div>
            </div>

            {/* Calories */}
            <div className="nf-thick-bar" />
            <table className="nf-cal-table">
              <thead>
                <tr>
                  <th />
                  <th className="nf-col-head">Per serving</th>
                  <th className="nf-col-head">Per container</th>
                </tr>
              </thead>
              <tbody>
                <tr className="nf-cal-row">
                  <td className="nf-cal-label">Calories</td>
                  <td className="nf-cal-value">{calPerServing}</td>
                  <td className="nf-cal-value">{calPerContainer}</td>
                </tr>
              </tbody>
            </table>

            {/* Main nutrients */}
            <div className="nf-medium-bar" />
            <table className="nf-nutrients-table">
              <thead>
                <tr>
                  <th />
                  <th />
                  <th className="nf-dv-head">% DV*</th>
                  <th />
                  <th className="nf-dv-head">% DV*</th>
                </tr>
              </thead>
              <tbody>
                <NutrientRow label="Total Fat" n={totalFat} servings={servings} bold />
                <NutrientRow label="Saturated Fat" n={satFat} servings={servings} indent={1} />
                <NutrientRow label="Trans Fat" n={transFat} servings={servings} indent={1} showDv={false} />
                <NutrientRow label="Cholesterol" n={cholesterol} servings={servings} bold />
                <NutrientRow label="Sodium" n={sodium} servings={servings} bold />
                <NutrientRow label="Total Carb." n={totalCarb} servings={servings} bold />
                <NutrientRow label="Dietary Fiber" n={fiber} servings={servings} indent={1} />
                <NutrientRow label="Total Sugars" n={totalSugars} servings={servings} indent={1} showDv={false} />
                <NutrientRow label="Protein" n={protein} servings={servings} bold showDv={false} />
              </tbody>
            </table>

            {/* Vitamins & Minerals */}
            <div className="nf-thick-bar" />
            <table className="nf-nutrients-table nf-vitamins-table">
              <tbody>
                <NutrientRow label="Vitamin D" n={vitD} servings={servings} />
                <NutrientRow label="Calcium" n={calcium} servings={servings} />
                <NutrientRow label="Iron" n={iron} servings={servings} />
                <NutrientRow label="Potassium" n={potassium} servings={servings} />
              </tbody>
            </table>

            {/* Footnote */}
            <div className="nf-thin-bar" />
            <p className="nf-footnote">
              * The % Daily Value (DV) tells you how much a nutrient in a serving of
              food contributes to a daily diet. 2,000 calories a day is used for general
              nutrition advice.
            </p>
          </div>
        </div>

        <div className="results-actions">
          <button onClick={onBack} className="btn-start-new">
            Start New Recipe
          </button>
          <button className="btn-save-label">Save Label</button>
          <a href="#" className="view-saved-link">
            View Saved Labels
          </a>
        </div>
      </div>

      {result.skipped_ingredients && result.skipped_ingredients.length > 0 && (
        <div className="skipped-ingredients">
          <h3>⚠ Skipped Ingredients</h3>
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

      <div className="print-row">
        <button onClick={() => window.print()} className="btn-print">
          Print
        </button>
      </div>
    </div>
  );
}