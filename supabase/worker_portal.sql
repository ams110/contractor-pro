-- =====================================================
-- Worker Portal - Supabase Functions
-- شغّل هذا الملف في Supabase > SQL Editor
-- يتيح للعمال تسجيل أيام شغلهم عبر رابط خاص
-- =====================================================

-- دالة: جلب بيانات العامل عبر رمزه (employee id)
CREATE OR REPLACE FUNCTION get_worker_by_id(emp_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'id',             e.id,
    'name',           e.name,
    'phone',          e.phone,
    'specialization', e.specialization,
    'daily_rate',     e.daily_rate,
    'status',         e.status,
    'user_id',        e.user_id
  )
  INTO result
  FROM employees e
  WHERE e.id = emp_id;
  RETURN result;
END;
$$;

-- دالة: جلب المشاريع النشطة لصاحب العامل
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

-- دالة: جلب أيام عمل العامل (آخر 60 يوم)
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
        'id',         wd.id,
        'date',       wd.date,
        'day_type',   wd.day_type,
        'hours',      wd.hours,
        'amount',     wd.amount,
        'project_id', wd.project_id,
        'project_name', p.name
      ) ORDER BY wd.date DESC
    ),
    '[]'::json
  )
  INTO result
  FROM work_days wd
  LEFT JOIN projects p ON p.id = wd.project_id
  WHERE wd.employee_id = emp_id
    AND wd.user_id     = owner_id
    AND wd.date        >= CURRENT_DATE - INTERVAL '60 days';

  RETURN result;
END;
$$;

-- دالة: جلب الدفعات المستلمة للعامل
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

-- دالة: تسجيل يوم عمل من قِبَل العامل
CREATE OR REPLACE FUNCTION submit_worker_day(
  emp_id     UUID,
  p_date     TEXT,
  p_day_type TEXT,
  p_hours    NUMERIC,
  p_proj_id  UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp        employees%ROWTYPE;
  day_amount NUMERIC;
  new_id     UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id = emp_id;
  IF NOT FOUND OR emp.status != 'نشط' THEN
    RETURN json_build_object('error', 'رمز العامل غير صحيح أو العامل غير نشط');
  END IF;

  -- التحقق من عدم تسجيل اليوم مسبقاً
  IF EXISTS (
    SELECT 1 FROM work_days
    WHERE employee_id = emp_id AND date = p_date::DATE AND user_id = emp.user_id
  ) THEN
    RETURN json_build_object('error', 'تم تسجيل هذا اليوم مسبقاً');
  END IF;

  -- حساب المبلغ
  day_amount := CASE
    WHEN p_day_type = 'كامل'   THEN emp.daily_rate
    WHEN p_day_type = 'نص يوم' THEN emp.daily_rate * 0.5
    ELSE ROUND(emp.daily_rate * (p_hours / 8.0), 2)
  END;

  new_id := gen_random_uuid();

  INSERT INTO work_days (id, user_id, employee_id, project_id, date, day_type, hours, amount, created_at)
  VALUES (
    new_id,
    emp.user_id,
    emp_id,
    p_proj_id,
    p_date::DATE,
    p_day_type,
    CASE WHEN p_day_type = 'كامل' THEN 8 WHEN p_day_type = 'نص يوم' THEN 4 ELSE p_hours END,
    day_amount,
    NOW()
  );

  RETURN json_build_object('success', true, 'id', new_id, 'amount', day_amount);
END;
$$;
