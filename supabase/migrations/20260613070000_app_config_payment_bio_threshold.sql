-- حدّ مبلغ يتطلّب تأكيد بصمة عند تسجيل الدفعة (0 = معطّل)
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS payment_bio_threshold numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.upsert_app_config(
  p_owner_id uuid,
  p_is_read_only boolean DEFAULT NULL::boolean,
  p_daily_spend_limit numeric DEFAULT NULL::numeric,
  p_session_timeout integer DEFAULT NULL::integer,
  p_payment_bio_threshold numeric DEFAULT NULL::numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_owner_id THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  INSERT INTO public.app_config(owner_id, is_read_only, daily_spend_limit, session_timeout, payment_bio_threshold)
  VALUES (
    p_owner_id,
    COALESCE(p_is_read_only, false),
    COALESCE(p_daily_spend_limit, 0),
    COALESCE(p_session_timeout, 30),
    COALESCE(p_payment_bio_threshold, 0)
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    is_read_only          = COALESCE(p_is_read_only,          app_config.is_read_only),
    daily_spend_limit     = COALESCE(p_daily_spend_limit,     app_config.daily_spend_limit),
    session_timeout       = COALESCE(p_session_timeout,       app_config.session_timeout),
    payment_bio_threshold = COALESCE(p_payment_bio_threshold, app_config.payment_bio_threshold),
    updated_at            = now();
END;
$function$;
