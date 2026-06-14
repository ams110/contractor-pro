-- فرض صلاحيات بوّابة العامل + مفتاح الإيقاف خادمياً داخل دوال worker_*.
-- بدون هذا، إخفاء التبويبات في الواجهة قابل للتجاوز بنداء الـRPC مباشرة.

-- 1) تسجيل الدخول: رفض إذا أُوقفت البوّابة (بعد التحقق من الـcredentials)
CREATE OR REPLACE FUNCTION public.worker_login(p_username text, p_password text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  emp employees%ROWTYPE; new_token TEXT; v_fails INT;
  v_uname TEXT := lower(trim(p_username));
BEGIN
  SELECT count(*) INTO v_fails FROM worker_login_attempts
   WHERE lower(username) = v_uname AND attempted_at > now() - interval '15 minutes';
  IF v_fails >= 8 THEN
    RETURN json_build_object('error','محاولات كثيرة جداً — انتظر 15 دقيقة ثم حاول مجدداً');
  END IF;
  SELECT * INTO emp FROM employees
  WHERE lower(worker_username) = v_uname
    AND worker_password_hash = crypt(p_password, worker_password_hash);
  IF NOT FOUND THEN
    INSERT INTO worker_login_attempts(username) VALUES (v_uname);
    DELETE FROM worker_login_attempts WHERE attempted_at < now() - interval '1 day';
    RETURN json_build_object('error','اسم المستخدم أو كلمة المرور غير صحيحة');
  END IF;
  IF NOT emp.can_access_portal THEN
    RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل');
  END IF;
  DELETE FROM worker_login_attempts WHERE lower(username) = v_uname;
  new_token := gen_random_uuid()::text;
  UPDATE employees SET worker_session_token = new_token,
         worker_session_expires_at = now() + interval '24 hours' WHERE id = emp.id;
  PERFORM log_worker_activity(emp.user_id, emp.id, emp.name, 'login', 'auth', NULL,
    json_build_object('method','password')::jsonb);
  RETURN json_build_object('id',emp.id,'name',emp.name,'specialization',emp.specialization,
    'daily_rate',emp.daily_rate,'status',emp.status,'token',new_token);
END;$function$;

-- 2) تسجيل يوم عمل (النسخة القديمة بلا location)
CREATE OR REPLACE FUNCTION public.worker_submit_day(p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_day_type text, p_hours numeric DEFAULT 8, p_custom_amount numeric DEFAULT NULL::numeric)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; calculated_amount NUMERIC; proj_name TEXT; new_day_id UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id=p_emp_id AND worker_session_token=p_token;
  IF NOT FOUND THEN RETURN json_build_object('error','جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT emp.can_access_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_submit_workday THEN RETURN json_build_object('error','غير مسموح لك بتسجيل أيام العمل'); END IF;
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id=p_project_id AND user_id=emp.user_id) THEN
    RETURN json_build_object('error','المشروع غير موجود');
  END IF;
  IF EXISTS (SELECT 1 FROM work_days WHERE employee_id=p_emp_id AND date=p_date) THEN
    RETURN json_build_object('error','يوجد يوم عمل مسجل بهذا التاريخ مسبقاً');
  END IF;
  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم','نصف') THEN calculated_amount := emp.daily_rate * 0.5;
  ELSE calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours,8), 2);
  END IF;
  SELECT name INTO proj_name FROM projects WHERE id=p_project_id;
  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending')
  RETURNING id INTO new_day_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب حضور جديد 📅',
    emp.name || ' • ' || COALESCE(proj_name,'?') || ' • ' || to_char(p_date,'DD/MM/YYYY') || ' • ' || calculated_amount || '₪',
    'pending_day', new_day_id);
  RETURN json_build_object('success',true,'amount',calculated_amount);
END;$function$;

-- 3) تسجيل يوم عمل (النسخة الحالية مع location)
CREATE OR REPLACE FUNCTION public.worker_submit_day(p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_day_type text, p_hours numeric DEFAULT 8, p_custom_amount numeric DEFAULT NULL::numeric, p_location text DEFAULT NULL::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; calculated_amount NUMERIC; proj_name TEXT; new_day_id UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT emp.can_access_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_submit_workday THEN RETURN json_build_object('error','غير مسموح لك بتسجيل أيام العمل'); END IF;
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
    RETURN json_build_object('error', 'المشروع غير موجود');
  END IF;
  IF EXISTS (SELECT 1 FROM work_days WHERE employee_id = p_emp_id AND date = p_date AND day_type = p_day_type) THEN
    RETURN json_build_object('error', 'يوجد يوم عمل من نفس النوع مسجل بهذا التاريخ مسبقاً');
  END IF;
  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN calculated_amount := p_custom_amount;
  ELSIF p_day_type = 'كامل' THEN calculated_amount := emp.daily_rate;
  ELSIF p_day_type IN ('نص يوم', 'نصف') THEN calculated_amount := emp.daily_rate * 0.5;
  ELSE calculated_amount := ROUND((emp.daily_rate / 8.0) * COALESCE(p_hours, 8), 2);
  END IF;
  INSERT INTO work_days (user_id, employee_id, project_id, date, day_type, hours, amount, status, location)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_day_type, p_hours, calculated_amount, 'pending', p_location)
  RETURNING id INTO new_day_id;
  SELECT name INTO proj_name FROM projects WHERE id = p_project_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب يوم عمل جديد',
    emp.name || ' — ' || p_day_type || COALESCE(' · ' || proj_name, ''), 'pending_day', new_day_id);
  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'submit_day', 'work_day', new_day_id,
    json_build_object('date', p_date, 'day_type', p_day_type, 'amount', calculated_amount,
                      'project', proj_name, 'location', p_location)::jsonb);
  RETURN json_build_object('success', true, 'amount', calculated_amount);
END;$function$;

-- 4) تسجيل مصروف (النسخة القديمة بلا receipt_url)
CREATE OR REPLACE FUNCTION public.worker_submit_expense(p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_amount numeric, p_category text, p_vendor text DEFAULT ''::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; proj_name TEXT; new_id UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id = p_emp_id AND worker_session_token = p_token;
  IF NOT FOUND THEN RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT emp.can_access_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_submit_expenses THEN RETURN json_build_object('error','غير مسموح لك بتسجيل المصاريف'); END IF;
  IF p_amount <= 0 THEN RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر'); END IF;
  IF p_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = emp.user_id) THEN
      RETURN json_build_object('error', 'المشروع غير موجود');
    END IF;
    SELECT name INTO proj_name FROM projects WHERE id = p_project_id;
  END IF;
  INSERT INTO expenses (user_id, employee_id, project_id, date, amount, category, vendor, payment_method, status)
  VALUES (emp.user_id, p_emp_id, p_project_id, p_date, p_amount, p_category, p_vendor, 'كاش', 'pending')
  RETURNING id INTO new_id;
  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'طلب مصروف جديد 💸',
    emp.name || ' • ' || p_category || ' • ' || COALESCE(proj_name, '') || ' • ' || p_amount || '₪',
    'pending_expense', new_id);
  RETURN json_build_object('success', true, 'amount', p_amount);
END;$function$;

-- 5) تسجيل مصروف (النسخة الحالية مع receipt_url)
CREATE OR REPLACE FUNCTION public.worker_submit_expense(p_emp_id uuid, p_token text, p_project_id uuid, p_date date, p_amount numeric, p_category text, p_vendor text DEFAULT ''::text, p_receipt_url text DEFAULT ''::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; proj_name TEXT; new_id UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT emp.can_access_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_submit_expenses THEN RETURN json_build_object('error','غير مسموح لك بتسجيل المصاريف'); END IF;
  IF p_amount <= 0 THEN RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر'); END IF;
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
  VALUES (emp.user_id, 'طلب مصروف جديد 💸',
    emp.name || ' • ' || p_category || ' • ' || COALESCE(proj_name, '') || ' • ' || p_amount || '₪',
    'pending_expense', new_id);
  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'submit_expense', 'expense', new_id,
    json_build_object('date', p_date, 'amount', p_amount, 'category', p_category,
                      'vendor', p_vendor, 'project', proj_name)::jsonb);
  RETURN json_build_object('success', true, 'amount', p_amount);
END;$function$;

-- 6) طلب راتب
CREATE OR REPLACE FUNCTION public.worker_request_payment(p_emp_id uuid, p_token text, p_amount numeric, p_project_id uuid DEFAULT NULL::uuid, p_method text DEFAULT 'كاش'::text, p_notes text DEFAULT ''::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE; proj_name TEXT; new_id UUID;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT emp.can_access_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_request_payment THEN RETURN json_build_object('error','غير مسموح لك بطلب راتب'); END IF;
  IF p_amount <= 0 THEN RETURN json_build_object('error', 'المبلغ يجب أن يكون أكبر من صفر'); END IF;
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
  VALUES (emp.user_id, 'طلب راتب جديد 💰',
    emp.name || ' يطلب ' || p_amount || '₪' ||
      CASE WHEN proj_name IS NOT NULL THEN ' من مشروع ' || proj_name ELSE '' END ||
      CASE WHEN p_notes <> '' THEN ' • ' || p_notes ELSE '' END,
    'pending_payment', new_id);
  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'request_payment', 'payment', new_id,
    json_build_object('amount', p_amount, 'method', p_method, 'project', proj_name, 'notes', p_notes)::jsonb);
  RETURN json_build_object('success', true, 'id', new_id);
END;$function$;

-- 7) طلب سلفة
CREATE OR REPLACE FUNCTION public.worker_request_advance(p_emp_id uuid, p_token text, p_amount numeric, p_notes text DEFAULT ''::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token
    AND worker_session_token IS NOT NULL
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'غير مصرح'); END IF;
  IF NOT emp.can_access_portal THEN RETURN jsonb_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_request_payment THEN RETURN jsonb_build_object('error','غير مسموح لك بطلب سلفة'); END IF;
  IF p_amount <= 0 OR p_amount > 999999 THEN RETURN jsonb_build_object('error', 'مبلغ غير صالح'); END IF;
  IF (SELECT COUNT(*) FROM worker_advance_requests WHERE employee_id = p_emp_id AND status = 'pending') >= 1 THEN
    RETURN jsonb_build_object('error', 'لديك طلب سلفة معلق — انتظر موافقة المشرف أولاً');
  END IF;
  INSERT INTO worker_advance_requests (owner_id, employee_id, amount, notes)
  VALUES (emp.user_id, p_emp_id, p_amount, p_notes);
  INSERT INTO notifications (user_id, title, body, type)
  VALUES (emp.user_id, 'طلب سلفة جديد',
    emp.name || ' يطلب سلفة ' || p_amount || '₪' ||
      CASE WHEN p_notes <> '' THEN ' • ' || p_notes ELSE '' END, 'pending_advance');
  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'request_advance', 'advance', NULL,
    json_build_object('amount', p_amount, 'notes', p_notes)::jsonb);
  RETURN jsonb_build_object('ok', true);
END;$function$;

-- 8) تسجيل بضاعة (بلا token — يقرأ صف العامل)
CREATE OR REPLACE FUNCTION public.worker_add_material_log(p_employee_id uuid, p_project_id uuid, p_date date, p_item_name text, p_quantity numeric, p_unit text DEFAULT 'قطعة'::text, p_notes text DEFAULT ''::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_owner_id UUID; v_name TEXT; v_can_log BOOLEAN; v_portal BOOLEAN; new_id UUID;
BEGIN
  IF p_item_name IS NULL OR trim(p_item_name) = '' THEN
    RETURN json_build_object('error', 'اسم المادة مطلوب');
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN json_build_object('error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;
  SELECT user_id, name, can_log_materials, can_access_portal
    INTO v_owner_id, v_name, v_can_log, v_portal FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'العامل غير موجود'); END IF;
  IF v_owner_id IS NULL THEN RETURN json_build_object('error', 'العامل غير مرتبط بحساب'); END IF;
  IF NOT v_portal THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT v_can_log THEN RETURN json_build_object('error','غير مسموح لك بتسجيل البضاعة'); END IF;
  INSERT INTO material_logs (owner_id, employee_id, project_id, date, item_name, quantity, unit, notes)
  VALUES (v_owner_id, p_employee_id, p_project_id, COALESCE(p_date, CURRENT_DATE),
    trim(p_item_name), p_quantity, COALESCE(nullif(trim(p_unit), ''), 'قطعة'), COALESCE(p_notes, ''))
  RETURNING id INTO new_id;
  PERFORM log_worker_activity(v_owner_id, p_employee_id, v_name, 'add_material', 'material', new_id,
    json_build_object('item', trim(p_item_name), 'quantity', p_quantity,
                      'unit', COALESCE(nullif(trim(p_unit), ''), 'قطعة'))::jsonb);
  RETURN json_build_object('success', true);
END;$function$;
