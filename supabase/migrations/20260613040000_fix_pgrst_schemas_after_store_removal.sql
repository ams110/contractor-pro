-- إصلاح إعداد PostgREST بعد حذف schema "store" (PR #188 / 20260613030000_remove_store_app).
--
-- المشكلة: الـmigration السابق حذف schema "store" عبر DROP SCHEMA store CASCADE،
-- لكن إعداد PostgREST (pgrst.db_schemas) و search_path للأدوار بقي يشير إلى "store".
-- بما أن الـschema لم يعد موجوداً، يفشل PostgREST في بناء schema cache ويرجّع
-- 503 لكل طلبات الـREST API (وسجلّ Postgres يكرّر: schema "store" does not exist).
--
-- هذا الـmigration يزيل المرجع اليتيم ويعيد الإعداد لقيمته الصحيحة (public فقط).
-- مهم: شغّله بعد أي إعادة تشغيل لـ remove_store_app حتى لا يتعطّل الـAPI.

ALTER ROLE authenticator SET pgrst.db_schemas = 'public';
ALTER ROLE anon          SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;

-- إعادة تحميل إعداد PostgREST و schema cache فوراً
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
