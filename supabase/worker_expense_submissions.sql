-- =====================================================
-- Worker Expense Submission System
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- إضافة الأعمدة المطلوبة لجدول المصاريف
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'approved';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by TEXT;  -- اسم المشرف/المالك الذي وافق

-- ─── دالة: إرسال مصروف من العامل (يُحفظ كـ pending) ─────────────────────────
CREATE OR REPLACE FUNCTION worker_submit_expense(
  p_emp_id      UUID,
  p_token       TEXT,
  p_project_id  UUID,
  p_date        DATE,
  p_amount      NUMERIC,
  p_category    TEXT,
  p_vendor      TEXT    DEFAULT '',
  p_receipt_url TEXT    DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp       employees%ROWTYPE;
  proj_name TEXT;
  new_id    UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
      RETURN json_build_object('error', 'المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id = p_project_id;
  END IF;

  INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, status, receipt_url)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_amount, p_category, p_vendor, 'كاش', 'pending', p_receipt_url)
  RETURNING id INTO new_id;

  -- إشعار للمشرف
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب مصروف جديد 💸',
    emp.name || ' • ' || p_category || ' • ' || COALESCE(proj_name, '') || ' • ' || p_amount || '₪',
    'pending_expense',
    new_id
  );

  RETURN json_build_object('success', true, 'amount', p_amount);
END;
$$;

-- ─── دالة: جلب مصاريف العامل ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_expenses(emp_id UUID)
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
        'id',           ex.id,
        'date',         ex.date,
        'amount',       ex.amount,
        'category',     ex.category,
        'vendor',       ex.vendor,
        'status',       COALESCE(ex.status, 'approved'),
        'project_name', p.name,
        'project_id',   ex.project_id
      ) ORDER BY ex.date DESC
    ),
    '[]'::json
  )
  INTO result
  FROM expenses ex
  LEFT JOIN projects p ON p.id = ex.project_id
  WHERE ex.employee_id = emp_id AND ex.user_id = owner_id;

  RETURN result;
END;
$$;
