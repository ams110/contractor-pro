-- =====================================================
-- Phase 2 Migration: Subscriptions (Paddle Billing)
-- Run AFTER phase1_001_organizations.sql
-- Safe to re-run (idempotent)
-- =====================================================

-- ─── 1. subscriptions table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  paddle_subscription_id TEXT UNIQUE,
  paddle_customer_id     TEXT,
  paddle_price_id        TEXT,
  plan                   TEXT NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_self_select" ON subscriptions;
CREATE POLICY "sub_self_select" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- INSERT / UPDATE / DELETE are done only by the webhook (service role),
-- so no authenticated-user write policies are needed.

-- ─── 3. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subs_user   ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subs_org    ON subscriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_subs_paddle ON subscriptions (paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions (status);

-- ─── 4. updated_at trigger (reuse function from Phase 1) ────────────────────
DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── 5. Helper RPC: get current user's active subscription ───────────────────
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT row_to_json(r) INTO result FROM (
    SELECT
      id,
      plan,
      status,
      current_period_end,
      cancel_at_period_end,
      paddle_subscription_id,
      created_at,
      updated_at
    FROM subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing', 'past_due')
    ORDER BY created_at DESC
    LIMIT 1
  ) r;

  RETURN result;
END;
$$;

-- ─── 6. Realtime: enable for organizations + subscriptions ───────────────────
-- (Required so clients receive plan-change events pushed by the webhook)
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- ─── 7. Reload schema cache ───────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
