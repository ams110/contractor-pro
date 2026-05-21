-- ═══════════════════════════════════════════════════════════════════
-- Biometric Signature Log + Fix worker_submit_day notifications
-- Run once in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. جدول سجل التوقيعات الرقمية
CREATE TABLE IF NOT EXISTS signature_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID        NOT NULL,
  signer_id    UUID,
  signer_name  TEXT        NOT NULL,
  signer_role  TEXT        NOT NULL DEFAULT 'owner',
  action       TEXT        NOT NULL,
  tbl          TEXT,
  record_label TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE signature_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sig_log_policy" ON signature_log;
CREATE POLICY "sig_log_policy" ON signature_log
  FOR ALL USING (owner_id = auth.uid() OR signer_id = auth.uid());

-- 2. إصلاح worker_submit_day: دمج الإشعار + مكان العمل
CREATE OR REPLACE FUNCTION worker_submit_day(
  p_emp_id        UUID,
  p_token         TEXT,
  p_project_id    UUID,
  p_date          DATE,
  p_day_type      TEXT,
  p_hours         NUMERIC DEFAULT 8,
  p_custom_amount NUMERIC DEFAULT NULL,
  p_location      TEXT    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp               employees%ROWTYPE;
  calculated_amount NUMERIC;
  proj_name         TEXT;
  new_day_id        UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id
  ) THEN
    RETURN json_build_object('error', 'المشروع غير موجود');
  END IF;

  IF EXISTS (
    SELECT 1 FROM work_days
    WHERE employee_id = p_emp_id AND date = p_date AND day_type = p_day_type
  ) THEN
    RETURN json_build_object('error', 'يوجد يوم عمل من نفس النوع مسجل بهذا التاريخ مسبقاً');
  END IF;

  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
    calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN
    calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم', 'نصف') THEN
    calculated_amount := emp.daily_rate * 0.5;
  ELSE
    calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours, 8), 2);
  END IF;

  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status, location)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending', p_location)
  RETURNING id INTO new_day_id;

  SELECT name INTO proj_name FROM projects WHERE id = p_project_id;

  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب يوم عمل جديد',
    emp.name || ' — ' || p_day_type || COALESCE(' · ' || proj_name, ''),
    'pending_day',
    new_day_id
  );

  RETURN json_build_object('success', true, 'amount', calculated_amount);
END;
$$;

-- 3. دالة لجلب سجل التوقيعات
CREATE OR REPLACE FUNCTION get_signature_log(p_limit INT DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id',           id,
        'signer_name',  signer_name,
        'signer_role',  signer_role,
        'action',       action,
        'tbl',          tbl,
        'record_label', record_label,
        'created_at',   created_at
      ) ORDER BY created_at DESC
    ),
    '[]'::json
  ) INTO result
  FROM signature_log
  WHERE owner_id = auth.uid()
  LIMIT p_limit;

  RETURN result;
END;
$$;
