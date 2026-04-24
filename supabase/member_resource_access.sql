-- إضافة أعمدة UUID[] لتحديد موارد الأعضاء
-- آمن للتشغيل: كل شيء داخل transaction واحدة
BEGIN;

-- ─── 1. الأعمدة الجديدة ───────────────────────────────────────────────────────
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS allowed_project_ids  UUID[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allowed_employee_ids UUID[] DEFAULT NULL;

-- ─── 2. المشاريع ──────────────────────────────────────────────────────────────

-- أنشئ السياسات الجديدة أولاً
CREATE POLICY "owner_projects" ON projects FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_projects" ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = projects.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_projects = true
        AND (
          tm.allowed_project_ids IS NULL
          OR cardinality(tm.allowed_project_ids) = 0
          OR projects.id = ANY(tm.allowed_project_ids)
        )
    )
  );

CREATE POLICY "member_edit_projects" ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = projects.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_edit_projects = true
    )
  );

-- الآن احذف السياسات القديمة بأمان
DROP POLICY IF EXISTS "user_projects"      ON projects;
DROP POLICY IF EXISTS "team_view_projects" ON projects;
DROP POLICY IF EXISTS "team_edit_projects" ON projects;

-- ─── 3. العمال ────────────────────────────────────────────────────────────────

CREATE POLICY "owner_employees" ON employees FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_employees" ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = employees.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_workers = true
        AND (
          tm.allowed_employee_ids IS NULL
          OR cardinality(tm.allowed_employee_ids) = 0
          OR employees.id = ANY(tm.allowed_employee_ids)
        )
    )
  );

DROP POLICY IF EXISTS "user_employees"      ON employees;
DROP POLICY IF EXISTS "team_view_employees" ON employees;

-- ─── 4. أيام العمل ────────────────────────────────────────────────────────────

CREATE POLICY "owner_work_days" ON work_days FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_work_days" ON work_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = work_days.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_workers = true
    )
  );

DROP POLICY IF EXISTS "user_work_days" ON work_days;

-- ─── 5. المصاريف ──────────────────────────────────────────────────────────────

CREATE POLICY "owner_expenses" ON expenses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_expenses" ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = expenses.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_expenses = true
    )
  );

CREATE POLICY "member_add_expenses" ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = expenses.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_add_expenses = true
    )
  );

DROP POLICY IF EXISTS "user_expenses" ON expenses;

-- ─── 6. الدفعات ───────────────────────────────────────────────────────────────

CREATE POLICY "owner_payments" ON payments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_payments" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = payments.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_payments = true
    )
  );

DROP POLICY IF EXISTS "user_payments" ON payments;

-- ─── 7. إيصالات العملاء ───────────────────────────────────────────────────────

CREATE POLICY "owner_client_receipts" ON client_receipts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_view_client_receipts" ON client_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.owner_id = client_receipts.user_id
        AND tm.member_id = auth.uid()
        AND tm.status = 'active'
        AND NOT COALESCE(tm.is_blocked, false)
        AND tm.can_view_projects = true
    )
  );

DROP POLICY IF EXISTS "user_client_receipts" ON client_receipts;

COMMIT;
