import { useState } from 'react';
import StepIndicator from './StepIndicator';

interface RecipeInputProps {
  onParse: (rawText: string, servings: string, servingSize: string) => void;
  loading: boolean;
  initialText?: string;
  initialServings?: string;
  initialServingSize?: string;
}

export default function RecipeInput({ onParse, loading, initialText, initialServings, initialServingSize }: RecipeInputProps) {
  const [rawText, setRawText] = useState(initialText ?? '');
  const [servings, setServings] = useState(initialServings ?? '');
  const [servingSize, setServingSize] = useState(initialServingSize ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    onParse(rawText, servings, servingSize);
  };

  return (
    <form className="recipe-input" onSubmit={handleSubmit}>
      <h2 className="page-title">Give a recipe, get a nutrition label!</h2>
      <StepIndicator currentStep={1} />

      <textarea
        id="recipe-text"
        className="recipe-textarea"
        value={rawText}
        onChange={e => setRawText(e.target.value)}
        placeholder="Paste your recipe here..."
        rows={8}
      />

      <div className="input-row">
        <div className="field">
          <input
            id="servings"
            type="text"
            value={servings}
            onChange={e => setServings(e.target.value)}
            placeholder="Servings (e.g 4 Cups)"
          />
        </div>
        <div className="field">
          <input
            id="serving-size"
            type="text"
            value={servingSize}
            onChange={e => setServingSize(e.target.value)}
            placeholder="Portion Size (e.g for 1)"
          />
        </div>
      </div>

      <div className="button-center">
        <button type="submit" disabled={loading || !rawText.trim()} className="btn-create">
          {loading ? 'Parsing...' : 'Create'}
        </button>
      </div>
    </form>
  );
}