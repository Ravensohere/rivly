-- Create profiles table (extends auth.users) - SAFE
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles if not already enabled
alter table profiles enable row level security;

-- Policy: Users can view/edit their own profile (SAFE - checks if exists)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view own profile') then
    create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Create tasks table (for non-sensitive metadata) - SAFE
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null, 
  status text check (status in ('todo', 'done')) default 'todo',
  date_key date not null, -- Stores local date (YYYY-MM-DD)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

alter table tasks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage own tasks') then
    create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);
  end if;
end $$;


-- Create focus_sessions table (for analytics & streaks) - SAFE
create table if not exists focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  duration_minutes integer not null,
  outcome text check (outcome in ('good', 'some', 'notReally')),
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table focus_sessions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage own focus sessions') then
    create policy "Users can manage own focus sessions" on focus_sessions for all using (auth.uid() = user_id);
  end if;
end $$;


-- Create journal_metadata table (NO CONTENT, just timestamps/counts) - SAFE
create table if not exists journal_metadata (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  entry_type text check (entry_type in ('reflection', 'brain_dump', 'wind_down')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  word_count integer -- optional metric
);

alter table journal_metadata enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage own journal metadata') then
    create policy "Users can manage own journal metadata" on journal_metadata for all using (auth.uid() = user_id);
  end if;
end $$;
