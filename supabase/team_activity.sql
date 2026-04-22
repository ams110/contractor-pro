-- =====================================================
-- Team Activity Log & Access Control
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- أعمدة جديدة على team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_blocked   BOOLEAN DEFAULT false;

-- جدول سجل النشاط
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL,
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,   -- insert | update | delete | view
  tbl         TEXT NOT NULL,   -- اسم الجدول أو الشاشة
  record_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_reads_audit" ON audit_log;
CREATE POLICY "owner_reads_audit" ON audit_log FOR SELECT
  USING (owner_id = auth.uid());

-- ─── Trigger Function: تسجيل تلقائي لكل insert/update/delete ─────────────────
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner  UUID;
  v_rec    UUID;
BEGIN
  -- تجاهل العمليات من قبل anon أو service_role (بوابة العمال)
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'DELETE' THEN v_owner := OLD.user_id; v_rec := OLD.id;
  ELSE                      v_owner := NEW.user_id; v_rec := NEW.id; END IF;

  -- تجاهل تصرفات المالك نفسه (نسجّل أعضاء الفريق فقط)
  IF auth.uid() = v_owner THEN RETURN COALESCE(NEW, OLD); END IF;

  INSERT INTO audit_log (owner_id, actor_id, actor_email, action, tbl, record_id)
  SELECT
    v_owner,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_rec;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ربط الـ Triggers بالجداول الرئيسية
DROP TRIGGER IF EXISTS _audit ON projects;
DROP TRIGGER IF EXISTS _audit ON employees;
DROP TRIGGER IF EXISTS _audit ON expenses;
DROP TRIGGER IF EXISTS _audit ON payments;
DROP TRIGGER IF EXISTS _audit ON work_days;

CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON projects   FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON employees  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON expenses   FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON payments   FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER _audit AFTER INSERT OR UPDATE OR DELETE ON work_days  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ─── RPC: تحديث last_seen عند دخول العضو ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_last_seen(p_owner_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE team_members
  SET last_seen_at = now()
  WHERE member_id = auth.uid()
    AND owner_id  = p_owner_id
    AND status    = 'active'
    AND NOT COALESCE(is_blocked, false);
END;
$$;

-- ─── RPC: تسجيل فتح صفحة (view) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_screen_view(p_owner_id UUID, p_screen TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = p_owner_id THEN RETURN; END IF;
  INSERT INTO audit_log (owner_id, actor_id, actor_email, action, tbl)
  SELECT p_owner_id, auth.uid(),
         (SELECT email FROM auth.users WHERE id = auth.uid()),
         'view', p_screen;
END;
$$;

-- ─── RPC: حجب / رفع حجب عضو ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_member_blocked(p_row_id UUID, p_blocked BOOLEAN)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;
  UPDATE team_members SET is_blocked = p_blocked
  WHERE id = p_row_id AND owner_id = auth.uid();
  RETURN '{"success":true}'::json;
END;
$$;

-- ─── RPC: جلب نشاط عضو معيّن ─────────────────────────────────────────────────
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
