import { describe, it, expect } from 'vitest';
import {
  hasGmailScope,
  normalizeGmailMessage,
  normalizeCalendarEvent,
  extractMeetingUrl,
  buildGmailQuery,
  orderSweepQuery,
  GmailApiError,
  gmailFailureHint,
  isInvalidGrant,
} from './google';

describe('hasGmailScope', () => {
  it('true when gmail.readonly present', () => {
    expect(hasGmailScope('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly')).toBe(true);
  });
  it('false when absent or null', () => {
    expect(hasGmailScope('https://www.googleapis.com/auth/calendar.readonly')).toBe(false);
    expect(hasGmailScope(null)).toBe(false);
  });
});

describe('normalizeGmailMessage', () => {
  it('pulls subject + sender from headers, snippet + internalDate', () => {
    const msg = {
      id: 'abc',
      snippet: 'Pay your fee',
      internalDate: '1750800000000',
      payload: { headers: [
        { name: 'Subject', value: 'Fee due' },
        { name: 'From', value: 'Bursar <fees@clg.edu>' },
      ] },
    };
    const n = normalizeGmailMessage(msg);
    expect(n.source_ref).toBe('abc');
    expect(n.subject).toBe('Fee due');
    expect(n.sender).toContain('fees@clg.edu');
    expect(n.snippet).toBe('Pay your fee');
    expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe('normalizeCalendarEvent', () => {
  it('uses summary as subject and start as date', () => {
    const ev = { id: 'e1', summary: 'Dentist', start: { dateTime: '2026-06-27T10:00:00+05:30' } };
    const n = normalizeCalendarEvent(ev);
    expect(n.source_ref).toBe('e1');
    expect(n.subject).toBe('Dentist');
    expect(n.date).toContain('2026-06-27');
  });

  it('exposes hangoutLink and exact start time so the meeting is joinable', () => {
    const ev = {
      id: 'e2',
      summary: 'Standup',
      start: { dateTime: '2026-06-27T10:00:00+05:30' },
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
    };
    const n = normalizeCalendarEvent(ev);
    expect(n.meeting_url).toBe('https://meet.google.com/abc-defg-hij');
    expect(n.starts_at).toBe('2026-06-27T10:00:00+05:30');
  });

  it('falls back to conferenceData video entry point', () => {
    const ev = {
      id: 'e3',
      summary: 'Client call',
      start: { dateTime: '2026-06-27T10:00:00Z' },
      conferenceData: {
        entryPoints: [
          { entryPointType: 'phone', uri: 'tel:+911234567890' },
          { entryPointType: 'video', uri: 'https://zoom.us/j/9876543210' },
        ],
      },
    };
    expect(normalizeCalendarEvent(ev).meeting_url).toBe('https://zoom.us/j/9876543210');
  });

  it('leaves starts_at null for all-day events', () => {
    const ev = { id: 'e4', summary: 'Holiday', start: { date: '2026-06-27' } };
    const n = normalizeCalendarEvent(ev);
    expect(n.starts_at).toBeNull();
    expect(n.date).toBe('2026-06-27');
  });
});

describe('extractMeetingUrl', () => {
  it('finds Meet, Zoom, and Teams links in free text', () => {
    expect(extractMeetingUrl('Join at https://meet.google.com/xyz-abcd-efg now')).toBe(
      'https://meet.google.com/xyz-abcd-efg'
    );
    expect(extractMeetingUrl('https://us02web.zoom.us/j/123456789?pwd=xy')).toBe(
      'https://us02web.zoom.us/j/123456789?pwd=xy'
    );
    expect(extractMeetingUrl(null, 'see https://teams.microsoft.com/l/meetup-join/abc')).toBe(
      'https://teams.microsoft.com/l/meetup-join/abc'
    );
  });

  it('strips trailing punctuation', () => {
    expect(extractMeetingUrl('Link: https://meet.google.com/abc-defg-hij.')).toBe(
      'https://meet.google.com/abc-defg-hij'
    );
  });

  it('returns null when there is no conference link', () => {
    expect(extractMeetingUrl('no link here', null, undefined)).toBeNull();
    expect(extractMeetingUrl('https://example.com/not-a-meeting')).toBeNull();
  });
});

describe('buildGmailQuery', () => {
  it('excludes promotions unless the user opted in', () => {
    expect(buildGmailQuery(['deadline', 'bill'])).toContain('-category:promotions');
    expect(buildGmailQuery(['deadline', 'promotion'])).not.toContain('-category:promotions');
  });

  it('always drops social and forums noise, and looks back a week', () => {
    const q = buildGmailQuery(['deadline']);
    expect(q).toContain('-category:social');
    expect(q).toContain('-category:forums');
    expect(q).toContain('newer_than:7d');
    expect(q).toContain('in:inbox');
  });
});

describe('gmailFailureHint', () => {
  it('names the disabled-API case, which is the fixable one', () => {
    const e = new GmailApiError(403, 'Gmail API has not been used in project 2541182778 before or it is disabled.');
    expect(gmailFailureHint(e)).toMatch(/not enabled/i);
    expect(gmailFailureHint(e)).toMatch(/Google Cloud/i);
  });

  it('distinguishes revoked access, expiry, and rate limits', () => {
    expect(gmailFailureHint(new GmailApiError(403, 'insufficient permission'))).toMatch(/Reconnect/i);
    expect(gmailFailureHint(new GmailApiError(401, 'invalid credentials'))).toMatch(/expired/i);
    expect(gmailFailureHint(new GmailApiError(429, 'rate limit'))).toMatch(/rate-limiting/i);
  });

  it('handles non-API errors', () => {
    expect(gmailFailureHint(new Error('network down'))).toMatch(/Could not reach Gmail/i);
  });
});

describe('orderSweepQuery', () => {
  it('targets known merchants and shipping subjects', () => {
    const q = orderSweepQuery();
    expect(q).toContain('from:amazon');
    expect(q).toContain('from:flipkart');
    expect(q).toContain('subject:shipped');
    expect(q).toContain('subject:"out for delivery"');
  });
});

describe('isInvalidGrant', () => {
  it('detects a permanently dead refresh token', () => {
    expect(isInvalidGrant('{"error":"invalid_grant","error_description":"Bad Request"}')).toBe(true);
    expect(isInvalidGrant('Token has been expired or revoked.')).toBe(true);
  });

  it('does not treat transient failures as permanent', () => {
    expect(isInvalidGrant('{"error":"internal_failure"}')).toBe(false);
    expect(isInvalidGrant('503 Service Unavailable')).toBe(false);
    expect(isInvalidGrant('')).toBe(false);
  });
});
