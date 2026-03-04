import type { NutrientValue } from '../../types';

interface TabularLabelProps {
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

export default function TabularLabel({ nutrients, servings, serving_size }: TabularLabelProps) {
  const calories = getN(nutrients, 'Calories');
  const calPerServing = calories?.amount ?? 0;

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

  return (
    <div className="nf-tabular">
      <div className="nf-tabular-header">
        <div className="nf-title" style={{ fontSize: '1.4rem' }}>Nutrition Facts</div>
        <div className="nf-tabular-servings">
          {servings} servings per container<br />
          <span className="nf-bold">Serv. size</span> {serving_size}
        </div>
      </div>

      <div className="nf-thick-bar" />
      <div className="nf-tabular-cal-row">
        <span className="nf-tabular-cal-header">Amt per serving</span>
        <span className="nf-bold">Calories</span>
        <span className="nf-calories-value" style={{ fontSize: '1rem' }}>{calPerServing}</span>
      </div>

      <div className="nf-medium-bar" />
      <table className="nf-htable">
        <thead>
          <tr>
            <th /><th /><th className="nf-hdv">% DV*</th>
            <th className="nf-hcol" /><th /><th className="nf-hdv">% DV*</th>
            <th className="nf-hcol" /><th /><th className="nf-hdv">% DV*</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="nf-hname">Total Fat</td>
            <td>{amt(totalFat)}</td>
            <td className="nf-hdv">{dv(totalFat)}</td>
            <td className="nf-hcol nf-hname">Cholesterol</td>
            <td>{amt(cholesterol)}</td>
            <td className="nf-hdv">{dv(cholesterol)}</td>
            <td className="nf-hcol nf-hname">Tot. Carb.</td>
            <td>{amt(totalCarb)}</td>
            <td className="nf-hdv">{dv(totalCarb)}</td>
          </tr>
          <tr>
            <td className="nf-hsub">Sat. Fat</td>
            <td>{amt(satFat)}</td>
            <td className="nf-hdv">{dv(satFat)}</td>
            <td className="nf-hcol nf-hname">Sodium</td>
            <td>{amt(sodium)}</td>
            <td className="nf-hdv">{dv(sodium)}</td>
            <td className="nf-hcol nf-hsub">Dietary Fiber</td>
            <td>{amt(fiber)}</td>
            <td className="nf-hdv">{dv(fiber)}</td>
          </tr>
          <tr>
            <td className="nf-hsub"><i>Trans</i> Fat</td>
            <td>{amt(transFat)}</td>
            <td className="nf-hdv" />
            <td className="nf-hcol nf-hname">Protein</td>
            <td>{amt(protein)}</td>
            <td className="nf-hdv" />
            <td className="nf-hcol nf-hsub">Total Sugars</td>
            <td>{amt(totalSugars)}</td>
            <td className="nf-hdv" />
          </tr>
        </tbody>
      </table>

      <div className="nf-thick-bar" />
      <div className="nf-tabular-vitamins">
        Vitamin D {amt(vitD)} {dv(vitD)}
        {' | '}Calcium {amt(calcium)} {dv(calcium)}
        {' | '}Iron {amt(iron)} {dv(iron)}
        {' | '}Potassium {amt(potassium)} {dv(potassium)}
      </div>

      <div className="nf-thin-bar" />
      <p className="nf-footnote">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for general
        nutrition advice.
      </p>
    </div>
  );
}
