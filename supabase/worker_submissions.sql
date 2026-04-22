-- =====================================================
-- Worker Day Submission & Approval System
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- إضافة عمود الحالة لأيام العمل (approved = موافق، pending = معلق، rejected = مرفوض)
ALTER TABLE work_days ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- إضافة توكن الجلسة للعامل (يتجدد عند كل تسجيل دخول)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS worker_session_token TEXT;

-- ─── تحديث دالة تسجيل الدخول (تعيد توكن الجلسة) ─────────────────────────────
CREATE OR REPLACE FUNCTION worker_login(p_username TEXT, p_password TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp       employees%ROWTYPE;
  new_token TEXT;
BEGIN
  SELECT * INTO emp
  FROM employees
  WHERE lower(worker_username) = lower(trim(p_username))
    AND worker_password_hash   = crypt(p_password, worker_password_hash);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  END IF;

  new_token := gen_random_uuid()::text;
  UPDATE employees SET worker_session_token = new_token WHERE id = emp.id;

  RETURN json_build_object(
    'id',             emp.id,
    'name',           emp.name,
    'specialization', emp.specialization,
    'daily_rate',     emp.daily_rate,
    'status',         emp.status,
    'token',          new_token
  );
END;
$$;

-- ─── دالة: إرسال يوم عمل من العامل (يُحفظ كـ pending) ───────────────────────
-- p_custom_amount: إذا أُرسل قيمة موجبة يُستخدم مباشرةً بدل الحساب من المعدل اليومي
CREATE OR REPLACE FUNCTION worker_submit_day(
  p_emp_id        UUID,
  p_token         TEXT,
  p_project_id    UUID,
  p_date          DATE,
  p_day_type      TEXT,
  p_hours         NUMERIC DEFAULT 8,
  p_custom_amount NUMERIC DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp               employees%ROWTYPE;
  calculated_amount NUMERIC;
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
    SELECT 1 FROM work_days WHERE employee_id = p_emp_id AND date = p_date
  ) THEN
    RETURN json_build_object('error', 'يوجد يوم عمل مسجل بهذا التاريخ مسبقاً');
  END IF;

  -- إذا أُرسل مبلغ مسكر يُستخدم مباشرةً
  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
    calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN
    calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم', 'نصف') THEN
    calculated_amount := emp.daily_rate * 0.5;
  ELSE
    calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours, 8), 2);
  END IF;

  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending');

  RETURN json_build_object('success', true, 'amount', calculated_amount);
END;
$$;

-- ─── تحديث دالة جلب أيام العامل (تشمل الحالة) ───────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_days(emp_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  result   json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id = emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id',           wd.id,
        'date',         wd.date,
        'day_type',     wd.day_type,
        'hours',        wd.hours,
        'amount',       wd.amount,
        'status',       COALESCE(wd.status, 'approved'),
        'project_name', p.name,
        'project_id',   wd.project_id
      ) ORDER BY wd.date DESC
    ),
    '[]'::json
  )
  INTO result
  FROM work_days wd
  LEFT JOIN projects p ON p.id = wd.project_id
  WHERE wd.employee_id = emp_id AND wd.user_id = owner_id;

  RETURN result;
END;
$$;
