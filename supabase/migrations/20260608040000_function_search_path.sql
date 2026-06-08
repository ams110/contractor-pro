-- =====================================================
-- المرحلة 4: تثبيت search_path للدوال (إغلاق تحذير function_search_path_mutable)
-- دالة SECURITY DEFINER/trigger بـ search_path قابل للتغيير قد تُستغل عبر
-- إنشاء كائنات بنفس الاسم في مخطط آخر. نثبّت المسار على public, extensions.
-- =====================================================

ALTER FUNCTION public.get_worker_advances(uuid)                 SET search_path = public, extensions;
ALTER FUNCTION public.next_ref_number(uuid, text)              SET search_path = public, extensions;
ALTER FUNCTION public.set_ref_number()                          SET search_path = public, extensions;
ALTER FUNCTION public.touch_updated_at()                        SET search_path = public, extensions;
ALTER FUNCTION public.tiandy_il_touch_updated_at()             SET search_path = public, extensions;
ALTER FUNCTION public.upsert_app_config(uuid, boolean, numeric, integer) SET search_path = public, extensions;
