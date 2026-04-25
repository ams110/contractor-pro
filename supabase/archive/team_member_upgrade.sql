-- =====================================================
-- Team Member Direct Add System (بدون إيميل دعوة)
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- 1. أعمدة جديدة على team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS display_name       TEXT,
  ADD COLUMN IF NOT EXISTS username           TEXT,
  ADD COLUMN IF NOT EXISTS role               TEXT DEFAULT 'عضو',
  ADD COLUMN IF NOT EXISTS expires_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_email         TEXT,
  ADD COLUMN IF NOT EXISTS can_view_amounts   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_activity  BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_username_uq
  ON team_members(username) WHERE username IS NOT NULL;

-- 2. صلاحيات بورتال الشغيلة على جدول employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS can_submit_expenses  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_request_payment  BOOLEAN DEFAULT true;

-- 3. دالة جلب إيميل العضو لتسجيل الدخول (تستخدمها شاشة الدخول)
CREATE OR REPLACE FUNCTION get_team_auth_email(p_username TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_email FROM team_members
  WHERE username = p_username
    AND status   = 'active'
    AND NOT COALESCE(is_blocked, false)
  LIMIT 1;
$$;

-- 4. دالة جلب كل النشاط (للمالك)
CREATE OR REPLACE FUNCTION get_all_activity(p_limit INT DEFAULT 100)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT
      al.action,
      al.tbl,
      al.record_id,
      al.created_at,
      al.actor_email,
      COALESCE(tm.display_name, al.actor_email) AS actor_name
    FROM audit_log al
    LEFT JOIN team_members tm
      ON tm.owner_id    = auth.uid()
      AND tm.auth_email = al.actor_email
    WHERE al.owner_id = auth.uid()
    ORDER BY al.created_at DESC
    LIMIT p_limit
  ) r;
  RETURN result;
END;
$$;

-- 5. تحديث دالة جلب نشاط عضو معيّن لتشمل اسمه
CREATE OR REPLACE FUNCTION get_member_activity(p_actor_email TEXT, p_limit INT DEFAULT 40)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT action, tbl, record_id, created_at
    FROM audit_log
    WHERE owner_id    = auth.uid()
      AND actor_email = p_actor_email
    ORDER BY created_at DESC
    LIMIT p_limit
  ) r;
  RETURN result;
END;
$$;
