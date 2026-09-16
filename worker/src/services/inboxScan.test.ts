import { describe, it, expect } from 'vitest';
import { shouldScan, mapSuggestionToTask, type SuggestionRow } from './inboxScan';

const base: SuggestionRow = {
  user_id: 'u1', source: 'gmail', source_ref: 'm1', title: 'Pay fee',
  category: 'bill', due_at: '2026-06-27T10:00:00.000Z', amount: 500,
  snippet: 's', sender: 'a@b.com', confidence: 0.9,
  meeting_url: null, starts_at: null,
};

describe('shouldScan', () => {
  const now = new Date('2026-06-25T12:00:00.000Z');
  it('scans when never scanned', () => {
    expect(shouldScan(null, now)).toBe(true);
  });
  it('skips when scanned 1h ago', () => {
    expect(shouldScan('2026-06-25T11:00:00.000Z', now)).toBe(false);
  });
  it('scans when scanned 5h ago', () => {
    expect(shouldScan('2026-06-25T07:00:00.000Z', now)).toBe(true);
  });
});

describe('mapSuggestionToTask', () => {
  it('maps due_at to YYYY-MM-DD due_date and pending status', () => {
    const t = mapSuggestionToTask(base);
    expect(t).toEqual({ user_id: 'u1', title: 'Pay fee', status: 'pending', due_date: '2026-06-27', tag: 'other' });
  });
  it('handles null due_at', () => {
    const t = mapSuggestionToTask({ ...base, due_at: null });
    expect(t.due_date).toBeNull();
  });
});
