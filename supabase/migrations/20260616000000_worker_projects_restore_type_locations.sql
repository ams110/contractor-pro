-- إصلاح: إرجاع نوع المشروع (type) وأماكن العمل (locations) في بوّابة العامل
--
-- خلفية المشكلة:
--   الدالة الأصلية get_worker_projects (في add_work_locations.sql) كانت ترجع
--   'type' و'locations' حتى تظهر أزرار «مكان العمل» للمشاريع اليومية في البوّابة.
--   لكن migration لاحقة (20260613060000_worker_controls_projects_limits_suspend)
--   أعادت تعريف الدالة لإضافة token gating + حصر allowed_project_ids، ونسيت
--   إعادة الحقلين، فصارت ترجع id/name فقط.
--   النتيجة: العامل يستلم المشروع بدون type/locations → الشرط في
--   WorkerPortalScreen يفشل دائماً → أماكن العمل لا تظهر أبداً عند اختيار المشروع.
--
-- الإصلاح: إعادة 'type' و'locations' مع الإبقاء على token gating + allowed_project_ids.

CREATE OR REPLACE FUNCTION public.get_worker_projects(emp_id uuid, p_token text DEFAULT NULL::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE owner_id UUID; v_allowed uuid[]; result json;
BEGIN
  SELECT user_id, allowed_project_ids INTO owner_id, v_allowed FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;
  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (SELECT 1 FROM employees WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL) THEN
      RETURN '[]'::json;
    END IF;
  END IF;
  SELECT COALESCE(json_agg(json_build_object(
    'id',        id,
    'name',      name,
    'type',      type,
    'locations', COALESCE(locations, '{}')
  ) ORDER BY name),'[]'::json)
  INTO result FROM projects
  WHERE user_id=owner_id AND status IN ('نشط','موافق عليه')
    AND (v_allowed IS NULL OR array_length(v_allowed,1) IS NULL OR id = ANY(v_allowed));
  RETURN result;
END;$function$;
