import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { extractBearerToken, verifyAccessToken } from '../services/auth';

/**
 * Phone-to-desktop control relay — Cloudflare-native (D1), no Supabase. Mounted at `/relay` in
 * index.ts, a separate prefix from `/api/*` specifically so it does NOT go through the global
 * Supabase JWT authMiddleware; this route group has its own device-secret auth instead (see
 * deviceAuth below). Schema: worker/migrations/0001_create_desktop_relay.sql.
 *
 * Supersedes the earlier Supabase-backed version (worker/src/routes/desktop.ts, deleted) — see
 * MERGE_LOG.md for why.
 */
const relayRoutes = new Hono<{ Bindings: Bindings; Variables: Variables & { deviceId: string } }>();

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Unambiguous alphabet (no 0/O/1/I) — this gets read off a screen and typed by hand into a setup
// wizard. 8 chars from a 32-symbol alphabet is ~40 bits of entropy, plenty for a code that's also
// single-use and expires in minutes.
const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_TTL_MINUTES = 10;

export function generatePairingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PAIRING_CODE_LENGTH));
  return Array.from(bytes, (b) => PAIRING_CODE_ALPHABET[b % PAIRING_CODE_ALPHABET.length]).join('');
}

// POST /relay/pairing/create — requires a logged-in Rivly (Supabase) user. Issues a short-lived,
// single-use code; the desktop setup wizard asks the person to type this in, which is what binds
// the device they're about to register to this user_id. This is the only relay endpoint that uses
// Supabase auth directly (the group below stays on device-secret auth, same as before) — it's the
// one call a browser/phone session, not a desktop agent, is expected to make.
relayRoutes.post('/pairing/create', async (c) => {
  const token = extractBearerToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'missing bearer token' }, 401);
  const user = await verifyAccessToken(c.env, token);
  if (!user) return c.json({ error: 'invalid or expired session' }, 401);

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60_000).toISOString();
  await c.env.DESKTOP_RELAY_DB.prepare(
    'INSERT INTO relay_pairing_codes (code, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(code, user.userId, expiresAt)
    .run();

  return c.json({ code, expires_at: expiresAt });
});

// POST /relay/devices/register  { secret, pairing_code }  — the desktop agent calls this once,
// during setup, after the person has typed in the code shown on their phone/web session. Replaces
// the old "anyone can self-register, ownership is whoever holds the secret" bootstrap: a device
// now exists only bound to the user_id who issued the code, and the code is burned on use.
relayRoutes.post('/devices/register', async (c) => {
  const body = await c.req
    .json<{ secret?: string; label?: string; pairing_code?: string }>()
    .catch(() => ({}) as { secret?: string; label?: string; pairing_code?: string });
  const secret = body.secret;
  const pairingCode = body.pairing_code?.trim().toUpperCase();
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    return c.json({ error: 'secret must be a string of at least 32 characters' }, 400);
  }
  if (!pairingCode) {
    return c.json({ error: 'pairing_code is required' }, 400);
  }

  // Atomic claim: the WHERE guard makes consumed_at NULL -> set a single conditional write, so
  // two concurrent requests for the same code can't both pass a separate check-then-act step.
  // Only the request whose UPDATE actually matches the still-unconsumed row gets a RETURNING row.
  const id = crypto.randomUUID();
  const claim = await c.env.DESKTOP_RELAY_DB.prepare(
    `UPDATE relay_pairing_codes
     SET consumed_at = datetime('now'), device_id = ?
     WHERE code = ? AND consumed_at IS NULL AND expires_at > datetime('now')
     RETURNING user_id`,
  )
    .bind(id, pairingCode)
    .first<{ user_id: string }>();

  if (!claim) {
    const existing = await c.env.DESKTOP_RELAY_DB.prepare(
      'SELECT expires_at, consumed_at FROM relay_pairing_codes WHERE code = ?',
    )
      .bind(pairingCode)
      .first<{ expires_at: string; consumed_at: string | null }>();
    if (!existing) return c.json({ error: 'invalid pairing code' }, 400);
    if (existing.consumed_at) return c.json({ error: 'pairing code already used' }, 400);
    return c.json({ error: 'pairing code expired' }, 400);
  }

  const secretHash = await sha256Hex(secret);
  await c.env.DESKTOP_RELAY_DB.prepare(
    'INSERT INTO desktop_devices (id, secret_hash, label, user_id) VALUES (?, ?, ?, ?)',
  )
    .bind(id, secretHash, body.label ?? null, claim.user_id)
    .run();

  return c.json({ device_id: id });
});

// Device-secret auth for every /devices/:deviceId/* route below: Authorization: Bearer <secret>,
// hashed and compared against the stored hash for that device id. Not constant-time compare —
// acceptable for this scope (a single-user personal device pair, not a public multi-tenant
// auth system); documented rather than silently assumed safe.
relayRoutes.use('/devices/:deviceId/*', async (c, next) => {
  const deviceId = c.req.param('deviceId');
  const authHeader = c.req.header('Authorization') ?? '';
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!secret) return c.json({ error: 'missing bearer token' }, 401);

  const row = await c.env.DESKTOP_RELAY_DB.prepare('SELECT secret_hash FROM desktop_devices WHERE id = ?')
    .bind(deviceId)
    .first<{ secret_hash: string }>();
  if (!row) return c.json({ error: 'unknown device' }, 404);

  const incomingHash = await sha256Hex(secret);
  if (incomingHash !== row.secret_hash) return c.json({ error: 'invalid secret' }, 401);

  c.set('deviceId', deviceId);
  await next();
});

// GET /relay/devices/:deviceId — presence: seconds since the desktop agent last polled. The phone
// shows "online" when this is small. Computed in SQL so both timestamps share one clock.
relayRoutes.get('/devices/:deviceId', async (c) => {
  const deviceId = c.get('deviceId');
  const row = await c.env.DESKTOP_RELAY_DB.prepare(
    `SELECT label, last_seen_at,
            CAST((julianday('now') - julianday(last_seen_at)) * 86400 AS INTEGER) AS seconds_since_seen
       FROM desktop_devices WHERE id = ?`,
  )
    .bind(deviceId)
    .first<{ label: string | null; last_seen_at: string | null; seconds_since_seen: number | null }>();
  return c.json({ device_id: deviceId, ...row });
});

// POST /relay/devices/:deviceId/commands  { command_text, kind? } — either side (phone enqueues,
// or the desktop itself for testing) can call this; the shared secret is the only access control.
// kind 'command' (default) is a spoken/typed instruction shown in the history; kind 'rpc' is a
// remote-console call (list panes, git status, approve/deny) whose command_text is a JSON request
// — those are throwaway, so rows older than an hour are pruned on each insert.
relayRoutes.post('/devices/:deviceId/commands', async (c) => {
  const deviceId = c.get('deviceId');
  const body = await c.req
    .json<{ command_text?: string; kind?: string }>()
    .catch(() => ({}) as { command_text?: string; kind?: string });
  if (!body.command_text || !body.command_text.trim()) {
    return c.json({ error: 'command_text is required' }, 400);
  }
  const kind = body.kind ?? 'command';
  if (kind !== 'command' && kind !== 'rpc') {
    return c.json({ error: "kind must be 'command' or 'rpc'" }, 400);
  }
  const id = crypto.randomUUID();
  if (kind === 'rpc') {
    await c.env.DESKTOP_RELAY_DB.prepare(
      "DELETE FROM desktop_commands WHERE device_id = ? AND kind = 'rpc' AND created_at < datetime('now', '-1 hour')",
    )
      .bind(deviceId)
      .run();
  }
  await c.env.DESKTOP_RELAY_DB.prepare(
    'INSERT INTO desktop_commands (id, device_id, command_text, kind) VALUES (?, ?, ?, ?)',
  )
    .bind(id, deviceId, body.command_text.trim(), kind)
    .run();
  const command = await c.env.DESKTOP_RELAY_DB.prepare('SELECT * FROM desktop_commands WHERE id = ?')
    .bind(id)
    .first();
  return c.json({ command });
});

// A command the desktop claimed but never finished (crash, network drop on the final write) would
// otherwise sit at 'claimed' forever. Anything claimed more than 2 minutes ago is marked failed so
// the phone shows an honest outcome; a late genuine completion still overwrites it.
async function failStaleClaims(db: D1Database, deviceId: string) {
  await db
    .prepare(
      `UPDATE desktop_commands
         SET status = 'failed',
             result = '{"result":{"error":"desktop claimed this command but never reported a result"}}',
             completed_at = datetime('now'), updated_at = datetime('now')
       WHERE device_id = ? AND status = 'claimed' AND claimed_at < datetime('now', '-2 minutes')`,
    )
    .bind(deviceId)
    .run();
}

// GET /relay/devices/:deviceId/commands?status=&kind=&limit=&order= — used by the phone (watch
// history) and the desktop agent (poll for pending work, both kinds). order=desc + limit gives the
// newest N for the history view instead of an ever-growing full dump.
relayRoutes.get('/devices/:deviceId/commands', async (c) => {
  const deviceId = c.get('deviceId');
  if (c.req.header('X-Relay-Role') === 'desktop') {
    await c.env.DESKTOP_RELAY_DB.prepare("UPDATE desktop_devices SET last_seen_at = datetime('now') WHERE id = ?")
      .bind(deviceId)
      .run();
  }
  await failStaleClaims(c.env.DESKTOP_RELAY_DB, deviceId);
  const status = c.req.query('status');
  const kind = c.req.query('kind');
  const order = c.req.query('order') === 'desc' ? 'DESC' : 'ASC';
  const limitParam = Number(c.req.query('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 200) : 200;

  const where = ['device_id = ?'];
  const binds: unknown[] = [deviceId];
  if (status) {
    where.push('status = ?');
    binds.push(status);
  }
  if (kind) {
    where.push('kind = ?');
    binds.push(kind);
  }
  const { results } = await c.env.DESKTOP_RELAY_DB.prepare(
    `SELECT * FROM desktop_commands WHERE ${where.join(' AND ')} ORDER BY created_at ${order}, rowid ${order} LIMIT ${limit}`,
  )
    .bind(...binds)
    .all();
  return c.json({ commands: results });
});

// GET /relay/devices/:deviceId/commands/:id — the phone polls one rpc call until it completes.
relayRoutes.get('/devices/:deviceId/commands/:id', async (c) => {
  const deviceId = c.get('deviceId');
  const command = await c.env.DESKTOP_RELAY_DB.prepare(
    'SELECT * FROM desktop_commands WHERE id = ? AND device_id = ?',
  )
    .bind(c.req.param('id'), deviceId)
    .first();
  if (!command) return c.json({ error: 'no such command' }, 404);
  return c.json({ command });
});

// PATCH /relay/devices/:deviceId/commands/:id  { status, result? } — desktop agent claims then
// completes/fails a command.
relayRoutes.patch('/devices/:deviceId/commands/:id', async (c) => {
  const deviceId = c.get('deviceId');
  const id = c.req.param('id');
  const body = await c.req
    .json<{ status?: string; result?: unknown }>()
    .catch(() => ({}) as { status?: string; result?: unknown });

  const allowedStatuses = ['claimed', 'completed', 'failed'];
  if (body.status && !allowedStatuses.includes(body.status)) {
    return c.json({ error: `status must be one of ${allowedStatuses.join(', ')}` }, 400);
  }

  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const values: unknown[] = [];
  if (body.status) {
    sets.push('status = ?');
    values.push(body.status);
  }
  if (body.result !== undefined) {
    sets.push('result = ?');
    values.push(JSON.stringify(body.result));
  }
  if (body.status === 'claimed') sets.push('claimed_at = datetime(\'now\')');
  if (body.status === 'completed' || body.status === 'failed') sets.push('completed_at = datetime(\'now\')');

  values.push(id, deviceId);
  const result = await c.env.DESKTOP_RELAY_DB.prepare(
    `UPDATE desktop_commands SET ${sets.join(', ')} WHERE id = ? AND device_id = ?`,
  )
    .bind(...values)
    .run();
  if (result.meta.changes === 0) return c.json({ error: 'no such command' }, 404);

  const command = await c.env.DESKTOP_RELAY_DB.prepare('SELECT * FROM desktop_commands WHERE id = ?')
    .bind(id)
    .first();
  return c.json({ command });
});

export default relayRoutes;
