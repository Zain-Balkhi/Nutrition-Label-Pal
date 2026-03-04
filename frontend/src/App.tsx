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

  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [servingSize, setServingSize] = useState('1 serving');
  const [ingredients, setIngredients] = useState<IngredientWithMatch[]>([]);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);

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
