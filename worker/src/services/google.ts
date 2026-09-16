// worker/src/services/google.ts
import { Bindings } from '../types';
import type { InboxCategory } from '../config/inboxCategories';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export function hasGmailScope(scope: string | null | undefined): boolean {
  return !!scope && scope.split(/\s+/).includes(GMAIL_SCOPE);
}

function header(msg: any, name: string): string {
  const headers = msg?.payload?.headers || [];
  const h = headers.find((x: any) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

/** Video-call links we can offer a one-tap "Join" for. */
const MEETING_URL_RE =
  /https?:\/\/(?:[\w-]+\.)*(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com|meet\.jit\.si|gotomeeting\.com|bluejeans\.com|chime\.aws|around\.co)\/[^\s<>"')\]]+/i;

/** First joinable conference URL found in free text, or null. */
export function extractMeetingUrl(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    const m = t.match(MEETING_URL_RE);
    if (m) return m[0].replace(/[.,;:]+$/, '');
  }
  return null;
}

export function normalizeGmailMessage(msg: any) {
  const ms = Number(msg?.internalDate);
  const date = Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
  const snippet = (msg?.snippet || '').slice(0, 300);
  const subject = header(msg, 'Subject') || '(no subject)';
  return {
    source_ref: String(msg?.id || ''),
    subject,
    snippet,
    sender: header(msg, 'From'),
    date,
    // A calendar invite mailed to you often carries the join link in the snippet.
    meeting_url: extractMeetingUrl(snippet, subject),
    starts_at: null as string | null,
  };
}

/** Google Calendar exposes the join link in several places depending on provider. */
function calendarMeetingUrl(ev: any): string | null {
  if (typeof ev?.hangoutLink === 'string' && ev.hangoutLink) return ev.hangoutLink;
  const entries: any[] = ev?.conferenceData?.entryPoints || [];
  const video = entries.find((e) => e?.entryPointType === 'video' && e?.uri);
  if (video) return String(video.uri);
  const anyUri = entries.find((e) => typeof e?.uri === 'string' && /^https?:/i.test(e.uri));
  if (anyUri) return String(anyUri.uri);
  return extractMeetingUrl(ev?.location, ev?.description);
}

export function normalizeCalendarEvent(ev: any) {
  // Timed events carry `start.dateTime`; all-day events only carry `start.date`.
  const startDateTime: string | null = ev?.start?.dateTime || null;
  const date = startDateTime || ev?.start?.date || new Date().toISOString();
  return {
    source_ref: String(ev?.id || ''),
    subject: ev?.summary || '(untitled event)',
    snippet: (ev?.description || '').slice(0, 300),
    sender: ev?.organizer?.email || '',
    date,
    meeting_url: calendarMeetingUrl(ev),
    starts_at: startDateTime,
  };
}

/**
 * The stored refresh token is permanently unusable — the user must re-consent.
 * Distinct from a transient refresh failure, which is worth retrying.
 */
export class GoogleAuthError extends Error {
  constructor(public body: string) {
    super('Google refresh token is no longer valid');
    this.name = 'GoogleAuthError';
  }
}

export function isInvalidGrant(body: string): boolean {
  return /invalid_grant|token has been expired or revoked/i.test(body);
}

/** Refresh the Google access token if expired. Mirrors the calendar edge fn. */
export async function getFreshAccessToken(
  env: Bindings,
  connection: { access_token: string | null; refresh_token: string; expires_at: string | null }
): Promise<{ accessToken: string; expiresAt: string | null } | null> {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
  const isExpired = !connection.access_token || (expiresAt && expiresAt < new Date());
  if (!isExpired && connection.access_token) {
    return { accessToken: connection.access_token, expiresAt: connection.expires_at };
  }
  if (!connection.refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[google] token refresh failed:', body);
    // invalid_grant means the refresh token is dead for good — revoked, or expired
    // because the OAuth app is still in "Testing" (Google expires those after 7
    // days). Retrying can never fix it; only a fresh consent can, so say so.
    if (isInvalidGrant(body)) throw new GoogleAuthError(body);
    return null;
  }
  const t = await res.json() as { expires_in?: number; access_token: string };
  const newExpiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  return { accessToken: t.access_token, expiresAt: newExpiresAt };
}

// Cloudflare Workers cap subrequests per invocation (50 on the free plan), and a
// scan also spends calls on the token refresh, Calendar, Groq, and Supabase. These
// caps keep a full scan comfortably inside that budget.
// Also kept modest because every candidate costs prompt tokens against Groq's
// per-minute budget (see MAX_PROMPT_TOKENS in ai/inboxExtract.ts).
const MAIN_MAX = 15;
const ORDER_MAX = 6;

/**
 * Merchants and couriers whose order mail Gmail routinely files under
 * Promotions — the reason order tracking never showed up before.
 */
const ORDER_SENDERS = [
  'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'snapdeal', 'tatacliq',
  'swiggy', 'zomato', 'blinkit', 'zepto', 'bigbasket', 'dunzo', 'instamart',
  'bluedart', 'delhivery', 'ekart', 'dtdc', 'shiprocket', 'xpressbees', 'ecomexpress',
  'apple', 'croma', 'reliancedigital', 'boat-lifestyle', 'shopify',
];

const ORDER_SUBJECTS = [
  'order', 'shipped', 'dispatched', 'delivered', '"out for delivery"', 'tracking',
  '"your package"', '"has shipped"', 'refund', 'return', 'invoice', '"order confirmed"',
];

/**
 * Build the Gmail search query for the user's selected categories.
 *
 * Promotions stay excluded unless the user opts in — but when order tracking is
 * on we run a second, tightly-scoped sweep (see `orderSweepQuery`) so shipping
 * mail filed under Promotions still gets through without the marketing flood.
 */
export function buildGmailQuery(categories: InboxCategory[]): string {
  const parts = ['in:inbox', 'newer_than:7d'];
  if (!categories.includes('promotion')) parts.push('-category:promotions');
  parts.push('-category:social', '-category:forums');
  return parts.join(' ');
}

/** Targeted query for shipping/delivery mail that Gmail buries in Promotions. */
export function orderSweepQuery(): string {
  const from = ORDER_SENDERS.map((s) => `from:${s}`).join(' OR ');
  const subject = ORDER_SUBJECTS.map((s) => `subject:${s}`).join(' OR ');
  return `in:inbox newer_than:7d {(${from}) (${subject})}`;
}

/** A Gmail request that failed outright, as opposed to returning no messages. */
export class GmailApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`Gmail API returned ${status}`);
    this.name = 'GmailApiError';
  }
}

/**
 * Turn a Gmail failure into something the user can act on. These are almost
 * always project configuration rather than anything the user did.
 */
export function gmailFailureHint(err: unknown): string {
  if (err instanceof GmailApiError) {
    if (err.status === 403 && /has not been used in project|is disabled/i.test(err.body)) {
      return 'The Gmail API is not enabled for this app\'s Google Cloud project. Enable it in the Google Cloud console, wait a minute, then scan again.';
    }
    if (err.status === 403) return 'Google denied access to Gmail. Reconnect your account to re-grant email permission.';
    if (err.status === 401) return 'Google access expired. Reconnect your account.';
    if (err.status === 429) return 'Google is rate-limiting us. Try again in a few minutes.';
    return `Gmail request failed (${err.status}). Try again later.`;
  }
  return 'Could not reach Gmail. Check your connection and try again.';
}

async function listMessageIds(accessToken: string, query: string, max: number): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    // Must not degrade to "no mail found" — that reports a broken scan as a
    // successful one and hides configuration errors indefinitely.
    console.error('[google] gmail list failed:', query, res.status, body);
    throw new GmailApiError(res.status, body);
  }
  const list = (await res.json()) as { messages?: Array<{ id: string }> };
  return (list.messages || []).map((m) => m.id).filter(Boolean);
}

async function fetchMessage(accessToken: string, id: string): Promise<any | null> {
  const r = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (r.ok) return r.json();
  console.warn('[google] gmail message fetch failed', id, r.status);
  return null;
}

/**
 * Fetch recent inbox message metadata for the user's chosen categories.
 * Two queries (general + order sweep), deduped, fetched in parallel.
 */
export async function fetchGmailCandidates(
  accessToken: string,
  categories: InboxCategory[] = []
): Promise<any[]> {
  const queries: Array<Promise<string[]>> = [
    listMessageIds(accessToken, buildGmailQuery(categories), MAIN_MAX),
  ];
  const wantsOrders = categories.includes('order');
  if (wantsOrders) queries.push(listMessageIds(accessToken, orderSweepQuery(), ORDER_MAX));

  const idGroups = await Promise.all(queries);
  const ids = [...new Set(idGroups.flat())].slice(0, MAIN_MAX + ORDER_MAX);

  const results = await Promise.all(ids.map((id) => fetchMessage(accessToken, id)));
  return results.filter((m): m is any => m !== null);
}

/** Fetch upcoming calendar events (next 14 days). */
export async function fetchCalendarCandidates(accessToken: string): Promise<any[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '25' });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.error('[google] calendar list failed:', await res.text());
    return [];
  }
  const data = await res.json() as { items?: any[] };
  return data.items || [];
}
