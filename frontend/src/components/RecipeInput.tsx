import { useState } from 'react';

interface RecipeInputProps {
  onParse: (rawText: string, servings: number, servingSize: string) => void;
  loading: boolean;
}

export default function RecipeInput({ onParse, loading }: RecipeInputProps) {
  const [rawText, setRawText] = useState('');
  const [servings, setServings] = useState(1);
  const [servingSize, setServingSize] = useState('1 serving');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    onParse(rawText, servings, servingSize);
  };

  return (
    <form className="recipe-input" onSubmit={handleSubmit}>
      <label htmlFor="recipe-text">Paste your recipe ingredients:</label>
      <textarea
        id="recipe-text"
        value={rawText}
        onChange={e => setRawText(e.target.value)}
        placeholder={"2 cups chicken breast, diced\n1 tbsp olive oil\n3 cups romaine lettuce\n1 medium tomato, chopped"}
        rows={8}
      />
      <div className="input-row">
        <div className="field">
          <label htmlFor="servings">Servings:</label>
          <input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={e => setServings(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="serving-size">Serving size:</label>
          <input
            id="serving-size"
            type="text"
            value={servingSize}
            onChange={e => setServingSize(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" disabled={loading || !rawText.trim()}>
        {loading ? 'Parsing...' : 'Parse Recipe'}
      </button>
    </form>
  );
}
