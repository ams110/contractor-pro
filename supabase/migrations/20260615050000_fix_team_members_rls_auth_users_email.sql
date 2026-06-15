-- =====================================================
-- إصلاح: سياسات RLS على team_members كانت تقرأ auth.users.email مباشرةً
-- (SELECT users.email FROM auth.users ...) ودور authenticated لا يملك
-- صلاحية SELECT على auth.users → "permission denied for table users".
--
-- الأثر الخفي (الذي ظهر للمستخدم): سياسة التخزين auth_reads_worker_receipts
-- تستعلم team_members مباشرةً عند تقييم أي SELECT على storage.objects، فكان
-- توليد أي رابط موقّع (createSignedUrl) يفشل لكل مستخدم مصادَق. النتيجة:
-- عند رفع صورة إيصال مع تسجيل قبضة، يفشل توليد الرابط → uploadReceipt يرمي
-- خطأً → onSave لا يُنفَّذ أبداً → القبضة لا تُحفظ (بصمت).
--
-- التطبيق نفسه لم يلاحظ الكسر لأنه يقرأ team_members عبر RPCs بصلاحية
-- SECURITY DEFINER (get_owner_team_members / get_my_membership) تتجاوز RLS؛
-- المسار الوحيد الذي كشفه كان تقييم السياسة داخل استعلام توقيع التخزين.
--
-- الحل المعياري في Supabase: استبدال قراءة auth.users بادّعاء البريد من الـJWT
-- عبر auth.jwt() ->> 'email' (لا يلمس auth.users إطلاقاً).
-- =====================================================

DROP POLICY IF EXISTS "member_view" ON public.team_members;
CREATE POLICY "member_view" ON public.team_members FOR SELECT
USING (
  member_id = (SELECT auth.uid())
  OR (status = 'pending' AND email = (auth.jwt() ->> 'email'))
);

DROP POLICY IF EXISTS "member_accept" ON public.team_members;
CREATE POLICY "member_accept" ON public.team_members FOR UPDATE
USING (
  status = 'pending' AND email = (auth.jwt() ->> 'email')
);
