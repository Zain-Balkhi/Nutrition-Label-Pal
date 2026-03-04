import type { NutrientValue } from '../../types';

interface DualColumnLabelProps {
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
      <td style={{ paddingLeft: `${4 + indent * 12}px` }}>
        {bold ? <b>{label}</b> : label}
      </td>
      <td>{amt(n)}</td>
      <td className="nf-dv">{hasDv ? dv(n) : ''}</td>
      <td>{containerAmt(n, servings)}</td>
      <td className="nf-dv">{hasDv ? containerDv(n, servings) : ''}</td>
    </tr>
  );
}

export default function DualColumnLabel({ nutrients, servings, serving_size }: DualColumnLabelProps) {
  const calories = getN(nutrients, 'Calories');
  const calPerServing = calories?.amount ?? 0;
  const calPerContainer = Math.round(calPerServing * servings);

  return (
    <div className="nf-dual-column">
      <div className="nf-title">Nutrition Facts</div>

      <div className="nf-servings-info">
        <div>{servings} servings per container</div>
        <div className="nf-serving-size-row">
          <span className="nf-bold">Serving size</span>
          <span className="nf-bold">{serving_size}</span>
        </div>
      </div>

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
          <NutrientRow label="Total Fat" n={getN(nutrients, 'Total Fat')} servings={servings} bold />
          <NutrientRow label="Saturated Fat" n={getN(nutrients, 'Saturated Fat')} servings={servings} indent={1} />
          <NutrientRow label="Trans Fat" n={getN(nutrients, 'Trans Fat')} servings={servings} indent={1} showDv={false} />
          <NutrientRow label="Cholesterol" n={getN(nutrients, 'Cholesterol')} servings={servings} bold />
          <NutrientRow label="Sodium" n={getN(nutrients, 'Sodium')} servings={servings} bold />
          <NutrientRow label="Total Carb." n={getN(nutrients, 'Total Carbohydrate')} servings={servings} bold />
          <NutrientRow label="Dietary Fiber" n={getN(nutrients, 'Dietary Fiber')} servings={servings} indent={1} />
          <NutrientRow label="Total Sugars" n={getN(nutrients, 'Total Sugars')} servings={servings} indent={1} showDv={false} />
          <NutrientRow label="Protein" n={getN(nutrients, 'Protein')} servings={servings} bold showDv={false} />
        </tbody>
      </table>

      <div className="nf-thick-bar" />
      <table className="nf-nutrients-table nf-vitamins-table">
        <tbody>
          <NutrientRow label="Vitamin D" n={getN(nutrients, 'Vitamin D')} servings={servings} />
          <NutrientRow label="Calcium" n={getN(nutrients, 'Calcium')} servings={servings} />
          <NutrientRow label="Iron" n={getN(nutrients, 'Iron')} servings={servings} />
          <NutrientRow label="Potassium" n={getN(nutrients, 'Potassium')} servings={servings} />
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
