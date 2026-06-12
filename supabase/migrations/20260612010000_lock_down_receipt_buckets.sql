-- ════════════════════════════════════════════════════════════════════════════
-- إغلاق تسريب صور الإيصالات: دلاء receipts + worker-receipts خاصّة + سياسات مُحكمة
-- ────────────────────────────────────────────────────────────────────────────
-- المشكلة المكتشفة:
--   • كل دلاء التخزين كانت public=true → صور الفواتير المالية تُقرأ وتُسرَد علناً
--     عبر مسار /object/public/ متجاوزةً RLS، عابرةً للمستأجرين.
--   • سياسة "read_receipts" (دلو receipts) = SELECT للجميع بلا قيد.
--   • سياسة "worker_receipts_open" (دلو worker-receipts) = ALL للجميع بلا قيد.
--
-- ⚠️ ترتيب النشر مهمّ: طبّق هذا الترحيل **بعد** نشر الواجهة الجديدة و edge function
--    (worker-sign-receipt). قبل ذلك، الواجهة القديمة ترفع/توقّع كـ anon مباشرةً
--    وسينكسر الرفع إن أُغلق الدلو أولاً.
--
-- ملاحظة: روابط موقّعة (signed URLs) مخزّنة سابقاً تظل تعمل على الدلو الخاصّ حتى
--   انتهاء مدّتها. روابط /object/public/ القديمة (~22) ستتوقّف — مقبول.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) دلو receipts (إيصالات المالك): أزل القراءة المفتوحة، أبقِ سياسات المالك
DROP POLICY IF EXISTS "read_receipts" ON storage.objects;
-- (تبقى: owner_reads_own_receipts [SELECT]، upload_receipts [INSERT]، delete_receipts [DELETE])

-- 2) دلو worker-receipts: أزل السياسة المفتوحة بالكامل
DROP POLICY IF EXISTS "worker_receipts_open" ON storage.objects;

-- 3) قراءة worker-receipts للمصادَقين فقط (مالك العامل أو عضو فريقه النشط)
--    تصحيح خطأ سابق: تقييم اسم المجلّد في النطاق الخارجي يضمن أنّ name = storage.objects.name
--    (داخل subquery على employees كان name يلتقط employees.name بالخطأ).
DROP POLICY IF EXISTS "auth_reads_worker_receipts" ON storage.objects;
CREATE POLICY "auth_reads_worker_receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'worker-receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM employees e
      WHERE e.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.owner_id = e.user_id
            AND tm.member_id = auth.uid()
            AND COALESCE(tm.is_blocked, false) = false
        )
    )
  );

-- 4) رفع worker-receipts: مسموح للبوّابة (anon) والمصادَقين — كتابة فقط.
--    القراءة للبوّابة تتمّ حصراً عبر edge function (worker-sign-receipt) بعد التحقّق
--    من الـ token — لا قراءة anon من التخزين مباشرةً.
DROP POLICY IF EXISTS "worker_receipts_insert" ON storage.objects;
CREATE POLICY "worker_receipts_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'worker-receipts');

-- 5) اجعل الدلاء خاصّة (يلغي مسار /object/public/ والسرد العلني)
UPDATE storage.buckets SET public = false WHERE id IN ('receipts', 'worker-receipts');
