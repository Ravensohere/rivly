-- ============================================
-- FIX: Backfill profiles + credits for existing users
-- Schema: profiles.user_id = auth user UUID (NOT profiles.id)
-- ============================================

-- 1. Ensure credits columns exist on the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMPTZ DEFAULT now();

-- 2. Backfill: Create profile rows for ALL existing auth.users who don't have one
INSERT INTO public.profiles (user_id, name, credits_balance)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  500
FROM auth.users u
WHERE u.id NOT IN (SELECT p.user_id FROM public.profiles p)
ON CONFLICT (user_id) DO UPDATE SET credits_balance = COALESCE(public.profiles.credits_balance, 500);

-- 3. Ensure existing profiles that have NULL credits get 500
UPDATE public.profiles SET credits_balance = 500 WHERE credits_balance IS NULL;

-- 4. Drop old function first (PostgreSQL cannot rename params via CREATE OR REPLACE)
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer);

-- Recreate with correct parameter name (p_user_id to avoid ambiguity with column name)
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

-- 5. Fix the trigger to use user_id + name (matching actual schema)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure RLS policies use user_id (matching actual schema)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
