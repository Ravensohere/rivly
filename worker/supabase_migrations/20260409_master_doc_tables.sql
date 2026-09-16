-- Master Document Tables Migration
-- Creates tables defined in the Rivly Master Product Document (Part 4.3)
-- Run in Supabase SQL Editor one block at a time.

-- ─────────────────────────────────────────────────────────────────────────────
-- Riva Memory (the most important table in the system)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riva_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_summary TEXT,
  personality_profile JSONB DEFAULT '{}',
  life_events JSONB DEFAULT '[]',
  total_conversations INTEGER DEFAULT 0,
  most_active_hour INTEGER,
  topics_discussed JSONB DEFAULT '[]',
  intimacy_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_riva_memory_user_id ON riva_memory(user_id);

ALTER TABLE riva_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_riva_memory" ON riva_memory FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'app',
  session_id UUID DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  credits_consumed FLOAT DEFAULT 0,
  detected_emotion TEXT,
  detected_language TEXT DEFAULT 'en',
  topic_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_conversations" ON conversations FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Check-ins
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_type TEXT,
  checkin_date DATE DEFAULT CURRENT_DATE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  mood_label TEXT,
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  riva_message TEXT,
  user_response TEXT,
  todays_main_goal TEXT,
  todays_concern TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_type, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_checkins" ON daily_checkins FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Family Members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  whatsapp_number TEXT NOT NULL,
  language_preference TEXT DEFAULT 'english',
  opted_in BOOLEAN DEFAULT FALSE,
  opted_in_at TIMESTAMPTZ,
  features JSONB DEFAULT '{
    "medicine_reminders": true,
    "health_queries": true,
    "recipes": true,
    "online_ordering_help": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(primary_user_id, whatsapp_number)
);

CREATE INDEX IF NOT EXISTS idx_family_members_primary ON family_members(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_whatsapp ON family_members(whatsapp_number);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_family" ON family_members FOR ALL USING (auth.uid() = primary_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reminders (medicine reminders, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id),
  reminder_type TEXT,
  title TEXT NOT NULL,
  medicine_name TEXT,
  dosage TEXT,
  frequency TEXT,
  reminder_times TIME[],
  days_of_week INTEGER[],
  channel TEXT DEFAULT 'whatsapp',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  last_confirmed_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_confirmed INTEGER DEFAULT 0,
  escalation_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active) WHERE is_active = TRUE;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_reminders" ON reminders FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reminder Escalations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id),
  primary_user_id UUID REFERENCES auth.users(id),
  check_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  escalated BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reminder_escalations_check ON reminder_escalations(check_at) WHERE escalated = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Subscriptions (extended version)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly',
  amount_paise INTEGER,
  cashfree_order_id TEXT,
  cashfree_subscription_id TEXT,
  voice_credits_allocated INTEGER,
  voice_credits_used INTEGER DEFAULT 0,
  text_credits_allocated INTEGER,
  text_credits_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Credit Transactions (cost monitoring)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT,
  credits_used FLOAT,
  cost_inr FLOAT,
  feature_used TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_credits" ON credit_transactions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Push Subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_push" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Error Logs (free monitoring)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT,
  error_message TEXT,
  stack TEXT,
  user_id UUID,
  additional_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- User table extensions (add columns to existing profiles table if not exists)
-- Run these ALTER TABLE statements one by one; they will fail silently if
-- the column already exists.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add language_preference if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='language_preference') THEN
    ALTER TABLE profiles ADD COLUMN language_preference TEXT DEFAULT 'english';
  END IF;
  -- Add whatsapp_number if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_number') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_number TEXT;
  END IF;
  -- Add whatsapp_verified if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_verified') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_verified BOOLEAN DEFAULT FALSE;
  END IF;
  -- Add subscription_tier if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_tier') THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  END IF;
  -- Add last_active_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_active_at') THEN
    ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
