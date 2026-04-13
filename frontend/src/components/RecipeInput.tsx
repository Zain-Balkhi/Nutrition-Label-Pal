import { useState, useCallback, useRef } from 'react';
import StepIndicator from './StepIndicator';
import HowToModal from './HowToModal';
import InputActions from './InputActions';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { api } from '../services/api';
import { compressImage } from '../utils/imageCompress';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showReviewBanner, setShowReviewBanner] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelected = useCallback(async (file: File) => {
    setOcrError(null);
    if (!file.type.startsWith('image/')) {
      setOcrError('Please select an image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setOcrError('Image too large (max 20 MB).');
      return;
    }
    setOcrLoading(true);
    try {
      const compressed = await compressImage(file);
      const { raw_text } = await api.transcribeRecipeImage(compressed);
      if (!raw_text.trim()) {
        setOcrError('No readable text found in the image. Please try a clearer photo of a recipe.');
        return;
      }
      setRawText(prev => {
        const sep = prev.length > 0 && !prev.endsWith('\n') ? '\n' : '';
        return prev + sep + raw_text;
      });
      setShowReviewBanner(true);
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : 'Transcription failed.');
    } finally {
      setOcrLoading(false);
    }
  }, []);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handleImageSelected(f);
  };

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
    if (!rawText.trim() || !servings.trim() || !servingSize.trim()) {
      setAttemptedSubmit(true);
      return;
    }
    onParse(rawText, servings, servingSize);
  };

  return (
    <form className="recipe-input" onSubmit={handleSubmit}>
      <h2 className="page-title">Give a recipe, get a nutrition label!</h2>
      <StepIndicator currentStep={1} />
      <button type="button" className="howto-trigger" onClick={() => setShowHowTo(true)}>
        How does this work?
      </button>

      {showReviewBanner && (
        <div className="ocr-review-banner" role="alert">
          <span className="ocr-review-banner__icon" aria-hidden="true">⚠️</span>
          <span>
            Transcribed from image — please review the text below and fix any errors before creating the label.
          </span>
        </div>
      )}

      <textarea
        id="recipe-text"
        className="recipe-textarea"
        value={displayText}
        onChange={e => { setRawText(e.target.value); setInterimText(''); }}
        placeholder="Paste your recipe here..."
        rows={8}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onImageChange}
      />

      <InputActions>
        <button
          type="button"
          className="input-action-btn"
          onClick={() => imageInputRef.current?.click()}
          disabled={ocrLoading}
          aria-label="Add an image of your recipe"
          title="Take a photo or upload an image of your recipe"
        >
          {ocrLoading ? (
            <span className="spinner spinner-sm" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
          <span className="input-action-label">
            {ocrLoading ? 'Reading...' : 'Image'}
          </span>
        </button>
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
        <div className="voice-error" role="alert">{voiceError}</div>
      )}

      {ocrError && (
        <div className="voice-error" role="alert">{ocrError}</div>
      )}

      <div className="input-row">
        <div className={`field${attemptedSubmit && !servings.trim() ? ' field--missing' : ''}`}>
          <input
            id="servings"
            type="text"
            value={servings}
            onChange={e => setServings(e.target.value)}
            placeholder="Number of servings (e.g. 24)"
            aria-required="true"
            aria-invalid={attemptedSubmit && !servings.trim()}
          />
        </div>
        <div className={`field${attemptedSubmit && !servingSize.trim() ? ' field--missing' : ''}`}>
          <input
            id="serving-size"
            type="text"
            value={servingSize}
            onChange={e => setServingSize(e.target.value)}
            placeholder="Serving size (e.g. 1 cookie)"
            aria-required="true"
            aria-invalid={attemptedSubmit && !servingSize.trim()}
          />
        </div>
      </div>

      <div className="button-center">
        {(() => {
          const isInvalid = !rawText.trim() || !servings.trim() || !servingSize.trim();
          const isBusy = loading || ocrLoading;
          return (
            <button
              type="submit"
              disabled={isBusy}
              aria-disabled={isInvalid || isBusy}
              className={`btn-create${isInvalid && !isBusy ? ' btn-create--dulled' : ''}`}
            >
              {loading ? <><span className="spinner spinner-sm" />Parsing...</> : 'Create'}
            </button>
          );
        })()}
      </div>
      {showHowTo && <HowToModal onClose={() => setShowHowTo(false)} />}
    </form>
  );
}
