/**
 * auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Access-token verification.
 *
 * Identity is derived from a Supabase access token that we verify against
 * Supabase itself — never from a client-supplied header. The token is checked
 * for shape and expiry locally (cheap, rejects junk without a network round
 * trip) and then validated by Supabase, which is what actually proves the
 * signature.
 *
 * Verified results are cached per isolate so a burst of calls from one client
 * costs one round trip rather than one per request.
 */

import { Bindings } from '../types';

export interface VerifiedUser {
  userId: string;
  email?: string;
}

interface CacheEntry {
  user: VerifiedUser;
  expiresAt: number;
}

const VERIFY_CACHE = new Map<string, CacheEntry>();
const CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Pull the raw token out of an `Authorization: Bearer <token>` header. */
export function extractBearerToken(header?: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/** Decode a JWT payload without trusting it. Returns null on any malformed input. */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const binary = atob(base64 + padding);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * A token with no `exp` counts as expired — we will not accept a credential
 * that never stops being valid.
 */
export function isTokenExpired(
  payload: Record<string, any> | null,
  nowSeconds: number = Date.now() / 1000
): boolean {
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp <= nowSeconds;
}

/**
 * True when `path` is the public prefix or sits beneath it.
 *
 * Matching is on segment boundaries, not substrings: `/api/admin/health` must
 * not inherit the public status of `/api/health`.
 */
export function isPublicPath(path: string, publicPrefixes: readonly string[]): boolean {
  return publicPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Drop a token from the verification cache (used on sign-out style failures). */
function forget(token: string): void {
  VERIFY_CACHE.delete(token);
}

function remember(token: string, user: VerifiedUser, tokenExpSeconds: number): void {
  if (VERIFY_CACHE.size >= CACHE_MAX_ENTRIES) VERIFY_CACHE.clear();
  const expiresAt = Math.min(tokenExpSeconds * 1000, Date.now() + CACHE_TTL_MS);
  VERIFY_CACHE.set(token, { user, expiresAt });
}

/** Exposed for tests — isolates are long-lived and cache state would leak between cases. */
export function __clearVerifyCache(): void {
  VERIFY_CACHE.clear();
}

/**
 * Verify a Supabase access token and return the identity it proves.
 * Returns null for anything we cannot vouch for.
 */
export async function verifyAccessToken(
  env: Bindings,
  token: string
): Promise<VerifiedUser | null> {
  const payload = decodeJwtPayload(token);
  if (isTokenExpired(payload)) {
    forget(token);
    return null;
  }

  const cached = VERIFY_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  if (cached) forget(token);

  let response: Response;
  try {
    response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
  } catch (error) {
    console.error('[Auth] Token verification request failed:', error);
    return null;
  }

  if (!response.ok) {
    forget(token);
    return null;
  }

  const body = (await response.json().catch(() => null)) as any;
  if (!body?.id || typeof body.id !== 'string') return null;

  const user: VerifiedUser = {
    userId: body.id,
    email: typeof body.email === 'string' ? body.email : undefined,
  };

  remember(token, user, payload!.exp as number);
  return user;
}

/**
 * Admin allowlist, read from the environment so the addresses live in
 * Cloudflare secrets rather than source control. Falls back to the bundled
 * list when unset so an unconfigured deploy still has working admin access.
 */
export function getAdminEmails(env: Bindings, fallback: readonly string[]): string[] {
  const configured = env.ADMIN_EMAILS;
  if (!configured) return fallback.map((e) => e.toLowerCase());
  return configured
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
