-- 20260625120000_lock_org_plan_trial_columns.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- إصلاح ثقب الدفع: organizations.plan و trial_ends_at كانا قابلَين للكتابة من
-- المالك مباشرةً عبر PostgREST (سياسة org_owner_update بلا WITH CHECK + GRANT
-- UPDATE عام على كل الأعمدة لدور authenticated) → أي مستخدم يقدر يرقّي حاله
-- إلى business + تجربة لا نهائية ببلاش من console المتصفّح.
--
-- الإصلاح: حصر كتابة plan/trial_ends_at على service_role فقط (paddle-webhook)،
-- مع إبقاء قدرة المالك على إعادة تسمية مصلحته (name). لا يغيّر أي قيمة قائمة.
-- التحقّق: authenticated يقدر يحدّث 'name' فقط؛ service_role كل الأعمدة.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) اسحب UPDATE العام عن أدوار العميل
REVOKE UPDATE ON public.organizations FROM anon, authenticated;

-- 2) أرجِع للمالك فقط تعديل اسم المصلحة — plan/trial_ends_at يبقوا محجوبين عن العميل
GRANT UPDATE (name) ON public.organizations TO authenticated;

-- 3) دفاع إضافي: تحديث المالك لا يقدر ينقل الملكية لمستخدم آخر
ALTER POLICY org_owner_update ON public.organizations
  WITH CHECK (owner_id = (select auth.uid()));
