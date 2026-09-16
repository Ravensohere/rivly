/**
 * The kinds of mail Inbox Radar can surface. Shared by the Gmail query builder,
 * the extraction prompt, the settings route, and the web settings UI.
 */
export const INBOX_CATEGORIES = [
  'deadline',
  'bill',
  'meeting',
  'followup',
  'order',
  'travel',
  'work',
  'personal',
  'promotion',
] as const;

export type InboxCategory = (typeof INBOX_CATEGORIES)[number];

/** What a new user gets: the actionable stuff, minus the noisy opt-ins. */
export const DEFAULT_INBOX_CATEGORIES: InboxCategory[] = [
  'deadline',
  'bill',
  'meeting',
  'followup',
  'order',
  'travel',
];

/** Definitions fed verbatim to the LLM so category boundaries stay stable. */
export const CATEGORY_DEFINITIONS: Record<InboxCategory, string> = {
  deadline: 'a due date, submission, last date, expiry, or renewal the user must act on',
  bill: 'money the user OWES and must pay — invoice, fee, recharge, EMI, or subscription charge with a due date (capture the amount). A price, fare, quote, or discount being advertised is NOT a bill',
  meeting: 'a scheduled meeting, call, appointment, or interview with a specific time',
  followup: "an email clearly awaiting the user's reply or action",
  order:
    'an online order, purchase, shipment, delivery, or return — including "order confirmed", "shipped", "out for delivery", "delivered", refunds, and courier tracking updates',
  travel:
    "a booking the user actually holds — flight/train/bus/cab/hotel confirmation, check-in reminder, PNR, boarding pass, or itinerary change. NOT fare adverts, deal roundups, or destination inspiration",
  work: 'something a person is asking THIS user to do — assignment, review request, ticket assigned to them, manager request, or a deadline they own. NOT newsletters, release notes, product announcements, or digests',
  personal:
    'a message from a real human needing a reply or action — family, friends, doctor, school, landlord, bank relationship manager. NOT app notifications, social mentions, or unread-message digests',
  promotion:
    'a sale, discount, coupon, or marketing offer the user explicitly asked to keep seeing',
};

export function isInboxCategory(value: unknown): value is InboxCategory {
  return typeof value === 'string' && (INBOX_CATEGORIES as readonly string[]).includes(value);
}

/** Coerce untrusted input (DB row, request body) into a valid category list. */
export function sanitizeCategories(input: unknown): InboxCategory[] {
  if (!Array.isArray(input)) return [...DEFAULT_INBOX_CATEGORIES];
  const kept = input.filter(isInboxCategory);
  const unique = [...new Set(kept)];
  return unique.length ? unique : [...DEFAULT_INBOX_CATEGORIES];
}
