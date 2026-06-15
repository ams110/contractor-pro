-- =====================================================
-- إثراء رصد البوتات: سبب التصنيف + المزوّد + حالة التأكيد + البيانات + IP/UA best-effort
-- =====================================================

-- ── 1. أعمدة إثراء جديدة ──────────────────────────────────────────────────────
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS reason     text;
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS provider   text;
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS confirmed  boolean;
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS meta       jsonb;
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS ip         text;
ALTER TABLE bot_activity ADD COLUMN IF NOT EXISTS user_agent text;

-- ── 2. سبب التصنيف (أي قاعدة طابقت) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_reason(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_email IS NULL THEN NULL
    WHEN p_email ILIKE 'probe.%@%' THEN 'probe'
    WHEN p_email ILIKE '%+test%@%' THEN 'plus-test'
    WHEN p_email ~* '(^|[._-])(bot|probe|monitor|synthetic|healthcheck|crawler|scanner)([._-]|@)' THEN 'keyword'
    ELSE NULL END;
$$;

-- ── 3. قراءة ترويسات الطلب (best-effort — تُملأ فقط عند المرور عبر PostgREST) ───
CREATE OR REPLACE FUNCTION _req_header(h text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.headers', true)::json ->> h, '');
$$;

CREATE OR REPLACE FUNCTION _req_ip()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(split_part(coalesce(_req_header('x-forwarded-for'), ''), ',', 1), ''),
    _req_header('x-real-ip'),
    inet_client_addr()::text
  );
$$;

-- ── 4. تسجيل: نوسم البوت ونثري السجلّ ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid; is_bot boolean;
BEGIN
  BEGIN
    IF NEW.email IS NULL OR NEW.email ILIKE '%@contractor.app' THEN RETURN NEW; END IF;
    is_bot := is_bot_email(NEW.email);
    IF is_bot THEN
      INSERT INTO bot_activity (email, event, reason, provider, confirmed, meta, ip, user_agent)
      VALUES (NEW.email, 'signup', bot_reason(NEW.email),
              NEW.raw_app_meta_data->>'provider',
              NEW.email_confirmed_at IS NOT NULL,
              NEW.raw_user_meta_data,
              _req_ip(), _req_header('user-agent'));
    END IF;
    SELECT notify_user_id INTO target FROM admin_auth WHERE id = 1;
    IF target IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, read)
      VALUES (
        target,
        CASE WHEN is_bot THEN '🤖 بوت سجّل' ELSE 'مستخدم جديد 🎉' END,
        COALESCE(NEW.email, '') || CASE WHEN is_bot THEN ' (مصنّف كبوت)' ELSE ' سجّل في المنصّة' END,
        CASE WHEN is_bot THEN 'bot_signup' ELSE 'admin_signup' END,
        false
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

-- ── 5. دخول البوت ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_bot_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
       AND NEW.last_sign_in_at IS NOT NULL
       AND is_bot_email(NEW.email) THEN
      INSERT INTO bot_activity (email, event, reason, provider, confirmed, ip, user_agent)
      VALUES (NEW.email, 'login', bot_reason(NEW.email),
              NEW.raw_app_meta_data->>'provider',
              NEW.email_confirmed_at IS NOT NULL,
              _req_ip(), _req_header('user-agent'));
      SELECT notify_user_id INTO target FROM admin_auth WHERE id = 1;
      IF target IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, type, read)
        VALUES (target, '🤖 بوت سجّل دخول', COALESCE(NEW.email, '') || ' دخل المنصّة', 'bot_login', false);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

-- ── 6. محو البوت ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_bot_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    IF is_bot_email(OLD.email) THEN
      INSERT INTO bot_activity (email, event, reason, provider, ip, user_agent)
      VALUES (OLD.email, 'deleted', bot_reason(OLD.email),
              OLD.raw_app_meta_data->>'provider',
              _req_ip(), _req_header('user-agent'));
      SELECT notify_user_id INTO target FROM admin_auth WHERE id = 1;
      IF target IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, type, read)
        VALUES (target, '🤖 بوت انمحى', COALESCE(OLD.email, '') || ' حذف حسابه', 'bot_deleted', false);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN OLD;
END;
$$;

-- ── 7. القائمة للأدمن — مع الحقول المثراة ─────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_bot_activity(p_limit int DEFAULT 50)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.at DESC), '[]'::json) INTO result FROM (
    SELECT email, event, reason, provider, confirmed, ip, user_agent, at
    FROM bot_activity ORDER BY at DESC LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) b;
  RETURN result;
END;
$$;

-- ── 8. تعبئة سبب التصنيف للصفوف القديمة ───────────────────────────────────────
UPDATE bot_activity SET reason = bot_reason(email) WHERE reason IS NULL;

NOTIFY pgrst, 'reload schema';
