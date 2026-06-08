-- =====================================================
-- سجل نشاط العمّال (Worker Activity Log)
-- يسجّل كل عملية يقوم بها العامل من البوّابة: دخول، تقديم يوم،
-- مصروف، طلب راتب/سلفة، تسجيل بضاعة، تغيير كلمة سر.
-- المالك فقط يقرأ السجل (RLS) عبر get_worker_activity().
-- =====================================================

-- ─── الجدول ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  worker_name   TEXT,
  action        TEXT NOT NULL,          -- login | submit_day | submit_expense | request_payment | request_advance | add_material | change_password
  resource_type TEXT,                   -- work_day | expense | payment | advance | material | auth
  resource_id   UUID,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worker_activity_owner_idx ON worker_activity_log (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_activity_emp_idx   ON worker_activity_log (employee_id, created_at DESC);

ALTER TABLE worker_activity_log ENABLE ROW LEVEL SECURITY;

-- المالك يقرأ سجلّ عمّاله فقط
DROP POLICY IF EXISTS worker_activity_owner_select ON worker_activity_log;
CREATE POLICY worker_activity_owner_select ON worker_activity_log
  FOR SELECT USING (owner_id = auth.uid());

-- ─── دالة التسجيل المساعدة (آمنة — لا تُفشِل العملية الأصل أبداً) ──────────────
CREATE OR REPLACE FUNCTION log_worker_activity(
  p_owner  UUID,
  p_emp    UUID,
  p_name   TEXT,
  p_action TEXT,
  p_rtype  TEXT,
  p_rid    UUID,
  p_meta   JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO worker_activity_log (owner_id, employee_id, worker_name, action, resource_type, resource_id, meta)
  VALUES (p_owner, p_emp, p_name, p_action, p_rtype, p_rid, COALESCE(p_meta, '{}'::jsonb));
EXCEPTION WHEN OTHERS THEN
  -- التسجيل ثانوي: تجاهل أي خطأ كي لا تنكسر عملية العامل
  NULL;
END;
$$;

-- ─── دالة القراءة للمالك ─────────────────────────────────────────────────────
-- p_emp_id اختياري: لو مُرّر يفلتر على عامل واحد، وإلا يرجّع كل العمّال
CREATE OR REPLACE FUNCTION get_worker_activity(p_emp_id UUID DEFAULT NULL, p_limit INT DEFAULT 200)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT wal.id, wal.employee_id, wal.worker_name, wal.action,
           wal.resource_type, wal.resource_id, wal.meta, wal.created_at
    FROM worker_activity_log wal
    WHERE wal.owner_id = auth.uid()
      AND (p_emp_id IS NULL OR wal.employee_id = p_emp_id)
    ORDER BY wal.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000))
  ) t;
  RETURN result;
END;
$$;

-- get_worker_activity للمالك (authenticated) فقط
REVOKE EXECUTE ON FUNCTION get_worker_activity(UUID, INT) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION get_worker_activity(UUID, INT) TO authenticated;

-- log_worker_activity داخلية فقط — تُستدعى من دوال العامل (SECURITY DEFINER) حصراً.
-- امنع استدعاءها مباشرةً من أي عميل كي لا يُحقن سجلّ نشاط مزيّف.
REVOKE EXECUTE ON FUNCTION log_worker_activity(UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
