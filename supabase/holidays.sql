-- جدول الإجازات والأعياد
CREATE TABLE IF NOT EXISTS holidays (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_holidays" ON holidays;
CREATE POLICY "owner_holidays" ON holidays FOR ALL USING (user_id = auth.uid());
