-- ─── Phase 3 security fixes ──────────────────────────────────────────────────

-- 1. Add FK from notifications.user_id → auth.users (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'notifications'
      AND constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Cap p_limit in get_member_activity to prevent unbounded queries
CREATE OR REPLACE FUNCTION get_member_activity(p_actor_email TEXT, p_limit INT DEFAULT 40)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC),'[]'::json) INTO result
  FROM (SELECT action, tbl, record_id, created_at FROM audit_log
        WHERE owner_id=auth.uid() AND actor_email=p_actor_email
        ORDER BY created_at DESC LIMIT LEAST(p_limit, 500)) r;
  RETURN result;
END;
$$;

-- 3. Cap p_limit in get_all_activity to prevent unbounded queries
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
    ORDER BY al.created_at DESC LIMIT LEAST(p_limit, 1000)
  ) r;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
