-- =====================================================
-- Site Units — المرحلة A: شقق (units) داخل الطوابق + بنود التشطيب (trades)
-- الهرمية تتوسّع: قطعة → عمارة → طابق → شقّة (level='unit').
-- trades: JSONB حالة البنود الخمسة لكل شقّة { tradeId: 'todo'|'doing'|'done' }
--   البنود: structure (هيكل) · plumbing (مواسير) · electrical (كهرباء)
--           · finishing (تشطيب) · handover (تسليم)
-- مفتاح فارغ = 'todo'. تقدّم الشقّة يُحسب في الواجهة (كل بند ٢٠٪، «ماشي»=نص).
-- =====================================================

ALTER TABLE project_site_units
  ADD COLUMN IF NOT EXISTS trades JSONB NOT NULL DEFAULT '{}'::jsonb;
