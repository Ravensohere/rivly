import { describe, it, expect } from 'vitest';
import {
  buildExtractionPrompt,
  parseExtractionResponse,
  selectItemsWithinBudget,
  itemLine,
  MAX_PROMPT_TOKENS,
  type CandidateItem,
} from './inboxExtract';
import { DEFAULT_INBOX_CATEGORIES, type InboxCategory } from '../../config/inboxCategories';

const items: CandidateItem[] = [
  { source: 'gmail', source_ref: 'm1', subject: 'College fee due Friday', snippet: 'Pay ₹500 by Fri', sender: 'fees@clg.edu', date: '2026-06-25' },
  { source: 'gmail', source_ref: 'm2', subject: '50% OFF mega sale!!!', snippet: 'shop now', sender: 'promo@shop.com', date: '2026-06-25' },
  { source: 'gmail', source_ref: 'm3', subject: 'Your order has shipped', snippet: 'Running shoes arriving Thu', sender: 'ship@amazon.in', date: '2026-06-25' },
];

const byRef = Object.fromEntries(items.map((i) => [i.source_ref, i]));

describe('buildExtractionPrompt', () => {
  it('includes every source_ref and subject, and the selected category vocabulary', () => {
    const p = buildExtractionPrompt(items, DEFAULT_INBOX_CATEGORIES);
    expect(p).toContain('m1');
    expect(p).toContain('College fee due Friday');
    for (const c of DEFAULT_INBOX_CATEGORIES) expect(p).toContain(`"${c}"`);
  });

  it('omits categories the user did not select', () => {
    const p = buildExtractionPrompt(items, ['bill']);
    expect(p).toContain('"bill"');
    expect(p).not.toContain('"travel":');
    expect(p).not.toContain('"followup":');
  });

  it('tells the model to drop promotions unless the user opted in', () => {
    expect(buildExtractionPrompt(items, ['bill'])).toContain('Drop marketing');
    expect(buildExtractionPrompt(items, ['bill', 'promotion'])).toContain('opted into promotions');
  });
});

describe('token budget', () => {
  const bulky = (n: number): CandidateItem[] =>
    Array.from({ length: n }, (_, i) => ({
      source: 'gmail' as const,
      source_ref: `m${i}`,
      subject: 'A fairly long subject line that goes on for a while '.repeat(3),
      snippet: 'And a long snippet body that would blow the budget. '.repeat(6),
      sender: 'someone.with.a.long.address@example-company.co.in',
      date: '2026-08-15',
    }));

  it('keeps the whole prompt under the per-minute budget', () => {
    const kept = selectItemsWithinBudget(bulky(40));
    const prompt = buildExtractionPrompt(kept, DEFAULT_INBOX_CATEGORIES);
    // 4 chars/token is the same estimate the selector uses.
    expect(Math.ceil(prompt.length / 4)).toBeLessThan(MAX_PROMPT_TOKENS + 400);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(40);
  });

  it('keeps everything when the batch is small', () => {
    expect(selectItemsWithinBudget(items)).toHaveLength(items.length);
  });

  it('preserves order, so callers can prioritise calendar items', () => {
    const kept = selectItemsWithinBudget(bulky(40));
    expect(kept[0].source_ref).toBe('m0');
    expect(kept[1].source_ref).toBe('m1');
  });

  it('trims oversized fields in the rendered line', () => {
    const [big] = bulky(1);
    const line = itemLine(big);
    expect(line.length).toBeLessThan(400);
    // Bracketed id, so the model copies the value rather than a "ref:" label.
    expect(line).toContain('[m0]');
    expect(line).not.toContain('ref:m0');
  });
});

describe('parseExtractionResponse', () => {
  it('keeps high-confidence items and drops low-confidence/promo', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay college fee', due_at: '2026-06-26T00:00:00.000Z', amount: 500, confidence: 0.9 },
      { source_ref: 'm2', category: 'deadline', title: 'Sale', due_at: null, amount: null, confidence: 0.2 },
    ]});
    const out = parseExtractionResponse(raw, byRef);
    expect(out).toHaveLength(1);
    expect(out[0].source_ref).toBe('m1');
    expect(out[0].category).toBe('bill');
    expect(out[0].amount).toBe(500);
  });

  it('keeps order-tracking items', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm3', category: 'order', title: 'Track Amazon delivery', due_at: '2026-06-27T00:00:00.000Z', amount: null, confidence: 0.85 },
    ]});
    const out = parseExtractionResponse(raw, byRef);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe('order');
  });

  it('drops categories outside the user selection even if the model returns them', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm3', category: 'order', title: 'Track delivery', due_at: null, amount: null, confidence: 0.9 },
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.9 },
    ]});
    const out = parseExtractionResponse(raw, byRef, ['bill']);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe('bill');
  });

  it('tolerates the model echoing the prompt label on source_ref', () => {
    // Regression: the model returns "ref:m1" instead of "m1", which silently
    // discarded every item in the batch.
    const raw = JSON.stringify({ items: [
      { source_ref: 'ref:m1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.9 },
      { source_ref: 'id: m3', category: 'order', title: 'Track delivery', due_at: null, amount: null, confidence: 0.8 },
    ]});
    const out = parseExtractionResponse(raw, byRef);
    expect(out).toHaveLength(2);
    expect(out[0].source_ref).toBe('m1');
    expect(out[1].source_ref).toBe('m3');
  });

  it('deduplicates across prefixed and bare forms of the same ref', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.9 },
      { source_ref: 'ref:m1', category: 'deadline', title: 'Pay fee', due_at: '2026-06-27T00:00:00Z', amount: null, confidence: 0.9 },
    ]});
    expect(parseExtractionResponse(raw, byRef)).toHaveLength(1);
  });

  it('drops a "bill" with no amount and no due date (marketing, not a bill)', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm2', category: 'bill', title: 'Flight prices from 7217', due_at: null, amount: null, confidence: 0.7 },
    ]});
    expect(parseExtractionResponse(raw, byRef)).toHaveLength(0);
  });

  it('keeps a bill that has either an amount or a due date', () => {
    const withAmount = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.8 },
    ]});
    const withDate = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: '2026-06-27T00:00:00Z', amount: null, confidence: 0.8 },
    ]});
    expect(parseExtractionResponse(withAmount, byRef)).toHaveLength(1);
    expect(parseExtractionResponse(withDate, byRef)).toHaveLength(1);
  });

  it('drops a "deadline" with no date', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'deadline', title: 'Something someday', due_at: null, amount: null, confidence: 0.9 },
    ]});
    expect(parseExtractionResponse(raw, byRef)).toHaveLength(0);
  });

  it('drops unknown source_ref and bad category', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'ghost', category: 'bill', title: 'x', due_at: null, amount: null, confidence: 0.9 },
      { source_ref: 'm1', category: 'spam', title: 'x', due_at: null, amount: null, confidence: 0.9 },
    ]});
    expect(parseExtractionResponse(raw, byRef)).toHaveLength(0);
  });

  it('deduplicates repeated source_refs', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.9 },
      { source_ref: 'm1', category: 'deadline', title: 'Pay fee again', due_at: '2026-06-27T00:00:00Z', amount: null, confidence: 0.9 },
    ]});
    expect(parseExtractionResponse(raw, byRef)).toHaveLength(1);
  });

  it('returns [] on malformed JSON', () => {
    expect(parseExtractionResponse('not json', byRef)).toEqual([]);
  });

  it('returns [] when no categories are allowed', () => {
    const raw = JSON.stringify({ items: [
      { source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: null, confidence: 0.9 },
    ]});
    expect(parseExtractionResponse(raw, byRef, [] as InboxCategory[])).toEqual([]);
  });
});
