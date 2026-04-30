-- ─── جدول سجل البضاعة (material_logs) ───────────────────────────────────────
-- العمال يسجّلون البضاعة المأخوذة بدون الأسعار
-- المقاول يرى الأسعار والإجمالي

CREATE TABLE IF NOT EXISTS material_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id  UUID REFERENCES employees(id)  ON DELETE SET NULL,
  project_id   UUID REFERENCES projects(id)   ON DELETE SET NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  item_name    TEXT NOT NULL,
  quantity     NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit         TEXT NOT NULL DEFAULT 'قطعة',
  notes        TEXT DEFAULT '',
  unit_price   NUMERIC(12,2) DEFAULT NULL,   -- يملأه المقاول فقط
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | approved
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE material_logs ENABLE ROW LEVEL SECURITY;

-- المقاول يرى كل سجلاته
CREATE POLICY "owner_material_logs" ON material_logs
  FOR ALL USING (owner_id = auth.uid());

-- العمال يقدرون يضيفوا ويقرأوا (بدون unit_price — مُتحكم فيه من الـ app)
CREATE POLICY "worker_insert_material_logs" ON material_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "worker_select_material_logs" ON material_logs
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_matlogs_owner    ON material_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_matlogs_emp      ON material_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_matlogs_project  ON material_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_matlogs_date     ON material_logs (date);
