-- =====================================================
-- المرحلة 1: فرض صلاحيات الفريق على مستوى قاعدة البيانات (RLS)
-- المشكلة: كانت سياسة كل جدول = (user_id=auth.uid() OR is_active_team_member_of(user_id))
-- أي عضو فريق نشط يقرأ/يكتب كل بيانات المالك متجاوزاً allowed_project_ids و can_*.
-- الحل: فرع المالك يبقى كامل الصلاحية؛ فرع العضو يُقيَّد بأعلام الصلاحيات + نطاق
-- المشاريع/العمّال المسموحين، قراءةً (USING) وكتابةً (WITH CHECK).
-- =====================================================

-- ─── دوال مساعدة (STABLE SECURITY DEFINER) ──────────────────────────────────
-- علم can_* للعضو النشط الحالي تجاه مالك معيّن (NULL لو ليس عضواً → يُعامل كـ false)
CREATE OR REPLACE FUNCTION tm_flag(owner uuid, perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE perm
    WHEN 'can_view_projects' THEN tm.can_view_projects
    WHEN 'can_edit_projects' THEN tm.can_edit_projects
    WHEN 'can_view_workers'  THEN tm.can_view_workers
    WHEN 'can_edit_workers'  THEN tm.can_edit_workers
    WHEN 'can_view_expenses' THEN tm.can_view_expenses
    WHEN 'can_add_expenses'  THEN tm.can_add_expenses
    WHEN 'can_view_payments' THEN tm.can_view_payments
    WHEN 'can_add_payments'  THEN tm.can_add_payments
    WHEN 'can_delete'        THEN tm.can_delete
    ELSE false END
  FROM team_members tm
  WHERE tm.member_id = auth.uid() AND tm.owner_id = owner
    AND tm.status = 'active' AND NOT COALESCE(tm.is_blocked, false)
    AND (tm.expires_at IS NULL OR tm.expires_at > now())
  LIMIT 1
$$;

-- هل المشروع ضمن نطاق العضو؟ (allowed_project_ids = NULL ⇒ كل المشاريع، proj NULL ⇒ عام)
CREATE OR REPLACE FUNCTION tm_project_ok(owner uuid, proj uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_id = auth.uid() AND tm.owner_id = owner
      AND tm.status = 'active' AND NOT COALESCE(tm.is_blocked, false)
      AND (tm.expires_at IS NULL OR tm.expires_at > now())
      AND (tm.allowed_project_ids IS NULL OR proj IS NULL OR proj = ANY(tm.allowed_project_ids))
  )
$$;

-- هل العامل ضمن نطاق العضو؟ (allowed_employee_ids = NULL ⇒ كل العمّال)
CREATE OR REPLACE FUNCTION tm_employee_ok(owner uuid, emp uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_id = auth.uid() AND tm.owner_id = owner
      AND tm.status = 'active' AND NOT COALESCE(tm.is_blocked, false)
      AND (tm.expires_at IS NULL OR tm.expires_at > now())
      AND (tm.allowed_employee_ids IS NULL OR emp IS NULL OR emp = ANY(tm.allowed_employee_ids))
  )
$$;

-- ─── السياسات الجديدة (المالك كامل الصلاحية، العضو مُقيَّد) ───────────────────

-- projects
DROP POLICY IF EXISTS user_projects ON projects;
CREATE POLICY user_projects ON projects FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_projects') AND tm_project_ok(user_id, id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_edit_projects') AND tm_project_ok(user_id, id)));

-- work_days
DROP POLICY IF EXISTS user_work_days ON work_days;
CREATE POLICY user_work_days ON work_days FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_workers') AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_edit_workers') AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)));

-- expenses (project_id قد يكون NULL لمصروف عام)
DROP POLICY IF EXISTS user_expenses ON expenses;
CREATE POLICY user_expenses ON expenses FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_expenses') AND tm_project_ok(user_id, project_id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_add_expenses')  AND tm_project_ok(user_id, project_id)));

-- payments
DROP POLICY IF EXISTS user_payments ON payments;
CREATE POLICY user_payments ON payments FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_payments') AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_add_payments')  AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)));

-- advances (سياق العامل)
DROP POLICY IF EXISTS users_own_advances ON advances;
CREATE POLICY users_own_advances ON advances FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_workers') AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_edit_workers') AND tm_project_ok(user_id, project_id) AND tm_employee_ok(user_id, employee_id)));

-- client_receipts (مدخولات — أقرب علم مالي هو can_view/add_payments)
DROP POLICY IF EXISTS user_client_receipts ON client_receipts;
CREATE POLICY user_client_receipts ON client_receipts FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_payments') AND tm_project_ok(user_id, project_id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_add_payments')  AND tm_project_ok(user_id, project_id)));

-- employees (مقيّد بـ allowed_employee_ids)
DROP POLICY IF EXISTS user_employees ON employees;
CREATE POLICY user_employees ON employees FOR ALL
USING      (user_id = auth.uid() OR (tm_flag(user_id,'can_view_workers') AND tm_employee_ok(user_id, id)))
WITH CHECK (user_id = auth.uid() OR (tm_flag(user_id,'can_edit_workers') AND tm_employee_ok(user_id, id)));

-- يجب أن تكون قابلة للتنفيذ من أي دور كي لا يفشل تقييم سياسة RLS بخطأ صلاحية
-- (الدوال غير حسّاسة: ترجع بوليان عن عضوية المستدعي نفسه فقط)
GRANT EXECUTE ON FUNCTION tm_flag(uuid,text), tm_project_ok(uuid,uuid), tm_employee_ok(uuid,uuid) TO anon, authenticated;
