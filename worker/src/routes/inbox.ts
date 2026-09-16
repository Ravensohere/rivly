import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';
import {
  scanInboxForUser,
  mapSuggestionToTask,
  type ScanDeps,
  type SuggestionRow,
} from '../services/inboxScan';
import { getFreshAccessToken, fetchGmailCandidates, fetchCalendarCandidates, hasGmailScope } from '../services/google';
import { extractSuggestions } from '../services/ai/inboxExtract';
import {
  DEFAULT_INBOX_CATEGORIES,
  INBOX_CATEGORIES,
  isInboxCategory,
  sanitizeCategories,
} from '../config/inboxCategories';

const inboxRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

export function buildScanDeps(env: Bindings, userId: string): ScanDeps {
  const supabase = createSupabaseClient(env);
  return {
    getConnection: async () => {
      const { data } = await supabase
        .from('google_calendar_connections')
        .select('access_token, refresh_token, expires_at, scope')
        .eq('user_id', userId)
        .maybeSingle();
      return data || null;
    },
    getScanState: async () => {
      const { data, error } = await supabase
        .from('inbox_scan_state')
        .select('last_scanned_at, enabled, categories')
        .eq('user_id', userId)
        .maybeSingle();
      // A schema drift here (e.g. migration not applied) would otherwise look
      // identical to "user never enabled it" and silently disable the feature.
      if (error) console.error('[inbox] scan state read failed:', error.message);
      return data || { last_scanned_at: null, enabled: false, categories: null };
    },
    getFreshToken: (conn) => getFreshAccessToken(env, conn),
    fetchGmail: (t, cats) => fetchGmailCandidates(t, cats),
    fetchCalendar: (t) => fetchCalendarCandidates(t),
    extract: (items, cats) => extractSuggestions(env.GROQ_API_KEY, items, cats),
    upsertSuggestions: async (rows: SuggestionRow[]) => {
      await supabase.from('task_suggestions').upsert(rows, { onConflict: 'user_id,source_ref', ignoreDuplicates: true });
    },
    saveTokens: async (uid, accessToken, expiresAt) => {
      await supabase.from('google_calendar_connections').update({ access_token: accessToken, expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('user_id', uid);
    },
    setLastScanned: async (uid, iso) => {
      await supabase.from('inbox_scan_state').upsert({ user_id: uid, last_scanned_at: iso }, { onConflict: 'user_id' });
    },
    now: () => new Date(),
  };
}

inboxRoutes.get('/status', async (c) => {
  const userId = c.get('userId');
  const supabase = createSupabaseClient(c.env);
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('scope')
    .eq('user_id', userId)
    .maybeSingle();
  const { data: state, error: stateErr } = await supabase
    .from('inbox_scan_state')
    .select('enabled, categories, last_scanned_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (stateErr) console.error('[inbox] status read failed:', stateErr.message);
  return c.json({
    connected: !!conn,
    /**
     * Gmail is an optional upgrade now, not a broken connection. A Calendar-only
     * user is fully working, so `needsReconnect` must stay false for them —
     * otherwise the UI nags them to fix something that isn't wrong.
     */
    gmailConnected: !!conn && hasGmailScope(conn.scope),
    needsReconnect: false,
    enabled: !!state?.enabled,
    categories: state ? sanitizeCategories(state.categories) : DEFAULT_INBOX_CATEGORIES,
    availableCategories: INBOX_CATEGORIES,
    lastScannedAt: state?.last_scanned_at ?? null,
  });
});

inboxRoutes.post('/settings', async (c) => {
  const userId = c.get('userId');
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const hasEnabled = body?.enabled !== undefined;
  const hasCategories = body?.categories !== undefined;
  if (!hasEnabled && !hasCategories) {
    return c.json({ error: 'Provide enabled and/or categories' }, 400);
  }

  const patch: Record<string, unknown> = { user_id: userId };

  if (hasEnabled) {
    if (typeof body.enabled !== 'boolean') {
      return c.json({ error: 'enabled must be a boolean' }, 400);
    }
    patch.enabled = body.enabled;
  }

  if (hasCategories) {
    if (!Array.isArray(body.categories) || !body.categories.every(isInboxCategory)) {
      return c.json(
        { error: `categories must be an array of: ${INBOX_CATEGORIES.join(', ')}` },
        400
      );
    }
    // Deduplicate but keep the user's empty choice meaningful: an empty list
    // means "surface nothing", which sanitizeCategories would override, so we
    // reject it rather than silently restoring defaults.
    const unique = [...new Set(body.categories as string[])];
    if (unique.length === 0) {
      return c.json({ error: 'Select at least one category' }, 400);
    }
    patch.categories = unique;
  }

  const supabase = createSupabaseClient(c.env);
  const { data, error } = await supabase
    .from('inbox_scan_state')
    .upsert(patch, { onConflict: 'user_id' })
    .select('enabled, categories')
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ enabled: !!data?.enabled, categories: sanitizeCategories(data?.categories) });
});

inboxRoutes.post('/scan', async (c) => {
  const userId = c.get('userId');
  try {
    const result = await scanInboxForUser(buildScanDeps(c.env, userId), userId);
    return c.json(result);
  } catch (e: any) {
    console.error('[inbox] scan failed:', e);
    // Soft fail: leave last_scanned_at unchanged so next open retries.
    // Don't leak internal error detail to the client.
    return c.json({
      status: 'token_failed',
      suggestionsAdded: 0,
      detail: 'Something went wrong while scanning. Try again in a moment.',
    });
  }
});

inboxRoutes.get('/suggestions', async (c) => {
  const userId = c.get('userId');
  const supabase = createSupabaseClient(c.env);
  const { data, error } = await supabase
    .from('task_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true, nullsFirst: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ suggestions: data || [] });
});

inboxRoutes.post('/suggestions/:id/accept', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const supabase = createSupabaseClient(c.env);

  const { data: suggestion, error: selErr } = await supabase
    .from('task_suggestions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (selErr || !suggestion) return c.json({ error: 'Suggestion not found' }, 404);

  const taskRow = mapSuggestionToTask(suggestion as SuggestionRow);
  const { data: task, error: insErr } = await supabase.from('tasks').insert(taskRow).select().single();
  if (insErr) return c.json({ error: insErr.message }, 500);

  const { error: updErr } = await supabase.from('task_suggestions').update({ status: 'accepted' }).eq('id', id).eq('user_id', userId);
  if (updErr) {
    // Task was created but the suggestion couldn't be marked accepted — surface it
    // so the client doesn't silently leave the suggestion in 'pending' (it would re-appear).
    console.error('[inbox] failed to mark suggestion accepted:', updErr);
    return c.json({ task, warning: 'Task created, but the suggestion may reappear.' });
  }
  return c.json({ task });
});

inboxRoutes.post('/suggestions/:id/dismiss', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const supabase = createSupabaseClient(c.env);
  const { error } = await supabase.from('task_suggestions').update({ status: 'dismissed' }).eq('id', id).eq('user_id', userId);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

export default inboxRoutes;
