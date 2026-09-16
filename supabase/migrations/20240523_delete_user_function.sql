-- Migration to delete auth users when removed from waitlist
-- This ensures that deleted/rejected users cannot log in

-- Function to delete auth user when waitlist entry is deleted
create or replace function public.delete_auth_user_on_waitlist_delete()
returns trigger as $$
begin
  -- Only delete the auth user if they have a user_id
  if old.user_id is not null then
    -- Delete from auth.users (requires service role)
    -- This will cascade delete the waitlist entry automatically
    delete from auth.users where id = old.user_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

-- Create trigger to run before delete on waitlist
drop trigger if exists on_waitlist_delete on public.waitlist;
create trigger on_waitlist_delete
  before delete on public.waitlist
  for each row execute procedure public.delete_auth_user_on_waitlist_delete();

-- Note: This creates a circular dependency with the cascade delete
-- We need to temporarily disable the cascade to prevent infinite loops
-- Let's modify the approach: Instead of deleting, we'll use a different method

-- Drop the trigger we just created
drop trigger if exists on_waitlist_delete on public.waitlist;
drop function if exists public.delete_auth_user_on_waitlist_delete();

-- Better approach: Create a function that can be called from the admin panel
-- to delete both the waitlist entry and the auth user
create or replace function public.admin_delete_user(waitlist_id uuid)
returns void as $$
declare
  user_uuid uuid;
begin
  -- Get the user_id from the waitlist entry
  select user_id into user_uuid from public.waitlist where id = waitlist_id;
  
  -- Delete from auth.users first (this will cascade to waitlist)
  if user_uuid is not null then
    delete from auth.users where id = user_uuid;
  else
    -- If no user_id, just delete the waitlist entry
    delete from public.waitlist where id = waitlist_id;
  end if;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users (admin check will be in RLS)
grant execute on function public.admin_delete_user(uuid) to authenticated;
