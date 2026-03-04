import { useState, useEffect } from 'react';
import Header from './components/Header';
import RecipeInput from './components/RecipeInput';
import IngredientReview from './components/IngredientReview';
import NutritionDisplay from './components/NutritionDisplay';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { api } from './services/api';
import type { AuthUser, IngredientWithMatch, NutritionResult } from './types';

type AppStep = 'input' | 'review' | 'results';
type Page = 'app' | 'login' | 'register';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export default function App() {
  const [page, setPage] = useState<Page>('app');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const [step, setStep] = useState<AppStep>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipeText, setRecipeText] = useState('');
  const [recipeServings, setRecipeServings] = useState('');
  const [recipeServingSize, setRecipeServingSize] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [servingSize, setServingSize] = useState('1 serving');
  const [ingredients, setIngredients] = useState<IngredientWithMatch[]>([]);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);

  // Stamp initial browser history state on mount
  useEffect(() => {
    history.replaceState({ step: 'input' }, '');
  }, []);

  // Sync browser back/forward button with step machine
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { step?: AppStep } | null)?.step ?? 'input';
      setStep(s);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Guard: redirect if step has missing data
  useEffect(() => {
    if (step === 'results' && !nutritionResult) setStep('review');
    if (step === 'review' && ingredients.length === 0) setStep('input');
  }, [step, nutritionResult, ingredients.length]);

  // Keep localStorage in sync whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [currentUser]);

  function handleAuthSuccess(user: AuthUser, token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    setCurrentUser(user);
    setPage('app');
  }

  function handleLogout() {
    setCurrentUser(null);
    setPage('app');
  }

  const handleParse = async (rawText: string, rawServings: string, rawServingSize: string) => {
    const srv = Number(rawServings) || 1;
    const srvSize = rawServingSize || '1 serving';

    // Skip API call if inputs are unchanged and we already have parsed results
    if (
      rawText === recipeText &&
      rawServings === recipeServings &&
      rawServingSize === recipeServingSize &&
      ingredients.length > 0
    ) {
      history.pushState({ step: 'review' }, '');
      setStep('review');
      return;
    }

    setLoading(true);
    setError(null);
    setRecipeText(rawText);
    setRecipeServings(rawServings);
    setRecipeServingSize(rawServingSize);
    try {
      const data = await api.parseRecipe(rawText, srv, srvSize);
      setRecipeName(data.recipe_name);
      setServings(data.servings);
      setServingSize(data.serving_size);
      setIngredients(data.ingredients);
      history.pushState({ step: 'review' }, '');
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIngredient = (index: number, fcId: number | null) => {
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
      history.pushState({ step: 'results' }, '');
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate nutrition');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setRecipeText('');
    setRecipeServings('');
    setRecipeServingSize('');
    setIngredients([]);
    setNutritionResult(null);
    setError(null);
    history.pushState({ step: 'input' }, '');
  };

  const handleBackToInput = () => window.history.back();

  if (page === 'login') {
    return (
      <div className="app">
        <Header
          activePage="login"
          currentUser={currentUser}
          onLoginClick={() => setPage('login')}
          onLogout={handleLogout}
          onLogoClick={() => { setPage('app'); handleStartOver(); }}
        />
        <main className="container">
          <LoginPage
            onSuccess={handleAuthSuccess}
            onNavigateRegister={() => setPage('register')}
          />
        </main>
      </div>
    );
  }

  if (page === 'register') {
    return (
      <div className="app">
        <Header
          activePage="login"
          currentUser={currentUser}
          onLoginClick={() => setPage('login')}
          onLogout={handleLogout}
          onLogoClick={() => { setPage('app'); handleStartOver(); }}
        />
        <main className="container">
          <RegisterPage
            onSuccess={handleAuthSuccess}
            onNavigateLogin={() => setPage('login')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        activePage="generate"
        currentUser={currentUser}
        onLoginClick={() => setPage('login')}
        onLogout={handleLogout}
      />
      <main className="container">
        {error && <div className="error">{error}</div>}

        {step === 'input' && (
          <RecipeInput
            onParse={handleParse}
            loading={loading}
            initialText={recipeText}
            initialServings={recipeServings}
            initialServingSize={recipeServingSize}
          />
        )}

        {step === 'review' && (
          <IngredientReview
            ingredients={ingredients}
            recipeName={recipeName}
            servings={servings}
            servingSize={servingSize}
            onUpdateIngredient={handleUpdateIngredient}
            onCalculate={handleCalculate}
            onBack={handleBackToInput}
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
