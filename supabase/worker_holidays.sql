-- دالة جلب الإجازات لبورتال الشغيلة
-- يجب تشغيل هذا الملف مرة واحدة في Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION get_worker_holidays(p_emp_id UUID, p_token TEXT)
RETURNS TABLE(id UUID, name TEXT, date DATE)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- التحقق من التوكن وجلب user_id الصاحب
  SELECT user_id INTO v_owner_id
  FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- إرجاع إجازات الصاحب
  RETURN QUERY
  SELECT h.id, h.name, h.date
  FROM holidays h
  WHERE h.user_id = v_owner_id
  ORDER BY h.date;
END;
$$;
