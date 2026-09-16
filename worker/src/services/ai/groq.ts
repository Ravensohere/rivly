import { AI_CONFIG, AI_MODELS, MODEL_FOR_TASK } from '../../config/constants';

/**
 * RIVA — Production-grade MVP module
 * - Groq helper with timeout
 * - Strict JSON validation + retry
 * - Deterministic scheduler underneath AI hints (prevents hallucinated schedules)
 * - Bridge → Auto-plan support via generateDayPlanFromCheckIn()
 * - Command-first assistant via generatePlan()
 *
 * IMPORTANT:
 * Do NOT call Groq directly from the browser in production (API key leakage).
 * Use your Cloudflare Worker as a proxy. This module is safe to run server-side.
 *
 * UPGRADES:
 * - Transcript Correction: LLM-powered STT error correction using user context
 * - Energy-Curve Scheduling: Morning peak → post-lunch dip → evening second wind
 * - Memory Engine: Lightweight interaction memory for personalization
 */

type Role = 'system' | 'user' | 'assistant';

type CheckIn = {
  mood?: number;         // 1–5
  energy?: number;       // 1–3
  sleepQuality?: number; // 1–10 (UI slider)
  intent?: string;
};

type UserPrefs = {
  dayStart?: string;  // "08:00"
  dayEnd?: string;    // "22:00"
  timezone?: string;  // "Asia/Kolkata"
  defaultMode?: Mode; // gentle|normal|beast
  language?: 'en' | 'hi' | 'hinglish';
};

type Task = {
  id?: string;
  title: string;
  dueDate?: string; // "YYYY-MM-DD"
  dueTime?: string; // "HH:MM"
  estimatedMinutes?: number; // 10/25/50/90 etc.
  priority?: 'low' | 'medium' | 'high';
  tag?: 'work' | 'personal' | 'study' | 'health' | 'other';
  status?: 'todo' | 'done';
};

type CalendarBlock = {
  title?: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  fixed?: boolean;
};

type PlanBlock = {
  title: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  type: 'focus' | 'task' | 'break' | 'event';
  meta?: Record<string, any>;
};

type Mode = 'gentle' | 'normal' | 'beast';

type RivaAction =
  | 'start_planning'
  | 'generate_day_plan'
  | 'online_response'
  | 'create_task'
  | 'create_tasks'
  | 'open_reschedule'
  | 'start_focus'
  | 'explain_concept'
  | 'set_reminder'
  | 'create_learning_path'
  | 'edit_learning_path'
  | 'add_to_shopping_list'
  | 'show_shopping_list'
  | 'remove_from_shopping_list'
  | 'search_web'
  | 'get_weather'
  | 'search_youtube'
  | 'get_news';

type RivaResponse = {
  message: string;
  action: RivaAction;
  data?: any;
  questions?: string[]; // max 2
  creditsCost?: number; // optional (useful for UI)
};

// --- Memory Engine Types ---

type MemoryEntry = {
  timestamp: number;
  transcript: string;
  correctedTranscript?: string;
  action: string;
  taskTitle?: string;
  tag?: string;
};

type UserPreferences = {
  wakeUpTime?: string;
  sleepTime?: string;
  workHours?: string;
  dietaryPrefs?: string;
  examDates?: { name: string; date: string }[];
};

type UserMemory = {
  recentInteractions: MemoryEntry[];   // last 20
  frequentTasks: Record<string, number>; // title → frequency
  corrections: { raw: string; corrected: string }[]; // last 15 corrections
  preferredTags: Record<string, number>; // tag → frequency
  lastMode?: Mode;
  avgSessionMinutes?: number;
  userFacts?: string[];  // things user told Riva about themselves (max 20)
  preferences?: UserPreferences;
};

// --- Transcript Correction Types ---

type TranscriptCorrectionResult = {
  original: string;
  corrected: string;
  confidence: number; // 0-1
  wasChanged: boolean;
};

// -----------------------------
// Groq client utilities
// -----------------------------

/**
 * Models to fall back through, in order, when the requested one fails.
 * Must list genuinely distinct models: the previous code degraded to
 * `AI_CONFIG.groq.model`, which IS the fast tier, so a fast-tier outage had
 * no fallback at all and simply threw.
 */
const DEGRADE_ORDER: readonly string[] = [AI_MODELS.fast, AI_MODELS.quality];

/** Only the gpt-oss family accepts reasoning_effort; others 400 on it. */
function supportsReasoningEffort(model: string): boolean {
  return model.startsWith('openai/gpt-oss');
}

export type ReasoningEffort = 'low' | 'medium' | 'high';

export async function groqChat(
  apiKey: string,
  messages: { role: Role; content: string }[],
  opts?: {
    temperature?: number;
    max_tokens?: number;
    json?: boolean;
    timeoutMs?: number;
    /** Task-specific model (see MODEL_FOR_TASK in constants.ts). Defaults to the fast tier. */
    model?: string;
    /**
     * gpt-oss models emit reasoning tokens BEFORE any content, and those count
     * against max_tokens. At our budgets (60-380) default reasoning eats the
     * whole allowance: JSON calls fail with 400 json_validate_failed and plain
     * calls return an empty string with finish_reason "length" — a silent
     * blank briefing. 'low' keeps reasoning to ~10 tokens, so we default to it
     * and let callers with room to spare opt into deeper reasoning.
     */
    reasoningEffort?: ReasoningEffort;
  }
): Promise<string> {
  return groqChatWithFallback(apiKey, messages, opts, new Set(), false);
}

async function groqChatWithFallback(
  apiKey: string,
  messages: { role: Role; content: string }[],
  opts: Parameters<typeof groqChat>[2],
  tried: Set<string>,
  budgetRaised: boolean
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 12000);
  const model = opts?.model ?? AI_CONFIG.groq.model;
  const maxTokens = opts?.max_tokens ?? 300;
  const effort = opts?.reasoningEffort ?? 'low';
  tried.add(model);

  try {
    const res = await fetch(AI_CONFIG.groq.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts?.temperature ?? 0.25,
        max_tokens: maxTokens,
        ...(supportsReasoningEffort(model) ? { reasoning_effort: effort } : {}),
        ...(opts?.json ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const text = await res.text();
      // Rate-limited, down, or decommissioned: move to the next distinct model
      // rather than failing the user's request. `tried` prevents a loop.
      const next = DEGRADE_ORDER.find((m) => !tried.has(m));
      if (
        next &&
        (res.status === 429 || res.status >= 500 || res.status === 404 || res.status === 400)
      ) {
        console.warn(`[Groq] ${model} failed (${res.status}), degrading to ${next}`);
        clearTimeout(timeout);
        return groqChatWithFallback(apiKey, messages, { ...opts, model: next }, tried, budgetRaised);
      }
      throw new Error(`Groq API Error (${res.status}): ${text}`);
    }

    const data: any = await res.json();
    const choice = data.choices?.[0];
    const content = (choice?.message?.content ?? '').trim();

    // Reasoning consumed the entire budget and left no answer. Retry once with
    // room to breathe instead of handing the caller a confident empty string.
    if (!content && choice?.finish_reason === 'length' && !budgetRaised) {
      console.warn(`[Groq] ${model} spent all ${maxTokens} tokens reasoning; retrying with more room`);
      clearTimeout(timeout);
      return groqChatWithFallback(
        apiKey,
        messages,
        { ...opts, model, max_tokens: Math.max(maxTokens * 4, 800), reasoningEffort: 'low' },
        tried,
        true
      );
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function hasHindiChars(s: string) {
  return /[\u0900-\u097F]/.test(s);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeText(s: any, maxLen = 240) {
  const str = String(s ?? '').replace(/\s+/g, ' ').trim();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

// -----------------------------
// Memory Engine
// -----------------------------

const MAX_RECENT = 20;
const MAX_CORRECTIONS = 15;

function createEmptyMemory(): UserMemory {
  return {
    recentInteractions: [],
    frequentTasks: {},
    corrections: [],
    preferredTags: {},
  };
}

function updateMemory(memory: UserMemory, entry: MemoryEntry): UserMemory {
  const m = { ...memory };

  // Add to recent interactions (FIFO)
  m.recentInteractions = [entry, ...m.recentInteractions].slice(0, MAX_RECENT);

  // Track frequent tasks
  if (entry.taskTitle) {
    const key = entry.taskTitle.toLowerCase().trim();
    m.frequentTasks = { ...m.frequentTasks };
    m.frequentTasks[key] = (m.frequentTasks[key] || 0) + 1;
  }

  // Track tag preferences
  if (entry.tag) {
    m.preferredTags = { ...m.preferredTags };
    m.preferredTags[entry.tag] = (m.preferredTags[entry.tag] || 0) + 1;
  }

  // Track corrections
  if (entry.correctedTranscript && entry.correctedTranscript !== entry.transcript) {
    m.corrections = [
      { raw: entry.transcript, corrected: entry.correctedTranscript },
      ...m.corrections
    ].slice(0, MAX_CORRECTIONS);
  }

  return m;
}

/**
 * Compact, prompt-ready summary of what Riva remembers about this user.
 * Shared by the voice session (gemini-live) and morning briefing so Riva
 * feels personal everywhere, not just in typed commands.
 */
export function summarizeMemoryForPrompt(memory: UserMemory | null | undefined): string {
  if (!memory) return '';
  const lines: string[] = [];

  const freq = getTopFrequentTasks(memory, 4);
  if (freq.length) lines.push(`Often works on: ${freq.join(', ')}`);

  if (memory.userFacts?.length) {
    for (const f of memory.userFacts.slice(0, 10)) lines.push(f);
  }

  const p = memory.preferences;
  if (p) {
    if (p.wakeUpTime) lines.push(`Wakes up around ${p.wakeUpTime}`);
    if (p.sleepTime) lines.push(`Sleeps around ${p.sleepTime}`);
    if (p.workHours) lines.push(`Work hours: ${p.workHours}`);
    if (p.dietaryPrefs) lines.push(`Diet: ${p.dietaryPrefs}`);
    if (p.examDates?.length) {
      const today = new Date();
      for (const e of p.examDates.slice(0, 3)) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
          if (daysLeft >= 0) {
            lines.push(`${e.name} exam on ${e.date} (${daysLeft === 0 ? 'TODAY' : `in ${daysLeft} days`})`);
            continue;
          }
        }
        lines.push(`${e.name} exam on ${e.date}`);
      }
    }
  }

  const recent = memory.recentInteractions?.slice(0, 3) || [];
  if (recent.length) {
    lines.push(`Recently asked Riva to: ${recent.map(r => r.action).join(', ')}`);
  }

  if (!lines.length) return '';
  return lines.map(l => `- ${l}`).join('\n');
}

function getTopFrequentTasks(memory: UserMemory, n = 5): string[] {
  return Object.entries(memory.frequentTasks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function getRecentTaskTitles(memory: UserMemory, n = 10): string[] {
  return memory.recentInteractions
    .filter(e => e.taskTitle)
    .slice(0, n)
    .map(e => e.taskTitle!)
    .filter((v, i, a) => a.indexOf(v) === i); // unique
}

/**
 * Extract user facts/preferences from a transcript using simple regex/keyword matching.
 * No extra LLM call needed — runs after every AI response.
 */
function extractUserFacts(memory: UserMemory, transcript: string): UserMemory {
  const m = { ...memory };
  const lower = transcript.toLowerCase();
  if (!m.preferences) m.preferences = {};
  if (!m.userFacts) m.userFacts = [];

  // Wake up time: "I wake up at 6" / "I get up at 7am"
  const wakeMatch = lower.match(/(?:i\s+)?(?:wake|get)\s+up\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (wakeMatch) {
    let h = parseInt(wakeMatch[1]);
    const meridian = wakeMatch[3];
    if (meridian === 'pm' && h < 12) h += 12;
    if (meridian === 'am' && h === 12) h = 0;
    m.preferences.wakeUpTime = `${h.toString().padStart(2, '0')}:${wakeMatch[2] || '00'}`;
  }

  // Sleep time: "I sleep at 11pm" / "I go to bed at 10"
  const sleepMatch = lower.match(/(?:i\s+)?(?:sleep|go to bed|sone)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (sleepMatch) {
    let h = parseInt(sleepMatch[1]);
    const meridian = sleepMatch[3];
    if (meridian === 'pm' && h < 12) h += 12;
    if (!meridian && h < 7) h += 12; // assume PM for small numbers
    m.preferences.sleepTime = `${h.toString().padStart(2, '0')}:${sleepMatch[2] || '00'}`;
  }

  // Dietary preferences
  const dietMatch = lower.match(/\b(i'?m|i am|i eat)\s+(vegetarian|vegan|non[- ]?veg|eggetarian|jain)/);
  if (dietMatch) {
    m.preferences.dietaryPrefs = dietMatch[2];
  }

  // Exam dates: "my exam is on March 20" / "JEE is on April 15"
  const examMatch = lower.match(/(?:my\s+)?(\w+)\s+(?:exam|test|paper)\s+(?:is\s+)?(?:on\s+)?(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/);
  if (examMatch) {
    const examDate = { name: examMatch[1], date: examMatch[2] };
    if (!m.preferences.examDates) m.preferences.examDates = [];
    // Don't duplicate
    const exists = m.preferences.examDates.some(e => e.name.toLowerCase() === examDate.name.toLowerCase());
    if (!exists) {
      m.preferences.examDates = [...m.preferences.examDates, examDate].slice(0, 10);
    }
  }

  // Generic user facts: "I work from home" / "I'm a student" / "I have 2 kids"
  const factPatterns = [
    /i(?:'m| am) (?:a |an )?(student|teacher|developer|engineer|designer|doctor|freelancer|working professional)/,
    /i work (?:from |at |in )(.{3,30})/,
    /i (?:have|got) (\d+ (?:kid|child|pet|cat|dog)s?)/,
    /i (?:live|stay) (?:in|at) (.{3,30})/,
    /i prefer (\d+)[- ]?min(?:ute)? (?:focus|pomodoro|sessions?)/,
  ];

  for (const pattern of factPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const fact = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      if (!m.userFacts.includes(fact) && m.userFacts.length < 20) {
        m.userFacts = [...m.userFacts, fact];
      }
    }
  }

  return m;
}

// Exported for the route layer to persist memory in KV/Supabase
export { createEmptyMemory, updateMemory, extractUserFacts, getTopFrequentTasks, getRecentTaskTitles };
export type { UserMemory, MemoryEntry, TranscriptCorrectionResult };

// -----------------------------
// Transcript Correction Engine
// -----------------------------

/**
 * Uses Groq LLM to correct STT mishearings.
 * The model sees the raw transcript + user's known tasks/vocabulary
 * and outputs what the user most likely said.
 *
 * Cost: 1 fast LLM call (~50 tokens output). Runs BEFORE the main plan call.
 */
export async function correctTranscript(
  apiKey: string,
  rawTranscript: string,
  context?: {
    recentTasks?: string[];
    frequentTasks?: string[];
    corrections?: { raw: string; corrected: string }[];
    language?: string;
  }
): Promise<TranscriptCorrectionResult> {
  // Skip correction for very short or clearly clean inputs
  if (!rawTranscript || rawTranscript.trim().length < 3) {
    return { original: rawTranscript, corrected: rawTranscript, confidence: 1, wasChanged: false };
  }

  const recentTasks = (context?.recentTasks ?? []).slice(0, 8);
  const frequentTasks = (context?.frequentTasks ?? []).slice(0, 5);
  const pastCorrections = (context?.corrections ?? []).slice(0, 5);

  const examplesBlock = pastCorrections.length
    ? `\nPast corrections (learn from these):\n${pastCorrections.map(c => `  "${c.raw}" → "${c.corrected}"`).join('\n')}`
    : '';

  const vocabBlock = [...recentTasks, ...frequentTasks].length
    ? `\nUser's known vocabulary (tasks they frequently say):\n  ${[...new Set([...recentTasks, ...frequentTasks])].join(', ')}`
    : '';

  const system = `You are a speech-to-text correction engine. Your ONLY job is to fix mishearings.
Rules:
- Output ONLY the corrected transcript. Nothing else.
- If the transcript is already correct, output it unchanged.
- Fix common STT errors: homophones, word boundaries, missing/extra words.
- Fix intent-altering mishearings especially carefully:
  "whether" when context suggests weather forecast → "weather"
  "no" when context suggests knowledge → "know"
  "male" when context suggests email → "mail"
  "their/there/they're", "your/you're", "to/too/two" — pick the right one based on meaning.
- Think about what the user is TRYING TO SAY, not just individual word corrections.
- Use the user's known vocabulary to guess intended words.
- Preserve the user's language (English, Hindi, Hinglish).
- Do NOT add information. Do NOT change the user's intent.
- Do NOT add punctuation or formatting beyond what's natural.
- Keep it concise — output only the corrected text.${examplesBlock}${vocabBlock}`;

  const user = `Raw STT transcript: "${sanitizeText(rawTranscript, 300)}"

Corrected transcript:`;

  try {
    const corrected = await groqChat(
      apiKey,
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { temperature: 0.1, max_tokens: 120, timeoutMs: 5000, model: MODEL_FOR_TASK.transcript_fix }
    );

    const cleaned = corrected
      .replace(/^["']|["']$/g, '')  // strip quotes
      .replace(/^corrected transcript:\s*/i, '') // strip echo
      .trim();

    if (!cleaned || cleaned.length < 2) {
      return { original: rawTranscript, corrected: rawTranscript, confidence: 0.5, wasChanged: false };
    }

    const wasChanged = cleaned.toLowerCase() !== rawTranscript.toLowerCase();

    // Simple confidence heuristic: if very different, lower confidence
    const similarity = computeStringSimilarity(rawTranscript.toLowerCase(), cleaned.toLowerCase());
    const confidence = wasChanged ? Math.max(0.4, similarity) : 1;

    return { original: rawTranscript, corrected: cleaned, confidence, wasChanged };
  } catch (err) {
    console.error('[TranscriptCorrection] Error:', err);
    return { original: rawTranscript, corrected: rawTranscript, confidence: 0.5, wasChanged: false };
  }
}

/**
 * Levenshtein-based similarity (0-1). Used to gauge correction confidence.
 */
function computeStringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Simplified: use bigram overlap for speed (avoid O(n²) levenshtein on edge worker)
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const bg1 = bigrams(a);
  const bg2 = bigrams(b);
  if (bg1.size === 0 && bg2.size === 0) return 1;

  let intersection = 0;
  bg1.forEach(bi => { if (bg2.has(bi)) intersection++; });

  return (2 * intersection) / (bg1.size + bg2.size);
}

// -----------------------------
// Deterministic scheduling engine
// -----------------------------

function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`Invalid time: ${hhmm}`);
  return h * 60 + min;
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mergeIntervals(intervals: { start: number; end: number }[]) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const it of sorted) {
    if (!merged.length) merged.push({ ...it });
    else {
      const last = merged[merged.length - 1];
      if (it.start <= last.end) last.end = Math.max(last.end, it.end);
      else merged.push({ ...it });
    }
  }
  return merged;
}

function computeModeFromSignals(checkIn: CheckIn, prefs?: UserPrefs): Mode {
  const mood = clamp(Number(checkIn?.mood ?? 3), 1, 5);
  const energy = clamp(Number(checkIn?.energy ?? 2), 1, 3);
  const sleep = clamp(Number(checkIn?.sleepQuality ?? 7), 1, 10);

  // If user has explicit default mode preference, treat it as a soft bias:
  const bias = prefs?.defaultMode ?? null;

  // Simple signal-based suggestion:
  // - Beast if mood high AND energy high AND sleep ok
  // - Gentle if sleep poor OR energy low OR mood low
  // - else normal
  const suggested: Mode =
    (mood >= 4 && energy >= 3 && sleep >= 7) ? 'beast' :
    (sleep <= 4 || energy <= 1 || mood <= 2) ? 'gentle' :
    'normal';

  // Bias the final mode slightly:
  if (bias && bias !== suggested) {
    // If bias is gentle and suggested is beast, settle to normal
    if (bias === 'gentle' && suggested === 'beast') return 'normal';
    // If bias is beast and suggested is gentle, settle to normal
    if (bias === 'beast' && suggested === 'gentle') return 'normal';
  }
  return suggested;
}

// --- Energy Curve Engine ---

/**
 * Models a typical human energy curve across the day.
 * Returns a multiplier (0.4 - 1.0) for a given minute-of-day.
 *
 * Peak:       08:00 – 11:00  (1.0)
 * Pre-lunch:  11:00 – 12:00  (0.85)
 * Post-lunch: 12:30 – 14:30  (0.55 — the dip)
 * Afternoon:  14:30 – 17:00  (0.75)
 * Evening:    17:00 – 19:00  (0.80 — second wind)
 * Late:       19:00 – 22:00  (0.60)
 * Night:      22:00+         (0.40)
 */
function energyCurve(minuteOfDay: number): number {
  if (minuteOfDay < 480)  return 0.5;   // before 8am
  if (minuteOfDay < 660)  return 1.0;   // 8–11am peak
  if (minuteOfDay < 720)  return 0.85;  // 11am–12pm
  if (minuteOfDay < 750)  return 0.7;   // 12–12:30 lunch
  if (minuteOfDay < 870)  return 0.55;  // 12:30–2:30pm dip
  if (minuteOfDay < 1020) return 0.75;  // 2:30–5pm
  if (minuteOfDay < 1140) return 0.80;  // 5–7pm second wind
  if (minuteOfDay < 1320) return 0.60;  // 7–10pm
  return 0.40;                           // after 10pm
}

/**
 * Ranks tasks by priority for a given energy level.
 * High energy → high priority / hard tasks first.
 * Low energy → light / low priority tasks.
 */
function taskEnergyScore(task: Task, energyLevel: number): number {
  const priScore = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
  const estMin = task.estimatedMinutes ?? 25;
  const effortScore = estMin >= 50 ? 3 : estMin >= 25 ? 2 : 1;

  // High energy slots should get high-priority, high-effort tasks
  // Low energy slots should get low-priority, light tasks
  if (energyLevel >= 0.8) return priScore * 3 + effortScore * 2;  // prefer hard work
  if (energyLevel >= 0.6) return priScore * 2 + (4 - effortScore); // balanced
  return (4 - priScore) + (4 - effortScore); // prefer light tasks in dips
}

function chooseBlockSizeMinutes(mode: Mode, checkIn: CheckIn, energyLevel?: number): number {
  const energy = clamp(Number(checkIn?.energy ?? 2), 1, 3);
  const sleep = clamp(Number(checkIn?.sleepQuality ?? 7), 1, 10);
  const curve = energyLevel ?? 0.75;

  // Default sizes:
  if (mode === 'gentle') return curve < 0.6 ? 20 : 25;
  if (mode === 'beast') return curve >= 0.8 ? 50 : 40;

  // Normal mode adapts to energy curve:
  if (energy === 1 || sleep <= 4 || curve < 0.55) return 20;
  if ((energy === 3 && sleep >= 7) || curve >= 0.9) return 50;
  if (curve >= 0.7) return 30;
  return 25;
}

function breakEveryNBlocks(mode: Mode, checkIn: CheckIn): number {
  const energy = clamp(Number(checkIn?.energy ?? 2), 1, 3);
  if (mode === 'gentle') return energy <= 1 ? 1 : 2;
  if (mode === 'beast') return 3;
  return energy <= 1 ? 2 : 3;
}

function breakDuration(mode: Mode, checkIn: CheckIn, energyLevel?: number): number {
  const energy = clamp(Number(checkIn?.energy ?? 2), 1, 3);
  const curve = energyLevel ?? 0.75;

  // Longer breaks during energy dips
  if (curve < 0.6) return mode === 'beast' ? 7 : 12;
  if (mode === 'gentle') return energy <= 1 ? 10 : 7;
  if (mode === 'beast') return 5;
  return energy <= 1 ? 7 : 5;
}

// --- Lunch Break Auto-Insertion ---

const LUNCH_START = 12 * 60 + 30; // 12:30
const LUNCH_END = 13 * 60 + 15;   // 13:15
const LUNCH_DURATION = 45;

function shouldInsertLunch(dayStartMin: number, dayEndMin: number, calendar: CalendarBlock[]): boolean {
  // Only if the user's day spans the lunch window
  if (dayStartMin > LUNCH_START || dayEndMin < LUNCH_END) return false;
  // Check if there's already a lunch/meal event
  return !calendar.some(c => {
    const start = toMinutes(c.start);
    const end = toMinutes(c.end);
    const title = (c.title || '').toLowerCase();
    return (title.includes('lunch') || title.includes('meal') || title.includes('eat')) ||
           (start <= LUNCH_START && end >= LUNCH_END);
  });
}

// Buffer between blocks (minutes)
const BUFFER_MINUTES = 5;

function sortTasksForToday(tasks: Task[], todayISO: string): Task[] {
  const safe = tasks
    .filter(t => t && t.title && t.status !== 'done')
    .map(t => ({
      ...t,
      title: sanitizeText(t.title, 80),
      estimatedMinutes: clamp(Number(t.estimatedMinutes ?? 25), 10, 240),
      priority: t.priority ?? 'medium'
    }));

  const dueRank = (t: Task) => {
    if (!t.dueDate) return 3;
    if (t.dueDate < todayISO) return 0; // overdue
    if (t.dueDate === todayISO) return 1; // today
    return 2; // future
  };

  const priRank = (p?: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);

  safe.sort((a, b) => {
    const dr = dueRank(a) - dueRank(b);
    if (dr !== 0) return dr;
    const pr = priRank(a.priority) - priRank(b.priority);
    if (pr !== 0) return pr;
    // shorter tasks earlier if equal
    return (a.estimatedMinutes ?? 25) - (b.estimatedMinutes ?? 25);
  });

  return safe;
}

function buildDeterministicDayPlan(params: {
  mode: Mode;
  checkIn: CheckIn;
  tasks: Task[];
  calendar: CalendarBlock[];
  prefs?: UserPrefs;
  todayISO: string;
  memory?: UserMemory;
}): { blocks: PlanBlock[]; assumptions: string[] } {
  const { mode, checkIn, tasks, calendar, prefs, todayISO, memory } = params;

  const dayStart = prefs?.dayStart ?? '08:00';
  const dayEnd = prefs?.dayEnd ?? '22:00';

  const startMin = toMinutes(dayStart);
  const endMin = toMinutes(dayEnd);
  if (endMin <= startMin) throw new Error('Invalid dayStart/dayEnd prefs');

  // Auto-insert lunch if no lunch event exists
  const calendarWithLunch = [...(calendar ?? [])];
  if (shouldInsertLunch(startMin, endMin, calendarWithLunch)) {
    calendarWithLunch.push({
      title: 'Lunch Break',
      start: toHHMM(LUNCH_START),
      end: toHHMM(LUNCH_START + LUNCH_DURATION),
      fixed: true
    });
  }

  const busyIntervals = mergeIntervals(
    calendarWithLunch.map(b => ({
      start: clamp(toMinutes(b.start), startMin, endMin),
      end: clamp(toMinutes(b.end), startMin, endMin)
    })).filter(i => i.end > i.start)
  );

  // Free slots: [startMin, endMin] minus busy intervals
  const free: { start: number; end: number }[] = [];
  let cur = startMin;
  for (const bi of busyIntervals) {
    if (bi.start > cur) free.push({ start: cur, end: bi.start });
    cur = Math.max(cur, bi.end);
  }
  if (cur < endMin) free.push({ start: cur, end: endMin });

  const assumptions: string[] = [];
  assumptions.push(`Mode: ${mode}`);
  assumptions.push(`Day window: ${dayStart}-${dayEnd}`);
  assumptions.push(`Calendar blocks respected`);
  if (shouldInsertLunch(startMin, endMin, calendar ?? [])) {
    assumptions.push(`Auto-inserted lunch break (12:30-13:15)`);
  }

  const sortedTasks = sortTasksForToday(tasks ?? [], todayISO);
  if (!sortedTasks.length) {
    // fallback: create a gentle default block
    const blockSize = chooseBlockSizeMinutes(mode, checkIn, energyCurve(startMin));
    const first = free[0];
    if (!first || first.end - first.start < blockSize) {
      return {
        blocks: calendarWithLunch.map(e => ({
          title: e.title ?? 'Busy',
          start: e.start,
          end: e.end,
          type: 'event'
        })),
        assumptions: [...assumptions, 'No free slot found; showing calendar only']
      };
    }

    const blocks: PlanBlock[] = [
      ...calendarWithLunch.map(e => ({ title: e.title ?? 'Event', start: e.start, end: e.end, type: 'event' as const })),
      {
        title: 'Focus block (choose one task)',
        start: toHHMM(first.start),
        end: toHHMM(first.start + blockSize),
        type: 'focus' as const
      }
    ].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    assumptions.push('No tasks found — added one starter focus block');
    return { blocks, assumptions };
  }

  assumptions.push(`Energy-curve scheduling: hard tasks in morning peak, light tasks in afternoon dip`);
  assumptions.push(`${BUFFER_MINUTES}m buffer between blocks`);

  const blocks: PlanBlock[] = [];
  // Insert calendar events as fixed blocks
  for (const e of calendarWithLunch) {
    blocks.push({ title: e.title ?? 'Event', start: e.start, end: e.end, type: 'event' });
  }

  // Create a mutable copy of tasks for energy-aware reordering per slot
  const remainingTasks = sortedTasks.map(t => ({ ...t }));
  let focusCount = 0;

  for (const slot of free) {
    let t = slot.start;

    while (t + 10 <= slot.end && remainingTasks.length > 0) {
      const curEnergy = energyCurve(t);
      const breakEvery = breakEveryNBlocks(mode, checkIn);
      const breakMins = breakDuration(mode, checkIn, curEnergy);
      const blockSize = chooseBlockSizeMinutes(mode, checkIn, curEnergy);

      // Insert break if needed
      if (focusCount > 0 && focusCount % breakEvery === 0) {
        const bEnd = Math.min(t + breakMins, slot.end);
        if (bEnd - t >= 3) {
          blocks.push({ title: 'Break', start: toHHMM(t), end: toHHMM(bEnd), type: 'break' });
          t = bEnd + BUFFER_MINUTES;
          continue;
        }
      }

      const remaining = slot.end - t;
      if (remaining < 10) break;

      // Energy-aware task picking: score each remaining task for the current energy level
      const scored = remainingTasks.map((task, idx) => ({
        idx,
        score: taskEnergyScore(task, curEnergy)
      }));
      scored.sort((a, b) => b.score - a.score);

      // But respect due-date urgency: overdue/today tasks always come first
      const bestIdx = scored[0].idx;
      const task = remainingTasks[bestIdx];

      const taskMins = task.estimatedMinutes ?? blockSize;
      const alloc = Math.min(blockSize, remaining, taskMins);
      if (alloc < 10) break;

      // Place task block
      blocks.push({
        title: task.title,
        start: toHHMM(t),
        end: toHHMM(t + alloc),
        type: 'task',
        meta: {
          taskId: task.id ?? null,
          tag: task.tag ?? 'other',
          priority: task.priority ?? 'medium',
          energyLevel: Math.round(curEnergy * 100) / 100
        }
      });

      t += alloc + BUFFER_MINUTES; // add buffer between blocks
      focusCount++;

      // Reduce task remaining minutes or remove
      const newRemaining = taskMins - alloc;
      if (newRemaining <= 10) {
        remainingTasks.splice(bestIdx, 1);
      } else {
        remainingTasks[bestIdx] = { ...task, estimatedMinutes: newRemaining };
      }
    }
    if (remainingTasks.length === 0) break;
  }

  // Sort by time
  blocks.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  // If tasks couldn't fit, add a note block near end
  if (remainingTasks.length > 0) {
    const leftover = remainingTasks.slice(0, 4).map(t => t.title);
    assumptions.push('Not all tasks fit into today — some left unscheduled');
    blocks.push({
      title: `Unscheduled: ${leftover.join(', ')}${remainingTasks.length > 4 ? '…' : ''}`,
      start: dayEnd,
      end: dayEnd,
      type: 'break',
      meta: { note: true }
    });
  }

  return { blocks, assumptions };
}

// -----------------------------
// Validation for AI JSON responses
// -----------------------------

function validateInsights(obj: any) {
  return (
    obj &&
    typeof obj.summary === 'string' &&
    (typeof obj.energyPattern === 'string' || obj.energyPattern === null) &&
    Array.isArray(obj.suggestions) &&
    obj.suggestions.every((s: any) => typeof s === 'string')
  );
}

function validateRivaResponse(obj: any): obj is RivaResponse {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.message !== 'string') return false;
  if (typeof obj.action !== 'string') return false;

  const allowed: Set<string> = new Set([
    'start_planning',
    'generate_day_plan',
    'online_response',
    'create_task',
    'create_tasks',
    'open_reschedule',
    'start_focus',
    'explain_concept',
    'set_reminder',
    'create_learning_path',
    'edit_learning_path',
    'add_to_shopping_list',
    'show_shopping_list',
    'remove_from_shopping_list',
    'search_web',
    'get_weather',
    'search_youtube',
    'get_news'
  ]);

  if (!allowed.has(obj.action)) return false;
  if (obj.data != null && typeof obj.data !== 'object') return false;
  if (obj.questions != null) {
    if (!Array.isArray(obj.questions)) return false;
    if (obj.questions.length > 2) return false;
    if (!obj.questions.every((q: any) => typeof q === 'string')) return false;
  }
  if (obj.creditsCost != null && typeof obj.creditsCost !== 'number') return false;
  return true;
}

// -----------------------------
// Public API — Feature functions
// -----------------------------

/**
 * Generate morning briefing using Groq API (short spoken text).
 * Keeps the feature exactly, but fixes sleep scale and reduces randomness.
 */
export async function generateMorningBriefing(apiKey: string, checkIn: CheckIn, userName: string, memory?: UserMemory): Promise<string> {
  const mood = clamp(Number(checkIn?.mood ?? 3), 1, 5);
  const energy = clamp(Number(checkIn?.energy ?? 2), 1, 3);
  const sleepRaw = clamp(Number(checkIn?.sleepQuality ?? 7), 1, 10);
  const intent = sanitizeText(checkIn?.intent ?? '', 60);

  const sleepLabel = sleepRaw <= 3 ? 'Poor' : sleepRaw <= 7 ? 'Okay' : 'Good';
  const languageHint = hasHindiChars(intent) ? 'hinglish_or_hindi' : 'english';
  const personal = summarizeMemoryForPrompt(memory);

  const system = `
You are Riva, ${sanitizeText(userName, 40)}'s warm, personal morning companion — like a caring friend saying good morning, not a generic assistant.
Rules:
- Do NOT invent tasks, events, deadlines, or user history.
- Use only the provided check-in data${personal ? ' and the remembered facts below' : ''}.
- Tone follows mood: mood <= 2 → extra gentle, suggest one tiny win; energy low → suggest a short 15-20 min start; good mood + energy → bring energy.
- Max 3 short sentences. No markdown. No emojis.
- If intent is empty, suggest a gentle default: one small step + one focus block.${personal ? `
Personal touch:
- Weave in at most ONE remembered fact ONLY if it naturally fits (an exam coming up, their usual routine). Like a friend who remembers — never "according to my records".
REMEMBERED FACTS:
${personal}` : ''}
Language:
- Reply in English unless user's intent is clearly Hindi/Hinglish.`;

  const user = `
User: ${sanitizeText(userName, 40)}
Check-in:
- Mood: ${mood}/5
- Energy: ${energy}/3
- Sleep: ${sleepLabel} (${sleepRaw}/10)
- Intent: ${intent || '(none)'}
Language hint: ${languageHint}
Write the morning briefing now.`;

  try {
    const content = await groqChat(
      apiKey,
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { temperature: 0.35, max_tokens: 120, model: MODEL_FOR_TASK.morning_briefing }
    );
    return content || `Good morning ${userName}. Let's start gently and take one clear step today.`;
  } catch {
    return `Good morning ${userName}. Let's start gently and take one clear step today.`;
  }
}

/**
 * Generate AI insights using Groq API (JSON).
 * Keeps the feature, but hardens parsing & schema validation.
 */
export async function generateAIInsights(apiKey: string, stats: any, daysBack: number): Promise<{
  summary: string;
  energyPattern: string | null;
  suggestions: string[];
}> {
  const prompt = `
You are a calm Rhythm Guide analyzing a user's patterns.
Hard rules:
- Do not invent data beyond what is provided.
- Keep suggestions specific and actionable.

Context (Last ${daysBack} days):
- Tasks: ${stats.completedTasks}/${stats.totalTasks} (${stats.completionRate}%)
- Focus: ${stats.totalFocusMinutes} minutes (${stats.avgFocusPerDay} min/day)
- Mood: ${stats.avgMood}/5
- Energy: ${stats.avgEnergy}/3
- Reflections: ${stats.reflectionCount}
- Busy Days: ${stats.busyDays} days with 5+ calendar blocks

Return JSON:
{
  "summary": "...",
  "energyPattern": "... or null",
  "suggestions": ["...", "..."]
}`;

  try {
    const raw = await groqChat(apiKey, [{ role: 'user', content: prompt }], {
      temperature: 0.25,
      max_tokens: 240,
      json: true,
      model: MODEL_FOR_TASK.insights
    });

    const parsed = safeJsonParse(raw);
    if (parsed && validateInsights(parsed)) return parsed;
  } catch (err) {
    console.error('[Insights] error:', err);
  }

  return { summary: "You're building a steady rhythm — keep it up!", energyPattern: null, suggestions: [] };
}

/**
 * Generate orb guide insight (1 sentence).
 * Keeps feature, uses shared Groq client for consistency.
 */
export async function generateOrbGuide(apiKey: string, focusHistory: any[], userName: string): Promise<string> {
  const prompt = `
You are a gentle Rhythm Guide.
Context:
- Recent Focus Sessions: ${focusHistory?.length || 0} sessions in last 3 days.
- User Name: ${sanitizeText(userName || 'Friend', 40)}.

Task: Provide a 1-sentence supportive insight about their rhythm.
Tone: Calm, minimal, encouraging. Max 20 words.
Language: English only. No emojis.`;

  try {
    const content = await groqChat(apiKey, [{ role: 'user', content: prompt }], {
      temperature: 0.35,
      max_tokens: 60,
      model: MODEL_FOR_TASK.orb_guide
    });
    return content || 'Breathe and find your flow.';
  } catch {
    return 'Breathe and find your flow.';
  }
}

// -----------------------------
// NEW: Bridge → Auto Day Plan (safe & deterministic)
// -----------------------------

/**
 * This is what your "Generate today's plan ✨" button should call.
 * - Uses Groq only to ask 0–2 clarifying questions + optionally rank priorities.
 * - Scheduling is deterministic, so it won't hallucinate impossible times.
 */
export async function generateDayPlanFromCheckIn(
  apiKey: string,
  input: {
    userName: string;
    checkIn: CheckIn;
    tasks: Task[];
    calendar: CalendarBlock[];
    preferences?: UserPrefs;
    mode?: Mode; // if user explicitly selected
    todayISO?: string; // "YYYY-MM-DD" optional
  }
): Promise<{
  message: string;
  mode: Mode;
  blocks: PlanBlock[];
  assumptions: string[];
  questions: string[];
}> {
  const todayISO = input.todayISO ?? new Date().toISOString().slice(0, 10);
  const prefs = input.preferences ?? {};
  const suggestedMode = computeModeFromSignals(input.checkIn, prefs);
  const mode: Mode = input.mode ?? suggestedMode;

  // If there are no tasks and calendar is empty, ask one clarifying question (keep it minimal)
  const hasAny = (input.tasks?.length ?? 0) > 0 || (input.calendar?.length ?? 0) > 0;

  const intent = sanitizeText(input.checkIn?.intent ?? '', 60);
  const languageHint = hasHindiChars(intent) ? 'hinglish_or_hindi' : 'english';

  // Use Groq only to ask up to 2 questions if needed.
  let questions: string[] = [];
  if (!hasAny) {
    questions = [
      "What are your top 3 tasks for today?"
    ];
  } else {
    // Ask at most 1 question if day window missing
    if (!prefs.dayStart || !prefs.dayEnd) {
      questions = [
        "What time do you want to start and end your day today? (Example: 09:00 to 21:00)"
      ];
    }
  }

  const { blocks, assumptions } = buildDeterministicDayPlan({
    mode,
    checkIn: input.checkIn,
    tasks: input.tasks ?? [],
    calendar: input.calendar ?? [],
    prefs,
    todayISO
  });

  const message = questions.length
    ? `I can plan your day, but I need one quick detail first.`
    : `Got it. Here's a ${mode} plan for today — start with your next block.`;

  return {
    message,
    mode,
    blocks,
    assumptions,
    questions
  };
}

// -----------------------------
// Command-first assistant (7 P0 + improved auto plan)
// -----------------------------

function compactContext(context: any) {
  // Do NOT dump raw JSON into the prompt (prompt injection + token bloat).
  const checkIn: CheckIn | null = context?.checkIn
    ? {
        mood: Number(context.checkIn.mood ?? 3),
        energy: Number(context.checkIn.energy ?? 2),
        sleepQuality: Number(context.checkIn.sleepQuality ?? 7),
        intent: sanitizeText(context.checkIn.intent ?? '', 80)
      }
    : null;

  const tasks: Task[] = Array.isArray(context?.tasks)
    ? context.tasks.slice(0, 60).map((t: any) => ({
        id: t.id,
        title: sanitizeText(t.title, 80),
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        estimatedMinutes: Number(t.estimatedMinutes ?? 25),
        priority: t.priority,
        tag: t.tag,
        status: t.status
      }))
    : [];

  const calendar: CalendarBlock[] = Array.isArray(context?.calendar)
    ? context.calendar.slice(0, 60).map((b: any) => ({
        title: sanitizeText(b.title ?? 'Event', 60),
        start: sanitizeText(b.start, 5),
        end: sanitizeText(b.end, 5),
        fixed: true
      }))
    : [];

  const prefs: UserPrefs = {
    dayStart: context?.preferences?.dayStart,
    dayEnd: context?.preferences?.dayEnd,
    timezone: context?.preferences?.timezone ?? 'Asia/Kolkata',
    defaultMode: context?.preferences?.defaultMode,
    language: context?.preferences?.language
  };

  const user = {
    name: sanitizeText(context?.user?.name ?? context?.userName ?? 'Friend', 40)
  };

  const planBlocks: PlanBlock[] = Array.isArray(context?.planBlocks)
    ? context.planBlocks.slice(0, 120)
    : [];

  return { user, checkIn, tasks, calendar, prefs, planBlocks };
}

function localRoute(transcript: string, context: ReturnType<typeof compactContext>): RivaResponse | null {
  const t = transcript.trim().toLowerCase();

  // What's next
  if (/(what('?s)? next|next block|what should i do now)/i.test(transcript)) {
    const blocks = context.planBlocks ?? [];
    if (blocks.length) {
      const tz = context.prefs.timezone || 'Asia/Kolkata';
      let nowM = 0;
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23'
        });
        const parts = formatter.formatToParts(new Date());
        const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
        const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
        nowM = h * 60 + m;
      } catch {
        const now = new Date();
        nowM = now.getHours() * 60 + now.getMinutes();
      }
      const next = blocks.find(b => {
        const s = toMinutes(b.start);
        const e = toMinutes(b.end);
        return e >= nowM; // current or upcoming
      }) ?? blocks[0];

      const dur = Math.max(1, toMinutes(next.end) - toMinutes(next.start));
      return {
        message: `Next up: ${next.title}. It'll take about ${dur} minutes.`,
        action: 'online_response',
        data: { next }
      };
    }
    return { message: "You don't have a scheduled block yet. Say: 'Plan my day'.", action: 'online_response', data: {} };
  }

  // Start focus for X minutes
  if (/(start focus|focus for|pomodoro|start timer)/i.test(transcript)) {
    const m = /(\d{1,3})\s*(min|mins|minutes|m)\b/i.exec(transcript);
    const duration = clamp(m ? Number(m[1]) : 25, 5, 180);
    return {
      message: `Starting ${duration}m focus. You've got this!`,
      action: 'start_focus',
      data: { duration }
    };
  }

  // Plan my day / Generate plan
  if (/(plan my day|generate.*plan|help me plan|schedule my day|make my schedule)/i.test(transcript)) {
    // If we already have tasks/calendar/checkIn, go straight to generate_day_plan
    const hasContext = !!context.checkIn && ((context.tasks?.length ?? 0) > 0 || (context.calendar?.length ?? 0) > 0);
    if (hasContext) {
      return {
        message: "Generating your day plan now.",
        action: 'generate_day_plan',
        data: {}
      };
    }
    return {
      message: "Let's plan your day. Tell me your top 3 tasks and any fixed timings.",
      action: 'start_planning',
      data: {}
    };
  }

  // Learning intent → deterministic create_learning_path. The fast-tier model
  // sometimes misroutes "I want to learn X" to create_task depending on exact
  // phrasing; a 60-credit feature shouldn't depend on the model's mood.
  if (!/\b(task|todo|shopping)\b/i.test(transcript)) {
    const learnPatterns = [
      /\bi\s+(?:want|wanna|would\s+like|wish)\s+to\s+learn\s+(?:about\s+|how\s+to\s+)?(.+)/i,
      /\bteach\s+me\s+(?:about\s+|how\s+to\s+)?(.+)/i,
      /^learn\s+(?:about\s+)?(.+)/i,
      /(?:create|make|build|generate)\s+(?:a\s+|an\s+)?(?:learning\s+|study\s+)?(?:roadmap|path)\s+(?:for|on|about|of)\s+(.+)/i,
      /(?:mujhe\s+)?(.+?)\s+(?:seekhn[ai]|sikhn[ai])\s+(?:hai|h)\b/i,
    ];
    for (const re of learnPatterns) {
      const m = re.exec(transcript);
      if (m?.[1]) {
        const topic = m[1]
          .replace(/[?.!]+$/g, '')
          .replace(/\b(?:please|today|now|from\s+scratch|completely|properly)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (topic.length >= 2 && topic.length <= 80) {
          return {
            message: `Creating your ${topic} roadmap — it'll be ready in a few seconds.`,
            action: 'create_learning_path',
            data: { topic }
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generate plan from command using Groq — handles all 7 P0 Riva commands,
 * PLUS generate_day_plan (auto schedule) reliably.
 * Now accepts optional memory for personalization.
 */
export async function generatePlan(apiKey: string, transcript: string, context?: any, memory?: UserMemory): Promise<RivaResponse> {
  const ctx = compactContext(context || {});
  const userTz = ctx.prefs.timezone || 'Asia/Kolkata';
  let nowUserTz: string;
  try {
    nowUserTz = new Date().toLocaleString('en-IN', { timeZone: userTz });
  } catch {
    nowUserTz = new Date().toLocaleString('en-IN'); // fallback if timezone is invalid
  }

  // First: local route for common commands (fast, no hallucination)
  const local = localRoute(transcript, ctx);
  if (local) {
    // If local decided generate_day_plan, actually generate deterministic blocks here:
    if (local.action === 'generate_day_plan') {
      const result = await generateDayPlanFromCheckIn(apiKey, {
        userName: ctx.user.name,
        checkIn: ctx.checkIn ?? {},
        tasks: ctx.tasks,
        calendar: ctx.calendar,
        preferences: ctx.prefs,
        mode: computeModeFromSignals(ctx.checkIn ?? {}, ctx.prefs)
      });

      return {
        message: result.message,
        action: 'generate_day_plan',
        data: { mode: result.mode, blocks: result.blocks, assumptions: result.assumptions },
        questions: result.questions
      };
    }
    return local;
  }

  // Else: use Groq command router (strict JSON + validation + retry)
  const compactForPrompt = {
    user: ctx.user,
    checkIn: ctx.checkIn,
    tasks: ctx.tasks.slice(0, 40),
    calendar: ctx.calendar.slice(0, 40),
    prefs: ctx.prefs,
    hasPlan: (ctx.planBlocks?.length ?? 0) > 0
  };

  // Build memory hints for the prompt
  let memoryHints = '';
  if (memory) {
    const freqTasks = getTopFrequentTasks(memory, 5);
    const recentActions = memory.recentInteractions.slice(0, 3);
    if (freqTasks.length) {
      memoryHints += `\nUSER PATTERNS (from past interactions):\n- Frequent tasks: ${freqTasks.join(', ')}`;
    }
    if (memory.lastMode) {
      memoryHints += `\n- Last preferred mode: ${memory.lastMode}`;
    }
    if (recentActions.length) {
      memoryHints += `\n- Recent commands: ${recentActions.map(a => a.action).join(', ')}`;
    }
    const topTag = Object.entries(memory.preferredTags).sort((a, b) => b[1] - a[1])[0];
    if (topTag) {
      memoryHints += `\n- Most used tag: ${topTag[0]}`;
    }

    // User facts from past conversations
    if (memory.userFacts?.length) {
      memoryHints += `\n\nUSER FACTS (remembered from past conversations):\n${memory.userFacts.map(f => `- ${f}`).join('\n')}`;
    }
    if (memory.preferences) {
      const p = memory.preferences;
      const prefLines: string[] = [];
      if (p.wakeUpTime) prefLines.push(`Wakes up at ${p.wakeUpTime}`);
      if (p.sleepTime) prefLines.push(`Sleeps at ${p.sleepTime}`);
      if (p.dietaryPrefs) prefLines.push(`Diet: ${p.dietaryPrefs}`);
      if (p.workHours) prefLines.push(`Work hours: ${p.workHours}`);
      if (p.examDates?.length) {
        prefLines.push(...p.examDates.map(e => `${e.name} exam on ${e.date}`));
      }
      if (prefLines.length) {
        memoryHints += `\n\nUSER PREFERENCES:\n${prefLines.map(l => `- ${l}`).join('\n')}`;
      }
    }
  }

  const systemPrompt = `
You are Riva, a warm and caring AI companion built into Rivly.
Think of yourself as a supportive older sister/friend who genuinely cares about the user's wellbeing.

PERSONALITY:
- Warm but not fake. Supportive but not preachy. Smart but not condescending.
- Use the user's name naturally (about 1 in 3 messages).
- Match the user's energy: if they sound tired, be gentle. If excited, match their energy.
- Add tiny personal touches: "That's a solid plan!" / "Ooh, ambitious — love it!" / "Take it easy today, no shame in that."
- If user seems stressed (many urgent tasks, low mood/energy): acknowledge it first before helping.
- Keep responses SHORT (2-3 sentences max). Long messages are terrible when spoken aloud.
- NEVER sound robotic. NEVER use corporate jargon. NEVER say "I understand your concern."
- NEVER start with "Hello!", "Sure!", "Great!", "Absolutely!"

EMOTIONAL AWARENESS (read checkIn in CONTEXT below):
- If mood <= 2: be extra gentle. Suggest one small win. Don't pile on tasks.
- If energy <= 1: suggest shorter focus blocks (15-20 min) and a break.
- If user says they're stressed/overwhelmed: validate FIRST, then simplify. "Hey, it's okay. Let's just pick ONE thing right now."
- If user is venting or sharing feelings: respond to the FEELING (online_response), not with tasks. Validate specifically ("Three deadlines in one week is genuinely a lot"), no toxic positivity, never "just stay positive".
- If user completed something: celebrate genuinely and specifically, not generically.
- If user expresses serious distress or hopelessness: respond with warmth, gently suggest reaching out to someone they trust or a professional (in India, iCall: 9152987821). Never lecture.

PERSONAL TOUCH (use USER FACTS / PATTERNS / PREFERENCES below, if present):
- Weave in at most ONE remembered detail per response, only when it genuinely fits: "Your JEE is in 12 days — want this on today's plan?"
- Sound like a friend who remembers, never like a database: no "according to my data" or reciting their facts back.

CRITICAL RULES:
- Never invent tasks, calendar events, deadlines, or user history.
- Never claim you scheduled or created something unless the action requires a tool execution.
- The "message" must accurately describe what the chosen action will do — if action is create_task, say you're adding it; never say "added" for an action you didn't choose.
- Ask at most 2 questions if needed. Otherwise act with safe defaults.
- No emojis in the message text.

LANGUAGE:
Detect user's language and reply in the same language style.
For Hinglish, be natural: "Chal, ek kaam karte hain — sabse important wala pehle" not formal Hindi.
Never default to Hindi for an English speaker; never default to English for a Hindi speaker.

TIME:
Current Date & Time (User Timezone): ${nowUserTz}

CONTEXT (trusted, compact):
${JSON.stringify(compactForPrompt)}

VOICE INPUT — READ THIS FIRST:
The user's input comes from speech-to-text and is OFTEN GARBLED, misheard, or incomplete.
Before choosing an action, you MUST:
1. Re-read the transcript and figure out what the user PROBABLY meant, not what the words literally say.
2. Consider common STT mishearings: "whether" → "weather", "bass" → "bus", "male" → "mail", "no" → "know", etc.
3. Ask yourself: "Is the user asking me to DO something (task), KNOW something (info), or MANAGE something (plan/focus)?"
4. ONLY create a task if the user's intent is clearly "I want to add this to my to-do list."
5. When in doubt, use online_response to give a helpful answer or ask for clarification — never silently create a junk task.

COMMON MISINTERPRETATIONS TO AVOID:
- "I need to know [topic]" → user wants INFORMATION, not a task called "[topic]"
- "What about [thing]" → user is ASKING A QUESTION, not creating a task
- "Can you check [thing]" → user wants you to LOOK UP info, not create a task
- "Tell me about [thing]" → explain_concept or online_response, NOT create_task
- "I want to learn [thing]" → create_learning_path, NOT create_task
- "How's the [weather/traffic/news]" → get_weather / search_web / get_news
- If transcript sounds like gibberish or is very short (< 3 words) and unclear → use online_response to ask "Could you say that again?"

ACTIONS (choose exactly one):
1) start_planning
2) generate_day_plan  (use when enough context exists to schedule today)
3) online_response  (general chat, greetings, questions you can answer from context, OR when you need clarification)
4) create_task / create_tasks  (ONLY when user explicitly wants to add a to-do item)
5) open_reschedule
6) start_focus
7) explain_concept
8) set_reminder
9) get_weather  (when user asks about weather, temperature, rain, climate for any city)
10) search_web  (when user needs real-time info you don't have — news, facts, prices, scores)
11) search_youtube  (when user wants to find a video or tutorial)
12) get_news  (when user asks for today's news or headlines)
13) create_learning_path  (when user says "I want to learn X" / "Teach me X" / "X sikhna hai")
14) edit_learning_path  (when user wants to modify an existing learning path)
15) add_to_shopping_list  (when user says "Add X to shopping list")
16) show_shopping_list  (when user asks to see their shopping list)
17) remove_from_shopping_list  (when user says "Remove X from shopping list")

LEARNING PATHS:
- If user says "I want to learn X" / "Teach me X" / "X sikhna hai" / "Create a roadmap for X" → create_learning_path
- If user wants to modify an existing path → edit_learning_path with the appropriate edit operation
- For "make it simpler/harder/shorter" → edit_learning_path with change_difficulty
- Always confirm edits: "Done! I've added 'React Hooks' after 'Components' in your React roadmap."

ACTION RULES:
- If user asks to plan/schedule the day AND there is checkIn + (tasks or calendar), choose generate_day_plan.
- If user says "late by 30 mins" or "energy crashed" or "add meeting", choose open_reschedule and include data.
- If user asks to explain a concept, choose explain_concept with structured template.
- If user asks about weather/temperature/rain for a location, choose get_weather. Default location: user's city or "Delhi" if unknown.
- If user asks a factual question that needs real-time data, choose search_web.
- If the transcript is unclear/garbled, choose online_response and ask the user to repeat. Do NOT guess and create a task.

OUTPUT:
Return ONLY valid JSON:
{ "message": "...", "action": "...", "data": {}, "questions": [] }

DATA SCHEMAS:
- create_task: { "title": "...", "tag": "work|personal|study|health|other" }
- create_tasks: { "tasks": [{ "title": "...", "tag": "..." }, ...] }   ← key MUST be "tasks", not "items"
- start_focus: { "duration": 25 }
- explain_concept: { "concept": "X", "wantPracticeQuestion": true }
- set_reminder: { "text": "...", "time": "HH:MM", "date": "today|YYYY-MM-DD" }
- open_reschedule:
  { "shift_minutes": 30 } OR { "energy_drop": true } OR { "new_event": { "title":"...", "start":"HH:MM", "end":"HH:MM" } }
- generate_day_plan:
  { "mode": "gentle|normal|beast" }  (do NOT output a full schedule; the app will generate it deterministically)
- get_weather: { "location": "city name" }
- search_web: { "query": "search query" }
- search_youtube: { "query": "search query" }
- get_news: {}
- create_learning_path: { "topic": "React.js" }
- edit_learning_path: { "edit": { "type": "add_checkpoint|remove_checkpoint|reorder|rename_checkpoint|update_description|add_note|replace_video|change_difficulty|split_checkpoint|merge_checkpoints", ... } }
  Edit type schemas:
  - add_checkpoint: { "type": "add_checkpoint", "title": "...", "description": "..." }
  - remove_checkpoint: { "type": "remove_checkpoint", "checkpointTitle": "..." }
  - reorder: { "type": "reorder", "checkpointTitle": "...", "newPosition": 0 }
  - rename_checkpoint: { "type": "rename_checkpoint", "oldTitle": "...", "newTitle": "..." }
  - add_note: { "type": "add_note", "checkpointTitle": "...", "note": "..." }
  - replace_video: { "type": "replace_video", "checkpointTitle": "...", "searchQuery": "..." }
  - change_difficulty: { "type": "change_difficulty", "newDifficulty": "beginner|intermediate|advanced" }
  - split_checkpoint: { "type": "split_checkpoint", "checkpointTitle": "...", "into": ["Part A", "Part B"] }
  - merge_checkpoints: { "type": "merge_checkpoints", "checkpointTitles": ["Title 1", "Title 2"] }
- add_to_shopping_list: { "items": ["milk", "eggs"] }
- show_shopping_list: {}
- remove_from_shopping_list: { "items": ["milk"] }

EXAMPLES (follow these exactly — input → output):

Input: "add buy groceries and call the dentist to my list"
Output: { "message": "Adding both — groceries and the dentist call. You've got this.", "action": "create_tasks", "data": { "tasks": [{ "title": "Buy groceries", "tag": "personal" }, { "title": "Call the dentist", "tag": "health" }] }, "questions": [] }

Input: "kal se React seekhna hai"
Output: { "message": "React roadmap bana rahi hoon — ek minute do, Learn tab mein dikh jayega.", "action": "create_learning_path", "data": { "topic": "React.js" }, "questions": [] }

Input: "what is the weather like"
Output: { "message": "Checking the weather for you.", "action": "get_weather", "data": { "location": "Delhi" }, "questions": [] }

Input: "I'm so behind on everything today"
Output: { "message": "Hey, it's okay. Let's just pick ONE thing right now — what matters most before evening?", "action": "online_response", "data": {}, "questions": ["What's the one thing that matters most today?"] }

Input: "remove the html chapter from my roadmap, I already know it"
Output: { "message": "Done — removed the HTML chapter. Smart move skipping what you know.", "action": "edit_learning_path", "data": { "edit": { "type": "remove_checkpoint", "checkpointTitle": "HTML" } }, "questions": [] }
${memoryHints}
`;

  const callOnce = async () => {
    const raw = await groqChat(
      apiKey,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ],
      { temperature: 0.2, max_tokens: 380, json: true, model: MODEL_FOR_TASK.command_parse }
    );
    const parsed = safeJsonParse(raw);
    if (!parsed) throw new Error(`Groq JSON Parse Error: ${raw}`);
    if (!validateRivaResponse(parsed)) throw new Error(`Invalid RivaResponse schema: ${raw}`);
    return parsed as RivaResponse;
  };

  let routed: RivaResponse;
  try {
    routed = await callOnce();
  } catch (e: any) {
    // Retry once with a fix instruction
    try {
      const raw = await groqChat(
        apiKey,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Fix your response to match the required JSON schema ONLY.\nUser request: ${transcript}` }
        ],
        { temperature: 0.1, max_tokens: 380, json: true, model: MODEL_FOR_TASK.command_parse }
      );

      const parsed = safeJsonParse(raw);
      if (!parsed || !validateRivaResponse(parsed)) throw new Error(`Retry failed schema: ${raw}`);
      routed = parsed as RivaResponse;
    } catch (e2: any) {
      console.error('Groq Plan Error:', e2);
      return {
        message: "Sorry — I couldn't do that reliably. Try: 'Plan my day' or 'What's next?'",
        action: 'online_response',
        data: {}
      };
    }
  }

  // Normalize: models sometimes emit { items } instead of { tasks } — the
  // frontend only reads data.tasks, so map it or the tasks silently vanish.
  if (routed.action === 'create_tasks' && (routed.data as any)?.items && !(routed.data as any)?.tasks) {
    (routed.data as any).tasks = (routed.data as any).items;
  }

  // If routed to generate_day_plan, create schedule deterministically here
  if (routed.action === 'generate_day_plan') {
    const mode: Mode = (routed.data?.mode as Mode) || computeModeFromSignals(ctx.checkIn ?? {}, ctx.prefs);

    const result = await generateDayPlanFromCheckIn(apiKey, {
      userName: ctx.user.name,
      checkIn: ctx.checkIn ?? {},
      tasks: ctx.tasks,
      calendar: ctx.calendar,
      preferences: ctx.prefs,
      mode
    });

    return {
      message: result.message,
      action: 'generate_day_plan',
      data: { mode: result.mode, blocks: result.blocks, assumptions: result.assumptions },
      questions: result.questions
    };
  }

  return routed;
}

// -----------------------------
// Convenience: Correct + Plan + Memory Update
// -----------------------------

/**
 * One-call function for the route layer:
 *  1. Corrects the raw STT transcript using LLM + user memory
 *  2. Runs generatePlan with the corrected transcript
 *  3. Returns the result + correction info + updated memory
 *
 * The route layer should persist the updated memory to KV or Supabase.
 */
export async function generatePlanWithCorrection(
  apiKey: string,
  rawTranscript: string,
  context?: any,
  memory?: UserMemory
): Promise<{
  response: RivaResponse;
  correction: TranscriptCorrectionResult;
  updatedMemory: UserMemory;
}> {
  const mem = memory ?? createEmptyMemory();

  // Step 1: Correct the transcript
  const correction = await correctTranscript(apiKey, rawTranscript, {
    recentTasks: getRecentTaskTitles(mem),
    frequentTasks: getTopFrequentTasks(mem),
    corrections: mem.corrections,
  });

  const effectiveTranscript = correction.confidence >= 0.4 ? correction.corrected : rawTranscript;
  console.log(`[Riva] Transcript correction: "${rawTranscript}" → "${effectiveTranscript}" (confidence: ${correction.confidence}, changed: ${correction.wasChanged})`);

  // Step 2: Generate plan with corrected transcript
  const response = await generatePlan(apiKey, effectiveTranscript, context, mem);

  // Step 3: Update memory
  const entry: MemoryEntry = {
    timestamp: Date.now(),
    transcript: rawTranscript,
    correctedTranscript: correction.wasChanged ? correction.corrected : undefined,
    action: response.action,
    taskTitle: response.data?.title ?? response.data?.items?.[0]?.title,
    tag: response.data?.tag ?? response.data?.items?.[0]?.tag,
  };

  let updatedMemory = updateMemory(mem, entry);
  if (response.action === 'generate_day_plan' && response.data?.mode) {
    updatedMemory.lastMode = response.data.mode;
  }

  // Step 4: Extract user facts from transcript (regex-based, no LLM call)
  updatedMemory = extractUserFacts(updatedMemory, rawTranscript);

  return { response, correction, updatedMemory };
}