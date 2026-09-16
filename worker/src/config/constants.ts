/**
 * Admin allowlist used only when the ADMIN_EMAILS secret is not configured.
 * Set ADMIN_EMAILS (comma-separated) in Cloudflare so this list can go away.
 */
export const ADMIN_EMAILS_FALLBACK = [
  'gnvenkatapathiraju@gmail.com',
  'ravenso.here@gmail.com',
  'venkatwork2295@gmail.com',
] as const;

/**
 * Full paths that bypass authentication. Matched on segment boundaries, so
 * `/api/admin/health` does not inherit `/api/health`'s public status.
 */
export const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/waitlist',
  '/api/riva/live',
  // Cashfree's server-to-server callback. Authenticated by HMAC signature
  // inside the handler, not by a bearer token.
  '/api/payment/webhook',
] as const;

/** Origins allowed to call the API from a browser. */
export const ALLOWED_ORIGINS = [
  // Production site. Both apex and www are served, so both must be allowed —
  // a browser sends the exact host it loaded, and www is what users land on.
  'https://rivly.in',
  'https://www.rivly.in',
  // Legacy brand domain, kept until it stops resolving.
  'https://vivly.app',
  'https://www.vivly.app',
  // Capacitor shells (Android/iOS) present these as their page origin.
  'https://localhost',
  'capacitor://localhost',
  // Local development.
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:4173',
] as const;

/**
 * Build the CORS config for this environment.
 *
 * Credentials-bearing APIs must echo a specific origin, never `*`. Unknown
 * origins get no CORS headers, which is what blocks a hostile page from
 * reading responses.
 */
export function buildCorsConfig(frontendUrl?: string) {
  const allowed = new Set<string>(ALLOWED_ORIGINS);
  if (frontendUrl) allowed.add(frontendUrl.replace(/\/$/, ''));

  return {
    origin: (origin: string) => (allowed.has(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  };
}

// -----------------------------
// AI Model Routing
// -----------------------------
// Different models for different jobs, routed by (frequency × value):
// high-frequency low-stakes calls get the cheapest model; low-frequency
// calls the user pays credits for get the quality model.
//
// Groq PRODUCTION models (verified against /v1/models on 2026-08-30, per 1M
// tokens). Groq decommissioned every llama-* chat model; only these remain:
//   openai/gpt-oss-20b     $0.075 in / $0.30 out · 1000 t/s → fast tier
//   openai/gpt-oss-120b    $0.15 in / $0.60 out  · 500 t/s  → ~₹0.10 per learning path
//   qwen/qwen3.6-27b, qwen/qwen3.8-27b, groq/compound       → unused
// NOTE: gpt-oss models spend reasoning tokens before emitting content, and
// those count against max_tokens. Budget >=800 or JSON mode returns an empty
// generation and Groq rejects it with 400 json_validate_failed.
// Voice stays on Gemini Live native audio (see gemini-live.ts) —
// ~₹0.70/session with buffer, charged 5 credits + capped at 90s.
export const AI_MODELS = {
  /** Cheapest + fastest. For high-frequency, simple-schema calls. */
  fast: 'openai/gpt-oss-20b',
  /** Stronger reasoning, JSON-reliable, still cheap (~3× fast tier on output). */
  quality: 'openai/gpt-oss-120b',
} as const;

/** Which model each AI task uses. Change tiers here, not at call sites. */
export const MODEL_FOR_TASK = {
  command_parse: AI_MODELS.fast,      // every Riva command — volume is huge, schema is simple
  transcript_fix: AI_MODELS.fast,     // trivial cleanup, runs before most commands
  tool_answer: AI_MODELS.fast,        // summarizing weather/news/search results
  morning_briefing: AI_MODELS.fast,   // 120 tokens of warmth, 1×/day
  orb_guide: AI_MODELS.fast,          // 1-sentence insight
  insights: AI_MODELS.quality,        // pattern analysis — reasoning quality matters
  learning_path: AI_MODELS.quality,   // user pays 60 credits — quality IS the product
} as const;

// AI Configuration
export const AI_CONFIG = {
  groq: {
    model: AI_MODELS.fast, // default when no task-specific model is given
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  },
};
