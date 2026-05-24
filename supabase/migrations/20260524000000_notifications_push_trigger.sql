-- ────────────────────────────────────────────────────────────────────────────
-- Migration: notifications_push_trigger
-- Purpose:   Wire call_send_push() to the notifications table so that every
--            new notification row automatically fires a web-push to the user.
--
-- Also fixes call_send_push() to embed the shared secret directly instead
-- of reading it from app.send_push_secret (ALTER DATABASE requires superuser).
-- The function body is protected because it is SECURITY DEFINER.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Update call_send_push() with embedded secret
CREATE OR REPLACE FUNCTION public.call_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://rvhjrzbhugvytvktdhor.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', '96527c5283374e7eb34abcbacf05529d06987a2e2f30425e912618a18ce32ee5'
    ),
    body    := jsonb_build_object(
      'user_id', NEW.user_id,
      'title',   NEW.title,
      'body',    NEW.body,
      'type',    NEW.type,
      'url',     '/'
    )
  );
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to notifications table
DROP TRIGGER IF EXISTS on_notification_push ON public.notifications;
CREATE TRIGGER on_notification_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.call_send_push();
