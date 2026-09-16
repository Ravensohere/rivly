import { Context, Next } from 'hono';
import { Bindings, Variables } from '../types';
import { PUBLIC_ENDPOINTS } from '../config/constants';
import { extractBearerToken, isPublicPath, verifyAccessToken } from '../services/auth';

/**
 * Authentication middleware
 *
 * Requires `Authorization: Bearer <supabase access token>` and derives the
 * user's identity from the verified token. Client-supplied `x-user-id` and
 * `x-user-email` headers are ignored — they are claims, not proof.
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  if (isPublicPath(c.req.path, PUBLIC_ENDPOINTS)) {
    return next();
  }

  const token = extractBearerToken(c.req.header('Authorization'));
  if (!token) {
    return c.json({ error: 'Unauthorized', details: 'Missing bearer token' }, 401);
  }

  const user = await verifyAccessToken(c.env, token);
  if (!user) {
    return c.json({ error: 'Unauthorized', details: 'Invalid or expired session' }, 401);
  }

  c.set('userId', user.userId);
  if (user.email) c.set('userEmail', user.email);

  await next();
}
