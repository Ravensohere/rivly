import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types';
import { buildCorsConfig } from './config/constants';
import { authMiddleware } from './middleware/auth';

// Import route modules
import healthRoutes from './routes/health';
import taskRoutes from './routes/tasks';
import focusRoutes from './routes/focus';
import rivaRoutes from './routes/riva';
import orbRoutes from './routes/orb';
import insightsRoutes from './routes/insights';
import adminRoutes from './routes/admin';
import waitlistRoutes from './routes/waitlist';
import paymentRoutes from './routes/payment';
import inboxRoutes from './routes/inbox';
import { handleRivaLiveWebSocket } from './routes/riva-live';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// --- Global Middleware ---
// CORS is built per-request so the allowlist can include FRONTEND_URL from env.
app.use('*', (c, next) => cors(buildCorsConfig(c.env.FRONTEND_URL))(c, next));

// Auth middleware for protected routes
app.use('/api/*', authMiddleware);

// --- Mount Routes ---
app.route('/api', healthRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/focus', focusRoutes);
app.route('/api/riva', rivaRoutes);
app.route('/api', orbRoutes);
app.route('/api/insights', insightsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/waitlist', waitlistRoutes);
app.route('/api/payment', paymentRoutes);
app.route('/api/inbox', inboxRoutes);

// --- Export ---
// WebSocket upgrades must bypass Hono's middleware (CORS, etc.) because
// the CF Workers WebSocket response (status 101 + webSocket) cannot have
// extra headers added by middleware. We intercept the upgrade at the
// top-level fetch handler before Hono processes it.
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Intercept WebSocket upgrade for /api/riva/live
    if (
      url.pathname === '/api/riva/live' &&
      request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
    ) {
      return handleRivaLiveWebSocket(request, env);
    }

    // Everything else goes through Hono
    return app.fetch(request, env, ctx);
  },
};
