-- =====================================================
-- Team Member Data Access Fix
-- يتيح لأعضاء الفريق الوصول إلى بيانات المالك
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- ─── 1. دالة مساعدة: تُعيد معرّف المالك الفعلي ────────────────────────────────
-- للمالك: تُعيد auth.uid() مباشرة
-- لعضو الفريق: تُعيد owner_id الخاص بالمالك
-- STABLE تسمح لـ PostgreSQL بتخزينها مؤقتاً خلال نفس الاستعلام
CREATE OR REPLACE FUNCTION effective_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT owner_id FROM team_members
      WHERE member_id = auth.uid()
        AND status    = 'active'
        AND NOT COALESCE(is_blocked, false)
      LIMIT 1
    ),
    auth.uid()
  )
$$;

-- ─── 2. تحديث سياسات RLS لتشمل أعضاء الفريق ──────────────────────────────────
-- المنطق: كل سجل يُسمح به إذا كان user_id = المالك الفعلي للمستخدم الحالي

DROP POLICY IF EXISTS "user_projects"          ON projects;
DROP POLICY IF EXISTS "user_employees"         ON employees;
DROP POLICY IF EXISTS "user_work_days"         ON work_days;
DROP POLICY IF EXISTS "user_expenses"          ON expenses;
DROP POLICY IF EXISTS "user_payments"          ON payments;
DROP POLICY IF EXISTS "user_client_receipts"   ON client_receipts;
DROP POLICY IF EXISTS "users_own_advances"     ON advances;
DROP POLICY IF EXISTS "owner_holidays"         ON holidays;
DROP POLICY IF EXISTS "owner_notifications"    ON notifications;
DROP POLICY IF EXISTS "users_own_tax_advances" ON tax_advances;

CREATE POLICY "user_projects"          ON projects           FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "user_employees"         ON employees          FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "user_work_days"         ON work_days          FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "user_expenses"          ON expenses           FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "user_payments"          ON payments           FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "user_client_receipts"   ON client_receipts    FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "users_own_advances"     ON advances           FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "owner_holidays"         ON holidays           FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "owner_notifications"    ON notifications      FOR ALL USING (user_id = effective_owner_id());
CREATE POLICY "users_own_tax_advances" ON tax_advances       FOR ALL USING (user_id = effective_owner_id());

-- ─── 3. إعادة تحميل Schema Cache ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
