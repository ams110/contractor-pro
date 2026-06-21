-- =====================================================
-- Project Site Units — خريطة الموقع الحيّة (المرحلة 2)
-- وحدات هرمية: قطعة (block) → عمارة/بيت (building) → طابق (floor)
-- لكل وحدة حالة تنفيذ (مرحلة) تُعرض كإشارة نابضة على الخريطة.
-- =====================================================

CREATE TABLE IF NOT EXISTS project_site_units (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id)           ON DELETE CASCADE,
  parent_id   UUID        REFERENCES project_site_units(id)          ON DELETE CASCADE,
  level       TEXT        NOT NULL DEFAULT 'building',  -- block | building | floor
  name        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'planned',   -- planned|foundation|structure|finishing|done
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_site_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_site_units" ON project_site_units;
CREATE POLICY "owner_all_site_units" ON project_site_units
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS project_site_units_owner_project_idx
  ON project_site_units(owner_id, project_id, parent_id, sort_order);
