import { Hono } from 'hono';
import { Bindings, Variables, Task } from '../types';
import { createSupabaseClient } from '../services/supabase';

const taskRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

// GET /tasks?date=YYYY-MM-DD
taskRoutes.get('/', async (c) => {
  const supabase = createSupabaseClient(c.env);
  const userId = c.get('userId');
  const dateKey = c.req.query('date');

  let query = supabase.from('tasks').select('*').eq('user_id', userId);

  if (dateKey) {
    query = query.eq('date_key', dateKey);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ tasks: data });
});

// POST /tasks
taskRoutes.post('/', async (c) => {
  const supabase = createSupabaseClient(c.env);
  const userId = c.get('userId');
  const body = await c.req.json();

  // Enforce user_id from auth context, don't trust body
  const task = { ...body, user_id: userId };

  const { data, error } = await supabase.from('tasks').insert(task).select();
  if (error) return c.json({ error: error.message }, 500);

  await logEvent(supabase, userId, 'task_created', { title: body.title?.slice(0, 50), tag: body.tag });

  return c.json({ task: data[0] });
});

// PATCH /tasks/:id
taskRoutes.patch('/:id', async (c) => {
  const supabase = createSupabaseClient(c.env);
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { data, error } = await supabase
    .from('tasks')
    .update(body)
    .eq('id', id)
    .eq('user_id', userId) // Security: Ensure ownership
    .select();

  if (error) return c.json({ error: error.message }, 500);

  if (body.status === 'done') {
    await logEvent(supabase, userId, 'task_completed', { task_id: id });
  }

  return c.json({ task: data[0] });
});

// DELETE /tasks/:id
taskRoutes.delete('/:id', async (c) => {
  const supabase = createSupabaseClient(c.env);
  const userId = c.get('userId');
  const id = c.req.param('id');

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

export default taskRoutes;
