-- =====================================================
-- نظام الإشعارات الداخلية
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT DEFAULT 'info',
  ref_id     UUID,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- تحديث دالة إرسال يوم العامل لتضيف إشعاراً تلقائياً
CREATE OR REPLACE FUNCTION worker_submit_day(
  p_emp_id     UUID,
  p_token      TEXT,
  p_project_id UUID,
  p_date       DATE,
  p_day_type   TEXT,
  p_hours      NUMERIC DEFAULT 8
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp               employees%ROWTYPE;
  amt               NUMERIC;
  proj_name         TEXT;
  new_day_id        UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
    RETURN json_build_object('error', 'المشروع غير موجود');
  END IF;

  IF EXISTS (SELECT 1 FROM work_days WHERE employee_id = p_emp_id AND date = p_date) THEN
    RETURN json_build_object('error', 'يوجد يوم مسجل بهذا التاريخ مسبقاً');
  END IF;

  IF p_day_type = 'كامل' THEN
    amt := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم', 'نصف') THEN
    amt := emp.daily_rate * 0.5;
  ELSE
    amt := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours, 8), 2);
  END IF;

  SELECT name INTO proj_name FROM projects WHERE id = p_project_id;

  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, amt, 'pending')
  RETURNING id INTO new_day_id;

  -- إشعار للمشرف
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب حضور جديد 📅',
    emp.name || ' • ' || COALESCE(proj_name, '?') || ' • ' || to_char(p_date, 'DD/MM/YYYY') || ' • ' || amt || '₪',
    'pending_day',
    new_day_id
  );

  RETURN json_build_object('success', true, 'amount', amt);
END;
$$;
