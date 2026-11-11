/**
 * Browser speech-to-text for the desktop-control command box — "say it on your phone, it runs
 * on your PC" per the merge request. Uses the Web Speech API (SpeechRecognition), which ships
 * free in Chrome desktop and Chrome/WebView on Android (the Capacitor app's actual runtime) with
 * no server round trip or API key. Not available in Safari/iOS WebKit or Firefox — callers must
 * check `supported` and show a typed-input fallback, which DesktopControlPage already has (the
 * text box this feeds is the same one typing uses).
 *
 * A server-side fallback (recording audio, POSTing to the desktop agent's own
 * faster-whisper-backed /voice/transcribe) is a known next step for unsupported browsers — not
 * built this pass, see MERGE_LOG.md.
 */
import { useEffect, useRef, useState } from 'react';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(onFinalTranscript: (text: string) => void) {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || listening) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (e) => {
      let finalChunk = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimText(interim);
      if (finalChunk.trim()) onFinalRef.current(finalChunk.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      setInterimText('');
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { supported, listening, interimText, start, stop };
}
