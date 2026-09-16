import { Context } from 'hono';
import { Bindings, Variables } from '../types';
import { ADMIN_EMAILS_FALLBACK } from '../config/constants';
import { getAdminEmails } from '../services/auth';

/**
 * Check if the current user is an admin.
 *
 * The email comes from the verified access token (set by authMiddleware), not
 * from a request header — a caller cannot name themselves an admin.
 */
export function isAdmin(c: Context<{ Bindings: Bindings; Variables: Variables }>): boolean {
  const userEmail = c.get('userEmail');
  if (!userEmail) return false;

  const allowed = getAdminEmails(c.env, ADMIN_EMAILS_FALLBACK);
  return allowed.includes(userEmail.toLowerCase());
}

/**
 * Guard for admin-only routes. Returns a response to send, or null to continue.
 */
export function requireAdmin(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  if (!isAdmin(c)) {
    return c.json({ error: 'Forbidden', details: 'Admin access required' }, 403);
  }
  return null;
}
