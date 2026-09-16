-- Inbox Radar: AI-detected task suggestions from Gmail + Calendar.

create table if not exists public.task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('gmail', 'calendar')),
  source_ref text not null,
  title text not null,
  category text not null check (category in ('deadline', 'bill', 'meeting', 'followup')),
  due_at timestamptz,
  amount numeric,
  snippet text,
  sender text,
  confidence numeric not null default 0.5,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, source_ref)
);

create index if not exists task_suggestions_user_status_idx
  on public.task_suggestions (user_id, status);

create table if not exists public.inbox_scan_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_scanned_at timestamptz,
  last_history_id text,
  enabled boolean not null default false
);

alter table public.task_suggestions enable row level security;
alter table public.inbox_scan_state enable row level security;

-- Owner-scoped RLS (consistent with existing tables). The worker uses the
-- service-role key and bypasses RLS; these policies protect direct client access.
create policy "own suggestions" on public.task_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scan state" on public.inbox_scan_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
