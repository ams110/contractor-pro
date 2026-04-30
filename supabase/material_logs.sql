-- =====================================================
-- Material Logs — سجلات المستلزمات
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

-- ─── جدول سجلات المستلزمات ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES employees(id)  ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  date        DATE        NOT NULL,
  item_name   TEXT        NOT NULL,
  quantity    NUMERIC     NOT NULL DEFAULT 1,
  unit        TEXT        NOT NULL DEFAULT 'قطعة',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE material_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON material_logs
  FOR ALL USING (owner_id = auth.uid());

-- فهرس للأداء
CREATE INDEX IF NOT EXISTS material_logs_owner_project_idx
  ON material_logs(owner_id, project_id, date DESC);

-- ─── دالة: إضافة سجل مستلزم (تستدعيها بوابة العامل) ─────────────────────────
-- تحل owner_id تلقائياً من employees.user_id بناءً على employee_id
CREATE OR REPLACE FUNCTION worker_add_material_log(
  p_employee_id UUID,
  p_project_id  UUID,
  p_date        DATE,
  p_item_name   TEXT,
  p_quantity    NUMERIC,
  p_unit        TEXT    DEFAULT 'قطعة',
  p_notes       TEXT    DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- التحقق من المدخلات
  IF p_item_name IS NULL OR trim(p_item_name) = '' THEN
    RETURN json_build_object('error', 'اسم المادة مطلوب');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN json_build_object('error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  -- حل owner_id من employees.user_id
  SELECT user_id INTO v_owner_id
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'العامل غير موجود');
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('error', 'العامل غير مرتبط بحساب');
  END IF;

  INSERT INTO material_logs (
    owner_id,
    employee_id,
    project_id,
    date,
    item_name,
    quantity,
    unit,
    notes
  ) VALUES (
    v_owner_id,
    p_employee_id,
    p_project_id,
    COALESCE(p_date, CURRENT_DATE),
    trim(p_item_name),
    p_quantity,
    COALESCE(nullif(trim(p_unit), ''), 'قطعة'),
    COALESCE(p_notes, '')
  );

  RETURN json_build_object('success', true);
END;
$$;
