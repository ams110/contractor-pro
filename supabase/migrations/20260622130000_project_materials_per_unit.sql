-- =====================================================
-- Project Materials — BOQ مربوطة بالشقق
-- علم per_unit: عند تفعيله تُضرب كمّية البند بعدد الشقق (units) في الموقع،
-- فالكمّية والتكلفة التقديرية تتوسّعان تلقائياً مع حجم المشروع (حساب بالواجهة).
-- =====================================================

ALTER TABLE project_materials
  ADD COLUMN IF NOT EXISTS per_unit BOOLEAN NOT NULL DEFAULT false;
