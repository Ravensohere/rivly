import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceRecognitionOptions {
  onResult?: (text: string) => void;
  language?: string; // Language code like 'en-IN' or 'hi-IN'
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { onResult, language = 'en-IN' } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Use a ref for the callback so we can access the latest version inside event listeners
  const onResultRef = useRef(onResult);
  // Use a ref for the transcript so we can access the latest text inside 'onend'
  const transcriptRef = useRef('');
  // Use a ref for the language
  const languageRef = useRef(language);

  // Keep the callback ref up to date
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Keep language ref up to date
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      setIsSupported(true);
      console.log('[Voice] Browser supports SpeechRecognition');
    } else {
      setIsSupported(false);
      console.error('[Voice] Browser does NOT support SpeechRecognition');
      setError('Voice recognition not supported.');
    }
  }, []);

  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  const stopListening = useCallback(() => {
    console.log('[Voice] Stopping...');
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    // Don't set isListening false here, let onend handle it to process results
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return; // Prevent double start

    console.log('[Voice] Starting...');
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    transcriptRef.current = '';

    if (!isSupported) {
      console.error('[Voice] Not supported, cannot start');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Use continuous mode so it doesn't stop after a short pause
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageRef.current; // Use language from props (hi-IN for Hindi/Hinglish, en-IN for English)

    recognition.onstart = () => {
      console.log('[Voice] Recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalSegment = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSegment += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalSegment) {
        transcriptRef.current += finalSegment;
        setTranscript(transcriptRef.current);
      }
      setInterimTranscript(currentInterim);
      
      const combined = transcriptRef.current + currentInterim;
      console.log('[Voice] Interim result:', combined);

      // Reset silence timer on every new word
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      
      // If we have content, set a timer to auto-stop after silence
      if (combined.trim().length > 0) {
          silenceTimer.current = setTimeout(() => {
              console.log('[Voice] Silence detected, stopping...');
              recognition.stop();
          }, 2000); // Wait 2 seconds of silence before processing
      }
    };

    recognition.onerror = (event: any) => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      // Ignore 'aborted' and 'no-speech' errors as they are often expected flow
      if (event.error === 'aborted' || event.error === 'no-speech') {
        console.log('[Voice] Ignored error:', event.error);
        setIsListening(false);
        return;
      }
      
      // Special handling for network errors (common in Brave browser)
      if (event.error === 'network') {
        console.error('[Voice] Network error - likely blocked by browser privacy settings');
        setError('Speech recognition blocked. If using Brave, please allow fingerprinting for this site in Brave Shields settings.');
        setIsListening(false);
        return;
      }
      
      console.error('[Voice] Error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      console.log('[Voice] Ended. Final Transcript:', transcriptRef.current);
      setIsListening(false);
      
      // If we have a transcript, process it
      if (transcriptRef.current && transcriptRef.current.trim().length > 0 && onResultRef.current) {
        console.log('[Voice] Triggering onResult callback');
        onResultRef.current(transcriptRef.current);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('[Voice] Failed to start:', e);
      setIsListening(false);
    }
  }, [isSupported, isListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error,
    isSupported,
  };
}
