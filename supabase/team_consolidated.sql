-- =====================================================
-- Team Feature — Consolidated Migration
-- ملف موحّد يحل محل: team_member_upgrade, team_activity,
--   team_member_rls_fix, update_team_member_perms
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- ─── 1. Schema additions (idempotent) ────────────────────────────────────────
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS display_name      TEXT,
  ADD COLUMN IF NOT EXISTS username          TEXT,
  ADD COLUMN IF NOT EXISTS role              TEXT DEFAULT 'عضو',
  ADD COLUMN IF NOT EXISTS expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_email        TEXT,
  ADD COLUMN IF NOT EXISTS can_view_amounts  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_activity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_blocked        BOOLEAN DEFAULT false;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS can_submit_expenses BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_request_payment BOOLEAN DEFAULT true;

-- ─── 2. Username uniqueness — PER OWNER (fix global uniqueness bug) ──────────
-- الخطأ القديم: يمنع مالكَين مختلفَين من اختيار نفس اسم المستخدم
DROP INDEX IF EXISTS team_members_username_uq;

-- الصحيح: كل مالك له نطاق usernames مستقل
CREATE UNIQUE INDEX IF NOT EXISTS team_members_username_owner_uq
  ON team_members(owner_id, username)
  WHERE username IS NOT NULL;

-- ─── 3. audit_log table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL,
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  tbl         TEXT NOT NULL,
  record_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS helper: is_active_team_member_of ─────────────────────────────────
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

-- ─── 5. RLS policies ─────────────────────────────────────────────────────────
-- audit_log
DROP POLICY IF EXISTS "owner_reads_audit" ON audit_log;
CREATE POLICY "owner_reads_audit" ON audit_log FOR SELECT
  USING (owner_id = auth.uid());

-- projects
DROP POLICY IF EXISTS "user_projects" ON projects;
CREATE POLICY "user_projects" ON projects FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- employees
DROP POLICY IF EXISTS "user_employees" ON employees;
CREATE POLICY "user_employees" ON employees FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- work_days
DROP POLICY IF EXISTS "user_work_days" ON work_days;
CREATE POLICY "user_work_days" ON work_days FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- expenses
DROP POLICY IF EXISTS "user_expenses" ON expenses;
CREATE POLICY "user_expenses" ON expenses FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- payments
DROP POLICY IF EXISTS "user_payments" ON payments;
CREATE POLICY "user_payments" ON payments FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- advances
DROP POLICY IF EXISTS "users_own_advances" ON advances;
CREATE POLICY "users_own_advances" ON advances FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- tax_advances
DROP POLICY IF EXISTS "users_own_tax_advances" ON tax_advances;
CREATE POLICY "users_own_tax_advances" ON tax_advances FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- holidays
DROP POLICY IF EXISTS "owner_holidays" ON holidays;
CREATE POLICY "owner_holidays" ON holidays FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- client_receipts
DROP POLICY IF EXISTS "user_client_receipts" ON client_receipts;
CREATE POLICY "user_client_receipts" ON client_receipts FOR ALL
  USING (user_id = auth.uid() OR is_active_team_member_of(user_id));

-- ─── 5b. RLS على جدول team_members ──────────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_reads_own" ON team_members;
CREATE POLICY "member_reads_own" ON team_members FOR SELECT
  USING (member_id = auth.uid() OR owner_id = auth.uid());

-- ─── 6. RPCs ─────────────────────────────────────────────────────────────────
-- Drop first to allow return-type changes
DROP FUNCTION IF EXISTS get_my_membership();
DROP FUNCTION IF EXISTS get_team_auth_email(TEXT);
DROP FUNCTION IF EXISTS get_owner_team_members();
DROP FUNCTION IF EXISTS delete_team_member(UUID);
DROP FUNCTION IF EXISTS update_team_member_perms(UUID,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN);
DROP FUNCTION IF EXISTS set_member_blocked(UUID,BOOLEAN);
DROP FUNCTION IF EXISTS update_member_last_seen(UUID);
DROP FUNCTION IF EXISTS log_screen_view(UUID,TEXT);
DROP FUNCTION IF EXISTS get_member_activity(TEXT,INT);
DROP FUNCTION IF EXISTS get_all_activity(INT);

-- جلب بيانات العضو الحالي (SECURITY DEFINER يتجاوز RLS)
CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT row_to_json(t) FROM team_members t
  WHERE member_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_my_membership() TO authenticated;

-- جلب اسم المستخدم → auth_email (لشاشة الدخول)
CREATE OR REPLACE FUNCTION get_team_auth_email(p_username TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_email FROM team_members
  WHERE username = p_username
    AND status   = 'active'
    AND NOT COALESCE(is_blocked, false)
  LIMIT 1;
$$;

-- جلب كل أعضاء فريق المالك الحالي
CREATE OR REPLACE FUNCTION get_owner_team_members()
RETURNS SETOF team_members LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT * FROM team_members WHERE owner_id = auth.uid() ORDER BY created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION get_owner_team_members() TO authenticated;

-- حذف عضو (يتحقق من الملكية)
CREATE OR REPLACE FUNCTION delete_team_member(p_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;
  SELECT member_id INTO v_member_id FROM team_members WHERE id=p_id AND owner_id=auth.uid();
  IF NOT FOUND THEN RETURN '{"error":"العضو غير موجود"}'::json; END IF;
  DELETE FROM team_members WHERE id=p_id AND owner_id=auth.uid();
  RETURN '{"success":true}'::json;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_team_member(UUID) TO authenticated;

-- تحديث صلاحيات عضو
CREATE OR REPLACE FUNCTION update_team_member_perms(
  p_id                UUID,
  p_can_view_projects BOOLEAN,
  p_can_edit_projects BOOLEAN,
  p_can_view_workers  BOOLEAN,
  p_can_edit_workers  BOOLEAN,
  p_can_view_expenses BOOLEAN,
  p_can_add_expenses  BOOLEAN,
  p_can_view_payments BOOLEAN,
  p_can_add_payments  BOOLEAN,
  p_can_delete        BOOLEAN,
  p_can_manage_team   BOOLEAN,
  p_can_view_amounts  BOOLEAN,
  p_can_view_activity BOOLEAN
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;
  UPDATE team_members SET
    can_view_projects = p_can_view_projects,
    can_edit_projects = p_can_edit_projects,
    can_view_workers  = p_can_view_workers,
    can_edit_workers  = p_can_edit_workers,
    can_view_expenses = p_can_view_expenses,
    can_add_expenses  = p_can_add_expenses,
    can_view_payments = p_can_view_payments,
    can_add_payments  = p_can_add_payments,
    can_delete        = p_can_delete,
    can_manage_team   = p_can_manage_team,
    can_view_amounts  = p_can_view_amounts,
    can_view_activity = p_can_view_activity
  WHERE id = p_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RETURN '{"error":"العضو غير موجود أو ليس لديك صلاحية"}'::json; END IF;
  RETURN '{"success":true}'::json;
END;
$$;

-- حجب / رفع حجب عضو
CREATE OR REPLACE FUNCTION set_member_blocked(p_row_id UUID, p_blocked BOOLEAN)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;
  UPDATE team_members SET is_blocked=p_blocked WHERE id=p_row_id AND owner_id=auth.uid();
  RETURN '{"success":true}'::json;
END;
$$;

-- تحديث last_seen عند دخول العضو
CREATE OR REPLACE FUNCTION update_member_last_seen(p_owner_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE team_members SET last_seen_at=now()
  WHERE member_id=auth.uid() AND owner_id=p_owner_id AND status='active' AND NOT COALESCE(is_blocked,false);
END;
$$;

-- تسجيل فتح صفحة
CREATE OR REPLACE FUNCTION log_screen_view(p_owner_id UUID, p_screen TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid()=p_owner_id THEN RETURN; END IF;
  INSERT INTO audit_log (owner_id, actor_id, actor_email, action, tbl)
  SELECT p_owner_id, auth.uid(), (SELECT email FROM auth.users WHERE id=auth.uid()), 'view', p_screen;
END;
$$;

-- جلب نشاط عضو معيّن
CREATE OR REPLACE FUNCTION get_member_activity(p_actor_email TEXT, p_limit INT DEFAULT 40)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC),'[]'::json) INTO result
  FROM (SELECT action, tbl, record_id, created_at FROM audit_log
        WHERE owner_id=auth.uid() AND actor_email=p_actor_email
        ORDER BY created_at DESC LIMIT p_limit) r;
  RETURN result;
END;
$$;

-- جلب كل نشاط الفريق (للمالك)
CREATE OR REPLACE FUNCTION get_all_activity(p_limit INT DEFAULT 100)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC),'[]'::json) INTO result
  FROM (
    SELECT al.action, al.tbl, al.record_id, al.created_at, al.actor_email,
           COALESCE(tm.display_name, al.actor_email) AS actor_name
    FROM audit_log al
    LEFT JOIN team_members tm ON tm.owner_id=auth.uid() AND tm.auth_email=al.actor_email
    WHERE al.owner_id=auth.uid()
    ORDER BY al.created_at DESC LIMIT p_limit
  ) r;
  RETURN result;
END;
$$;

-- ─── 7. إعادة تحميل Schema Cache ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
