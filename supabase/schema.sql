-- =====================================================
-- Contractor Pro - Supabase Database Schema
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- ─── جدول المشاريع ───────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  client_name     TEXT DEFAULT '',
  client_phone    TEXT DEFAULT '',
  type            TEXT DEFAULT '',
  status          TEXT DEFAULT 'نشط',
  price           NUMERIC(12,2) DEFAULT 0,
  specialization  TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── جدول العمال ─────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT DEFAULT '',
  specialization  TEXT DEFAULT '',
  daily_rate      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT DEFAULT 'نشط',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── جدول أيام العمل ─────────────────────────────
CREATE TABLE IF NOT EXISTS work_days (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  project_id    UUID REFERENCES projects(id)  ON DELETE SET NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  day_type      TEXT NOT NULL DEFAULT 'كامل',
  hours         NUMERIC(4,1) DEFAULT 8,
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── جدول المصاريف ───────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id      UUID REFERENCES projects(id)  ON DELETE SET NULL,
  category        TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendor          TEXT DEFAULT '',
  payment_method  TEXT DEFAULT '',
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── جدول الدفعات ────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  method        TEXT DEFAULT '',
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── جدول بيانات اعتماد البصمة (WebAuthn) ────────
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,
  counter         BIGINT NOT NULL DEFAULT 0,
  device_type     TEXT DEFAULT 'platform',
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_used_at    TIMESTAMPTZ
);

-- ─── جدول تحديات البصمة المؤقتة ─────────────────────
CREATE TABLE IF NOT EXISTS passkey_challenges (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,           -- 'registration' | 'authentication'
  challenge   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, type)
);

-- ─── Row Level Security (RLS) ─────────────────────
-- تفعيل الحماية على كل الجداول
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges   ENABLE ROW LEVEL SECURITY;

-- كل مستخدم يرى ويعدّل بياناته فقط
CREATE POLICY "user_projects"    ON projects            FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_employees"   ON employees           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_work_days"   ON work_days           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_expenses"    ON expenses            FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_payments"    ON payments            FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_passkeys"     ON passkey_credentials FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_challenges"   ON passkey_challenges  FOR ALL USING (user_id = auth.uid());

-- ─── Indexes (تسريع الاستعلامات) ─────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user   ON projects  (user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user  ON employees (user_id);
CREATE INDEX IF NOT EXISTS idx_workdays_user   ON work_days (user_id);
CREATE INDEX IF NOT EXISTS idx_workdays_emp    ON work_days (employee_id);
CREATE INDEX IF NOT EXISTS idx_workdays_proj   ON work_days (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user   ON expenses  (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_proj   ON expenses  (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments  (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_emp    ON payments  (employee_id);
