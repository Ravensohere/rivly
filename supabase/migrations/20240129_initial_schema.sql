-- Create profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Policy: Users can view/edit their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Create tasks table (for non-sensitive metadata)
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null, -- Only public/safe titles synced here
  status text check (status in ('todo', 'done')) default 'todo',
  date_key date not null, -- Stores local date (YYYY-MM-DD)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Enable RLS on tasks
alter table tasks enable row level security;

-- Policy: Users can manage their own tasks
create policy "Users can manage own tasks" on tasks
  for all using (auth.uid() = user_id);


-- Create focus_sessions table (for analytics & streaks)
create table focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  duration_minutes integer not null,
  outcome text check (outcome in ('good', 'some', 'notReally')),
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on focus_sessions
alter table focus_sessions enable row level security;

-- Policy: Users can manage their own focus sessions
create policy "Users can manage own focus sessions" on focus_sessions
  for all using (auth.uid() = user_id);


-- Create journal_metadata table (NO CONTENT, just timestamps/counts)
-- This allows us to show "You journaled 3 times today" without reading the content.
create table journal_metadata (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  entry_type text check (entry_type in ('reflection', 'brain_dump', 'wind_down')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  word_count integer -- optional metric
);

-- Enable RLS on journal_metadata
alter table journal_metadata enable row level security;

-- Policy: Users can manage their own journal metadata
create policy "Users can manage own journal metadata" on journal_metadata
  for all using (auth.uid() = user_id);
