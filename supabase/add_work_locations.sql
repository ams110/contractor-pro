-- أماكن العمل — تشغيل مرة واحدة في Supabase Dashboard → SQL Editor

-- 1. عمود أماكن العمل في جدول المشاريع (مصفوفة نصية)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}';

-- 2. عمود مكان العمل في سجلات أيام العمل
ALTER TABLE work_days
  ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. تحديث دالة جلب مشاريع العامل لتشمل النوع وأماكن العمل
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

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id',        id,
        'name',      name,
        'type',      type,
        'locations', COALESCE(locations, '{}')
      )
      ORDER BY name
    ),
    '[]'::json
  )
  INTO result
  FROM projects
  WHERE user_id = owner_id AND status IN ('نشط', 'موافق عليه');

  RETURN result;
END;
$$;

-- 4. تحديث دالة جلب أيام العامل لتشمل مكان العمل
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
        'status',       wd.status,
        'location',     wd.location,
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

-- 5. تحديث دالة إرسال يوم عمل لتشمل مكان العمل
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
    SELECT 1 FROM work_days WHERE employee_id = p_emp_id AND date = p_date AND day_type = p_day_type
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
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending', p_location);

  RETURN json_build_object('success', true, 'amount', calculated_amount);
END;
$$;
