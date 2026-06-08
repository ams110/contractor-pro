-- =====================================================
-- إضافة تسجيل النشاط لدوال بوّابة العامل
-- يعيد إنشاء كل RPC بنفس سلوكه الحالي + استدعاء log_worker_activity()
-- قبل الإرجاع الناجح. التسجيل آمن (لا يُفشِل العملية).
-- =====================================================

-- ─── 1) تسجيل الدخول ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_login(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; new_token TEXT;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE lower(worker_username)=lower(trim(p_username))
    AND worker_password_hash=crypt(p_password, worker_password_hash);
  IF NOT FOUND THEN RETURN json_build_object('error','اسم المستخدم أو كلمة المرور غير صحيحة'); END IF;
  new_token := gen_random_uuid()::text;
  UPDATE employees SET worker_session_token=new_token WHERE id=emp.id;

  PERFORM log_worker_activity(emp.user_id, emp.id, emp.name, 'login', 'auth', NULL,
    json_build_object('method','password')::jsonb);

  RETURN json_build_object('id',emp.id,'name',emp.name,'specialization',emp.specialization,
    'daily_rate',emp.daily_rate,'status',emp.status,'token',new_token);
END;$function$;

-- ─── 2) تقديم يوم عمل ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_submit_day(
  p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_day_type text,
  p_hours numeric DEFAULT 8, p_custom_amount numeric DEFAULT NULL::numeric, p_location text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  emp               employees%ROWTYPE;
  calculated_amount NUMERIC;
  proj_name         TEXT;
  new_day_id        UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id
  ) THEN
    RETURN json_build_object('error', 'المشروع غير موجود');
  END IF;

  IF EXISTS (
    SELECT 1 FROM work_days
    WHERE employee_id = p_emp_id AND date = p_date AND day_type = p_day_type
  ) THEN
    RETURN json_build_object('error', 'يوجد يوم عمل من نفس النوع مسجل بهذا التاريخ مسبقاً');
  END IF;

  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
    calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN
    calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم', 'نصف') THEN
    calculated_amount := emp.daily_rate * 0.5;
  ELSE
    calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours, 8), 2);
  END IF;

  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status, location)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending', p_location)
  RETURNING id INTO new_day_id;

  SELECT name INTO proj_name FROM projects WHERE id = p_project_id;

  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب يوم عمل جديد',
    emp.name || ' — ' || p_day_type || COALESCE(' · ' || proj_name, ''),
    'pending_day',
    new_day_id
  );

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'submit_day', 'work_day', new_day_id,
    json_build_object('date', p_date, 'day_type', p_day_type, 'amount', calculated_amount,
                      'project', proj_name, 'location', p_location)::jsonb);

  RETURN json_build_object('success', true, 'amount', calculated_amount);
END;
$function$;

-- ─── 3) تقديم مصروف ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_submit_expense(
  p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_amount numeric,
  p_category text, p_vendor text DEFAULT ''::text, p_receipt_url text DEFAULT ''::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  emp       employees%ROWTYPE;
  proj_name TEXT;
  new_id    UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
      RETURN json_build_object('error', 'المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id = p_project_id;
  END IF;

  INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, receipt_url, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_amount, p_category, p_vendor, 'كاش', p_receipt_url, 'pending')
  RETURNING id INTO new_id;

  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب مصروف جديد 💸',
    emp.name || ' • ' || p_category || ' • ' || COALESCE(proj_name, '') || ' • ' || p_amount || '₪',
    'pending_expense',
    new_id
  );

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'submit_expense', 'expense', new_id,
    json_build_object('date', p_date, 'amount', p_amount, 'category', p_category,
                      'vendor', p_vendor, 'project', proj_name)::jsonb);

  RETURN json_build_object('success', true, 'amount', p_amount);
END;
$function$;

-- ─── 4) طلب راتب ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_request_payment(
  p_emp_id uuid, p_token text, p_amount numeric, p_project_id uuid DEFAULT NULL::uuid,
  p_method text DEFAULT 'كاش'::text, p_notes text DEFAULT ''::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  emp       employees%ROWTYPE;
  proj_name TEXT;
  new_id    UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;
  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
      RETURN json_build_object('error', 'المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id = p_project_id;
  END IF;
  INSERT INTO payments (user_id, employee_id, amount, method, date, project_id, notes, status)
  VALUES (emp.user_id, p_emp_id, p_amount, p_method, CURRENT_DATE, p_project_id, p_notes, 'pending')
  RETURNING id INTO new_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (
    emp.user_id,
    'طلب راتب جديد 💰',
    emp.name || ' يطلب ' || p_amount || '₪' ||
      CASE WHEN proj_name IS NOT NULL THEN ' من مشروع ' || proj_name ELSE '' END ||
      CASE WHEN p_notes  <> ''       THEN ' • ' || p_notes           ELSE '' END,
    'pending_payment',
    new_id
  );

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'request_payment', 'payment', new_id,
    json_build_object('amount', p_amount, 'method', p_method, 'project', proj_name, 'notes', p_notes)::jsonb);

  RETURN json_build_object('success', true, 'id', new_id);
END;
$function$;

-- ─── 5) طلب سلفة ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_request_advance(
  p_emp_id uuid, p_token text, p_amount numeric, p_notes text DEFAULT ''::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id
    AND worker_session_token = p_token
    AND worker_session_token IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  IF p_amount <= 0 OR p_amount > 999999 THEN
    RETURN jsonb_build_object('error', 'مبلغ غير صالح');
  END IF;

  IF (SELECT COUNT(*) FROM worker_advance_requests
        WHERE employee_id = p_emp_id AND status = 'pending') >= 1 THEN
    RETURN jsonb_build_object('error', 'لديك طلب سلفة معلق — انتظر موافقة المشرف أولاً');
  END IF;

  INSERT INTO worker_advance_requests (owner_id, employee_id, amount, notes)
  VALUES (emp.user_id, p_emp_id, p_amount, p_notes);

  INSERT INTO notifications (user_id, title, body, type)
  VALUES (
    emp.user_id,
    'طلب سلفة جديد',
    emp.name || ' يطلب سلفة ' || p_amount || '₪' ||
      CASE WHEN p_notes <> '' THEN ' • ' || p_notes ELSE '' END,
    'pending_advance'
  );

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'request_advance', 'advance', NULL,
    json_build_object('amount', p_amount, 'notes', p_notes)::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ─── 6) تسجيل بضاعة ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_add_material_log(
  p_employee_id uuid, p_project_id uuid, p_date date, p_item_name text,
  p_quantity numeric, p_unit text DEFAULT 'قطعة'::text, p_notes text DEFAULT ''::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id UUID;
  v_name     TEXT;
  new_id     UUID;
BEGIN
  IF p_item_name IS NULL OR trim(p_item_name) = '' THEN
    RETURN json_build_object('error', 'اسم المادة مطلوب');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN json_build_object('error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  SELECT user_id, name INTO v_owner_id, v_name
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'العامل غير موجود');
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('error', 'العامل غير مرتبط بحساب');
  END IF;

  INSERT INTO material_logs (
    owner_id, employee_id, project_id, date,
    item_name, quantity, unit, notes
  ) VALUES (
    v_owner_id, p_employee_id, p_project_id,
    COALESCE(p_date, CURRENT_DATE),
    trim(p_item_name), p_quantity,
    COALESCE(nullif(trim(p_unit), ''), 'قطعة'),
    COALESCE(p_notes, '')
  ) RETURNING id INTO new_id;

  PERFORM log_worker_activity(v_owner_id, p_employee_id, v_name, 'add_material', 'material', new_id,
    json_build_object('item', trim(p_item_name), 'quantity', p_quantity,
                      'unit', COALESCE(nullif(trim(p_unit), ''), 'قطعة'))::jsonb);

  RETURN json_build_object('success', true);
END;
$function$;

-- ─── 7) تغيير كلمة السر ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_change_password(
  p_emp_id uuid, p_token text, p_old_pass text, p_new_pass text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة غير صالحة، أعد تسجيل الدخول'); END IF;
  IF emp.worker_password_hash IS NULL OR emp.worker_password_hash != crypt(p_old_pass, emp.worker_password_hash) THEN
    RETURN json_build_object('error','كلمة المرور الحالية غير صحيحة');
  END IF;
  IF length(trim(p_new_pass)) < 4 THEN RETURN json_build_object('error','كلمة المرور يجب أن تكون 4 أحرف على الأقل'); END IF;
  UPDATE employees SET worker_password_hash=crypt(p_new_pass, gen_salt('bf')) WHERE id=p_emp_id;

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'change_password', 'auth', NULL, '{}'::jsonb);

  RETURN json_build_object('success',true);
END;
$function$;
