-- =====================================================
-- Payments with Projects + Worker Payment Requests
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- إضافة أعمدة على جدول الدفعات
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'approved';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes      TEXT DEFAULT '';

-- ─── دالة: طلب راتب من العامل (يُحفظ كـ pending) ──────────────────────────
CREATE OR REPLACE FUNCTION worker_request_payment(
  p_emp_id     UUID,
  p_token      TEXT,
  p_amount     NUMERIC,
  p_project_id UUID    DEFAULT NULL,
  p_method     TEXT    DEFAULT 'كاش',
  p_notes      TEXT    DEFAULT ''
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

  INSERT INTO payments (user_id, employee_id, amount, method, date, project_id, notes, status)
  VALUES (emp.user_id, p_emp_id, p_amount, p_method, CURRENT_DATE, p_project_id, p_notes, 'pending')
  RETURNING id INTO new_id;

  -- إشعار للمشرف
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب راتب جديد 💰',
    emp.name || ' يطلب ' || p_amount || '₪' ||
      CASE WHEN proj_name IS NOT NULL THEN ' من مشروع ' || proj_name ELSE '' END ||
      CASE WHEN p_notes  <> ''       THEN ' • ' || p_notes           ELSE '' END,
    'pending_payment',
    new_id
  );

  RETURN json_build_object('success', true, 'id', new_id);
END;
$$;

-- ─── دالة: الموافقة على طلب راتب + تسجيله كمصروف على المشروع ──────────────
CREATE OR REPLACE FUNCTION approve_payment_request(
  p_payment_id UUID,
  p_project_id UUID DEFAULT NULL   -- المشرف يختار/يؤكد المشروع هنا
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'غير مصرح');
  END IF;

  SELECT * INTO pay FROM payments
  WHERE id = p_payment_id AND user_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'الطلب غير موجود');
  END IF;

  -- تحديث الدفعة
  UPDATE payments
  SET status     = 'approved',
      project_id = COALESCE(p_project_id, pay.project_id)
  WHERE id = p_payment_id;

  -- إذا في مشروع → سجّل كمصروف على المشروع (رواتب عمال)
  IF COALESCE(p_project_id, pay.project_id) IS NOT NULL THEN
    INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, status)
    SELECT
      pay.user_id,
      pay.employee_id,
      COALESCE(p_project_id, pay.project_id),
      pay.date,
      pay.amount,
      'رواتب عمال',
      (SELECT name FROM employees WHERE id = pay.employee_id),
      pay.method,
      'approved'
    WHERE NOT EXISTS (
      SELECT 1 FROM expenses
      WHERE employee_id = pay.employee_id
        AND project_id  = COALESCE(p_project_id, pay.project_id)
        AND amount      = pay.amount
        AND date        = pay.date
        AND category    = 'رواتب عمال'
    );
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- ─── دالة: رفض طلب راتب ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_payment_request(p_payment_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'غير مصرح');
  END IF;

  DELETE FROM payments
  WHERE id = p_payment_id AND user_id = auth.uid() AND status = 'pending';

  RETURN json_build_object('success', true);
END;
$$;

-- ─── دالة: جلب الدفعات الخاصة بعامل (تشمل المعلقة) ─────────────────────────
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
      json_build_object(
        'id',           p.id,
        'date',         p.date,
        'amount',       p.amount,
        'method',       p.method,
        'status',       COALESCE(p.status, 'approved'),
        'notes',        p.notes,
        'project_name', pr.name
      ) ORDER BY p.date DESC
    ),
    '[]'::json
  )
  INTO result
  FROM payments p
  LEFT JOIN projects pr ON pr.id = p.project_id
  WHERE p.employee_id = emp_id AND p.user_id = owner_id;

  RETURN result;
END;
$$;
