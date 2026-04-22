-- =====================================================
-- Patch: Fix 3 runtime errors
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- ─── 1. تأكد من وجود عمود project_id في payments ──────────────────────────────
--    (يحل خطأ: Could not find the 'project_id' column of 'payments')
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'approved';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes      TEXT DEFAULT '';

-- إعادة تحميل Schema Cache في PostgREST
NOTIFY pgrst, 'reload schema';

-- ─── 2. حذف النسخة القديمة من worker_submit_day (6 معاملات بدون p_custom_amount) ──
--    (يحل خطأ: Could not choose the best candidate function)
DROP FUNCTION IF EXISTS public.worker_submit_day(uuid, text, uuid, date, text, numeric);

-- ─── 3. إعادة إنشاء set_worker_credentials مع search_path صحيح ────────────────
--    (يحل خطأ: function gen_salt(unknown) does not exist)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_worker_credentials(
  emp_id   UUID,
  username TEXT,
  password TEXT
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

-- إعادة إنشاء reset_worker_password مع search_path صحيح
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

-- إعادة إنشاء worker_change_password مع search_path صحيح
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
