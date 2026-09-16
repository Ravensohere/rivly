-- Remove the email column from profiles table (email should come from auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Remove auth_provider column as well (this info is in auth.users.app_metadata)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_provider;

-- Verify RLS is enabled (no-op if already enabled, but ensures it's on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (extra security)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;