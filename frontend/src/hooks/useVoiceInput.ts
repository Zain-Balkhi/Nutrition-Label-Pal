import { useState, useRef, useEffect, useCallback } from 'react';

type VoiceState = 'idle' | 'listening' | 'unsupported';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  lang?: string;
  silenceTimeout?: number;
}

interface UseVoiceInputReturn {
  state: VoiceState;
  error: string | null;
  toggle: () => void;
  isSupported: boolean;
}

const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export function useVoiceInput({
  onTranscript,
  onInterim,
  lang = 'en-US',
  silenceTimeout = 7000,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>(
    SpeechRecognitionClass ? 'idle' : 'unsupported'
  );
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks in refs so the recognition handlers always see latest values
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterim);
  onTranscriptRef.current = onTranscript;
  onInterimRef.current = onInterim;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
      }, silenceTimeout);
    }
  }, [clearSilenceTimer, silenceTimeout]);

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer();

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript.trim());
      }
      if (onInterimRef.current) {
        onInterimRef.current(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access was denied. Please allow microphone access in your browser settings.',
        'permission-denied': 'Microphone access was denied. Please allow microphone access in your browser settings.',
        'no-speech': 'No speech detected. Please try again.',
        'network': 'Network error. Speech recognition requires an internet connection in some browsers.',
        'audio-capture': 'No microphone found. Please connect a microphone and try again.',
      };

      setError(errorMessages[event.error] || `Voice input error: ${event.error}. Please try again.`);
      setState('idle');
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setState('idle');
      // Clear interim text on end since anything not finalized is lost
      if (onInterimRef.current) {
        onInterimRef.current('');
      }
    };

    return recognition;
  }, [lang, resetSilenceTimer, clearSilenceTimer]);

  const toggle = useCallback(() => {
    if (state === 'unsupported') return;

    if (state === 'listening') {
      recognitionRef.current?.stop();
      return;
    }

    // Starting: clear previous error
    setError(null);

    // Create a fresh instance each time to avoid stale state issues
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setState('listening');
      resetSilenceTimer();
    } catch {
      setError('Could not start voice input. Please try again.');
      setState('idle');
    }
  }, [state, createRecognition, resetSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    error,
    toggle,
    isSupported: state !== 'unsupported',
  };
}
