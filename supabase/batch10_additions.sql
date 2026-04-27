-- Batch 10 additions
-- Run in Supabase SQL Editor (safe to re-run, all idempotent)

-- #24: Worker performance rating (1–5 stars)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS performance_rating SMALLINT
    CHECK (performance_rating IS NULL OR (performance_rating BETWEEN 1 AND 5));

-- #55: Server-side date validation in worker_submit_day
--      Prevents workers from submitting future dates or dates older than 30 days
--      (stops device-clock manipulation)
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

  -- Reject future dates (no more than 1 day ahead to account for timezones)
  IF p_date > CURRENT_DATE + INTERVAL '1 day' THEN
    RETURN json_build_object('error', 'لا يمكن تسجيل يوم عمل في المستقبل');
  END IF;

  -- Reject dates older than 30 days
  IF p_date < CURRENT_DATE - INTERVAL '30 days' THEN
    RETURN json_build_object('error', 'لا يمكن تسجيل يوم عمل قبل أكثر من 30 يوماً');
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
