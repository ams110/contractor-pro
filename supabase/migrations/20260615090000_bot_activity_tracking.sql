-- =====================================================
-- رصد البوتات: تتبّع دورة حياتها الكاملة (تسجيل / دخول / محو) وتصنيفها
-- =====================================================
-- لا نتجاهلها — نُبقي التنبيه، لكن نوسمها كبوت ونحفظها بقائمة دائمة
-- (حتى لو محت نفسها يبقى الأثر). كله service_role فقط.

-- ── 1. كاشف نمط البوت ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_bot_email(p_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_email IS NOT NULL AND (
       p_email ILIKE 'probe.%@%'
    OR p_email ILIKE '%+test%@%'
    OR p_email ~* '(^|[._-])(bot|probe|monitor|synthetic|healthcheck|crawler|scanner)([._-]|@)'
  );
$$;

-- ── 2. قائمة نشاط البوتات الدائمة ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_activity (
  id    bigserial PRIMARY KEY,
  email text,
  event text NOT NULL,                 -- 'signup' | 'login' | 'deleted'
  at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bot_activity_at_idx ON bot_activity (at DESC);
ALTER TABLE bot_activity ENABLE ROW LEVEL SECURITY;  -- بلا policies = service_role فقط

-- ── 3. تسجيل جديد: نُبقي التنبيه لكن نوسم البوت ونحفظه ─────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid; is_bot boolean;
BEGIN
  BEGIN
    IF NEW.email IS NULL OR NEW.email ILIKE '%@contractor.app' THEN RETURN NEW; END IF;
    is_bot := is_bot_email(NEW.email);
    IF is_bot THEN
      INSERT INTO bot_activity (email, event) VALUES (NEW.email, 'signup');
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

-- ── 4. تسجيل دخول البوت (تغيّر last_sign_in_at) ────────────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_bot_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
       AND NEW.last_sign_in_at IS NOT NULL
       AND is_bot_email(NEW.email) THEN
      INSERT INTO bot_activity (email, event) VALUES (NEW.email, 'login');
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

-- ── 5. محو البوت لنفسه ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_notify_bot_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    IF is_bot_email(OLD.email) THEN
      INSERT INTO bot_activity (email, event) VALUES (OLD.email, 'deleted');
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

DROP TRIGGER IF EXISTS on_bot_login_notify ON auth.users;
CREATE TRIGGER on_bot_login_notify
  AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION admin_notify_bot_login();

DROP TRIGGER IF EXISTS on_bot_delete_notify ON auth.users;
CREATE TRIGGER on_bot_delete_notify
  BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION admin_notify_bot_delete();

-- ── 6. السجلّ الحيّ البشري يستثني البوتات (تبقى بقائمتها الخاصة) ────────────────
CREATE OR REPLACE FUNCTION admin_activity_feed(p_limit int DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(e) ORDER BY e.at DESC), '[]'::json) INTO result FROM (
    SELECT * FROM (
      SELECT 'signup'::text AS type, COALESCE(p.full_name, '') AS name, au.email, au.created_at AS at, NULL::text AS detail
      FROM auth.users au LEFT JOIN profiles p ON p.id = au.id
      WHERE (au.email IS NULL OR au.email NOT ILIKE '%@contractor.app') AND NOT is_bot_email(au.email)
      UNION ALL
      SELECT 'subscription'::text AS type, COALESCE(p.full_name, '') AS name, au.email, s.created_at AS at, s.plan AS detail
      FROM subscriptions s LEFT JOIN auth.users au ON au.id = s.user_id LEFT JOIN profiles p ON p.id = s.user_id
    ) all_events
    ORDER BY at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ) e;
  RETURN result;
END;
$$;

-- ── 7. قائمة نشاط البوتات للأدمن ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_bot_activity(p_limit int DEFAULT 50)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.at DESC), '[]'::json) INTO result FROM (
    SELECT email, event, at FROM bot_activity ORDER BY at DESC LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) b;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_bot_activity(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_bot_activity(int) TO service_role;

-- ── 8. التقاط البوت الذي سبق ورصدناه (probe من 06-15) أثرياً ───────────────────
INSERT INTO bot_activity (email, event, at)
SELECT 'probe.1781498807504@gmail.com', 'signup', '2026-06-15 04:46:48+00'
WHERE NOT EXISTS (SELECT 1 FROM bot_activity WHERE email = 'probe.1781498807504@gmail.com');

NOTIFY pgrst, 'reload schema';
