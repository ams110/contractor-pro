-- =====================================================
-- بصمة العامل (Worker WebAuthn Passkeys)
-- يتيح للعامل تسجيل الدخول لبوّابته بالبصمة/الوجه (passkey حقيقي).
-- منفصل تماماً عن passkey المالك. الجداول تُدار فقط عبر edge functions
-- (service role)؛ لا وصول مباشر للعميل (RLS مُفعّل بلا سياسات عامة).
-- =====================================================

CREATE TABLE IF NOT EXISTS worker_passkey_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,          -- base64url
  public_key    TEXT NOT NULL,                 -- base64 (COSE)
  counter       BIGINT NOT NULL DEFAULT 0,
  device_type   TEXT DEFAULT 'platform',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS worker_passkey_emp_idx ON worker_passkey_credentials (employee_id);

CREATE TABLE IF NOT EXISTS worker_passkey_challenges (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                    -- registration | authentication
  challenge   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (employee_id, type)
);

-- RLS مُفعّل بلا سياسات: لا أحد يصل مباشرةً (الـ edge functions تستعمل service role وتتجاوز RLS)
ALTER TABLE worker_passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_passkey_challenges  ENABLE ROW LEVEL SECURITY;

-- ─── حالة البصمة للعامل (هل سجّل passkey؟) — يُستدعى من البوّابة بعد الدخول ────
CREATE OR REPLACE FUNCTION worker_passkey_status(p_emp_id UUID, p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cnt INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_emp_id AND worker_session_token = p_token) THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;
  SELECT count(*) INTO v_cnt FROM worker_passkey_credentials WHERE employee_id = p_emp_id;
  RETURN json_build_object('enabled', v_cnt > 0, 'count', v_cnt);
END;
$$;

-- ─── إلغاء بصمة العامل ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION worker_remove_passkey(p_emp_id UUID, p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_emp_id AND worker_session_token = p_token) THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;
  DELETE FROM worker_passkey_credentials WHERE employee_id = p_emp_id;
  PERFORM log_worker_activity(
    (SELECT user_id FROM employees WHERE id = p_emp_id), p_emp_id,
    (SELECT name FROM employees WHERE id = p_emp_id),
    'disable_passkey', 'auth', NULL, '{}'::jsonb);
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION worker_passkey_status(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION worker_remove_passkey(UUID, TEXT) TO anon, authenticated;
