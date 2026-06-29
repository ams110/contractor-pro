-- ════════════════════════════════════════════════════════════════════════════
-- إصلاحات أمنية (2026-06-29) — كشفها تدقيق المؤسس الشامل (docs/founder/audit-results)
-- ────────────────────────────────────────────────────────────────────────────
-- ثغرة 1 (كتابة بلا مصادقة): worker_add_material_log كانت تأخذ p_employee_id فقط
--   بلا أي token — أي مهاجم مجهول يعرف UUID عامل (تتسرّب عبر مسارات التخزين) كان
--   يحقن سجلّات بضاعة بحساب المالك ويُغرق إشعاراته. كل دوال worker_* الأخرى تفحص
--   p_token؛ هاي وحدها فاتت. الإصلاح: نضيف p_token ونطبّق نفس نمط token gating.
--   ⚠️ يتطلّب نشر الواجهة الجديدة (تمرّر worker.token) — بدونها يفشل تسجيل البضاعة.
--
-- ثغرة 2 (رفع تخزين مفتوح للمجهول): سياسة رفع دلو worker-receipts كانت
--   WITH CHECK (bucket_id='worker-receipts') فقط — أي زائر مجهول يرفع أي ملف لأي
--   مسار = استنزاف تخزين/كلفة + محتوى ضار. لا يمكن فحص الـ token داخل سياسة التخزين،
--   لكن نقيّد الرفع لمجلّد عامل حقيقي وبوّابته مفتوحة (عبر دالة SECURITY DEFINER،
--   لأنّ anon لا يقرأ employees مباشرةً بسبب RLS). يبقي تدفّق الواجهة الحالي يعمل
--   (يرفع إلى <empId>/...) ويمنع الرفع العشوائي خارج مجلّدات العمّال.
-- ════════════════════════════════════════════════════════════════════════════

-- ── الثغرة 1: token gating لتسجيل البضاعة ───────────────────────────────────
-- نحذف التوقيع القديم المكشوف أولاً (وإلا يبقى overload شغّال بلا token)
DROP FUNCTION IF EXISTS public.worker_add_material_log(uuid, uuid, date, text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.worker_add_material_log(
  p_employee_id uuid,
  p_token       text,
  p_project_id  uuid,
  p_date        date,
  p_item_name   text,
  p_quantity    numeric,
  p_unit        text DEFAULT 'قطعة'::text,
  p_notes       text DEFAULT ''::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE emp employees%ROWTYPE; new_id UUID;
BEGIN
  IF p_item_name IS NULL OR trim(p_item_name) = '' THEN RETURN json_build_object('error', 'اسم المادة مطلوب'); END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN json_build_object('error', 'الكمية يجب أن تكون أكبر من صفر'); END IF;

  SELECT * INTO emp FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'العامل غير موجود'); END IF;
  IF emp.user_id IS NULL THEN RETURN json_build_object('error', 'العامل غير مرتبط بحساب'); END IF;

  -- مصادقة: المالك عبر جلسة Supabase، أو العامل عبر worker_session_token مطابق وغير منتهٍ
  IF auth.uid() IS NOT NULL THEN
    IF emp.user_id <> auth.uid() THEN RETURN json_build_object('error', 'غير مصرّح'); END IF;
  ELSE
    IF p_token IS NULL OR emp.worker_session_token IS NULL OR emp.worker_session_token <> p_token
       OR (emp.worker_session_expires_at IS NOT NULL AND emp.worker_session_expires_at <= now()) THEN
      RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
    END IF;
  END IF;

  IF NOT worker_portal_open(emp.can_access_portal, emp.portal_access_until) THEN RETURN json_build_object('error','🔒 تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل'); END IF;
  IF NOT emp.can_log_materials THEN RETURN json_build_object('error','غير مسموح لك بتسجيل البضاعة'); END IF;
  IF p_project_id IS NOT NULL AND emp.allowed_project_ids IS NOT NULL AND array_length(emp.allowed_project_ids,1) > 0
     AND NOT (p_project_id = ANY(emp.allowed_project_ids)) THEN
    RETURN json_build_object('error','هذا المشروع غير متاح لك');
  END IF;

  INSERT INTO material_logs (owner_id, employee_id, project_id, date, item_name, quantity, unit, notes)
  VALUES (emp.user_id, p_employee_id, p_project_id, COALESCE(p_date, CURRENT_DATE),
    trim(p_item_name), p_quantity, COALESCE(nullif(trim(p_unit), ''), 'قطعة'), COALESCE(p_notes, ''))
  RETURNING id INTO new_id;
  PERFORM log_worker_activity(emp.user_id, p_employee_id, emp.name, 'add_material', 'material', new_id,
    json_build_object('item', trim(p_item_name), 'quantity', p_quantity, 'unit', COALESCE(nullif(trim(p_unit), ''), 'قطعة'))::jsonb);
  RETURN json_build_object('success', true);
END;$function$;

-- ── الثغرة 2: تقييد رفع worker-receipts لمجلّد عامل حقيقي بوّابته مفتوحة ──────
-- دالة مساعدة SECURITY DEFINER: anon لا يقرأ employees مباشرةً (RLS)، فنفحص هنا.
CREATE OR REPLACE FUNCTION public.worker_receipt_folder_ok(p_name text)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id::text = (storage.foldername(p_name))[1]
      AND worker_portal_open(e.can_access_portal, e.portal_access_until)
  );
$function$;

DROP POLICY IF EXISTS "worker_receipts_insert" ON storage.objects;
CREATE POLICY "worker_receipts_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'worker-receipts'
    AND public.worker_receipt_folder_ok(name)
  );
