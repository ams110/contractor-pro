-- حذف تطبيق المتجر (B2B e-commerce) نهائياً من قاعدة البيانات المشتركة.
-- كان مشروعاً منفصلاً (سكيما store: 21 جدول + ~14 view عامّة + دوال + كتالوج منتجات)
-- يتشارك نفس مشروع Supabase مع تطبيق المقاولات. تمّ فصل المقاولات أولاً
-- (هجرة 20260613020000) فصار public.profiles جدولاً مستقلاً.
-- تمّ التحقّق أن لا شيء من كود المقاولات يستدعي أيّاً من كائنات المتجر.
-- (طُبّقت على الإنتاج عبر Supabase MCP. الاسترجاع: نسخ Supabase الاحتياطية.)

-- 1) دوال المتجر في public (طلبيات/فواتير/عروض/مخزون/دخول المتجر)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public'
    WHERE p.proname IN (
      'accept_my_quote','admin_ops_dashboard','admin_ops_stats','admin_set_product_cost',
      'apply_stock_movement','convert_quote_to_order','get_email_by_username','issue_invoice',
      'list_passkeys','my_prices','place_order','push_subscribe','push_unsubscribe',
      'receive_purchase_order','remove_passkey'
    )
  LOOP EXECUTE 'DROP FUNCTION IF EXISTS '||r.sig||' CASCADE'; END LOOP;
END $$;

-- 2) سكيما المتجر كاملة (جداولها + دوالها + تريغر تسجيلها + الـ views العامّة التابعة)
DROP SCHEMA IF EXISTS store CASCADE;

-- 3) جداول المتجر/القديمة المتبقّية في public
DROP TABLE IF EXISTS public.tiandy_il_categories CASCADE;
DROP TABLE IF EXISTS public.tiandy_il_products  CASCADE;
DROP TABLE IF EXISTS public._old_banners         CASCADE;
DROP TABLE IF EXISTS public._old_products        CASCADE;
DROP TABLE IF EXISTS public._old_profiles        CASCADE;
