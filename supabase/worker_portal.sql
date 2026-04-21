-- =====================================================
-- Worker Portal - Supabase Functions
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- تفعيل امتداد التشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إضافة أعمدة بيانات دخول العامل
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS worker_username     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS worker_password_hash TEXT;

-- ─── دالة: تعيين بيانات دخول العامل (يستدعيها الأدمن فقط) ───────────────────
CREATE OR REPLACE FUNCTION set_worker_credentials(
  emp_id   UUID,
  username TEXT,
  password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'غير مصرح');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = emp_id AND user_id = auth.uid()) THEN
    RETURN json_build_object('error', 'العامل غير موجود أو ليس لديك صلاحية');
  END IF;

  -- التحقق من أن اسم المستخدم غير مستخدم من عامل آخر
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE lower(worker_username) = lower(trim(username))
      AND id != emp_id
  ) THEN
    RETURN json_build_object('error', 'اسم المستخدم مستخدم بالفعل');
  END IF;

  UPDATE employees
  SET worker_username      = lower(trim(username)),
      worker_password_hash = crypt(password, gen_salt('bf'))
  WHERE id = emp_id AND user_id = auth.uid();

  RETURN json_build_object('success', true);
END;
$$;

-- ─── دالة: تسجيل دخول العامل ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_login(p_username TEXT, p_password TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp
  FROM employees
  WHERE lower(worker_username) = lower(trim(p_username))
    AND worker_password_hash   = crypt(p_password, worker_password_hash);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  END IF;

  RETURN json_build_object(
    'id',             emp.id,
    'name',           emp.name,
    'specialization', emp.specialization,
    'daily_rate',     emp.daily_rate,
    'status',         emp.status
  );
END;
$$;

-- ─── دالة: جلب المشاريع النشطة للعامل ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_projects(emp_id UUID)
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

  SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name) ORDER BY name), '[]'::json)
  INTO result
  FROM projects
  WHERE user_id = owner_id AND status IN ('نشط', 'موافق عليه');

  RETURN result;
END;
$$;

-- ─── دالة: جلب أيام عمل العامل (كل الأيام) ─────────────────────────────────
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
        'project_name', p.name
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

-- ─── دالة: جلب الدفعات المستلمة للعامل ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_payments(emp_id UUID)
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
      json_build_object('id', id, 'date', date, 'amount', amount, 'method', method)
      ORDER BY date DESC
    ),
    '[]'::json
  )
  INTO result
  FROM payments
  WHERE employee_id = emp_id AND user_id = owner_id;

  RETURN result;
END;
$$;

-- ─── دالة: تغيير كلمة مرور العامل من داخل البورتال ──────────────────────────
CREATE OR REPLACE FUNCTION worker_change_password(
  p_emp_id   UUID,
  p_token    TEXT,
  p_old_pass TEXT,
  p_new_pass TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة غير صالحة، أعد تسجيل الدخول');
  END IF;

  IF emp.worker_password_hash IS NULL OR
     emp.worker_password_hash != crypt(p_old_pass, emp.worker_password_hash) THEN
    RETURN json_build_object('error', 'كلمة المرور الحالية غير صحيحة');
  END IF;

  IF length(trim(p_new_pass)) < 4 THEN
    RETURN json_build_object('error', 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل');
  END IF;

  UPDATE employees
  SET worker_password_hash = crypt(p_new_pass, gen_salt('bf'))
  WHERE id = p_emp_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ─── دالة: إعادة تعيين كلمة مرور عامل (يستدعيها المشرف/المالك فقط) ──────────
CREATE OR REPLACE FUNCTION reset_worker_password(
  emp_id       UUID,
  new_password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'غير مصرح');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = emp_id AND user_id = auth.uid()) THEN
    RETURN json_build_object('error', 'العامل غير موجود أو ليس لديك صلاحية');
  END IF;

  IF length(trim(new_password)) < 4 THEN
    RETURN json_build_object('error', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
  END IF;

  UPDATE employees
  SET worker_password_hash  = crypt(new_password, gen_salt('bf')),
      worker_session_token  = NULL
  WHERE id = emp_id AND user_id = auth.uid();

  RETURN json_build_object('success', true);
END;
$$;
