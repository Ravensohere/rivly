import { describe, it, expect } from 'vitest';
import { FAILURE_BACKOFF_MS, isPaidFailure, shouldClientScan, shouldRecordScan } from './useInboxRadar';

describe('shouldClientScan', () => {
  const now = new Date('2026-06-25T12:00:00.000Z').getTime();
  it('scans when never scanned', () => {
    expect(shouldClientScan(null, now)).toBe(true);
  });
  it('skips within 4h', () => {
    expect(shouldClientScan(new Date('2026-06-25T11:00:00.000Z').toISOString(), now)).toBe(false);
  });
  it('scans after 4h', () => {
    expect(shouldClientScan(new Date('2026-06-25T07:00:00.000Z').toISOString(), now)).toBe(true);
  });
});

describe('shouldRecordScan', () => {
  it('starts the throttle clock only when the scan really ran', () => {
    expect(shouldRecordScan('ok')).toBe(true);
    expect(shouldRecordScan('skipped_throttle')).toBe(true);
  });

  it('keeps failures retryable so a fixed connection is picked up immediately', () => {
    expect(shouldRecordScan('no_connection')).toBe(false);
    expect(shouldRecordScan('needs_reconnect')).toBe(false);
    expect(shouldRecordScan('token_failed')).toBe(false);
    expect(shouldRecordScan('disabled')).toBe(false);
    expect(shouldRecordScan(undefined)).toBe(false);
  });
});

describe('paid-failure backoff', () => {
  const now = new Date('2026-06-25T12:00:00.000Z').getTime();

  it('classifies only statuses that already spent money/quota as paid', () => {
    expect(isPaidFailure('extract_failed')).toBe(true);
    expect(isPaidFailure('gmail_failed')).toBe(true);
    expect(isPaidFailure('token_failed')).toBe(true);
    // These return before any API call, so retrying them is free.
    expect(isPaidFailure('no_connection')).toBe(false);
    expect(isPaidFailure('needs_reconnect')).toBe(false);
    expect(isPaidFailure('disabled')).toBe(false);
    expect(isPaidFailure(undefined)).toBe(false);
  });

  it('blocks a rescan while the backoff window is open', () => {
    const justFailed = new Date(now - 60_000).toISOString();
    // Would otherwise scan (no successful scan on record).
    expect(shouldClientScan(null, now)).toBe(true);
    expect(shouldClientScan(null, now, justFailed)).toBe(false);
  });

  it('allows a rescan once the backoff has elapsed', () => {
    const oldFailure = new Date(now - FAILURE_BACKOFF_MS - 1000).toISOString();
    expect(shouldClientScan(null, now, oldFailure)).toBe(true);
  });

  it('ignores an unparseable failure stamp rather than blocking forever', () => {
    expect(shouldClientScan(null, now, 'not-a-date')).toBe(true);
  });

  it('still honours the 4h success throttle during backoff', () => {
    const recentScan = new Date(now - 60 * 60 * 1000).toISOString();
    expect(shouldClientScan(recentScan, now, null)).toBe(false);
  });
});
