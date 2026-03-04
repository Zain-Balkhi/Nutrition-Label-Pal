import type { NutrientValue } from '../../types';

interface LinearLabelProps {
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

function dvInline(n: NutrientValue | null): string {
  if (!n || n.daily_value_percent === null || n.daily_value_percent === undefined) return '';
  return ` (${n.daily_value_percent}% DV)`;
}

interface LinearItemProps {
  label: string;
  n: NutrientValue | null;
  bold?: boolean;
  showDv?: boolean;
  last?: boolean;
}

function LinearItem({ label, n, bold = false, showDv = true, last = false }: LinearItemProps) {
  const text = `${label} ${amt(n)}${showDv ? dvInline(n) : ''}`;
  return (
    <>
      {bold ? <b>{text}</b> : <>{text}</>}
      {!last && ', '}
    </>
  );
}

export default function LinearLabel({ nutrients, servings, serving_size }: LinearLabelProps) {
  return (
    <div className="nf-linear">
      <div className="nf-linear-title">Nutrition Facts</div>
      <div className="nf-linear-servings">
        <b>Serv. size</b> {serving_size}, {servings} servings per container
      </div>
      <div className="nf-thin-bar" />
      <div className="nf-linear-nutrients">
        <LinearItem label="Calories" n={getN(nutrients, 'Calories')} bold showDv={false} />
        <LinearItem label="Total Fat" n={getN(nutrients, 'Total Fat')} bold />
        <LinearItem label="Sat. Fat" n={getN(nutrients, 'Saturated Fat')} />
        <LinearItem label="Trans Fat" n={getN(nutrients, 'Trans Fat')} showDv={false} />
        <LinearItem label="Chol." n={getN(nutrients, 'Cholesterol')} bold />
        <LinearItem label="Sodium" n={getN(nutrients, 'Sodium')} bold />
        <LinearItem label="Tot. Carb." n={getN(nutrients, 'Total Carbohydrate')} bold />
        <LinearItem label="Dietary Fiber" n={getN(nutrients, 'Dietary Fiber')} />
        <LinearItem label="Total Sugars" n={getN(nutrients, 'Total Sugars')} showDv={false} />
        <LinearItem label="Protein" n={getN(nutrients, 'Protein')} bold showDv={false} />
        <LinearItem label="Vitamin D" n={getN(nutrients, 'Vitamin D')} />
        <LinearItem label="Calcium" n={getN(nutrients, 'Calcium')} />
        <LinearItem label="Iron" n={getN(nutrients, 'Iron')} />
        <LinearItem label="Potassium" n={getN(nutrients, 'Potassium')} last />
      </div>
      <div className="nf-thin-bar" />
      <p className="nf-footnote">* % Daily Value (DV) based on a 2,000 calorie diet.</p>
    </div>
  );
}
