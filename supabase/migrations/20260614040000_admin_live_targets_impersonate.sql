-- =====================================================
-- Admin: live activity feed + signup/subscription alerts + targets + impersonate
-- =====================================================
-- Safe to re-run. كل الدوال SECURITY DEFINER ومحصورة على service_role.

-- ── 1. أعمدة الأهداف + هدف الإشعار على admin_auth ─────────────────────────────
ALTER TABLE admin_auth ADD COLUMN IF NOT EXISTS target_users   int;
ALTER TABLE admin_auth ADD COLUMN IF NOT EXISTS target_mrr     numeric;
ALTER TABLE admin_auth ADD COLUMN IF NOT EXISTS notify_user_id uuid;

-- وجّه تنبيهات الأدمن لحساب المالك (خطة business) افتراضياً
UPDATE admin_auth
SET notify_user_id = (SELECT owner_id FROM organizations WHERE plan = 'business' ORDER BY created_at LIMIT 1)
WHERE id = 1 AND notify_user_id IS NULL;

-- ── 2. سجلّ النشاط الحيّ (تسجيلات + اشتراكات) ─────────────────────────────────
CREATE OR REPLACE FUNCTION admin_activity_feed(p_limit int DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(e) ORDER BY e.at DESC), '[]'::json) INTO result FROM (
    SELECT * FROM (
      SELECT 'signup'::text AS type, COALESCE(p.full_name, '') AS name, au.email, au.created_at AS at, NULL::text AS detail
      FROM auth.users au LEFT JOIN profiles p ON p.id = au.id
      WHERE au.email IS NULL OR au.email NOT ILIKE '%@contractor.app'
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

-- ── 3. تنبيهات فورية للأدمن (تسجيل جديد / اشتراك جديد) ────────────────────────
-- تُدرج إشعاراً لحساب المالك → خطّ الإشعارات + Web Push القائم يوصّلانه فوراً.
-- ⚠️ محميّة بـ EXCEPTION كي لا تُفشل التسجيل/الاشتراك أبداً عند أي خطأ.
CREATE OR REPLACE FUNCTION admin_notify_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    IF NEW.email IS NULL OR NEW.email ILIKE '%@contractor.app' THEN RETURN NEW; END IF;
    SELECT notify_user_id INTO target FROM admin_auth WHERE id = 1;
    IF target IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, read)
      VALUES (target, 'مستخدم جديد 🎉', COALESCE(NEW.email, '') || ' سجّل في المنصّة', 'admin_signup', false);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION admin_notify_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  BEGIN
    SELECT notify_user_id INTO target FROM admin_auth WHERE id = 1;
    IF target IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, read)
      VALUES (target, 'اشتراك جديد 💰', 'اشتراك جديد على خطة ' || COALESCE(NEW.plan, ''), 'admin_subscription', false);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signup_admin_notify ON auth.users;
CREATE TRIGGER on_signup_admin_notify
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION admin_notify_signup();

DROP TRIGGER IF EXISTS on_subscription_admin_notify ON subscriptions;
CREATE TRIGGER on_subscription_admin_notify
  AFTER INSERT ON subscriptions FOR EACH ROW EXECUTE FUNCTION admin_notify_subscription();

-- ── 4. قفل التنفيذ على service_role ───────────────────────────────────────────
REVOKE ALL ON FUNCTION admin_activity_feed(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_activity_feed(int) TO service_role;

NOTIFY pgrst, 'reload schema';
