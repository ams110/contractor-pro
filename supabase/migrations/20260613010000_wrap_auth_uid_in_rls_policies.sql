-- تحسين أداء RLS: لفّ auth.uid() بـ (select auth.uid()) داخل سياسات الأمان.
-- بدون اللفّ تُقيَّم auth.uid() مرّة لكل صف (initplan)؛ مع اللفّ تُقيَّم مرّة واحدة
-- لكل استعلام → تسريع كبير على الجداول الكبيرة. التحويل متطابق دلالياً تماماً
-- (لا يغيّر مَن يصل إلى ماذا) وهو توصية Supabase الرسمية.
--
-- النطاق: جداول contractor-pro فقط (يستثني tiandy/store/_old التابعة لتطبيق آخر
-- يشارك قاعدة البيانات). ALTER POLICY يعدّل التعبير دون حذف السياسة، والكتلة ذرّية
-- (أي فشل → تراجع كامل، لا حالة جزئية). idempotent (يتخطّى الملفوف مسبقاً).
-- (طُبّقت على الإنتاج عبر Supabase MCP؛ هذا الملف للحفظ في نسخة الكود.)

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('ALTER POLICY %I ON public.%I%s%s;',
      policyname, tablename,
      CASE WHEN qual IS NOT NULL
           THEN ' USING (' || regexp_replace(qual, 'auth\.uid\(\)', '(select auth.uid())', 'g') || ')' ELSE '' END,
      CASE WHEN with_check IS NOT NULL
           THEN ' WITH CHECK (' || regexp_replace(with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g') || ')' ELSE '' END
    ) AS stmt
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename NOT LIKE 'tiandy%' AND tablename NOT LIKE 'store%' AND tablename NOT LIKE '\_old\_%'
      AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%auth.uid()%'
      AND lower(coalesce(qual,'')||coalesce(with_check,'')) NOT LIKE '%select auth.uid()%'
  LOOP
    EXECUTE r.stmt;
  END LOOP;
END $$;
