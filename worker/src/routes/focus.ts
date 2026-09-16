import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';

const focusRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function logEvent(supabase: any, userId: string, eventType: string, metadata?: any) {
  try {
    await supabase.from('events_ledger').insert({
      user_id: userId,
      event_type: eventType,
      date_key: new Date().toISOString().split('T')[0],
      metadata
    });
  } catch (e) {
    console.error('[Event Log] Error:', e);
  }
}

// POST /focus - Create a focus session
focusRoutes.post('/', async (c) => {
  const supabase = createSupabaseClient(c.env);
  const userId = c.get('userId');
  const body = await c.req.json();

  const session = { ...body, user_id: userId };

  const { data, error } = await supabase.from('focus_sessions').insert(session).select();
  if (error) return c.json({ error: error.message }, 500);

  await logEvent(supabase, userId, 'focus_completed', { duration_min: body.duration_min });

  return c.json({ session: data[0] });
});

export default focusRoutes;
