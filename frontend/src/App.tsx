import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import HomePage from './components/HomePage';
import { api } from './services/api';
import type {
  AuthUser,
  IngredientWithMatch,
  NutritionResult,
  RecipeDetail as RecipeDetailType,
  SaveRecipeRequest,
} from './types';

type AppStep = 'input' | 'review' | 'results';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function ProtectedRoute({ currentUser, children }: { currentUser: AuthUser | null; children: React.ReactNode }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [allergens, setAllergens] = useState<string[]>([]);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);
  const [recipeNotes, setRecipeNotes] = useState<string>('');
  const [recipeImage, setRecipeImage] = useState<string | null>(null);

  // Snapshot of last-persisted values — used to detect unsaved changes.
  // null = never saved (button should be enabled so user can save).
  type SavedSnapshot = {
    recipe_name: string;
    servings: number;
    serving_size: string;
    notes: string;
    image: string | null;
    allergens: string[];
  };
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(null);

  const isDirty =
    !savedSnapshot ||
    savedSnapshot.recipe_name !== recipeName ||
    savedSnapshot.servings !== servings ||
    savedSnapshot.serving_size !== servingSize ||
    savedSnapshot.notes !== recipeNotes ||
    savedSnapshot.image !== recipeImage ||
    savedSnapshot.allergens.join('\u0000') !== allergens.join('\u0000');

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<number | null>(null);

  // Pending recipe for post-register auto-save
  const [pendingRecipe, setPendingRecipe] = useState<SaveRecipeRequest | null>(null);

  // Edit mode — tracks which recipe is being edited
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  // Guard: redirect if step has missing data
  useEffect(() => {
    if (location.pathname !== '/generate') return;
    if (step === 'results' && !nutritionResult) setStep('review');
    if (step === 'review' && ingredients.length === 0) setStep('input');
  }, [step, nutritionResult, ingredients.length, location.pathname]);

  // Keep localStorage in sync whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [currentUser]);

  const handleAuthSuccess = useCallback(async (user: AuthUser, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setCurrentUser(user);

    // Auto-save pending recipe if one exists
    if (pendingRecipe) {
      try {
        const saved = await api.recipes.save(pendingRecipe);
        setPendingRecipe(null);
        navigate(`/recipes/${saved.id}`, { replace: true });
        return;
      } catch {
        // If save fails, still go to generate
        setPendingRecipe(null);
      }
    }

    navigate('/generate', { replace: true });
  }, [pendingRecipe, navigate]);

  function handleLogout() {
    setCurrentUser(null);
    setStep('input');
    navigate('/generate');
  }

  function handleUserUpdated(user: AuthUser) {
    setCurrentUser(user);
  }

  function handleAccountDeleted() {
    setCurrentUser(null);
    setStep('input');
    navigate('/generate');
  }

  const handleParse = async (rawText: string, rawServings: string, rawServingSize: string) => {
    const srv = parseInt(rawServings, 10) || 1;
    const srvSize = rawServingSize || '1 serving';

    if (
      rawText === recipeText &&
      rawServings === recipeServings &&
      rawServingSize === recipeServingSize &&
      ingredients.length > 0
    ) {
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
      setAllergens(data.allergens || []);
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
        allergens,
      );
      setNutritionResult(result);
      setSavedRecipeId(null);
      // Fresh calculation = nothing persisted yet → dirty until saved.
      setSavedSnapshot(null);
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
    setAllergens([]);
    setNutritionResult(null);
    setError(null);
    setSavedRecipeId(null);
    setEditingRecipeId(null);
    setRecipeNotes('');
    setRecipeImage(null);
    setSavedSnapshot(null);
  };

  const handleBackToInput = () => setStep('input');

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
      allergens: allergens,
      notes: recipeNotes,
      image_data_url: recipeImage,
    };
  }

  function handleSaveClick() {
    if (!currentUser) {
      // Stash pending recipe and redirect to login
      const req = buildSaveRequest(recipeName);
      setPendingRecipe(req);
      navigate('/login');
      return;
    }
    // If the recipe already exists on the server, skip the title-prompt
    // modal and just update it. This covers both the "editing a saved
    // recipe" path and the "user saved once then tweaked something" path.
    const existingId = editingRecipeId ?? savedRecipeId;
    if (existingId !== null) {
      void handleDirectUpdate(existingId);
      return;
    }
    setShowSaveModal(true);
  }

  async function handleDirectUpdate(existingId: number) {
    setSaving(true);
    try {
      const req = buildSaveRequest(recipeName);
      const updated = await api.recipes.update(existingId, req);
      setSavedRecipeId(updated.id);
      setSavedSnapshot({
        recipe_name: recipeName,
        servings,
        serving_size: servingSize,
        notes: recipeNotes,
        image: recipeImage,
        allergens: [...allergens],
      });
      setEditingRecipeId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
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
      setRecipeName(title);
      setSavedSnapshot({
        recipe_name: title,
        servings,
        serving_size: servingSize,
        notes: recipeNotes,
        image: recipeImage,
        allergens: [...allergens],
      });
      setShowSaveModal(false);
      setEditingRecipeId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  function handleViewSaved() {
    navigate('/recipes');
  }

  function handleEditRecipe(recipe: RecipeDetailType) {
    // Pre-fill the input flow with saved recipe data
    setRecipeText(recipe.raw_text);
    setRecipeServings(String(recipe.servings));
    setRecipeServingSize(recipe.serving_size);
    setRecipeName(recipe.recipe_name);
    setServings(recipe.servings);
    setServingSize(recipe.serving_size);
    setAllergens(recipe.allergens || []);
    setRecipeNotes(recipe.notes ?? '');
    setRecipeImage(recipe.image_data_url ?? null);
    setEditingRecipeId(recipe.id);
    setSavedSnapshot({
      recipe_name: recipe.recipe_name,
      servings: recipe.servings,
      serving_size: recipe.serving_size,
      notes: recipe.notes ?? '',
      image: recipe.image_data_url ?? null,
      allergens: recipe.allergens ?? [],
    });

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
    setStep('input');
    navigate('/generate');
  }

  async function handleEditLabel(updates: { servings: number; serving_size: string }) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.calculateNutrition(
        ingredients,
        updates.servings,
        updates.serving_size,
        recipeName,
        allergens,
      );
      setNutritionResult(result);
      setServings(updates.servings);
      setServingSize(updates.serving_size);

      // Persist to DB if editing an existing recipe
      if (editingRecipeId) {
        await api.recipes.update(editingRecipeId, {
          servings: updates.servings,
          serving_size: updates.serving_size,
          nutrients: result.nutrients.map(n => ({
            name: n.name,
            amount: n.amount,
            unit: n.unit,
            daily_value_percent: n.daily_value_percent,
            display_value: n.display_value,
          })),
        });
        // Reflect the persisted change in the snapshot so the Save button
        // stays disabled unless a further change is made.
        setSavedSnapshot(prev =>
          prev
            ? { ...prev, servings: updates.servings, serving_size: updates.serving_size }
            : prev,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate nutrition');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function handleRecipeDeleted() {
    navigate('/recipes');
  }

  return (
    <div className="app">
      <Header currentUser={currentUser} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/generate" element={
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
                onEditLabel={handleEditLabel}
                saveDisabled={!isDirty}
                saveLabel={
                  !isDirty
                    ? 'Saved!'
                    : editingRecipeId
                      ? 'Update Recipe'
                      : savedRecipeId !== null
                        ? 'Save Changes'
                        : 'Save Label'
                }
                ingredientNames={ingredients
                  .filter(ing => ing.selected_fdc_id !== null)
                  .map(ing => ing.parsed.name)}
                notes={recipeNotes}
                imageDataUrl={recipeImage}
                onNotesChange={setRecipeNotes}
                onImageChange={setRecipeImage}
              />
            )}
          </main>
        } />

        <Route path="/login" element={
          <main className="container">
            <LoginPage
              onSuccess={handleAuthSuccess}
              onNavigateRegister={() => navigate('/register')}
            />
          </main>
        } />

        <Route path="/register" element={
          <main className="container">
            <RegisterPage
              onSuccess={handleAuthSuccess}
              onNavigateLogin={() => navigate('/login')}
            />
          </main>
        } />

        <Route path="/recipes" element={
          <ProtectedRoute currentUser={currentUser}>
            <main className="container">
              <Dashboard />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/recipes/:id" element={
          <ProtectedRoute currentUser={currentUser}>
            <main className="container">
              <RecipeDetail
                onEdit={handleEditRecipe}
                onDelete={handleRecipeDeleted}
              />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/account" element={
          <ProtectedRoute currentUser={currentUser}>
            <main className="container">
              <AccountPage
                currentUser={currentUser!}
                onUserUpdated={handleUserUpdated}
                onLogout={handleLogout}
                onAccountDeleted={handleAccountDeleted}
              />
            </main>
          </ProtectedRoute>
        } />

        {/* Catch-all: redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
