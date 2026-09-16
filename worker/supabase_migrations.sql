-- Add credit system columns to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 500, -- Start with 500 trial credits
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free', -- free, student, scholar, pro
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS riva_memory JSONB DEFAULT '{}'::jsonb; -- Riva interaction memory for personalization

-- Drop old function first (PostgreSQL cannot rename params via CREATE OR REPLACE)
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer);

-- Create a function to deduct credits securely (profiles.user_id = auth user UUID)
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT credits_balance INTO current_balance
  FROM profiles
  WHERE user_id = p_user_id;

  IF current_balance >= amount THEN
    UPDATE profiles
    SET credits_balance = credits_balance - amount
    WHERE user_id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- AUTOMATICALLY CREATE PROFILE ON SIGNUP
-- This ensures every new user gets a row in 'profiles' with 500 credits.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  INSERT INTO public.profiles (user_id, name, credits_balance)
  VALUES (NEW.id, extracted_name, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET credits_balance = COALESCE(public.profiles.credits_balance, 500);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
