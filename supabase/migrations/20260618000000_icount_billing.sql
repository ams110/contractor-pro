-- =====================================================
-- iCount billing — بوّابة دفع إسرائيلية (فيزا + הוראת קבע)
-- يضيف دعم iCount **بجانب** Paddle في جدول subscriptions.
-- خامل بأمان: لا أثر حتى يُضبط VITE_PAYMENT_PROVIDER=icount + الأسرار.
-- آمن لإعادة التشغيل (idempotent).
-- =====================================================

-- ─── 1. أعمدة المزوّد + معرّفات iCount ───────────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider           TEXT NOT NULL DEFAULT 'paddle'
    CHECK (provider IN ('paddle', 'icount')),
  ADD COLUMN IF NOT EXISTS icount_sub_id      TEXT,  -- معرّف أمر التكرار (הוראת קבע)
  ADD COLUMN IF NOT EXISTS icount_customer_id TEXT,  -- معرّف العميل/الكرتيس في iCount
  ADD COLUMN IF NOT EXISTS icount_doc_id      TEXT;  -- معرّف آخر مستند (חשבונית/קבלה)

-- معرّف اشتراك iCount فريد (مع السماح بصفوف Paddle حيث القيمة NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_icount_sub
  ON subscriptions (icount_sub_id) WHERE icount_sub_id IS NOT NULL;

-- ─── 2. تحديث RPC ليُرجع المزوّد + معرّفات iCount ─────────────────────────────
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
      provider,
      current_period_end,
      cancel_at_period_end,
      paddle_subscription_id,
      icount_sub_id,
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

-- ─── 3. إعادة تحميل كاش الـschema ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
