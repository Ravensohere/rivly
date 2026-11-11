/**
 * Server-side speech-to-text fallback for browsers without the Web Speech API (Safari/iOS,
 * Firefox — see useSpeechInput.ts). Records raw mic audio via the Web Audio API, encodes it as
 * 16kHz mono 16-bit PCM WAV in-browser (no server transcoding needed), and POSTs it to the
 * desktop agent's existing /voice/transcribe route (faster-whisper, local-mode only — the cloud
 * Worker has no STT model, so this fallback only works when LOCAL_DESKTOP_URL is set).
 *
 * The desktop backend's transcribe_wav_bytes (F:\Personal Assistant\app\backend\voice\stt.py)
 * reads the WAV header's frame rate but does NOT resample to match it before feeding faster-
 * whisper — the audio must actually BE 16kHz already, which is why this encodes at exactly that
 * rate rather than leaving it at the mic's native rate (usually 44.1/48kHz).
 */
import { useRef, useState } from 'react';

const TARGET_SAMPLE_RATE = 16000;

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function useRecorderTranscribe(
  onTranscript: (text: string) => void,
  transcribe: (wavBlob: Blob) => Promise<{ text: string }>,
) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  async function start() {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated in favor of AudioWorklet, but needs no separate worklet
    // module file and works everywhere — acceptable for this short-lived, narrow-scope fallback.
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    chunksRef.current = [];
    processor.onaudioprocess = (e) => {
      chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    setRecording(true);
  }

  async function stop() {
    const ctx = ctxRef.current;
    const processor = processorRef.current;
    const stream = streamRef.current;
    if (!ctx || !processor || !stream) return;
    processor.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    const sampleRate = ctx.sampleRate;
    await ctx.close();
    setRecording(false);

    const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let o = 0;
    for (const c of chunksRef.current) {
      merged.set(c, o);
      o += c.length;
    }
    chunksRef.current = [];
    const downsampled = downsampleBuffer(merged, sampleRate, TARGET_SAMPLE_RATE);
    const wavBlob = encodeWav(downsampled, TARGET_SAMPLE_RATE);

    setBusy(true);
    try {
      const { text } = await transcribe(wavBlob);
      if (text.trim()) onTranscript(text.trim());
    } finally {
      setBusy(false);
    }
  }

  return { recording, busy, start, stop };
}
