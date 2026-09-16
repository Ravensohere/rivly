/**
 * useGeminiVoice — Real-time voice conversation with Gemini via WebSocket
 *
 * Captures microphone audio, downsamples to 16kHz mono PCM, streams it to
 * our Cloudflare Worker relay (/api/riva/live), and plays back Gemini's
 * audio responses in real time.
 *
 * Protocol (to/from worker):
 *   Send:    { type: "audio", data: "<base64 PCM 16kHz>" }
 *   Send:    { type: "text",  text: "typed command" }
 *   Receive: { type: "setup_complete" }
 *   Receive: { type: "audio", audio: "<base64 PCM 24kHz>" }
 *   Receive: { type: "text",  text: "..." }
 *   Receive: { type: "turn_complete" }
 *   Receive: { type: "interrupted" }
 *   Receive: { type: "function_call", id, name, args }
 *   Receive: { type: "function_result", id, name, result }
 *   Receive: { type: "error", message }
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// --- Config ---
const SAMPLE_RATE_INPUT = 16000; // Required by Gemini
const SAMPLE_RATE_OUTPUT = 24000; // Gemini outputs 24kHz PCM
const CHUNK_INTERVAL_MS = 250; // Send audio chunks every 250ms
const SESSION_TIMEOUT_MS = 90_000; // 90-second hard cap

function deriveWsBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ||
    import.meta.env.VITE_WORKER_URL ||
    'https://vivly-backend.gnvenkatapathiraju.workers.dev';

  // http → ws, https → wss
  return raw.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

const WS_BASE_URL = deriveWsBaseUrl();

// --- Types ---
export interface GeminiFunctionCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface GeminiFunctionResult {
  id: string;
  name: string;
  result: Record<string, any>;
}

interface UseGeminiVoiceOptions {
  /** Called when Gemini invokes a function (create_task, start_focus, etc.) */
  onFunctionCall?: (fc: GeminiFunctionCall) => void;
  /** Called when the worker returns a function result */
  onFunctionResult?: (fr: GeminiFunctionResult) => void;
  /** Called when the session ends (timeout, error, or manual) */
  onSessionEnd?: (reason: string) => void;
  /** User's display name for Gemini's system prompt */
  userName?: string;
}

// --- Utility: base64 encode a Float32Array as 16-bit PCM ---
function float32ToBase64Pcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- Utility: downsample from browser's native rate to 16kHz ---
function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = i * ratio;
    const low = Math.floor(idx);
    const high = Math.min(low + 1, buffer.length - 1);
    const frac = idx - low;
    result[i] = buffer[low] * (1 - frac) + buffer[high] * frac;
  }
  return result;
}

// --- Utility: decode base64 PCM to Float32Array ---
function base64PcmToFloat32(base64: string, sampleRate: number): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

export function useGeminiVoice(options: UseGeminiVoiceOptions = {}) {
  const { onFunctionCall, onFunctionResult, onSessionEnd, userName } = options;

  // --- State ---
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Chunk accumulator (buffer audio between sends)
  const chunkBufferRef = useRef<Float32Array[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timeout
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard against double startSession calls
  const connectingRef = useRef(false);

  // Stable callback refs
  const onFunctionCallRef = useRef(onFunctionCall);
  const onFunctionResultRef = useRef(onFunctionResult);
  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => { onFunctionCallRef.current = onFunctionCall; }, [onFunctionCall]);
  useEffect(() => { onFunctionResultRef.current = onFunctionResult; }, [onFunctionResult]);
  useEffect(() => { onSessionEndRef.current = onSessionEnd; }, [onSessionEnd]);

  // --- Audio Playback ---
  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length === 0) {
      setIsAISpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);

    const chunk = audioQueueRef.current.shift()!;

    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE_OUTPUT });
    }
    const ctx = playbackContextRef.current;

    const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE_OUTPUT);
    buffer.getChannelData(0).set(chunk);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    currentSourceRef.current = source;

    source.onended = () => {
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      playNextChunk();
    };

    source.start();
  }, []);

  const enqueueAudio = useCallback(
    (float32: Float32Array) => {
      audioQueueRef.current.push(float32);
      if (!isPlayingRef.current) {
        playNextChunk();
      }
    },
    [playNextChunk],
  );

  /** Stop current playback (user interruption) */
  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch { /* already stopped */ }
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
    setIsAISpeaking(false);
  }, []);

  // --- Cleanup ---
  const cleanup = useCallback(
    (reason: string = 'cleanup') => {
      // Track whether there was actually an active session to clean up
      const hadActiveSession = !!wsRef.current || !!mediaStreamRef.current;

      // Stop chunk timer
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      // Stop session timer
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }

      // Stop microphone capture
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, reason);
        }
        wsRef.current = null;
      }

      // Stop playback
      stopPlayback();

      // Reset state
      chunkBufferRef.current = [];
      connectingRef.current = false;
      setIsConnected(false);
      setIsListening(false);
      setIsAISpeaking(false);

      // Only fire onSessionEnd if there was an actual session
      if (hadActiveSession) {
        onSessionEndRef.current?.(reason);
      }
    },
    [stopPlayback],
  );

  // --- Start Session ---
  const startSession = useCallback(async () => {
    if (wsRef.current || connectingRef.current) {
      console.warn('[GeminiVoice] Session already active or connecting');
      return;
    }
    connectingRef.current = true;

    setError(null);
    setTranscript('');

    // 1. Get user ID for auth
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      return;
    }
    const userId = session.user.id;

    // 2. Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: SAMPLE_RATE_INPUT },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error('[GeminiVoice] Microphone access denied:', err);
      setError('Microphone access denied. Please allow microphone permissions.');
      connectingRef.current = false;
      return;
    }

    // 3. Connect WebSocket
    const wsUrl = `${WS_BASE_URL}/api/riva/live?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName || '')}`;
    console.log('[GeminiVoice] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    connectingRef.current = false;

    ws.onopen = () => {
      console.log('[GeminiVoice] WebSocket connected, waiting for setup_complete...');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'setup_complete':
            console.log('[GeminiVoice] Gemini ready — starting audio capture');
            setIsConnected(true);
            setIsListening(true);
            startAudioCapture(stream);
            startSessionTimeout();
            break;

          case 'audio':
            if (msg.audio) {
              const pcm = base64PcmToFloat32(msg.audio, SAMPLE_RATE_OUTPUT);
              enqueueAudio(pcm);
            }
            break;

          case 'text':
            if (msg.text) {
              setTranscript((prev) => prev + msg.text);
            }
            break;

          case 'turn_complete':
            // AI finished speaking this turn
            console.log('[GeminiVoice] Turn complete');
            break;

          case 'interrupted':
            // Gemini acknowledged user interruption
            console.log('[GeminiVoice] AI interrupted by user');
            stopPlayback();
            break;

          case 'function_call':
            console.log('[GeminiVoice] Function call:', msg.name, msg.args);
            onFunctionCallRef.current?.({
              id: msg.id,
              name: msg.name,
              args: msg.args || {},
            });
            break;

          case 'function_result':
            console.log('[GeminiVoice] Function result:', msg.name, msg.result);
            onFunctionResultRef.current?.({
              id: msg.id,
              name: msg.name,
              result: msg.result || {},
            });
            break;

          case 'error':
            console.error('[GeminiVoice] Server error:', msg.message);
            setError(msg.message || 'Connection error');
            if (msg.message?.includes('timed out')) {
              cleanup('timeout');
            }
            break;
        }
      } catch (err) {
        console.error('[GeminiVoice] Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[GeminiVoice] WebSocket error:', err);
      setError('Connection error');
    };

    ws.onclose = (event) => {
      console.log(`[GeminiVoice] WebSocket closed: ${event.code} ${event.reason}`);
      cleanup(event.reason || 'disconnected');
    };
  }, [userName, enqueueAudio, stopPlayback, cleanup]);

  // --- Audio Capture ---
  const startAudioCapture = useCallback(
    (stream: MediaStream) => {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 48000 }); // browsers typically use 44.1k or 48k
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode with 4096 buffer (good balance of latency vs efficiency)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Downsample from browser rate to 16kHz
        const downsampled = downsample(new Float32Array(input), ctx.sampleRate, SAMPLE_RATE_INPUT);
        chunkBufferRef.current.push(downsampled);
      };

      source.connect(processor);
      processor.connect(ctx.destination); // Required for ScriptProcessor to work (outputs silence)

      // Send accumulated audio chunks at regular intervals
      chunkTimerRef.current = setInterval(() => {
        if (chunkBufferRef.current.length === 0) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        // Concatenate all buffered chunks
        const totalLength = chunkBufferRef.current.reduce((sum, c) => sum + c.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunkBufferRef.current) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        chunkBufferRef.current = [];

        // Convert to base64 PCM and send
        const base64 = float32ToBase64Pcm16(combined);
        wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
      }, CHUNK_INTERVAL_MS);
    },
    [],
  );

  // --- Session Timeout ---
  const startSessionTimeout = useCallback(() => {
    sessionTimerRef.current = setTimeout(() => {
      console.log('[GeminiVoice] Session timeout reached (90s)');
      cleanup('timeout');
    }, SESSION_TIMEOUT_MS);
  }, [cleanup]);

  // --- End Session ---
  const endSession = useCallback(() => {
    cleanup('user_ended');
  }, [cleanup]);

  // --- Send Text (from command bar) ---
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[GeminiVoice] Cannot send text — not connected');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'text', text }));
    setTranscript(''); // Clear for new response
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      cleanup('unmount');
    };
  }, [cleanup]);

  return {
    // State
    isConnected,
    isListening,
    isAISpeaking,
    transcript,
    error,

    // Actions
    startSession,
    endSession,
    sendText,
    stopPlayback,

    // Convenience
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
