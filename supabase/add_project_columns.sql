-- إضافة أعمدة جديدة لجداول المشاريع والإيصالات

-- تواريخ بدء/نهاية المشروع وملاحظات/اتفاقيات
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date   DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes      TEXT;

-- اسم الدافع في إيصالات العملاء (قبضة اليوميات)
ALTER TABLE client_receipts ADD COLUMN IF NOT EXISTS payer_name   TEXT;
-- رابط صورة الإيصال
ALTER TABLE client_receipts ADD COLUMN IF NOT EXISTS receipt_url  TEXT DEFAULT '';
