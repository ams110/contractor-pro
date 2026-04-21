-- جدول المقدمات الضريبية (מקדמות מס הכנסה + ביטוח לאומי)
CREATE TABLE IF NOT EXISTS tax_advances (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income_tax', 'bituach_leumi')),
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  period     TEXT DEFAULT '',   -- e.g. '2024-01'
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tax_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tax_advances" ON tax_advances
  FOR ALL USING (auth.uid() = user_id);
