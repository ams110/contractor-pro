-- =====================================================
-- جدول اشتراكات الإشعارات (Web Push)
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_push_subs" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());
