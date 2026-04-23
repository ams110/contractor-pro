-- إضافة تحديد المشاريع والعمال لكل عضو فريق
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS allowed_project_ids  UUID[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allowed_employee_ids UUID[] DEFAULT NULL;

-- ─── تحديث سياسات RLS لتسمح لأعضاء الفريق بالوصول ───────────────────────────

-- المشاريع: المالك كامل الصلاحيات، الأعضاء يقرؤون فقط المشاريع المسموح بها
DROP POLICY IF EXISTS "user_projects"          ON projects;
DROP POLICY IF EXISTS "team_view_projects"     ON projects;
DROP POLICY IF EXISTS "team_edit_projects"     ON projects;

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

-- العمال: نفس المنطق
DROP POLICY IF EXISTS "user_employees"         ON employees;
DROP POLICY IF EXISTS "team_view_employees"    ON employees;

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

-- أيام العمل: المالك كل شيء، الأعضاء يقرؤون بشرط صلاحية المشاريع والعمال
DROP POLICY IF EXISTS "user_work_days"         ON work_days;

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

-- المصاريف
DROP POLICY IF EXISTS "user_expenses"          ON expenses;

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

-- الدفعات
DROP POLICY IF EXISTS "user_payments"          ON payments;

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

-- إيصالات العملاء
DROP POLICY IF EXISTS "user_client_receipts"   ON client_receipts;

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
