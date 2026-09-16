-- Improvements for the handle_new_user trigger function:
-- 1. Updates conflict handling: Uses ON CONFLICT DO UPDATE to prevent errors if the profile already exists.
-- 2. Enhanced Name Extraction: Better logic to extract a name from metadata or email.
-- 3. Robust Error Handling: Wraps the logic in a BEGIN/EXCEPTION block to ensure user creation doesn't fail even if profile creation hits a snag.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Attempt to extract name from various sources
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'user_name',
    'User' -- Fallback defaults
  );

  -- Fallback to email username if name is still generic or empty
  IF extracted_name = 'User' AND NEW.email IS NOT NULL THEN
     extracted_name := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (user_id, name, email, auth_provider)
  VALUES (
    NEW.id,
    extracted_name,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google') -- Default to google now since it's the main auth
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    auth_provider = EXCLUDED.auth_provider,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
