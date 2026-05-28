-- Backfill: client_receipts.business_id من project.business_id
-- المشكلة: المسار القديم لإضافة قبضة من داخل تاب المشروع كان لا يحفظ
-- business_id، فالقبضات القديمة لا تظهر في شاشة المالية → مدخولات
-- التي تفلتر بـ business_id.

UPDATE client_receipts cr
SET    business_id = p.business_id
FROM   projects p
WHERE  cr.project_id  = p.id
  AND  cr.user_id     = p.user_id
  AND  cr.business_id IS NULL
  AND  p.business_id  IS NOT NULL;

-- نفس المعالجة للمصاريف (احتياط — المسار الحالي يحفظها لكن نضمن الاتساق)
UPDATE expenses e
SET    business_id = p.business_id
FROM   projects p
WHERE  e.project_id  = p.id
  AND  e.user_id     = p.user_id
  AND  e.business_id IS NULL
  AND  p.business_id IS NOT NULL;
