import type { InboxCategory } from '../config/inboxCategories';

export interface SuggestionRow {
  id?: string;
  user_id: string;
  source: 'gmail' | 'calendar';
  source_ref: string;
  title: string;
  category: InboxCategory;
  due_at: string | null;
  amount: number | null;
  snippet: string | null;
  sender: string | null;
  confidence: number;
  /** Joinable conference URL, when the item is a meeting with one. */
  meeting_url: string | null;
  /** Exact start time for timed meetings (all-day events stay null). */
  starts_at: string | null;
  status?: 'pending' | 'accepted' | 'dismissed';
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/** True if we should scan now: never scanned, or last scan was ≥ 4h ago. */
export function shouldScan(lastScannedAt: string | null, now: Date): boolean {
  if (!lastScannedAt) return true;
  const last = new Date(lastScannedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= FOUR_HOURS_MS;
}

/** Map an accepted suggestion to a row for the real `tasks` table. */
export function mapSuggestionToTask(s: SuggestionRow) {
  return {
    user_id: s.user_id,
    title: s.title,
    status: 'pending' as const,
    due_date: s.due_at ? s.due_at.slice(0, 10) : null,
    tag: 'other',
  };
}

import type { ExtractedItem, CandidateItem } from './ai/inboxExtract';
import { hasGmailScope, normalizeGmailMessage, normalizeCalendarEvent, gmailFailureHint } from './google';
import { sanitizeCategories } from '../config/inboxCategories';

export interface ScanConn {
  access_token: string | null;
  refresh_token: string;
  expires_at: string | null;
  scope: string | null;
}

export interface ScanState {
  last_scanned_at: string | null;
  enabled: boolean;
  categories?: string[] | null;
}

export interface ScanDeps {
  getConnection(userId: string): Promise<ScanConn | null>;
  getScanState(userId: string): Promise<ScanState | null>;
  getFreshToken(conn: ScanConn): Promise<{ accessToken: string; expiresAt: string | null } | null>;
  fetchGmail(token: string, categories: InboxCategory[]): Promise<any[]>;
  fetchCalendar(token: string): Promise<any[]>;
  extract(items: CandidateItem[], categories: InboxCategory[]): Promise<ExtractedItem[]>;
  upsertSuggestions(rows: SuggestionRow[]): Promise<void>;
  saveTokens(userId: string, accessToken: string, expiresAt: string | null): Promise<void>;
  setLastScanned(userId: string, iso: string): Promise<void>;
  now(): Date;
}

export type ScanStatus =
  | 'ok'
  | 'skipped_throttle'
  | 'disabled'
  | 'needs_reconnect'
  | 'no_connection'
  | 'token_failed'
  | 'gmail_failed'
  | 'extract_failed';

export type ScanResult = {
  status: ScanStatus;
  suggestionsAdded: number;
  /** Actionable explanation, present on failure statuses. */
  detail?: string;
  /** False when the scan ran Calendar-only because Gmail was never granted. */
  gmailEnabled?: boolean;
};

export async function scanInboxForUser(deps: ScanDeps, userId: string): Promise<ScanResult> {
  const state = await deps.getScanState(userId);
  if (!state || !state.enabled) return { status: 'disabled', suggestionsAdded: 0 };

  const conn = await deps.getConnection(userId);
  if (!conn) return { status: 'no_connection', suggestionsAdded: 0 };

  // Gmail is an optional upgrade (restricted scope). Without it we still scan
  // Calendar — meetings and joinable links are the higher-signal half — instead
  // of returning nothing and telling the user to "reconnect" into a wall.
  const gmailEnabled = hasGmailScope(conn.scope);

  if (!shouldScan(state.last_scanned_at, deps.now())) {
    return { status: 'skipped_throttle', suggestionsAdded: 0 };
  }

  const categories = sanitizeCategories(state.categories);

  let token: { accessToken: string; expiresAt: string | null } | null;
  try {
    token = await deps.getFreshToken(conn);
  } catch (e: any) {
    // A dead refresh token can only be fixed by re-consenting, so send the user
    // to reconnect rather than leaving them on a failure they can't act on.
    if (e?.name === 'GoogleAuthError') {
      return {
        status: 'needs_reconnect',
        suggestionsAdded: 0,
        detail: 'Your Google connection expired. Reconnect your account to keep Inbox Radar running.',
      };
    }
    return { status: 'token_failed', suggestionsAdded: 0, detail: 'Could not refresh Google access. Try again shortly.' };
  }
  if (!token) return { status: 'token_failed', suggestionsAdded: 0, detail: 'Could not refresh Google access. Try again shortly.' };
  if (token.accessToken !== conn.access_token) {
    await deps.saveTokens(userId, token.accessToken, token.expiresAt);
  }

  let gmailRaw: any[];
  let calRaw: any[];
  try {
    [gmailRaw, calRaw] = await Promise.all([
      gmailEnabled ? deps.fetchGmail(token.accessToken, categories) : Promise.resolve([]),
      deps.fetchCalendar(token.accessToken),
    ]);
  } catch (e) {
    // Deliberately do NOT stamp last_scanned_at: a failed scan must stay
    // retryable rather than being throttled out for the next 4 hours.
    return { status: 'gmail_failed', suggestionsAdded: 0, detail: gmailFailureHint(e) };
  }

  const gmailItems: CandidateItem[] = gmailRaw
    .map((m) => ({ source: 'gmail' as const, ...normalizeGmailMessage(m) }))
    .filter((i) => i.source_ref);
  const calItems: CandidateItem[] = calRaw
    .map((e) => ({ source: 'calendar' as const, ...normalizeCalendarEvent(e) }))
    .filter((i) => i.source_ref);

  // Calendar events first: there are few of them and they carry the joinable
  // meetings, so they must survive the extractor's token-budget truncation.
  const all = [...calItems, ...gmailItems];
  const refIndex = Object.fromEntries(all.map((i) => [i.source_ref, i]));

  // Nothing to read: skip the model entirely. An empty candidate list still costs
  // a full billed Groq call, and an empty inbox is the common case for a new user.
  if (all.length === 0) {
    await deps.setLastScanned(userId, deps.now().toISOString());
    return { status: 'ok', suggestionsAdded: 0, gmailEnabled };
  }

  let extracted: ExtractedItem[];
  try {
    extracted = await deps.extract(all, categories);
  } catch (e: any) {
    // Same rule as a Gmail failure: report it, and stay retryable.
    console.error('[inbox] extraction failed:', e?.message || e);
    return {
      status: 'extract_failed',
      suggestionsAdded: 0,
      detail: /rate.?limit|429|413|too large/i.test(String(e?.message || e))
        ? 'Riva hit her AI rate limit reading your inbox. Try again in a minute.'
        : 'Riva could not read your inbox just now. Try again shortly.',
    };
  }

  const rows: SuggestionRow[] = extracted
    .filter((e) => refIndex[e.source_ref]) // drop hallucinated refs not in candidates
    .map((e) => {
    const src = refIndex[e.source_ref];
    // Meeting time/URL come from the source item, never from the model, so a
    // hallucinated link can never become a "Join" button.
    const startsAt = src.starts_at ?? (e.category === 'meeting' ? e.due_at : null);
    return {
      user_id: userId,
      source: src.source,
      source_ref: e.source_ref,
      title: e.title,
      category: e.category,
      due_at: e.due_at ?? src.starts_at ?? null,
      amount: e.amount,
      snippet: src.snippet,
      sender: src.sender,
      confidence: e.confidence,
      meeting_url: src.meeting_url ?? null,
      starts_at: startsAt,
      status: 'pending',
    };
  });

  if (rows.length) await deps.upsertSuggestions(rows);
  await deps.setLastScanned(userId, deps.now().toISOString());
  return { status: 'ok', suggestionsAdded: rows.length, gmailEnabled };
}
