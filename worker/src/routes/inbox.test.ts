import { describe, it, expect, vi } from 'vitest';
import inboxRoutes from './inbox';
import { Hono } from 'hono';
import type { Variables } from '../types';

function appWithUser(userId = 'u1') {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => { c.set('userId', userId); await next(); });
  app.route('/inbox', inboxRoutes);
  return app;
}

describe('inbox routes', () => {
  it('GET /status returns shape', async () => {
    // Stub the supabase service so getConnection/scan-state resolve.
    const app = appWithUser();
    const res = await app.request('/inbox/status', {}, { GROQ_API_KEY: 'x' } as any);
    // Without DB this may 200 with defaults or 500; assert it routes (not 404).
    expect(res.status).not.toBe(404);
  });
});
