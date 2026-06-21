-- =====================================================
-- Project Documents — الوثائق والتصاريح (المرحلة 3)
-- تصريح بناء / عقد / رخصة / تأمين... بملف مرفق + تاريخ انتهاء
-- (حالة السريان تُحسب من expiry_date في الواجهة)
-- =====================================================

CREATE TABLE IF NOT EXISTS project_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  doc_type    TEXT        NOT NULL DEFAULT 'أخرى',  -- تصريح بناء | عقد | رخصة | تأمين | أخرى
  file_url    TEXT,
  file_type   TEXT        NOT NULL DEFAULT 'image', -- image | pdf
  expiry_date DATE,
  notes       TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_documents" ON project_documents;
CREATE POLICY "owner_all_documents" ON project_documents
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS project_documents_owner_project_idx
  ON project_documents(owner_id, project_id, sort_order);
