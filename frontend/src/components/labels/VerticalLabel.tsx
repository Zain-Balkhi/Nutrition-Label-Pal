import type { NutrientValue } from '../../types';

interface VerticalLabelProps {
  nutrients: NutrientValue[];
  servings: number;
  serving_size: string;
}

function getN(nutrients: NutrientValue[], name: string): NutrientValue | null {
  return nutrients.find(n => n.name === name) ?? null;
}

function amt(n: NutrientValue | null): string {
  if (!n) return '0g';
  if (n.display_value) return n.display_value;
  return `${n.amount}${n.unit}`;
}

function dv(n: NutrientValue | null): string {
  if (!n || n.daily_value_percent === null || n.daily_value_percent === undefined) return '';
  return `${n.daily_value_percent}%`;
}

interface NutrientRowProps {
  label: string;
  n: NutrientValue | null;
  bold?: boolean;
  indent?: number;
  showDv?: boolean;
}

function NutrientRow({ label, n, bold = false, indent = 0, showDv = true }: NutrientRowProps) {
  const hasDv = showDv && n?.daily_value_percent !== null && n?.daily_value_percent !== undefined;
  return (
    <tr className={`nf-row ${bold ? 'nf-bold-row' : ''}`}>
      <td style={{ paddingLeft: `${4 + indent * 12}px` }}>
        {bold ? <b>{label}</b> : label}
      </td>
      <td className="nf-amt">{amt(n)}</td>
      <td className="nf-dv">{hasDv ? dv(n) : ''}</td>
    </tr>
  );
}

export default function VerticalLabel({ nutrients, servings, serving_size }: VerticalLabelProps) {
  const calories = getN(nutrients, 'Calories');
  const calPerServing = calories?.amount ?? 0;

  return (
    <div className="nf-vertical">
      <div className="nf-title">Nutrition Facts</div>

      <div className="nf-servings-info">
        <div>{servings} servings per container</div>
        <div className="nf-serving-size-row">
          <span className="nf-bold">Serving size</span>
          <span className="nf-bold">{serving_size}</span>
        </div>
      </div>

      <div className="nf-thick-bar" />
      <div className="nf-calories-section">
        <div className="nf-calories-header">Amount per serving</div>
        <div className="nf-calories-row">
          <span className="nf-calories-label">Calories</span>
          <span className="nf-calories-value">{calPerServing}</span>
        </div>
      </div>

      <div className="nf-medium-bar" />
      <table className="nf-nutrients-table nf-single-col">
        <thead>
          <tr>
            <th />
            <th />
            <th className="nf-dv-head">% DV*</th>
          </tr>
        </thead>
        <tbody>
          <NutrientRow label="Total Fat" n={getN(nutrients, 'Total Fat')} bold />
          <NutrientRow label="Saturated Fat" n={getN(nutrients, 'Saturated Fat')} indent={1} />
          <NutrientRow label="Trans Fat" n={getN(nutrients, 'Trans Fat')} indent={1} showDv={false} />
          <NutrientRow label="Cholesterol" n={getN(nutrients, 'Cholesterol')} bold />
          <NutrientRow label="Sodium" n={getN(nutrients, 'Sodium')} bold />
          <NutrientRow label="Total Carb." n={getN(nutrients, 'Total Carbohydrate')} bold />
          <NutrientRow label="Dietary Fiber" n={getN(nutrients, 'Dietary Fiber')} indent={1} />
          <NutrientRow label="Total Sugars" n={getN(nutrients, 'Total Sugars')} indent={1} showDv={false} />
          <NutrientRow label="Protein" n={getN(nutrients, 'Protein')} bold showDv={false} />
        </tbody>
      </table>

      <div className="nf-thick-bar" />
      <table className="nf-nutrients-table nf-vitamins-table nf-single-col">
        <tbody>
          <NutrientRow label="Vitamin D" n={getN(nutrients, 'Vitamin D')} />
          <NutrientRow label="Calcium" n={getN(nutrients, 'Calcium')} />
          <NutrientRow label="Iron" n={getN(nutrients, 'Iron')} />
          <NutrientRow label="Potassium" n={getN(nutrients, 'Potassium')} />
        </tbody>
      </table>

      <div className="nf-thin-bar" />
      <p className="nf-footnote">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for general
        nutrition advice.
      </p>
    </div>
  );
}
