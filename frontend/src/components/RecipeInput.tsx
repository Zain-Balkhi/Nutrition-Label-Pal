import { useState, useCallback } from 'react';
import StepIndicator from './StepIndicator';
import HowToModal from './HowToModal';
import InputActions from './InputActions';
import { useVoiceInput } from '../hooks/useVoiceInput';

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
  const [showHowTo, setShowHowTo] = useState(false);
  const [interimText, setInterimText] = useState('');

  const handleTranscript = useCallback((text: string) => {
    setRawText(prev => {
      const separator = prev.length > 0 && !prev.endsWith('\n') && !prev.endsWith(' ') ? '\n' : '';
      return prev + separator + text;
    });
    setInterimText('');
  }, []);

  const handleInterim = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  const { state: voiceState, error: voiceError, toggle: toggleVoice, isSupported } = useVoiceInput({
    onTranscript: handleTranscript,
    onInterim: handleInterim,
  });

  const displayText = interimText
    ? rawText + (rawText && !rawText.endsWith('\n') && !rawText.endsWith(' ') ? '\n' : '') + interimText
    : rawText;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    onParse(rawText, servings, servingSize);
  };

  return (
    <form className="recipe-input" onSubmit={handleSubmit}>
      <h2 className="page-title">Give a recipe, get a nutrition label!</h2>
      <StepIndicator currentStep={1} />
      <button type="button" className="howto-trigger" onClick={() => setShowHowTo(true)}>
        How does this work?
      </button>

      <textarea
        id="recipe-text"
        className="recipe-textarea"
        value={displayText}
        onChange={e => { setRawText(e.target.value); setInterimText(''); }}
        placeholder="Paste your recipe here..."
        rows={8}
      />

      <InputActions>
        {isSupported && (
          <button
            type="button"
            className={`input-action-btn${voiceState === 'listening' ? ' mic-btn--listening' : ''}`}
            onClick={toggleVoice}
            aria-label={voiceState === 'listening' ? 'Stop voice input' : 'Start voice input'}
            title={voiceState === 'listening' ? 'Stop voice input' : 'Dictate your recipe'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span className="input-action-label">
              {voiceState === 'listening' ? 'Listening...' : 'Voice'}
            </span>
          </button>
        )}
      </InputActions>

      {voiceError && (
        <div className="voice-error" role="alert">
          {voiceError}
        </div>
      )}

      <div className="input-row">
        <div className="field">
          <input
            id="servings"
            type="text"
            value={servings}
            onChange={e => setServings(e.target.value)}
            placeholder="Number of servings (e.g. 24)"
          />
        </div>
        <div className="field">
          <input
            id="serving-size"
            type="text"
            value={servingSize}
            onChange={e => setServingSize(e.target.value)}
            placeholder="Serving size (e.g. 1 cookie)"
          />
        </div>
      </div>

      <div className="button-center">
        <button type="submit" disabled={loading || !rawText.trim()} className="btn-create">
          {loading ? <><span className="spinner spinner-sm" />Parsing...</> : 'Create'}
        </button>
      </div>
      {showHowTo && <HowToModal onClose={() => setShowHowTo(false)} />}
    </form>
  );
}
