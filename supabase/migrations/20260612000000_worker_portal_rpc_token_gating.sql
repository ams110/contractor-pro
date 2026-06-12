-- ════════════════════════════════════════════════════════════════════════════
-- إصلاح أمني: تقييد دوال قراءة بوّابة العامل بالـ token + حصر إيصالات العمّال
-- ────────────────────────────────────────────────────────────────────────────
-- المشكلة (Critical IDOR):
--   get_worker_days / get_worker_payments / get_worker_projects / get_worker_expenses
--   كانت SECURITY DEFINER تأخذ emp_id فقط بلا أي تحقّق token/auth، وبصلاحية تنفيذ
--   PUBLIC الافتراضية. بوّابة العامل (?portal/?worker) مفتوحة بلا تسجيل دخول مالك،
--   فأي مهاجم مجهول يعرف/يخمّن UUID عامل كان يقرأ سجلّ رواتبه/أيامه/مصاريفه
--   وأسماء مشاريع المالك ومورّديه — تسريب بيانات عابر للمستأجرين.
--
-- الإصلاح: نضيف بارامتر p_token ونطبّق نفس نمط get_worker_advances المُصحَّح سابقاً:
--   • مستدعٍ عبر Supabase auth → لازم يملك العامل (employees.user_id = auth.uid()).
--   • مستدعٍ من البوّابة (anon) → لازم يقدّم worker_session_token مطابقاً وغير فارغ.
--   غير ذلك تُرجَّع قائمة فارغة.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. get_worker_projects ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_projects(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(json_build_object('id',id,'name',name) ORDER BY name),'[]'::json)
  INTO result FROM projects WHERE user_id=owner_id AND status IN ('نشط','موافق عليه');
  RETURN result;
END;$$;

-- ── 2. get_worker_days ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_days(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',wd.id,'date',wd.date,'day_type',wd.day_type,'hours',wd.hours,
      'amount',wd.amount,'status',COALESCE(wd.status,'approved'),'project_name',p.name,'project_id',wd.project_id)
    ORDER BY wd.date DESC),'[]'::json)
  INTO result FROM work_days wd LEFT JOIN projects p ON p.id=wd.project_id
  WHERE wd.employee_id=emp_id AND wd.user_id=owner_id;
  RETURN result;
END;$$;

-- ── 3. get_worker_payments ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_payments(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',p.id,'date',p.date,'amount',p.amount,'method',p.method,
      'status',COALESCE(p.status,'approved'),'notes',p.notes,'project_name',pr.name)
    ORDER BY p.date DESC),'[]'::json)
  INTO result FROM payments p LEFT JOIN projects pr ON pr.id=p.project_id
  WHERE p.employee_id=emp_id AND p.user_id=owner_id;
  RETURN result;
END;$$;

-- ── 4. get_worker_expenses ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_expenses(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',ex.id,'date',ex.date,'amount',ex.amount,'category',ex.category,
      'vendor',ex.vendor,'receipt_url',ex.receipt_url,'status',COALESCE(ex.status,'approved'),
      'project_name',p.name,'project_id',ex.project_id)
    ORDER BY ex.date DESC),'[]'::json)
  INTO result FROM expenses ex LEFT JOIN projects p ON p.id=ex.project_id
  WHERE ex.employee_id=emp_id AND ex.user_id=owner_id;
  RETURN result;
END;$$;

-- ════════════════════════════════════════════════════════════════════════════
-- إصلاح H2: حصر قراءة دلو إيصالات العمّال (worker-receipts) على المستأجر
-- ────────────────────────────────────────────────────────────────────────────
-- المشكلة: السياسة السابقة كانت "أي مستخدم مُصادَق يقرأ" (auth.uid() IS NOT NULL)،
--   فأي مقاول/عضو فريق من أي مؤسسة كان يقرأ كل إيصالات العمّال عبر كل المستأجرين.
-- الإصلاح: المسار = <empId>/<ts>.jpg → نطلب أن يكون الجزء الأول معرّف عامل
--   يملكه المستدعي (employees.user_id = auth.uid())، أو أن يكون المستدعي عضو فريق
--   نشطاً (غير محظور) تابعاً لمالك ذلك العامل.
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "auth_reads_worker_receipts" ON storage.objects;
CREATE POLICY "auth_reads_worker_receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'worker-receipts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND (
          e.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.owner_id = e.user_id
              AND tm.member_id = auth.uid()
              AND COALESCE(tm.is_blocked, false) = false
          )
        )
    )
  );
