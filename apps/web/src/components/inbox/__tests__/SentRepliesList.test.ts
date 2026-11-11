import { describe, it, expect } from 'vitest';
import { formatSentDate } from '../SentRepliesList';

describe('formatSentDate', () => {
  it('formats a valid ISO date as "Mon D"', () => {
    const formatted = formatSentDate('2026-06-27T10:00:00.000Z');
    expect(formatted).toMatch(/Jun/);
    expect(formatted).toMatch(/2[67]/);
  });
  it('returns empty string for an unparseable date', () => {
    expect(formatSentDate('not-a-date')).toBe('');
  });
});
