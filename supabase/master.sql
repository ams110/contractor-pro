-- =====================================================
-- Contractor Pro — Master SQL (ملف موحد شامل)
-- شغّل هذا الملف مرة واحدة في Supabase > SQL Editor
-- آمن للتشغيل أكثر من مرة (idempotent)
-- =====================================================

-- ─── 0. Extensions ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. الجداول ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  client_name    TEXT DEFAULT '',
  client_phone   TEXT DEFAULT '',
  type           TEXT DEFAULT '',
  status         TEXT DEFAULT 'نشط',
  price          NUMERIC(12,2) DEFAULT 0,
  specialization TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  phone                TEXT DEFAULT '',
  specialization       TEXT DEFAULT '',
  daily_rate           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT DEFAULT 'نشط',
  worker_username      TEXT UNIQUE,
  worker_password_hash TEXT,
  worker_session_token TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id)  ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  day_type    TEXT NOT NULL DEFAULT 'كامل',
  hours       NUMERIC(4,1) DEFAULT 8,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      TEXT DEFAULT 'approved',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id)  ON DELETE SET NULL,
  employee_id    UUID REFERENCES employees(id) ON DELETE SET NULL,
  category       TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendor         TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url    TEXT DEFAULT '',
  status         TEXT DEFAULT 'approved',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id)  ON DELETE SET NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  method      TEXT DEFAULT '',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',
  status      TEXT DEFAULT 'approved',
  receipt_url TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_receipts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'كاش',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  name       TEXT NOT NULL,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT DEFAULT 'info',
  ref_id     UUID,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_advances (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('income_tax', 'bituach_leumi')),
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  period     TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email               TEXT NOT NULL,
  status              TEXT DEFAULT 'pending',
  last_seen_at        TIMESTAMPTZ,
  is_blocked          BOOLEAN DEFAULT false,
  can_view_projects   BOOLEAN DEFAULT false,
  can_edit_projects   BOOLEAN DEFAULT false,
  can_view_workers    BOOLEAN DEFAULT false,
  can_edit_workers    BOOLEAN DEFAULT false,
  can_view_expenses   BOOLEAN DEFAULT false,
  can_add_expenses    BOOLEAN DEFAULT false,
  can_view_payments   BOOLEAN DEFAULT false,
  can_add_payments    BOOLEAN DEFAULT false,
  can_delete          BOOLEAN DEFAULT false,
  can_manage_team     BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL,
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  tbl         TEXT NOT NULL,
  record_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS passkey_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key    TEXT NOT NULL,
  counter       BIGINT NOT NULL DEFAULT 0,
  device_type   TEXT DEFAULT 'platform',
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS passkey_challenges (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  challenge  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, type)
);

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_receipts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances             ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_advances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;

-- حذف القديم وإعادة الإنشاء (لتفادي التكرار)
DROP POLICY IF EXISTS "user_projects"          ON projects;
DROP POLICY IF EXISTS "user_employees"         ON employees;
DROP POLICY IF EXISTS "user_work_days"         ON work_days;
DROP POLICY IF EXISTS "user_expenses"          ON expenses;
DROP POLICY IF EXISTS "user_payments"          ON payments;
DROP POLICY IF EXISTS "user_client_receipts"   ON client_receipts;
DROP POLICY IF EXISTS "users_own_advances"     ON advances;
DROP POLICY IF EXISTS "owner_holidays"         ON holidays;
DROP POLICY IF EXISTS "owner_notifications"    ON notifications;
DROP POLICY IF EXISTS "users_own_tax_advances" ON tax_advances;
DROP POLICY IF EXISTS "owner_reads_audit"      ON audit_log;
DROP POLICY IF EXISTS "user_passkeys"          ON passkey_credentials;
DROP POLICY IF EXISTS "user_challenges"        ON passkey_challenges;
DROP POLICY IF EXISTS "team_member_select"     ON team_members;
DROP POLICY IF EXISTS "team_owner_all"         ON team_members;
DROP POLICY IF EXISTS "user_profile"           ON profiles;

CREATE POLICY "user_projects"          ON projects           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_employees"         ON employees          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_work_days"         ON work_days          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_expenses"          ON expenses           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_payments"          ON payments           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_client_receipts"   ON client_receipts    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_advances"     ON advances           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "owner_holidays"         ON holidays           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "owner_notifications"    ON notifications      FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_tax_advances" ON tax_advances       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_reads_audit"      ON audit_log          FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "user_passkeys"          ON passkey_credentials FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_challenges"        ON passkey_challenges  FOR ALL USING (user_id = auth.uid());
-- المالك يرى أعضاءه، والعضو يرى سجله
CREATE POLICY "team_owner_all"    ON team_members FOR ALL    USING (owner_id  = auth.uid());
CREATE POLICY "team_member_select" ON team_members FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "user_profile"       ON profiles     FOR ALL    USING (id = auth.uid());

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user    ON projects        (user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user   ON employees       (user_id);
CREATE INDEX IF NOT EXISTS idx_workdays_user    ON work_days       (user_id);
CREATE INDEX IF NOT EXISTS idx_workdays_emp     ON work_days       (employee_id);
CREATE INDEX IF NOT EXISTS idx_workdays_proj    ON work_days       (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user    ON expenses        (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_proj    ON expenses        (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user    ON payments        (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_emp     ON payments        (employee_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user    ON client_receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_project ON client_receipts (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_owner      ON audit_log       (owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_log       (actor_email);
CREATE INDEX IF NOT EXISTS idx_team_owner       ON team_members    (owner_id);
CREATE INDEX IF NOT EXISTS idx_team_member      ON team_members    (member_id);
CREATE INDEX IF NOT EXISTS idx_team_email       ON team_members    (email);

-- ─── 5. Storage Buckets ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-receipts', 'worker-receipts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_worker_receipt_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_worker_receipt_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatar_upload"               ON storage.objects;
DROP POLICY IF EXISTS "avatar_read"                 ON storage.objects;

CREATE POLICY "anon_worker_receipt_upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'worker-receipts');
CREATE POLICY "public_worker_receipt_read" ON storage.objects FOR SELECT USING (bucket_id = 'worker-receipts');
CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatar_read"   ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- ─── 6. Functions ────────────────────────────────────────────────────────────

-- ── بوابة العمال: تعيين بيانات الدخول ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_worker_credentials(emp_id UUID, username TEXT, password TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','غير مصرح'); END IF;
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id=emp_id AND user_id=auth.uid()) THEN
    RETURN json_build_object('error','العامل غير موجود أو ليس لديك صلاحية');
  END IF;
  IF EXISTS (SELECT 1 FROM employees WHERE lower(worker_username)=lower(trim(username)) AND id!=emp_id) THEN
    RETURN json_build_object('error','اسم المستخدم مستخدم بالفعل');
  END IF;
  UPDATE employees
  SET worker_username=lower(trim(username)), worker_password_hash=crypt(password, gen_salt('bf'))
  WHERE id=emp_id AND user_id=auth.uid();
  RETURN json_build_object('success',true);
END;$$;

-- ── بوابة العمال: تسجيل دخول ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_login(p_username TEXT, p_password TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE emp employees%ROWTYPE; new_token TEXT;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE lower(worker_username)=lower(trim(p_username))
    AND worker_password_hash=crypt(p_password, worker_password_hash);
  IF NOT FOUND THEN RETURN json_build_object('error','اسم المستخدم أو كلمة المرور غير صحيحة'); END IF;
  new_token := gen_random_uuid()::text;
  UPDATE employees SET worker_session_token=new_token WHERE id=emp.id;
  RETURN json_build_object('id',emp.id,'name',emp.name,'specialization',emp.specialization,
    'daily_rate',emp.daily_rate,'status',emp.status,'token',new_token);
END;$$;

-- ── بوابة العمال: تغيير كلمة المرور ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_change_password(p_emp_id UUID, p_token TEXT, p_old_pass TEXT, p_new_pass TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة غير صالحة، أعد تسجيل الدخول'); END IF;
  IF emp.worker_password_hash IS NULL OR emp.worker_password_hash != crypt(p_old_pass, emp.worker_password_hash) THEN
    RETURN json_build_object('error','كلمة المرور الحالية غير صحيحة');
  END IF;
  IF length(trim(p_new_pass)) < 4 THEN RETURN json_build_object('error','كلمة المرور يجب أن تكون 4 أحرف على الأقل'); END IF;
  UPDATE employees SET worker_password_hash=crypt(p_new_pass, gen_salt('bf')) WHERE id=p_emp_id;
  RETURN json_build_object('success',true);
END;$$;

-- ── بوابة العمال: إعادة تعيين كلمة المرور (المشرف) ──────────────────────────
CREATE OR REPLACE FUNCTION reset_worker_password(emp_id UUID, new_password TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','غير مصرح'); END IF;
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id=emp_id AND user_id=auth.uid()) THEN
    RETURN json_build_object('error','العامل غير موجود أو ليس لديك صلاحية');
  END IF;
  IF length(trim(new_password)) < 4 THEN RETURN json_build_object('error','كلمة المرور يجب أن تكون 4 أحرف على الأقل'); END IF;
  UPDATE employees SET worker_password_hash=crypt(new_password, gen_salt('bf')), worker_session_token=NULL
  WHERE id=emp_id AND user_id=auth.uid();
  RETURN json_build_object('success',true);
END;$$;

-- ── بوابة العمال: جلب المشاريع ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_projects(emp_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(json_build_object('id',id,'name',name) ORDER BY name),'[]'::json)
  INTO result FROM projects WHERE user_id=owner_id AND status IN ('نشط','موافق عليه');
  RETURN result;
END;$$;

-- ── بوابة العمال: إرسال يوم عمل (مع p_custom_amount) ─────────────────────────
-- أولاً: احذف النسخة القديمة إذا كانت موجودة (6 معاملات بدون custom_amount)
DROP FUNCTION IF EXISTS public.worker_submit_day(uuid, text, uuid, date, text, numeric);

CREATE OR REPLACE FUNCTION worker_submit_day(
  p_emp_id        UUID,
  p_token         TEXT,
  p_project_id    UUID,
  p_date          DATE,
  p_day_type      TEXT,
  p_hours         NUMERIC DEFAULT 8,
  p_custom_amount NUMERIC DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  emp               employees%ROWTYPE;
  calculated_amount NUMERIC;
  proj_name         TEXT;
  new_day_id        UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id=p_project_id AND user_id=emp.user_id) THEN
    RETURN json_build_object('error','المشروع غير موجود');
  END IF;
  IF EXISTS (SELECT 1 FROM work_days WHERE employee_id=p_emp_id AND date=p_date) THEN
    RETURN json_build_object('error','يوجد يوم عمل مسجل بهذا التاريخ مسبقاً');
  END IF;

  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
    calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN
    calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم','نصف') THEN
    calculated_amount := emp.daily_rate * 0.5;
  ELSE
    calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours,8), 2);
  END IF;

  SELECT name INTO proj_name FROM projects WHERE id=p_project_id;

  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending')
  RETURNING id INTO new_day_id;

  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب حضور جديد 📅',
    emp.name || ' • ' || COALESCE(proj_name,'?') || ' • ' || to_char(p_date,'DD/MM/YYYY') || ' • ' || calculated_amount || '₪',
    'pending_day', new_day_id);

  RETURN json_build_object('success',true,'amount',calculated_amount);
END;$$;

-- ── بوابة العمال: جلب أيام العمل ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_days(emp_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(
    json_build_object('id',wd.id,'date',wd.date,'day_type',wd.day_type,'hours',wd.hours,
      'amount',wd.amount,'status',COALESCE(wd.status,'approved'),'project_name',p.name,'project_id',wd.project_id)
    ORDER BY wd.date DESC),'[]'::json)
  INTO result FROM work_days wd LEFT JOIN projects p ON p.id=wd.project_id
  WHERE wd.employee_id=emp_id AND wd.user_id=owner_id;
  RETURN result;
END;$$;

-- ── بوابة العمال: طلب راتب ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_request_payment(
  p_emp_id UUID, p_token TEXT, p_amount NUMERIC,
  p_project_id UUID DEFAULT NULL, p_method TEXT DEFAULT 'كاش', p_notes TEXT DEFAULT ''
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE emp employees%ROWTYPE; proj_name TEXT; new_id UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF p_amount <= 0 THEN RETURN json_build_object('error','المبلغ يجب أن يكون أكبر من صفر'); END IF;
  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id=p_project_id AND user_id=emp.user_id) THEN
      RETURN json_build_object('error','المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id=p_project_id;
  END IF;
  INSERT INTO payments (user_id, employee_id, amount, method, date, project_id, notes, status)
  VALUES (emp.user_id, p_emp_id, p_amount, p_method, CURRENT_DATE, p_project_id, p_notes, 'pending')
  RETURNING id INTO new_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب راتب جديد 💰',
    emp.name || ' يطلب ' || p_amount || '₪' ||
    CASE WHEN proj_name IS NOT NULL THEN ' من مشروع ' || proj_name ELSE '' END ||
    CASE WHEN p_notes <> '' THEN ' • ' || p_notes ELSE '' END,
    'pending_payment', new_id);
  RETURN json_build_object('success',true,'id',new_id);
END;$$;

-- ── بوابة العمال: جلب الدفعات ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_payments(emp_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(
    json_build_object('id',p.id,'date',p.date,'amount',p.amount,'method',p.method,
      'status',COALESCE(p.status,'approved'),'notes',p.notes,'project_name',pr.name)
    ORDER BY p.date DESC),'[]'::json)
  INTO result FROM payments p LEFT JOIN projects pr ON pr.id=p.project_id
  WHERE p.employee_id=emp_id AND p.user_id=owner_id;
  RETURN result;
END;$$;

-- ── موافقة المشرف على طلب راتب ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_payment_request(p_payment_id UUID, p_project_id UUID DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pay payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','غير مصرح'); END IF;
  SELECT * INTO pay FROM payments WHERE id=p_payment_id AND user_id=auth.uid() AND status='pending';
  IF NOT FOUND THEN RETURN json_build_object('error','الطلب غير موجود'); END IF;
  UPDATE payments SET status='approved', project_id=COALESCE(p_project_id, pay.project_id)
  WHERE id=p_payment_id;
  IF COALESCE(p_project_id, pay.project_id) IS NOT NULL THEN
    INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, status)
    SELECT pay.user_id, pay.employee_id, COALESCE(p_project_id, pay.project_id), pay.date, pay.amount,
      'رواتب عمال', (SELECT name FROM employees WHERE id=pay.employee_id), pay.method, 'approved'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses WHERE employee_id=pay.employee_id
        AND project_id=COALESCE(p_project_id, pay.project_id)
        AND amount=pay.amount AND date=pay.date AND category='رواتب عمال'
    );
  END IF;
  RETURN json_build_object('success',true);
END;$$;

-- ── رفض طلب راتب ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_payment_request(p_payment_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','غير مصرح'); END IF;
  DELETE FROM payments WHERE id=p_payment_id AND user_id=auth.uid() AND status='pending';
  RETURN json_build_object('success',true);
END;$$;

-- ── بوابة العمال: إرسال مصروف ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_submit_expense(
  p_emp_id UUID, p_token TEXT, p_project_id UUID, p_date DATE,
  p_amount NUMERIC, p_category TEXT, p_vendor TEXT DEFAULT '', p_receipt_url TEXT DEFAULT ''
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE emp employees%ROWTYPE; proj_name TEXT; new_id UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF p_amount <= 0 THEN RETURN json_build_object('error','المبلغ يجب أن يكون أكبر من صفر'); END IF;
  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id=p_project_id AND user_id=emp.user_id) THEN
      RETURN json_build_object('error','المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id=p_project_id;
  END IF;
  INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, receipt_url, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_amount, p_category, p_vendor, 'كاش', p_receipt_url, 'pending')
  RETURNING id INTO new_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب مصروف جديد 💸',
    emp.name || ' • ' || p_category || ' • ' || COALESCE(proj_name,'') || ' • ' || p_amount || '₪',
    'pending_expense', new_id);
  RETURN json_build_object('success',true,'amount',p_amount);
END;$$;

-- ── بوابة العمال: جلب المصاريف ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_expenses(emp_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(
    json_build_object('id',ex.id,'date',ex.date,'amount',ex.amount,'category',ex.category,
      'vendor',ex.vendor,'receipt_url',ex.receipt_url,'status',COALESCE(ex.status,'approved'),
      'project_name',p.name,'project_id',ex.project_id)
    ORDER BY ex.date DESC),'[]'::json)
  INTO result FROM expenses ex LEFT JOIN projects p ON p.id=ex.project_id
  WHERE ex.employee_id=emp_id AND ex.user_id=owner_id;
  RETURN result;
END;$$;

-- ── بوابة العمال: جلب السلف ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_advances(emp_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',a.id,'amount',a.amount,'date',a.date,'notes',a.notes,'created_at',a.created_at))
    FROM (SELECT * FROM advances WHERE employee_id=emp_id ORDER BY date DESC) a
  ),'[]'::JSONB)
$$;

-- ── الفريق: تحديث last_seen ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_last_seen(p_owner_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE team_members SET last_seen_at=now()
  WHERE member_id=auth.uid() AND owner_id=p_owner_id AND status='active' AND NOT COALESCE(is_blocked,false);
END;$$;

-- ── الفريق: تسجيل فتح صفحة ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_screen_view(p_owner_id UUID, p_screen TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid()=p_owner_id THEN RETURN; END IF;
  INSERT INTO audit_log (owner_id, actor_id, actor_email, action, tbl)
  SELECT p_owner_id, auth.uid(), (SELECT email FROM auth.users WHERE id=auth.uid()), 'view', p_screen;
END;$$;

-- ── الفريق: حجب / رفع حجب عضو ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_member_blocked(p_row_id UUID, p_blocked BOOLEAN)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;
  UPDATE team_members SET is_blocked=p_blocked WHERE id=p_row_id AND owner_id=auth.uid();
  RETURN '{"success":true}'::json;
END;$$;

-- ── الفريق: جلب نشاط عضو ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_member_activity(p_actor_email TEXT, p_limit INT DEFAULT 40)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC),'[]'::json) INTO result
  FROM (SELECT action, tbl, record_id, created_at FROM audit_log
        WHERE owner_id=auth.uid() AND actor_email=p_actor_email
        ORDER BY created_at DESC LIMIT p_limit) r;
  RETURN result;
END;$$;

-- ─── 7. Trigger: تسجيل تلقائي لكل insert/update/delete ──────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_rec UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP='DELETE' THEN v_owner:=OLD.user_id; v_rec:=OLD.id;
  ELSE                    v_owner:=NEW.user_id; v_rec:=NEW.id; END IF;
  IF auth.uid()=v_owner THEN RETURN COALESCE(NEW, OLD); END IF;
  INSERT INTO audit_log (owner_id, actor_id, actor_email, action, tbl, record_id)
  SELECT v_owner, auth.uid(), (SELECT email FROM auth.users WHERE id=auth.uid()), lower(TG_OP), TG_TABLE_NAME, v_rec;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS _audit ON projects;
DROP TRIGGER IF EXISTS _audit ON employees;
DROP TRIGGER IF EXISTS _audit ON expenses;
DROP TRIGGER IF EXISTS _audit ON payments;
DROP TRIGGER IF EXISTS _audit ON work_days;

CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON projects  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON expenses  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON payments  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON work_days FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ─── 8. إعادة تحميل Schema Cache ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
