import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractBearerToken,
  decodeJwtPayload,
  isTokenExpired,
  isPublicPath,
  verifyAccessToken,
  getAdminEmails,
  __clearVerifyCache,
} from './auth';
import { PUBLIC_ENDPOINTS } from '../config/constants';
import type { Bindings } from '../types';

const ENV = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
} as Bindings;

function makeToken(payload: Record<string, any>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
const pastExp = () => Math.floor(Date.now() / 1000) - 60;

describe('extractBearerToken', () => {
  it('pulls the token out of a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme', () => {
    expect(extractBearerToken('bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('rejects a missing, empty, or non-bearer header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
  });
});

describe('decodeJwtPayload', () => {
  it('decodes the payload segment', () => {
    const token = makeToken({ sub: 'user-1', exp: 123 });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', exp: 123 });
  });

  it('handles non-ASCII claims', () => {
    const token = makeToken({ name: 'Ravi' });
    expect(decodeJwtPayload(token)).toEqual({ name: 'Ravi' });
  });

  it('returns null for malformed input rather than throwing', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
    expect(decodeJwtPayload('a.!!!!.c')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('treats a token with no exp claim as expired', () => {
    expect(isTokenExpired({ sub: 'user-1' })).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
  });

  it('compares exp against now', () => {
    expect(isTokenExpired({ exp: futureExp() })).toBe(false);
    expect(isTokenExpired({ exp: pastExp() })).toBe(true);
  });
});

describe('isPublicPath', () => {
  it('matches the prefix itself and paths beneath it', () => {
    expect(isPublicPath('/api/health', PUBLIC_ENDPOINTS)).toBe(true);
    expect(isPublicPath('/api/waitlist/join', PUBLIC_ENDPOINTS)).toBe(true);
  });

  it('does not let a nested route inherit a public prefix by substring', () => {
    expect(isPublicPath('/api/admin/health', PUBLIC_ENDPOINTS)).toBe(false);
    expect(isPublicPath('/api/health-secrets', PUBLIC_ENDPOINTS)).toBe(false);
    expect(isPublicPath('/api/tasks', PUBLIC_ENDPOINTS)).toBe(false);
  });
});

describe('verifyAccessToken', () => {
  beforeEach(() => {
    __clearVerifyCache();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockUserResponse(body: unknown, ok = true) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok,
      json: async () => body,
    } as Response);
  }

  it('returns the identity Supabase confirms', async () => {
    mockUserResponse({ id: 'user-1', email: 'a@b.com' });
    const result = await verifyAccessToken(ENV, makeToken({ exp: futureExp() }));
    expect(result).toEqual({ userId: 'user-1', email: 'a@b.com' });
  });

  it('rejects an expired token without calling Supabase', async () => {
    const fetchSpy = mockUserResponse({ id: 'user-1' });
    const result = await verifyAccessToken(ENV, makeToken({ exp: pastExp() }));
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a token Supabase does not recognise', async () => {
    mockUserResponse({ msg: 'invalid' }, false);
    const result = await verifyAccessToken(ENV, makeToken({ exp: futureExp() }));
    expect(result).toBeNull();
  });

  it('rejects a response with no user id', async () => {
    mockUserResponse({ email: 'a@b.com' });
    const result = await verifyAccessToken(ENV, makeToken({ exp: futureExp() }));
    expect(result).toBeNull();
  });

  it('returns null instead of throwing when the network fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const result = await verifyAccessToken(ENV, makeToken({ exp: futureExp() }));
    expect(result).toBeNull();
  });

  it('caches a verified token so repeat calls cost one round trip', async () => {
    const fetchSpy = mockUserResponse({ id: 'user-1', email: 'a@b.com' });
    const token = makeToken({ exp: futureExp() });

    await verifyAccessToken(ENV, token);
    await verifyAccessToken(ENV, token);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected token', async () => {
    const fetchSpy = mockUserResponse({}, false);
    const token = makeToken({ exp: futureExp() });

    await verifyAccessToken(ENV, token);
    await verifyAccessToken(ENV, token);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('sends the token and the anon apikey to Supabase', async () => {
    const fetchSpy = mockUserResponse({ id: 'user-1' });
    const token = makeToken({ exp: futureExp() });

    await verifyAccessToken(ENV, token);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      { headers: { Authorization: `Bearer ${token}`, apikey: 'anon-key' } }
    );
  });
});

describe('getAdminEmails', () => {
  it('parses and normalises the configured allowlist', () => {
    const env = { ADMIN_EMAILS: ' A@b.com , c@d.com ' } as Bindings;
    expect(getAdminEmails(env, [])).toEqual(['a@b.com', 'c@d.com']);
  });

  it('falls back to the bundled list when unset', () => {
    expect(getAdminEmails({} as Bindings, ['Admin@Vivly.app'])).toEqual(['admin@vivly.app']);
  });
});
