-- =====================================================
-- Patch: Fix worker receipt storage RLS
-- شغّل هذا الملف في Supabase > SQL Editor
-- يحل خطأ: "new row violates row-level security policy"
-- عند رفع صورة الفاتورة من بوابة العمال
-- =====================================================

-- تأكد من وجود الـ bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-receipts', 'worker-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- احذف السياسات القديمة لو موجودة (لتجنب التعارض)
DROP POLICY IF EXISTS "anon_worker_receipt_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_worker_receipt_read"  ON storage.objects;
DROP POLICY IF EXISTS "worker_receipt_delete"        ON storage.objects;

-- السماح للعمال (anonymous) برفع الفواتير
CREATE POLICY "anon_worker_receipt_upload"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'worker-receipts');

-- السماح للجميع بقراءة الفواتير (الصور عامة)
CREATE POLICY "public_worker_receipt_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'worker-receipts');

-- تأكد من وجود دالة worker_submit_expense مع دعم receipt_url
-- (هذا يحل مشكلة لو كانت نسخة قديمة من الدالة مثبتة)
CREATE OR REPLACE FUNCTION worker_submit_expense(
  p_emp_id     UUID,
  p_token      TEXT,
  p_project_id UUID,
  p_date       DATE,
  p_amount     NUMERIC,
  p_category   TEXT,
  p_vendor     TEXT DEFAULT '',
  p_receipt_url TEXT DEFAULT ''
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

  INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, receipt_url, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_amount, p_category, p_vendor, 'كاش', p_receipt_url, 'pending')
  RETURNING id INTO new_id;

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

NOTIFY pgrst, 'reload schema';
