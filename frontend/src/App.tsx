import { useState } from 'react';
import Header from './components/Header';
import RecipeInput from './components/RecipeInput';
import IngredientReview from './components/IngredientReview';
import NutritionDisplay from './components/NutritionDisplay';
import { api } from './services/api';
import type { IngredientWithMatch, NutritionResult } from './types';

type Step = 'input' | 'review' | 'results';

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [servingSize, setServingSize] = useState('1 serving');
  const [ingredients, setIngredients] = useState<IngredientWithMatch[]>([]);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);

  const handleParse = async (rawText: string, srv: number, srvSize: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.parseRecipe(rawText, srv, srvSize);
      setRecipeName(data.recipe_name);
      setServings(data.servings);
      setServingSize(data.serving_size);
      setIngredients(data.ingredients);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIngredient = (index: number, fcId: number) => {
    setIngredients(prev =>
      prev.map((ing, i) =>
        i === index ? { ...ing, selected_fdc_id: fcId } : ing,
      ),
    );
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.calculateNutrition(
        ingredients,
        servings,
        servingSize,
        recipeName,
      );
      setNutritionResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate nutrition');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setIngredients([]);
    setNutritionResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <Header activePage="generate" />
      <main className="container">
        {error && <div className="error">{error}</div>}

        {step === 'input' && (
          <RecipeInput onParse={handleParse} loading={loading} />
        )}

        {step === 'review' && (
          <IngredientReview
            ingredients={ingredients}
            recipeName={recipeName}
            servings={servings}
            servingSize={servingSize}
            onUpdateIngredient={handleUpdateIngredient}
            onCalculate={handleCalculate}
            onBack={handleStartOver}
            loading={loading}
          />
        )}

        {step === 'results' && nutritionResult && (
          <NutritionDisplay
            result={nutritionResult}
            onBack={handleStartOver}
          />
        )}
      </main>
    </div>
  );
}