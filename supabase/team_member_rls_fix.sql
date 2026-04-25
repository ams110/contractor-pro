-- =====================================================
-- Team Member RLS Fix
-- يسمح لأعضاء الفريق النشطين بالوصول لبيانات المالك
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- دالة مساعدة: هل المستخدم الحالي عضو نشط لهذا المالك؟
CREATE OR REPLACE FUNCTION is_active_team_member_of(owner UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE member_id = auth.uid()
      AND owner_id  = owner
      AND status    = 'active'
      AND NOT COALESCE(is_blocked, false)
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

GRANT EXECUTE ON FUNCTION is_active_team_member_of(UUID) TO authenticated;

-- ─── projects ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_projects" ON projects;
CREATE POLICY "user_projects" ON projects FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── employees ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_employees" ON employees;
CREATE POLICY "user_employees" ON employees FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── work_days ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_work_days" ON work_days;
CREATE POLICY "user_work_days" ON work_days FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── expenses ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_expenses" ON expenses;
CREATE POLICY "user_expenses" ON expenses FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── payments ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_payments" ON payments;
CREATE POLICY "user_payments" ON payments FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── advances ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_own_advances" ON advances;
CREATE POLICY "users_own_advances" ON advances FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── tax_advances ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_own_tax_advances" ON tax_advances;
CREATE POLICY "users_own_tax_advances" ON tax_advances FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── holidays ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_holidays" ON holidays;
CREATE POLICY "owner_holidays" ON holidays FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── client_receipts ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_client_receipts" ON client_receipts;
CREATE POLICY "user_client_receipts" ON client_receipts FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));
