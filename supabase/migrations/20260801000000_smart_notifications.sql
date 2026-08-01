-- ────────────────────────────────────────────────────────────────────────────
-- Migration: smart_notifications
-- الغرض: نظام إشعارات أكفأ وأذكى
--   1. فهارس مركّبة — كل استعلامات الإشعارات كانت seq scan
--   2. جدول notification_prefs — الـpush الخلفي يحترم كتم المستخدم وساعات هدوئه
--      (قبل، التفضيلات كانت localStorage فقط فالـtrigger كان يبعت رغم الكتم)
--   3. call_send_push() يفلتر حسب التفضيلات + يمرّر الأولوية والوجهة للـSW
--   4. تنظيف دوري للإشعارات القديمة — الجدول كان ينمو بلا سقف
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. فهارس ────────────────────────────────────────────────────────────────
-- قائمة الإشعارات: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- منع التكرار: WHERE user_id = ? AND type = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);

-- عدّاد غير المقروء (جزئي — يغطّي الصفوف غير المقروءة فقط، فهرس صغير)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id) WHERE read = false;

-- إرسال الـpush: WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);


-- ── 2. تفضيلات الإشعارات ────────────────────────────────────────────────────
-- المجموعات: requests · money · insights · system  (مطابقة NOTIF_GROUPS في
-- src/lib/notifications.js — هي المصدر الوحيد لأسماء المجموعات).
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_groups      TEXT[]  NOT NULL DEFAULT '{}',
  quiet_enabled     BOOLEAN NOT NULL DEFAULT true,
  quiet_start       SMALLINT NOT NULL DEFAULT 22 CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end         SMALLINT NOT NULL DEFAULT 7  CHECK (quiet_end   BETWEEN 0 AND 23),
  -- إزاحة توقيت المستخدم بالدقائق (إسرائيل +120/+180) — بلاها ساعات الهدوء
  -- تُحسب بـUTC فيوصل الإشعار الساعة ٤ الفجر محليّاً.
  tz_offset_minutes SMALLINT NOT NULL DEFAULT 180,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notification_prefs" ON public.notification_prefs;
CREATE POLICY "own_notification_prefs" ON public.notification_prefs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ── 3. أولوية كل نوع + مجموعته (مرآة NOTIF_TYPES في الفرونت) ────────────────
CREATE OR REPLACE FUNCTION public.notif_group(p_type TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_type IN ('pending_day','pending_expense','pending_payment',
                    'advance_request','material_log','stale_pending') THEN 'requests'
    WHEN p_type IN ('salary_overdue','patur_cap_70','patur_cap_90',
                    'overdue_receipt','warning')                      THEN 'money'
    WHEN p_type IN ('daily_digest','insight','info')                  THEN 'insights'
    WHEN p_type IN ('subscription','payment_failed','team','broadcast') THEN 'system'
    ELSE 'insights'
  END;
$$;

CREATE OR REPLACE FUNCTION public.notif_priority(p_type TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_type IN ('salary_overdue','patur_cap_90','payment_failed') THEN 'critical'
    WHEN p_type IN ('pending_day','pending_expense','pending_payment','advance_request',
                    'stale_pending','patur_cap_70','overdue_receipt','subscription',
                    'warning')                                        THEN 'high'
    WHEN p_type IN ('daily_digest','insight','info')                  THEN 'low'
    ELSE 'normal'
  END;
$$;

-- الشاشة اللي يفتحها نقر الإشعار (يمرّرها الـSW للتطبيق)
CREATE OR REPLACE FUNCTION public.notif_screen(p_type TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_type = 'pending_day'                        THEN 'workdays'
    WHEN p_type = 'pending_expense'                    THEN 'expenses'
    WHEN p_type IN ('pending_payment','advance_request') THEN 'payments'
    WHEN p_type = 'material_log'                       THEN 'materials'
    WHEN p_type = 'stale_pending'                      THEN 'workdays'
    WHEN p_type = 'salary_overdue'                     THEN 'workers'
    WHEN p_type IN ('patur_cap_70','patur_cap_90','overdue_receipt') THEN 'finance'
    WHEN p_type = 'daily_digest'                       THEN 'dashboard'
    WHEN p_type IN ('subscription','payment_failed')   THEN 'settings'
    WHEN p_type = 'team'                               THEN 'team'
    ELSE NULL
  END;
$$;


-- ── 4. trigger الـpush الذكي ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.call_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefs    public.notification_prefs%ROWTYPE;
  v_group    TEXT := public.notif_group(NEW.type);
  v_priority TEXT := public.notif_priority(NEW.type);
  v_hour     INT;
  v_quiet    BOOLEAN := false;
  v_unread   INT;
BEGIN
  -- الملخّصات والرؤى تُقرأ داخل التطبيق — ما بتستاهل رنّة على الجوّال
  IF v_group = 'insights' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_prefs FROM public.notification_prefs WHERE user_id = NEW.user_id;

  IF FOUND THEN
    -- المجموعة مكتومة → لا push (الإشعار بيضل بالتطبيق)
    IF v_group = ANY (v_prefs.muted_groups) THEN
      RETURN NEW;
    END IF;

    -- ساعات الهدوء بتوقيت المستخدم المحلّي، مع دعم المدى العابر لمنتصف الليل
    IF v_prefs.quiet_enabled AND v_prefs.quiet_start <> v_prefs.quiet_end THEN
      v_hour := EXTRACT(HOUR FROM (now() + make_interval(mins => v_prefs.tz_offset_minutes)));
      v_quiet := CASE
        WHEN v_prefs.quiet_start < v_prefs.quiet_end
          THEN v_hour >= v_prefs.quiet_start AND v_hour < v_prefs.quiet_end
        ELSE v_hour >= v_prefs.quiet_start OR  v_hour < v_prefs.quiet_end
      END;
    END IF;

    -- الحرِج يخترق الهدوء (راتب متأخّر · تجاوز سقف · فشل دفع)
    IF v_quiet AND v_priority <> 'critical' THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT count(*) INTO v_unread
    FROM public.notifications WHERE user_id = NEW.user_id AND read = false;

  PERFORM net.http_post(
    url     := 'https://rvhjrzbhugvytvktdhor.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', '96527c5283374e7eb34abcbacf05529d06987a2e2f30425e912618a18ce32ee5'
    ),
    body    := jsonb_build_object(
      'user_id',    NEW.user_id,
      'title',      NEW.title,
      'body',       NEW.body,
      'type',       NEW.type,
      'priority',   v_priority,
      'screen',     public.notif_screen(NEW.type),
      'badgeCount', v_unread,
      'url',        '/'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_push ON public.notifications;
CREATE TRIGGER on_notification_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.call_send_push();


-- ── 5. تنظيف الإشعارات القديمة ──────────────────────────────────────────────
-- الجدول كان ينمو بلا سقف. القاعدة: المقروء يُحذف بعد 30 يوم، وأي إشعار
-- بعد 120 يوم مهما كان. تُستدعى من pg_cron إن كان مفعّلاً، أو يدوياً.
CREATE OR REPLACE FUNCTION public.prune_old_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted INT;
BEGIN
  DELETE FROM public.notifications
   WHERE (read = true  AND created_at < now() - INTERVAL '30 days')
      OR (created_at < now() - INTERVAL '120 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_old_notifications() FROM PUBLIC, anon, authenticated;

-- جدولة يومية 03:15 UTC إن كان pg_cron متاحاً (لا نكسر الـmigration إن لم يكن)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune_notifications')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_notifications');
    PERFORM cron.schedule('prune_notifications', '15 3 * * *',
                          'SELECT public.prune_old_notifications()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;


-- ── 6. تنظيف الإيموجي من عناوين إشعارات الـRPCs ─────────────────────────────
-- قاعدة المشروع: أيقونات Lucide فقط، ممنوع إيموجي في UI (§19). لوحة الإشعارات
-- صارت تعرض أيقونة ملوّنة لكل نوع، فالإيموجي بالعنوان صار تكراراً.
UPDATE public.notifications
   SET title = btrim(regexp_replace(title, '[\U0001F300-\U0001FAFF☀-➿]', '', 'g'))
 WHERE title ~ '[\U0001F300-\U0001FAFF☀-➿]';

-- ونمنعها من الدخول أصلاً — أنظف من تعديل كل RPC يكتب إشعاراً (worker_submit_day
-- / worker_submit_expense / worker_request_payment...)، ويغطّي أي مصدر جديد.
CREATE OR REPLACE FUNCTION public.strip_notification_emoji()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.title := btrim(regexp_replace(NEW.title, '[\U0001F300-\U0001FAFF☀-➿]', '', 'g'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_strip_emoji ON public.notifications;
CREATE TRIGGER on_notification_strip_emoji
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_notification_emoji();
