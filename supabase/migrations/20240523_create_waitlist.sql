-- Create waitlist table if not exists
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  motivation text,
  user_type text,
  phone text,
  joined_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- DROP existing policies to allow updates (in case of re-run)
drop policy if exists "Users can read own waitlist status" on public.waitlist;
drop policy if exists "Admins can view all" on public.waitlist;
drop policy if exists "Admins can update status" on public.waitlist;

-- Policy 1: Users can read their own status
create policy "Users can read own waitlist status"
  on public.waitlist for select
  using (auth.uid() = user_id);

-- Policy 2: Admin can see ALL entries
create policy "Admins can view all"
  on public.waitlist for select
  using (auth.jwt() ->> 'email' in ('gnvenkatapathiraju@gmail.com', 'ravenso.here@gmail.com'));

-- Policy 3: Admin can update status
create policy "Admins can update status"
  on public.waitlist for update
  using (auth.jwt() ->> 'email' in ('gnvenkatapathiraju@gmail.com', 'ravenso.here@gmail.com'));

-- Policy 4: Admins can delete entries
create policy "Admins can delete entries"
  on public.waitlist for delete
  using (auth.jwt() ->> 'email' in ('gnvenkatapathiraju@gmail.com', 'ravenso.here@gmail.com'));

-- Function to handle new user signup
-- Add new columns if they don't exist
alter table public.waitlist add column if not exists approved_by text;
alter table public.waitlist add column if not exists approved_at timestamptz;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
  approver_name text;
begin
  -- Check if email is an admin and assign approver
  if new.email = 'gnvenkatapathiraju@gmail.com' then
    is_admin := true;
    approver_name := 'Venkat';
  elsif new.email = 'ravenso.here@gmail.com' then
    is_admin := true;
    approver_name := 'Ravi';
  else
    is_admin := false;
    approver_name := null;
  end if;

  -- Try to insert. If email exists (from marketing site), update the user_id instead.
  insert into public.waitlist (user_id, email, status, approved_by, approved_at)
  values (
    new.id, 
    new.email, 
    case when is_admin then 'approved' else 'pending' end,
    approver_name,
    case when is_admin then now() else null end
  )
  on conflict (email) do update
  set 
    user_id = new.id,
    status = case when is_admin then 'approved' else public.waitlist.status end,
    approved_by = case when is_admin then approver_name else public.waitlist.approved_by end,
    approved_at = case when is_admin then now() else public.waitlist.approved_at end;
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users as 'approved' so they don't get locked out
insert into public.waitlist (user_id, email, status)
select id, email, 'approved' from auth.users
on conflict (email) do nothing;
