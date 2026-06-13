-- يُرجع أعلام صلاحيات العامل لنفسه (بالـtoken) كي تعكسها البوّابة بإخفاء/إظهار التبويبات.
CREATE OR REPLACE FUNCTION public.get_worker_self(emp_id uuid, p_token text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE e employees%ROWTYPE;
BEGIN
  SELECT * INTO e FROM employees
  WHERE id = emp_id AND worker_session_token = p_token
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة منتهية'); END IF;
  RETURN json_build_object(
    'id', e.id, 'name', e.name,
    'can_submit_workday',  e.can_submit_workday,
    'can_submit_expenses', e.can_submit_expenses,
    'can_log_materials',   e.can_log_materials,
    'can_request_payment', e.can_request_payment,
    'can_access_portal',   e.can_access_portal
  );
END;$function$;

GRANT EXECUTE ON FUNCTION public.get_worker_self(uuid, text) TO anon, authenticated;
