-- ────────────────────────────────────────────────────────────────────────────
-- Migration: security_hardening
-- Covers:
--   1. login_log table (was referenced in code but never created)
--   2. rate_limits table (for edge-function rate limiting)
--   3. Storage RLS — user-scoped policies for receipts & worker-receipts
-- ────────────────────────────────────────────────────────────────────────────


-- ── 1. login_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  email       TEXT,
  role        TEXT,
  device_info TEXT,
  ip_hint     TEXT,                    -- last 2 octets only, e.g. "*.*.12.34"
  is_new_device BOOLEAN   DEFAULT false,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.login_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_reads_login_log" ON public.login_log
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner_inserts_login_log" ON public.login_log
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR user_id = auth.uid());

-- Index for fast recent-login queries
CREATE INDEX IF NOT EXISTS login_log_owner_logged_at
  ON public.login_log (owner_id, logged_at DESC);

-- Index for device-fingerprint lookups
CREATE INDEX IF NOT EXISTS login_log_device
  ON public.login_log (owner_id, device_info);


-- ── 2. rate_limits ───────────────────────────────────────────────────────────
-- Lightweight request counter used by edge functions.
-- Each row = one request. Old rows are pruned by the cleanup function below.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  action      TEXT        NOT NULL,   -- e.g. 'scan_receipt', 'send_push'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS — accessed only via service-role in edge functions
CREATE INDEX IF NOT EXISTS rate_limits_user_action_ts
  ON public.rate_limits (user_id, action, created_at DESC);

-- Auto-cleanup: delete rows older than 24 hours (runs as a cron or trigger)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
$$;


-- ── 3. Storage RLS — user-scoped access ──────────────────────────────────────
-- Drop the overly-permissive "anyone can read" policies
DROP POLICY IF EXISTS "public_worker_receipt_read" ON storage.objects;
DROP POLICY IF EXISTS "avatar_read"                ON storage.objects;
DROP POLICY IF EXISTS "receipt_read"               ON storage.objects;

-- receipts bucket: owner can only read their own folder (first path segment = user_id)
DROP POLICY IF EXISTS "owner_reads_own_receipts" ON storage.objects;
CREATE POLICY "owner_reads_own_receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- worker-receipts: authenticated users can read (workers upload, managers view)
DROP POLICY IF EXISTS "auth_reads_worker_receipts" ON storage.objects;
CREATE POLICY "auth_reads_worker_receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'worker-receipts'
    AND auth.uid() IS NOT NULL
  );

-- avatars: any authenticated user can read (profile pictures are semi-public)
DROP POLICY IF EXISTS "auth_reads_avatars" ON storage.objects;
CREATE POLICY "auth_reads_avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );
