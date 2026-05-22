-- ============================================================
-- Security Audit Fixes — 2026-05-22
-- Covers: RLS policy hardening, SECURITY DEFINER function fixes,
--         duplicate policy cleanup, admin-only table lockdown.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FIX: upsert_app_config — missing auth.uid() ownership check
--    Any authenticated user could modify any other user's config.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_app_config(
  p_owner_id        uuid,
  p_is_read_only    boolean DEFAULT NULL,
  p_daily_spend_limit numeric DEFAULT NULL,
  p_session_timeout integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_owner_id THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  INSERT INTO public.app_config(owner_id, is_read_only, daily_spend_limit, session_timeout)
  VALUES (
    p_owner_id,
    COALESCE(p_is_read_only, false),
    COALESCE(p_daily_spend_limit, 0),
    COALESCE(p_session_timeout, 30)
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    is_read_only      = COALESCE(p_is_read_only,      app_config.is_read_only),
    daily_spend_limit = COALESCE(p_daily_spend_limit, app_config.daily_spend_limit),
    session_timeout   = COALESCE(p_session_timeout,   app_config.session_timeout),
    updated_at        = now();
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. FIX: get_worker_advances — no auth check at all
--    Any anonymous caller could read any employee's advances by UUID.
--    Add token validation to match all other worker portal functions.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_worker_advances(emp_id uuid, p_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Supabase-auth caller: must own this employee
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM employees WHERE id = emp_id AND user_id = auth.uid()) THEN
      RETURN '[]'::jsonb;
    END IF;
  ELSE
    -- Worker-portal caller: must present a valid session token
    IF p_token IS NULL THEN
      RETURN '[]'::jsonb;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM employees
      WHERE id = emp_id
        AND worker_session_token = p_token
        AND worker_session_token IS NOT NULL
    ) THEN
      RETURN '[]'::jsonb;
    END IF;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',         a.id,
        'amount',     a.amount,
        'date',       a.date,
        'notes',      a.notes,
        'created_at', a.created_at
      )
    )
    FROM (
      SELECT * FROM advances WHERE employee_id = emp_id ORDER BY date DESC
    ) a
  ), '[]'::jsonb);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. FIX: next_ref_number — no caller ownership check
--    Any authenticated user could increment another user's counters.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_ref_number(p_user_id uuid, p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE new_cnt INT;
BEGIN
  -- Only allow incrementing your own counters (or SECURITY DEFINER trigger context)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  INSERT INTO ref_counters (user_id, prefix, counter)
  VALUES (p_user_id, p_prefix, 1)
  ON CONFLICT (user_id, prefix)
  DO UPDATE SET counter = ref_counters.counter + 1
  RETURNING counter INTO new_cnt;

  RETURN p_prefix || '-' || LPAD(new_cnt::TEXT, 4, '0');
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. FIX: banners — any authenticated user had full write access
--    These are admin-managed rows. Drop the write policy;
--    service_role (used by admin tools) bypasses RLS automatically.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated full access banners" ON public.banners;

-- Read-only access for authenticated users (active banners already public)
-- Retain: "public read active banners"


-- ────────────────────────────────────────────────────────────
-- 5. FIX: products — any authenticated user had full write access
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated full access" ON public.products;

-- Read-only access retained via "public read active" policy


-- ────────────────────────────────────────────────────────────
-- 6. FIX: site_settings — any authenticated user could write;
--         SELECT qual = true exposed all rows publicly including
--         any sensitive settings stored in future.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated write settings" ON public.site_settings;
DROP POLICY IF EXISTS "public read settings"         ON public.site_settings;

-- Restrict reads to authenticated users only
CREATE POLICY "authenticated read settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes remain service_role-only (no client policy)


-- ────────────────────────────────────────────────────────────
-- 7. FIX: signature_log — missing WITH CHECK
--    Without it the USING clause doubled as WITH CHECK, letting a user
--    INSERT a row with an arbitrary owner_id as long as they set
--    signer_id = auth.uid(). Add explicit WITH CHECK.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sig_log_policy" ON public.signature_log;

CREATE POLICY "sig_log_policy"
  ON public.signature_log
  FOR ALL
  USING  ((owner_id = auth.uid()) OR (signer_id = auth.uid()))
  WITH CHECK (owner_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 8. FIX: call_send_push trigger — missing SET search_path
--    A rogue object in an untrusted schema could hijack function calls.
-- ────────────────────────────────────────────────────────────
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
      'Content-Type', 'application/json',
      'x-webhook-secret', current_setting('app.send_push_secret', true)
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


-- ────────────────────────────────────────────────────────────
-- 9. CLEANUP: Remove duplicate policies on profiles
--    "user_profile" and "user_profiles" are identical — keep one.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_profile" ON public.profiles;
-- "user_profiles" (id = auth.uid()) remains


-- ────────────────────────────────────────────────────────────
-- 10. CLEANUP: Remove duplicate policies on team_members
--     "owner_all" and "team_owner_all" are identical — keep one.
--     "member_reads_own" and "member_view" and "team_member_select"
--     all cover SELECT for members — consolidate.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_all"          ON public.team_members;
DROP POLICY IF EXISTS "member_reads_own"   ON public.team_members;
DROP POLICY IF EXISTS "team_member_select" ON public.team_members;
-- "team_owner_all" (owner_id = auth.uid()) remains
-- "member_view"    (member_id = auth.uid() or pending email) remains
-- "member_accept"  (UPDATE for pending invites) remains


-- ────────────────────────────────────────────────────────────
-- 11. FIX: ref_counters — has RLS but zero policies
--     Completely blocked for regular users. Explicitly document that
--     access is intentionally routed through next_ref_number() only.
--     Add a policy that denies direct client access explicitly.
-- ────────────────────────────────────────────────────────────
-- (No policy needed — RLS with no policy = deny-all is intentional.
--  next_ref_number() is SECURITY DEFINER and bypasses RLS.
--  This comment is for documentation purposes only.)
