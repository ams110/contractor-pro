-- ════════════════════════════════════════════════════════════════════════════
-- Advances: ربط السلف بالمشروع
-- ════════════════════════════════════════════════════════════════════════════
-- الهدف:
--   إضافة عمود project_id (nullable) إلى جدول advances حتى تُنسب السلف
--   لمشروع معيّن، فيُحسب "متبقّي بيد المالك" على مستوى المشروع بدقّة
--   (الإيرادات − مصاريف المشروع − المدفوعات − السلف).
--
-- الملاحظات:
--   - nullable + ON DELETE SET NULL: السلف العامة (غير المرتبطة بمشروع)
--     تبقى صالحة، وحذف المشروع لا يحذف السلفة.
--   - الجدول فارغ حالياً (0 صفوف) → لا backfill مطلوب.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.advances
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.advances.project_id IS
  'المشروع المرتبط بالسلفة (اختياري). يُستخدم لحساب نقد المالك على مستوى المشروع.';

CREATE INDEX IF NOT EXISTS idx_advances_project
  ON public.advances (project_id)
  WHERE project_id IS NOT NULL;
