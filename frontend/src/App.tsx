import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import RecipeInput from './components/RecipeInput';
import IngredientReview from './components/IngredientReview';
import NutritionDisplay from './components/NutritionDisplay';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import RecipeDetail from './components/RecipeDetail';
import SaveLabelModal from './components/SaveLabelModal';
import AccountPage from './components/AccountPage';
import { api } from './services/api';
import type {
  AuthUser,
  IngredientWithMatch,
  NutritionResult,
  RecipeDetail as RecipeDetailType,
  SaveRecipeRequest,
} from './types';

type AppStep = 'input' | 'review' | 'results';
type Page = 'app' | 'login' | 'register' | 'dashboard' | 'recipe-detail' | 'account';

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

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<number | null>(null);

  // Pending recipe for post-register auto-save
  const [pendingRecipe, setPendingRecipe] = useState<SaveRecipeRequest | null>(null);

  // Recipe detail view
  const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null);

  // Edit mode — tracks which recipe is being edited
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  // Stamp initial browser history state on mount
  useEffect(() => {
    history.replaceState({ page: 'app', step: 'input' }, '');
  }, []);

  // Sync browser back/forward button
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const state = e.state as { page?: Page; step?: AppStep; recipeId?: number } | null;
      if (state?.page) {
        setPage(state.page);
        if (state.page === 'app' && state.step) setStep(state.step);
        if (state.page === 'recipe-detail' && state.recipeId) setViewingRecipeId(state.recipeId);
      } else {
        setPage('app');
        setStep('input');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Guard: redirect if step has missing data
  useEffect(() => {
    if (page !== 'app') return;
    if (step === 'results' && !nutritionResult) setStep('review');
    if (step === 'review' && ingredients.length === 0) setStep('input');
  }, [step, nutritionResult, ingredients.length, page]);

  // Keep localStorage in sync whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [currentUser]);

  function navigateTo(newPage: Page, extra: Record<string, unknown> = {}) {
    setPage(newPage);
    history.pushState({ page: newPage, ...extra }, '');
  }

  const handleAuthSuccess = useCallback(async (user: AuthUser, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setCurrentUser(user);

    // Auto-save pending recipe if one exists
    if (pendingRecipe) {
      try {
        const saved = await api.recipes.save(pendingRecipe);
        setPendingRecipe(null);
        setViewingRecipeId(saved.id);
        setPage('recipe-detail');
        history.replaceState({ page: 'recipe-detail', recipeId: saved.id }, '');
        return;
      } catch {
        // If save fails, still go to dashboard
        setPendingRecipe(null);
      }
    }

    setPage('app');
    history.replaceState({ page: 'app', step }, '');
  }, [pendingRecipe, step]);

  function handleLogout() {
    setCurrentUser(null);
    setPage('app');
    setStep('input');
    history.pushState({ page: 'app', step: 'input' }, '');
  }

  function handleDashboardClick() {
    if (!currentUser) {
      navigateTo('login');
      return;
    }
    setViewingRecipeId(null);
    navigateTo('dashboard');
  }

  function handleAccountClick() {
    if (!currentUser) {
      navigateTo('login');
      return;
    }
    navigateTo('account');
  }

  function handleUserUpdated(user: AuthUser) {
    setCurrentUser(user);
  }

  function handleAccountDeleted() {
    setCurrentUser(null);
    setPage('app');
    setStep('input');
    history.pushState({ page: 'app', step: 'input' }, '');
  }

  const handleParse = async (rawText: string, rawServings: string, rawServingSize: string) => {
    const srv = Number(rawServings) || 1;
    const srvSize = rawServingSize || '1 serving';

    if (
      rawText === recipeText &&
      rawServings === recipeServings &&
      rawServingSize === recipeServingSize &&
      ingredients.length > 0
    ) {
      setStep('review');
      history.pushState({ page: 'app', step: 'review' }, '');
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
      setStep('review');
      history.pushState({ page: 'app', step: 'review' }, '');
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
      setSavedRecipeId(null);
      setStep('results');
      history.pushState({ page: 'app', step: 'results' }, '');
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
    setSavedRecipeId(null);
    setEditingRecipeId(null);
    history.pushState({ page: 'app', step: 'input' }, '');
  };

  const handleBackToInput = () => window.history.back();

  function buildSaveRequest(title: string): SaveRecipeRequest {
    return {
      recipe_name: title,
      raw_text: recipeText,
      servings,
      serving_size: servingSize,
      ingredients: ingredients
        .filter(ing => ing.selected_fdc_id !== null)
        .map(ing => {
          const matchDesc = ing.matches.find(m => m.fdc_id === ing.selected_fdc_id)?.description ?? null;
          return {
            name: ing.parsed.name,
            quantity: ing.parsed.quantity,
            unit: ing.parsed.unit,
            preparation: ing.parsed.preparation,
            original_text: ing.parsed.original_text,
            fdc_id: ing.selected_fdc_id,
            matched_description: matchDesc,
            gram_weight: null,
          };
        }),
      nutrients: nutritionResult?.nutrients.map(n => ({
        name: n.name,
        amount: n.amount,
        unit: n.unit,
        daily_value_percent: n.daily_value_percent,
        display_value: n.display_value,
      })) ?? [],
    };
  }

  function handleSaveClick() {
    if (!currentUser) {
      // Stash pending recipe and redirect to login
      const req = buildSaveRequest(recipeName);
      setPendingRecipe(req);
      navigateTo('login');
      return;
    }
    setShowSaveModal(true);
  }

  async function handleSaveConfirm(title: string) {
    setSaving(true);
    try {
      if (editingRecipeId) {
        const updateReq = buildSaveRequest(title);
        const updated = await api.recipes.update(editingRecipeId, updateReq);
        setSavedRecipeId(updated.id);
      } else {
        const req = buildSaveRequest(title);
        const saved = await api.recipes.save(req);
        setSavedRecipeId(saved.id);
      }
      setShowSaveModal(false);
      setEditingRecipeId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  function handleViewSaved() {
    if (!currentUser) {
      navigateTo('login');
      return;
    }
    navigateTo('dashboard');
  }

  function handleViewRecipe(id: number) {
    setViewingRecipeId(id);
    navigateTo('recipe-detail', { recipeId: id });
  }

  function handleEditRecipe(recipe: RecipeDetailType) {
    // Pre-fill the input flow with saved recipe data
    setRecipeText(recipe.raw_text);
    setRecipeServings(String(recipe.servings));
    setRecipeServingSize(recipe.serving_size);
    setRecipeName(recipe.recipe_name);
    setServings(recipe.servings);
    setServingSize(recipe.serving_size);
    setEditingRecipeId(recipe.id);

    // Reconstruct ingredients from saved data
    setIngredients(
      recipe.ingredients.map(ing => ({
        parsed: {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation: ing.preparation,
          original_text: ing.original_text,
        },
        status: ing.fdc_id ? 'matched' : 'no_match',
        matches: ing.fdc_id && ing.matched_description
          ? [{ fdc_id: ing.fdc_id, description: ing.matched_description, data_type: '' }]
          : [],
        selected_fdc_id: ing.fdc_id,
      })),
    );

    setNutritionResult(null);
    setPage('app');
    setStep('input');
    history.pushState({ page: 'app', step: 'input' }, '');
  }

  function handleRecipeDeleted() {
    navigateTo('dashboard');
  }

  // ── Shared header props ───────────────────────────────────────────
  const headerProps = {
    currentUser,
    onLoginClick: () => navigateTo('login'),
    onLogout: handleLogout,
    onLogoClick: () => { setPage('app'); handleStartOver(); },
    onDashboardClick: handleDashboardClick,
    onAccountClick: handleAccountClick,
  };

  // ── Page rendering ────────────────────────────────────────────────

  if (page === 'login') {
    return (
      <div className="app">
        <Header activePage="login" {...headerProps} />
        <main className="container">
          <LoginPage
            onSuccess={handleAuthSuccess}
            onNavigateRegister={() => navigateTo('register')}
          />
        </main>
      </div>
    );
  }

  if (page === 'register') {
    return (
      <div className="app">
        <Header activePage="login" {...headerProps} />
        <main className="container">
          <RegisterPage
            onSuccess={handleAuthSuccess}
            onNavigateLogin={() => navigateTo('login')}
          />
        </main>
      </div>
    );
  }

  if (page === 'dashboard') {
    return (
      <div className="app">
        <Header activePage="dashboard" {...headerProps} />
        <main className="container">
          <Dashboard
            onViewRecipe={handleViewRecipe}
            onNewRecipe={() => { setPage('app'); handleStartOver(); }}
          />
        </main>
      </div>
    );
  }

  if (page === 'recipe-detail' && viewingRecipeId !== null) {
    return (
      <div className="app">
        <Header activePage="dashboard" {...headerProps} />
        <main className="container">
          <RecipeDetail
            recipeId={viewingRecipeId}
            onBack={() => navigateTo('dashboard')}
            onEdit={handleEditRecipe}
            onDelete={handleRecipeDeleted}
          />
        </main>
      </div>
    );
  }

  if (page === 'account' && currentUser) {
    return (
      <div className="app">
        <Header activePage="account" {...headerProps} />
        <main className="container">
          <AccountPage
            currentUser={currentUser}
            onUserUpdated={handleUserUpdated}
            onLogout={handleLogout}
            onAccountDeleted={handleAccountDeleted}
            onDashboardClick={handleDashboardClick}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header activePage="generate" {...headerProps} />
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
            onSave={handleSaveClick}
            onViewSaved={handleViewSaved}
            saveDisabled={savedRecipeId !== null}
            saveLabel={savedRecipeId !== null ? 'Saved!' : (editingRecipeId ? 'Update Recipe' : 'Save Label')}
          />
        )}
      </main>

      {showSaveModal && (
        <SaveLabelModal
          defaultTitle={recipeName}
          onSave={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
