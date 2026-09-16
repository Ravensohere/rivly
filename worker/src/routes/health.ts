import { Hono } from 'hono';
import { Bindings, Variables } from '../types';

const healthRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Health check endpoint
healthRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', worker: 'active (hono)' });
});

// Database initialization endpoint (guidance only)
healthRoutes.post('/init-db', async (c) => {
  return c.json({
    message: 'You must run the SQL migration in your Supabase Dashboard SQL Editor manually. I cannot run DDL from here.',
    sql: `
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null, 
  status text check (status in ('todo', 'done')) default 'todo',
  date_key date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);
alter table tasks enable row level security;
create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);
`
  });
});

export default healthRoutes;
