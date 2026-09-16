import { describe, it, expect, vi } from 'vitest';
import { scanInboxForUser, type ScanDeps } from './inboxScan';
import { GmailApiError } from './google';

function makeDeps(over: Partial<ScanDeps> = {}): ScanDeps {
  return {
    getConnection: async () => ({ access_token: 'a', refresh_token: 'r', expires_at: null, scope: 'https://www.googleapis.com/auth/gmail.readonly' }),
    getScanState: async () => ({ last_scanned_at: null, enabled: true }),
    getFreshToken: async () => ({ accessToken: 'fresh', expiresAt: null }),
    fetchGmail: async () => [{ id: 'm1', snippet: 's', internalDate: '1750800000000', payload: { headers: [{ name: 'Subject', value: 'Fee due' }, { name: 'From', value: 'a@b.com' }] } }],
    fetchCalendar: async () => [],
    extract: async () => [{ source_ref: 'm1', category: 'bill', title: 'Pay fee', due_at: null, amount: 500, confidence: 0.9 }],
    upsertSuggestions: vi.fn(async () => {}),
    saveTokens: vi.fn(async () => {}),
    setLastScanned: vi.fn(async () => {}),
    now: () => new Date('2026-06-25T12:00:00.000Z'),
    ...over,
  };
}

describe('scanInboxForUser', () => {
  it('returns disabled when toggle off', async () => {
    const r = await scanInboxForUser(makeDeps({ getScanState: async () => ({ last_scanned_at: null, enabled: false }) }), 'u1');
    expect(r.status).toBe('disabled');
  });
  it('returns no_connection when not connected', async () => {
    const r = await scanInboxForUser(makeDeps({ getConnection: async () => null }), 'u1');
    expect(r.status).toBe('no_connection');
  });
  it('scans Calendar-only when the Gmail scope was never granted', async () => {
    // Gmail is a restricted scope and an optional upgrade. A Calendar-only user
    // is fully working, so the scan must succeed rather than demand a reconnect.
    const fetchGmail = vi.fn(async () => []);
    const r = await scanInboxForUser(
      makeDeps({
        fetchGmail,
        getConnection: async () => ({ access_token: 'a', refresh_token: 'r', expires_at: null, scope: 'https://www.googleapis.com/auth/calendar.readonly' }),
        fetchCalendar: async () => [{ id: 'e1', summary: 'Standup', start: { dateTime: '2026-06-25T13:00:00.000Z' } }],
        extract: async () => [{ source_ref: 'e1', category: 'meeting', title: 'Standup', due_at: null, amount: null, confidence: 0.9 }],
      }),
      'u1',
    );
    expect(r.status).toBe('ok');
    expect(r.gmailEnabled).toBe(false);
    expect(fetchGmail).not.toHaveBeenCalled();
  });

  it('skips the billed extraction call when nothing was found', async () => {
    const extract = vi.fn(async () => []);
    const r = await scanInboxForUser(
      makeDeps({ extract, fetchGmail: async () => [], fetchCalendar: async () => [] }),
      'u1',
    );
    expect(r.status).toBe('ok');
    expect(r.suggestionsAdded).toBe(0);
    expect(extract).not.toHaveBeenCalled();
  });
  it('skips on throttle', async () => {
    const r = await scanInboxForUser(makeDeps({ getScanState: async () => ({ last_scanned_at: '2026-06-25T11:00:00.000Z', enabled: true }) }), 'u1');
    expect(r.status).toBe('skipped_throttle');
  });
  it('happy path upserts mapped suggestions and updates scan time', async () => {
    const deps = makeDeps();
    const r = await scanInboxForUser(deps, 'u1');
    expect(r.status).toBe('ok');
    expect(r.suggestionsAdded).toBe(1);
    expect(deps.upsertSuggestions).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'u1', source: 'gmail', source_ref: 'm1', category: 'bill', amount: 500, title: 'Pay fee', status: 'pending' }),
    ]);
    expect(deps.setLastScanned).toHaveBeenCalled();
  });
  it('returns token_failed when refresh fails', async () => {
    const r = await scanInboxForUser(makeDeps({ getFreshToken: async () => null }), 'u1');
    expect(r.status).toBe('token_failed');
  });
  it('passes the user category selection to Gmail and the extractor', async () => {
    // Must return a candidate: with an empty result the scan short-circuits
    // before the extractor, and this test is about what the extractor receives.
    const fetchGmail = vi.fn(async () => [
      { id: 'm1', snippet: 's', internalDate: '1750800000000', payload: { headers: [{ name: 'Subject', value: 'Fee due' }, { name: 'From', value: 'a@b.com' }] } },
    ]);
    const extract = vi.fn(async () => []);
    const deps = makeDeps({
      fetchGmail,
      extract,
      getScanState: async () => ({ last_scanned_at: null, enabled: true, categories: ['bill', 'order'] }),
    });
    await scanInboxForUser(deps, 'u1');
    expect(fetchGmail).toHaveBeenCalledWith('fresh', ['bill', 'order']);
    expect(extract).toHaveBeenCalledWith(expect.anything(), ['bill', 'order']);
  });

  it('falls back to default categories when the column is null', async () => {
    const fetchGmail = vi.fn(async () => []);
    const deps = makeDeps({
      fetchGmail,
      getScanState: async () => ({ last_scanned_at: null, enabled: true, categories: null }),
    });
    await scanInboxForUser(deps, 'u1');
    expect(fetchGmail).toHaveBeenCalledWith('fresh', expect.arrayContaining(['deadline', 'order']));
  });

  it('carries the calendar join link and start time onto the suggestion', async () => {
    const deps = makeDeps({
      fetchGmail: async () => [],
      fetchCalendar: async () => [
        {
          id: 'e1',
          summary: 'Standup',
          start: { dateTime: '2026-06-26T09:30:00+05:30' },
          hangoutLink: 'https://meet.google.com/abc-defg-hij',
        },
      ],
      extract: async () => [
        { source_ref: 'e1', category: 'meeting', title: 'Standup', due_at: null, amount: null, confidence: 0.95 },
      ],
    });
    await scanInboxForUser(deps, 'u1');
    expect(deps.upsertSuggestions).toHaveBeenCalledWith([
      expect.objectContaining({
        source: 'calendar',
        category: 'meeting',
        meeting_url: 'https://meet.google.com/abc-defg-hij',
        starts_at: '2026-06-26T09:30:00+05:30',
        due_at: '2026-06-26T09:30:00+05:30',
      }),
    ]);
  });

  it('never trusts a model-supplied join link', async () => {
    const deps = makeDeps({
      extract: async () => [
        {
          source_ref: 'm1',
          category: 'meeting',
          title: 'Call',
          due_at: '2026-06-26T09:00:00.000Z',
          amount: null,
          confidence: 0.9,
          // A model could emit this; it must not reach the row.
          meeting_url: 'https://evil.example.com/phish',
        } as any,
      ],
    });
    await scanInboxForUser(deps, 'u1');
    expect(deps.upsertSuggestions).toHaveBeenCalledWith([
      expect.objectContaining({ meeting_url: null }),
    ]);
  });

  it('reports gmail_failed instead of a false ok when Gmail errors', async () => {
    const deps = makeDeps({
      fetchGmail: async () => {
        throw new GmailApiError(403, 'Gmail API has not been used in project 123 before or it is disabled.');
      },
    });
    const r = await scanInboxForUser(deps, 'u1');
    expect(r.status).toBe('gmail_failed');
    expect(r.suggestionsAdded).toBe(0);
    expect(r.detail).toMatch(/not enabled/i);
  });

  it('leaves a failed scan retryable by not stamping last_scanned_at', async () => {
    const deps = makeDeps({
      fetchGmail: async () => {
        throw new GmailApiError(403, 'disabled');
      },
    });
    await scanInboxForUser(deps, 'u1');
    expect(deps.setLastScanned).not.toHaveBeenCalled();
    expect(deps.upsertSuggestions).not.toHaveBeenCalled();
  });

  it('reports extract_failed with a rate-limit hint, and stays retryable', async () => {
    const deps = makeDeps({
      extract: async () => {
        throw new Error('Groq API Error (413): Request too large ... tokens per minute (TPM)');
      },
    });
    const r = await scanInboxForUser(deps, 'u1');
    expect(r.status).toBe('extract_failed');
    expect(r.detail).toMatch(/rate limit/i);
    expect(deps.setLastScanned).not.toHaveBeenCalled();
  });

  it('sends calendar items to the extractor first so they survive truncation', async () => {
    const seen: Array<{ source_ref: string }> = [];
    const deps = makeDeps({
      extract: async (items) => {
        seen.push(...items);
        return [];
      },
      fetchCalendar: async () => [
        { id: 'e1', summary: 'Standup', start: { dateTime: '2026-06-26T09:30:00+05:30' } },
      ],
    });
    await scanInboxForUser(deps, 'u1');
    expect(seen[0].source_ref).toBe('e1');
  });

  it('drops extracted items with unknown source_ref without crashing', async () => {
    const deps = makeDeps({
      extract: async () => [{ source_ref: 'ghost', category: 'bill', title: 'Hallucinated', due_at: null, amount: null, confidence: 0.9 }],
    });
    const r = await scanInboxForUser(deps, 'u1');
    expect(r.status).toBe('ok');
    expect(r.suggestionsAdded).toBe(0);
    expect(deps.upsertSuggestions).not.toHaveBeenCalled();
    expect(deps.setLastScanned).toHaveBeenCalled();
  });
});
