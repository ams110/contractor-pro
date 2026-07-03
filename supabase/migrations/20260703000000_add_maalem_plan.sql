-- إضافة باقة «معلّم» (maalem) — باقة فردية ₪35/شهر بلا ميزات عمال
-- توسيع قيدي CHECK على organizations.plan و subscriptions.plan.
-- ⚠️ بدون هذا التوسيع: webhook الاشتراك يفشل بصمت (يسجّل error ويرجّع 200)
--    ولا يتحدّث plan المؤسسة أبداً.
-- نسقط أي قيد CHECK قائم على عمود plan أياً كان اسمه (قد يكون مولّداً تلقائياً)
-- ثم نعيد إنشاءه بالقائمة الموسّعة.

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname, t.relname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname IN ('organizations', 'subscriptions')
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%plan%IN%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', con.relname, con.conname);
  END LOOP;
END $$;

ALTER TABLE public.organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'maalem', 'starter', 'pro', 'business'));

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'maalem', 'starter', 'pro', 'business'));
