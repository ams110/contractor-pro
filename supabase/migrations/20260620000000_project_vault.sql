-- =====================================================
-- Project Vault — دفتر المشروع (المرحلة 1)
-- مخططات المشروع (project_drawings) + قائمة المواد/الكميات (project_materials)
-- =====================================================

-- ─── 1) جدول المخططات (CP-Sheets) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_drawings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT '',
  sheet_no    INTEGER     NOT NULL DEFAULT 1,          -- رقم الورقة → يُعرض CP-{sheet_no}
  file_url    TEXT,                                     -- signed URL في bucket project-files
  file_type   TEXT        NOT NULL DEFAULT 'image',     -- 'image' | 'pdf'
  notes       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_drawings" ON project_drawings;
CREATE POLICY "owner_all_drawings" ON project_drawings
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS project_drawings_owner_project_idx
  ON project_drawings(owner_id, project_id, sort_order);

-- ─── 2) جدول المواد / الكميات (BOQ — כתב כמויות) ──────────────────────────────
CREATE TABLE IF NOT EXISTS project_materials (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  quantity    NUMERIC     NOT NULL DEFAULT 1,
  unit        TEXT        NOT NULL DEFAULT 'قطعة',
  est_price   NUMERIC     NOT NULL DEFAULT 0,           -- سعر الوحدة التقديري
  supplier    TEXT,
  status      TEXT        NOT NULL DEFAULT 'مطلوب',      -- مطلوب | طلب | وصل | مركّب
  notes       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_materials" ON project_materials;
CREATE POLICY "owner_all_materials" ON project_materials
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS project_materials_owner_project_idx
  ON project_materials(owner_id, project_id, sort_order);

-- ─── 3) bucket التخزين للملفات (مخططات/وثائق) ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- مسار الملف: {owner_uid}/{project_id}/{timestamp}.ext → المالك يصل لمجلّده فقط
DROP POLICY IF EXISTS "project_files_owner_read"   ON storage.objects;
CREATE POLICY "project_files_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project_files_owner_insert" ON storage.objects;
CREATE POLICY "project_files_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project_files_owner_delete" ON storage.objects;
CREATE POLICY "project_files_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
