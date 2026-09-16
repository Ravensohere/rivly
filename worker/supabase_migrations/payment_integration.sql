-- Payment & Subscription Tables Migration
-- ─────────────────────────────────────────────────────────────────────────────
-- Creates tables for Cashfree payment integration and subscription management

-- Payment Orders Table
-- Stores all payment order requests
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

-- User Subscriptions Table
-- Tracks active and past subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'past_due')),
  start_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status) WHERE status = 'active'
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_id ON user_subscriptions(tier_id);

-- Subscription Usage Table
-- Tracks usage metrics for subscription limits
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  usage_limit INTEGER NOT NULL,
  period_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);

-- Payment Webhooks Log Table
-- Logs all webhook events from Cashfree for auditing
CREATE TABLE IF NOT EXISTS payment_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  processed BOOLEAN DEFAULT FALSE NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id ON payment_webhooks_log(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks_log(processed);

-- Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Payment Orders Policies
CREATE POLICY "Users can view their own payment orders"
  ON payment_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment orders"
  ON payment_orders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- User Subscriptions Policies
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Subscription Usage Policies
CREATE POLICY "Users can view their own usage"
  ON subscription_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON subscription_usage FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Payment Webhooks Log Policies
CREATE POLICY "Service role can manage webhook logs"
  ON payment_webhooks_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Functions
-- ─────────────────────────────────────────────────────────────────────────────

/**
 * Function to check if user has active subscription
 */
CREATE OR REPLACE FUNCTION has_active_subscription(required_tier TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  has_subscription BOOLEAN;
BEGIN
  IF required_tier IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND end_date > NOW()
    ) INTO has_subscription;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND end_date > NOW()
      AND tier_id = required_tier
    ) INTO has_subscription;
  END IF;
  
  RETURN has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Function to get user's current tier
 */
CREATE OR REPLACE FUNCTION get_user_tier()
RETURNS TEXT AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier_id INTO user_tier
  FROM user_subscriptions
  WHERE user_id = auth.uid()
  AND status = 'active'
  AND end_date > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Trigger to update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE payment_orders IS 'Stores payment order requests from Cashfree';
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status and history';
COMMENT ON TABLE subscription_usage IS 'Tracks usage metrics for subscription limits';
COMMENT ON TABLE payment_webhooks_log IS 'Logs webhook events from Cashfree for auditing';
COMMENT ON FUNCTION has_active_subscription IS 'Checks if user has an active subscription';
COMMENT ON FUNCTION get_user_tier IS 'Returns the user''s current subscription tier';
