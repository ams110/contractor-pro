-- ════════════════════════════════════════════════════════════════════════════
-- ميزات ثقة بوّابة العامل (من محاكاة worker-portal 2026-07-03):
--   «مين بيراقب المعلم؟» — نص العمال علّقوا ثقتهم على: اعتراض + سجل تعديلات
--   مرئي + سبب رفض ظاهر + حالة «المعلم شاف طلبك».
-- ────────────────────────────────────────────────────────────────────────────
-- 1) أعمدة: reject_reason / dispute_note / dispute_at / seen_at
-- 2) جدول worker_visible_log + triggers تعديل/حذف يوم العمل (يكتبها المالك)
-- 3) RPC worker_dispute_day (token-gated) — اعتراض العامل + إشعار push للمالك
-- 4) RPC get_worker_edit_log (token-gated) — سجل تعديلات المعلم للعامل
-- 5) تحديث get_worker_days/expenses/payments لإرجاع الحقول الجديدة
--    ⚠️ منسوخة من آخر تعريف (20260612000000_worker_portal_rpc_token_gating)
--    مع الحفاظ على كل الحقول القائمة — لا تُسقط حقلاً (درس get_worker_projects).
-- 6) reject_payment_request(p_reason): يبقى حذفاً (تغييره لـrejected يكسر فلاتر
--    !== 'pending' المالية) لكن يسجّل السبب بسجل العامل المرئي.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. الأعمدة ───────────────────────────────────────────────────────────────
ALTER TABLE public.work_days
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_note  TEXT,
  ADD COLUMN IF NOT EXISTS dispute_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seen_at       TIMESTAMPTZ;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS seen_at       TIMESTAMPTZ;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS seen_at       TIMESTAMPTZ;

-- ── 2. سجل التعديلات المرئي للعامل ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worker_visible_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,                                            -- المالك
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,   -- edit_day | approve_day | reject_day | delete_day | payment_rejected
  day_date    DATE,
  detail      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worker_visible_log_emp ON public.worker_visible_log(employee_id, created_at DESC);
-- RLS بلا سياسات: القراءة فقط عبر RPC الـSECURITY DEFINER بالأسفل
ALTER TABLE public.worker_visible_log ENABLE ROW LEVEL SECURITY;

-- trigger: أي تعديل جوهري من طرف المالك على يوم عامل → صف مرئي للعامل
CREATE OR REPLACE FUNCTION public.log_owner_workday_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.employee_id IS NOT NULL THEN
      INSERT INTO worker_visible_log (user_id, employee_id, action, day_date, detail)
      VALUES (OLD.user_id, OLD.employee_id, 'delete_day', OLD.date,
        jsonb_build_object('amount', OLD.amount, 'day_type', OLD.day_type));
    END IF;
    RETURN OLD;
  END IF;

  -- تجاهل تغييرات حقول الاعتراض/المشاهدة (مصدرها العامل أو فتح الطابور)
  IF NEW.employee_id IS NOT NULL AND (
       (OLD.amount   IS DISTINCT FROM NEW.amount)
    OR (OLD.hours    IS DISTINCT FROM NEW.hours)
    OR (OLD.day_type IS DISTINCT FROM NEW.day_type)
    OR (OLD.date     IS DISTINCT FROM NEW.date)
    OR (OLD.status   IS DISTINCT FROM NEW.status)
  ) THEN
    INSERT INTO worker_visible_log (user_id, employee_id, action, day_date, detail)
    VALUES (NEW.user_id, NEW.employee_id,
      CASE
        WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN 'approve_day'
        WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN 'reject_day'
        ELSE 'edit_day'
      END,
      NEW.date,
      jsonb_strip_nulls(jsonb_build_object(
        'amount',   CASE WHEN OLD.amount   IS DISTINCT FROM NEW.amount   THEN jsonb_build_object('old', OLD.amount,   'new', NEW.amount)   END,
        'hours',    CASE WHEN OLD.hours    IS DISTINCT FROM NEW.hours    THEN jsonb_build_object('old', OLD.hours,    'new', NEW.hours)    END,
        'day_type', CASE WHEN OLD.day_type IS DISTINCT FROM NEW.day_type THEN jsonb_build_object('old', OLD.day_type, 'new', NEW.day_type) END,
        'date',     CASE WHEN OLD.date     IS DISTINCT FROM NEW.date     THEN jsonb_build_object('old', OLD.date,     'new', NEW.date)     END,
        'status',   CASE WHEN OLD.status   IS DISTINCT FROM NEW.status   THEN jsonb_build_object('old', OLD.status,   'new', NEW.status)   END,
        'reason',   NEW.reject_reason
      )));
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_log_owner_workday_change ON public.work_days;
CREATE TRIGGER trg_log_owner_workday_change
  AFTER UPDATE OR DELETE ON public.work_days
  FOR EACH ROW EXECUTE FUNCTION public.log_owner_workday_change();

-- ── 3. اعتراض العامل على يوم مسجّل ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.worker_dispute_day(p_emp_id uuid, p_token text, p_day_id uuid, p_note text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
DECLARE emp employees%ROWTYPE; wd work_days%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id AND worker_session_token = p_token
    AND (worker_session_expires_at IS NULL OR worker_session_expires_at > now());
  IF NOT FOUND THEN RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول'); END IF;
  IF NOT worker_portal_open(emp.can_access_portal, emp.portal_access_until) THEN
    RETURN json_build_object('error', 'تم إيقاف وصولك للبوّابة — تواصل مع صاحب العمل');
  END IF;

  IF p_note IS NULL OR length(trim(p_note)) = 0 THEN
    RETURN json_build_object('error', 'اكتب سبب الاعتراض');
  END IF;
  IF length(p_note) > 300 THEN
    RETURN json_build_object('error', 'الاعتراض طويل — اختصره لأقل من 300 حرف');
  END IF;

  SELECT * INTO wd FROM work_days
  WHERE id = p_day_id AND employee_id = p_emp_id AND user_id = emp.user_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'اليوم غير موجود'); END IF;
  IF wd.dispute_at IS NOT NULL THEN
    RETURN json_build_object('error', 'سبق أن اعترضت على هذا اليوم — المعلم شاف اعتراضك');
  END IF;

  UPDATE work_days SET dispute_note = trim(p_note), dispute_at = now() WHERE id = p_day_id;

  INSERT INTO notifications (user_id, title, body, type, ref_id)
  VALUES (emp.user_id, 'اعتراض على يوم عمل',
    emp.name || ' اعترض على يوم ' || to_char(wd.date, 'DD/MM') || ': ' || trim(p_note),
    'day_dispute', p_day_id);

  PERFORM log_worker_activity(emp.user_id, p_emp_id, emp.name, 'dispute_day', 'work_day', p_day_id,
    json_build_object('date', wd.date, 'note', trim(p_note))::jsonb);

  RETURN json_build_object('success', true);
END;$function$;

-- ── 4. سجل تعديلات المعلم — للعامل (token-gated) ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_worker_edit_log(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id = emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id = emp_id AND worker_session_token = p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(row_json), '[]'::json) INTO result FROM (
    SELECT json_build_object('id', id, 'action', action, 'day_date', day_date,
                             'detail', detail, 'created_at', created_at) AS row_json
    FROM worker_visible_log
    WHERE employee_id = emp_id AND user_id = owner_id
    ORDER BY created_at DESC LIMIT 50
  ) t;
  RETURN result;
END;$$;

-- ── 5. تحديث دوال القراءة (نسخ كامل من 20260612 + الحقول الجديدة فقط) ───────
CREATE OR REPLACE FUNCTION get_worker_days(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',wd.id,'date',wd.date,'day_type',wd.day_type,'hours',wd.hours,
      'amount',wd.amount,'status',COALESCE(wd.status,'approved'),'project_name',p.name,'project_id',wd.project_id,
      'reject_reason',wd.reject_reason,'dispute_note',wd.dispute_note,'dispute_at',wd.dispute_at,
      'seen_at',wd.seen_at,'created_at',wd.created_at)
    ORDER BY wd.date DESC),'[]'::json)
  INTO result FROM work_days wd LEFT JOIN projects p ON p.id=wd.project_id
  WHERE wd.employee_id=emp_id AND wd.user_id=owner_id;
  RETURN result;
END;$$;

CREATE OR REPLACE FUNCTION get_worker_payments(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',p.id,'date',p.date,'amount',p.amount,'method',p.method,
      'status',COALESCE(p.status,'approved'),'notes',p.notes,'project_name',pr.name,
      'seen_at',p.seen_at,'created_at',p.created_at)
    ORDER BY p.date DESC),'[]'::json)
  INTO result FROM payments p LEFT JOIN projects pr ON pr.id=p.project_id
  WHERE p.employee_id=emp_id AND p.user_id=owner_id;
  RETURN result;
END;$$;

CREATE OR REPLACE FUNCTION get_worker_expenses(emp_id UUID, p_token TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; result json;
BEGIN
  SELECT user_id INTO owner_id FROM employees WHERE id=emp_id;
  IF owner_id IS NULL THEN RETURN '[]'::json; END IF;

  IF auth.uid() IS NOT NULL THEN
    IF owner_id <> auth.uid() THEN RETURN '[]'::json; END IF;
  ELSE
    IF p_token IS NULL OR NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id=emp_id AND worker_session_token=p_token AND worker_session_token IS NOT NULL
    ) THEN RETURN '[]'::json; END IF;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object('id',ex.id,'date',ex.date,'amount',ex.amount,'category',ex.category,
      'vendor',ex.vendor,'receipt_url',ex.receipt_url,'status',COALESCE(ex.status,'approved'),
      'project_name',p.name,'project_id',ex.project_id,
      'reject_reason',ex.reject_reason,'seen_at',ex.seen_at,'created_at',ex.created_at)
    ORDER BY ex.date DESC),'[]'::json)
  INTO result FROM expenses ex LEFT JOIN projects p ON p.id=ex.project_id
  WHERE ex.employee_id=emp_id AND ex.user_id=owner_id;
  RETURN result;
END;$$;

-- ── 6. رفض طلب الراتب: يبقى حذفاً + سبب مرئي للعامل ─────────────────────────
-- (تحويله لـ status='rejected' يكسر فلاتر !== 'pending' المالية في
--  FinanceScreen/useDailyDigest ويُدخِل المرفوض في calcPaid)
DROP FUNCTION IF EXISTS public.reject_payment_request(uuid);
CREATE OR REPLACE FUNCTION public.reject_payment_request(p_payment_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pay payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','غير مصرح'); END IF;

  SELECT * INTO pay FROM payments
  WHERE id = p_payment_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RETURN json_build_object('error','الطلب غير موجود'); END IF;

  DELETE FROM payments WHERE id = p_payment_id;

  IF pay.employee_id IS NOT NULL THEN
    INSERT INTO worker_visible_log (user_id, employee_id, action, day_date, detail)
    VALUES (pay.user_id, pay.employee_id, 'payment_rejected', pay.date,
      jsonb_strip_nulls(jsonb_build_object('amount', pay.amount, 'reason', NULLIF(trim(COALESCE(p_reason,'')), ''))));
  END IF;

  RETURN json_build_object('success', true);
END;$$;
