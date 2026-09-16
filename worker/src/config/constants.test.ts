import { describe, it, expect } from 'vitest';
import { buildCorsConfig, ALLOWED_ORIGINS, AI_MODELS, MODEL_FOR_TASK, AI_CONFIG } from './constants';

const originOf = (cfg: ReturnType<typeof buildCorsConfig>, origin: string) =>
  cfg.origin(origin);

describe('buildCorsConfig', () => {
  const cors = buildCorsConfig();

  // Regression: the allowlist held only the legacy vivly.app domains while
  // production served from rivly.in, so every browser call from the live site
  // failed preflight with "No 'Access-Control-Allow-Origin' header".
  it.each([
    'https://rivly.in',
    'https://www.rivly.in',
  ])('echoes the production origin %s', (origin) => {
    expect(originOf(cors, origin)).toBe(origin);
  });

  it('echoes the Capacitor shell origins', () => {
    expect(originOf(cors, 'capacitor://localhost')).toBe('capacitor://localhost');
    expect(originOf(cors, 'https://localhost')).toBe('https://localhost');
  });

  it('echoes local dev origins', () => {
    expect(originOf(cors, 'http://localhost:8080')).toBe('http://localhost:8080');
  });

  it('refuses an unknown origin', () => {
    expect(originOf(cors, 'https://evil.example')).toBeNull();
  });

  it('refuses a lookalike that merely contains an allowed host', () => {
    expect(originOf(cors, 'https://rivly.in.evil.example')).toBeNull();
    expect(originOf(cors, 'http://rivly.in')).toBeNull();
  });

  it('adds FRONTEND_URL and tolerates a trailing slash', () => {
    const cfg = buildCorsConfig('https://preview.rivly.in/');
    expect(originOf(cfg, 'https://preview.rivly.in')).toBe('https://preview.rivly.in');
  });

  it('never returns a wildcard, since responses are credentialed', () => {
    expect(ALLOWED_ORIGINS).not.toContain('*');
    expect(originOf(cors, '*')).toBeNull();
  });
});

// Regression: Groq decommissioned every llama-* chat model, but AI_MODELS.fast
// still pointed at llama-3.1-8b-instant. Every fast-tier call 404'd, and
// because the degrade target IS the fast tier, groqChat had no fallback and
// threw — taking out inbox extraction, command parsing and the briefings.
describe('AI model routing', () => {
  // Models Groq served as of 2026-08-30. Update deliberately, not reflexively:
  // a name that vanishes here is an outage, so re-check /v1/models first.
  const GROQ_CHAT_MODELS = new Set([
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-safeguard-20b',
    'qwen/qwen3.6-27b',
    'qwen/qwen3.8-27b',
    'groq/compound',
    'groq/compound-mini',
  ]);

  it('routes every task to a model Groq still serves', () => {
    for (const [task, model] of Object.entries(MODEL_FOR_TASK)) {
      expect(GROQ_CHAT_MODELS.has(model), `${task} -> ${model}`).toBe(true);
    }
  });

  it('names no decommissioned llama model', () => {
    for (const model of Object.values(AI_MODELS)) {
      expect(model).not.toMatch(/llama/i);
    }
  });

  it('points the groq default at a live model, since it is the degrade target', () => {
    expect(GROQ_CHAT_MODELS.has(AI_CONFIG.groq.model)).toBe(true);
  });
});
