import { MODEL_FOR_TASK } from '../../config/constants';
import { groqChat } from './groq';
import {
  CATEGORY_DEFINITIONS,
  DEFAULT_INBOX_CATEGORIES,
  isInboxCategory,
  type InboxCategory,
} from '../../config/inboxCategories';

export interface CandidateItem {
  source: 'gmail' | 'calendar';
  source_ref: string;
  subject: string;
  snippet: string;
  sender: string;
  date: string;
  meeting_url?: string | null;
  starts_at?: string | null;
}

export interface ExtractedItem {
  source_ref: string;
  category: InboxCategory;
  title: string;
  due_at: string | null;
  amount: number | null;
  confidence: number;
}

// Groq's free tier allows 6000 tokens/minute for the fast model, counting the
// prompt AND max_tokens. Splitting into several calls does not help — the limit
// is per minute, not per request — so the prompt itself has to stay small.
const CHARS_PER_TOKEN = 4;
/** Rough size of the instruction block, before any items. */
const PROMPT_OVERHEAD_TOKENS = 700;
/** Input budget, leaving headroom for MAX_OUTPUT_TOKENS inside 6000 TPM. */
export const MAX_PROMPT_TOKENS = 2800;
const MAX_OUTPUT_TOKENS = 1200;

const SUBJECT_CHARS = 110;
const SNIPPET_CHARS = 130;
const SENDER_CHARS = 50;

/** One candidate rendered for the prompt, trimmed to keep the request small. */
export function itemLine(i: CandidateItem): string {
  const subject = (i.subject || '').slice(0, SUBJECT_CHARS);
  const snippet = (i.snippet || '').slice(0, SNIPPET_CHARS);
  const sender = (i.sender || '').slice(0, SENDER_CHARS);
  const date = (i.date || '').slice(0, 10);
  // The id is bracketed so the model copies the value, not the label.
  return `- [${i.source_ref}] ${i.source} | ${date} | from:${sender} | subj:${subject} | ${snippet}`;
}

/**
 * Keep as many candidates as fit the token budget, in the order given.
 * Callers put the highest-value items (calendar events, order sweep) first so
 * truncation drops the least important mail.
 */
export function selectItemsWithinBudget(
  items: CandidateItem[],
  maxTokens = MAX_PROMPT_TOKENS
): CandidateItem[] {
  const kept: CandidateItem[] = [];
  let used = PROMPT_OVERHEAD_TOKENS;
  for (const item of items) {
    const cost = Math.ceil(itemLine(item).length / CHARS_PER_TOKEN);
    if (used + cost > maxTokens) break;
    used += cost;
    kept.push(item);
  }
  return kept;
}

export function buildExtractionPrompt(items: CandidateItem[], categories: InboxCategory[]): string {
  const list = items.map(itemLine).join('\n');

  const catLines = categories.map((c) => `- "${c}": ${CATEGORY_DEFINITIONS[c]}`).join('\n');
  const allowsPromotions = categories.includes('promotion');

  return `You are Riva's inbox assistant. From the email/calendar items below, extract items the user would want surfaced.

The user has chosen to see ONLY these categories. Use these exact category values:
${catLines}

THE TEST FOR KEEPING AN ITEM: the user must have something concrete to DO, or a
specific event/delivery to be ready for. If the email is purely informational and
nothing would go wrong by ignoring it, DROP it. When unsure, DROP.

ALWAYS DROP these, whatever category they might seem to fit:
- Security alerts, sign-in notifications, OTPs, password resets
- "N unread messages", digests, "someone mentioned you", social notifications
- Newsletters, blog posts, product announcements, release notes, changelogs
- Adverts and deals, including fare/price-drop emails ("flights from ₹7,000")
- "Invitations" to mentor, refer, survey, or join something, unless the user already agreed
- Anything whose only action would be "read this at some point"

Rules:
- Assign every kept item to one of the categories listed above. If an item fits none of them, DROP it.
- ${allowsPromotions ? 'The user opted into promotions, so keep genuinely useful offers, but still drop pure spam.' : 'Drop marketing, newsletters, and promotional offers.'}
- Always drop OTPs, verification codes, password resets, and social network notifications.
- Order/shipping mail is valuable: "your order has shipped", "out for delivery", "delivered", refund and return updates all count as "order". Put the merchant and the item in the title when you can, e.g. "Track Amazon delivery — running shoes".
- For "order", set due_at to the expected delivery date when the email states one, otherwise null.
- For "meeting", set due_at to the exact meeting start time in ISO 8601.
- For "bill", set amount to the numeric value only (no currency symbol).
- Titles must be short and imperative, max 8 words.
- Today's date is ${new Date().toISOString().slice(0, 10)}. Resolve relative dates ("tomorrow", "in 2 days") against it.
- confidence is how sure you are the item is real and actionable, 0 to 1.

For each KEPT item, output an object:
{ "source_ref": "<copy the id from inside the square brackets, WITHOUT the brackets>", "category": "<one of the categories above>", "title": "<short title>", "due_at": "<ISO 8601 datetime or null>", "amount": <number or null>, "confidence": <0..1> }

Items:
${list}

Return ONLY valid JSON: { "items": [ ... ] }. If nothing matches, return { "items": [] }.`;
}

/** Strip any label the model copied from the prompt line, e.g. "ref:abc" -> "abc". */
export function normalizeRef(value: string): string {
  return value.replace(/^\s*(?:ref|id|source_ref)\s*[:=]\s*/i, '').trim();
}

export function parseExtractionResponse(
  raw: string,
  byRef: Record<string, CandidateItem>,
  allowed: InboxCategory[] = DEFAULT_INBOX_CATEGORIES,
  // Precision matters more than recall here: a tray full of newsletters is
  // worse than missing one item, and the next scan is only 4h away.
  minConfidence = 0.65
): ExtractedItem[] {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr: any[] = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const allowedSet = new Set<string>(allowed);
  const out: ExtractedItem[] = [];
  const seen = new Set<string>();

  for (const it of arr) {
    if (!it || typeof it.source_ref !== 'string') continue;
    // The model frequently echoes the label from the prompt line
    // ("ref:1a0048d4…"), which would otherwise miss every lookup and silently
    // discard the entire batch. Normalise before matching.
    const ref = normalizeRef(it.source_ref);
    if (!byRef[ref]) continue;
    if (seen.has(ref)) continue;
    if (!isInboxCategory(it.category)) continue;
    // The model can drift outside the user's selection — enforce it here.
    if (!allowedSet.has(it.category)) continue;
    const confidence = typeof it.confidence === 'number' ? it.confidence : 0;
    if (confidence < minConfidence) continue;
    if (!it.title || typeof it.title !== 'string') continue;

    const due_at = typeof it.due_at === 'string' ? it.due_at : null;
    const amount = typeof it.amount === 'number' ? it.amount : null;

    // Deterministic sanity check the model keeps failing on its own: a bill you
    // must pay always has an amount or a date, and a deadline always has a date.
    // Marketing ("Flight prices from ₹7,217") reliably has neither.
    if (it.category === 'bill' && due_at === null && amount === null) continue;
    if (it.category === 'deadline' && due_at === null) continue;

    seen.add(ref);
    out.push({
      source_ref: ref,
      category: it.category,
      title: it.title.trim().slice(0, 120),
      due_at,
      amount,
      confidence,
    });
  }
  return out;
}

/** Calls Groq (fast tier) to extract actionable items. Network — not unit tested. */
export async function extractSuggestions(
  groqApiKey: string,
  items: CandidateItem[],
  categories: InboxCategory[] = DEFAULT_INBOX_CATEGORIES
): Promise<ExtractedItem[]> {
  if (items.length === 0 || categories.length === 0) return [];

  const selected = selectItemsWithinBudget(items);
  if (selected.length < items.length) {
    console.warn(
      `[inbox] token budget: sending ${selected.length}/${items.length} candidates to the model`
    );
  }

  const byRef = Object.fromEntries(selected.map((i) => [i.source_ref, i]));
  const raw =
    (await groqChat(groqApiKey, [{ role: 'user', content: buildExtractionPrompt(selected, categories) }], {
      model: MODEL_FOR_TASK.command_parse,
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      json: true,
      timeoutMs: 20000,
    })) || '{"items":[]}';
  const parsed = parseExtractionResponse(raw, byRef, categories);
  // Counts only — never log raw output, it contains the user's email subjects.
  console.log(
    `[inbox] extract: ${items.length} candidates -> ${selected.length} sent -> ${parsed.length} kept`
  );
  return parsed;
}
