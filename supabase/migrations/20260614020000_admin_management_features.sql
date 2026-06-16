-- =====================================================
-- Admin management features: deeper stats + user management + broadcast
-- =====================================================
-- كل الدوال SECURITY DEFINER ومحصورة على service_role (تُستدعى من edge `admin-stats`).
-- Safe to re-run (idempotent).

-- ── 1. إحصائيات موسّعة (نشطون + قمع تحويل + نمو يومي) ─────────────────────────
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  result json;
  price_starter numeric := 129; price_pro numeric := 249; price_business numeric := 499;
BEGIN
  WITH real_users AS (
    SELECT * FROM auth.users WHERE email IS NULL OR email NOT ILIKE '%@contractor.app'
  ),
  real_orgs AS (
    SELECT o.* FROM organizations o JOIN real_users ru ON ru.id = o.owner_id
  )
  SELECT json_build_object(
    'users', (
      SELECT json_build_object(
        'total', count(*),
        'new_today', count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
        'new_7d',  count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
        'new_30d', count(*) FILTER (WHERE created_at >= now() - interval '30 days'),
        'confirmed', count(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
        'active_7d',  count(*) FILTER (WHERE last_sign_in_at >= now() - interval '7 days'),
        'active_30d', count(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days')
      ) FROM real_users
    ),
    'plans', (
      SELECT COALESCE(json_agg(json_build_object('plan', plan, 'count', c) ORDER BY c DESC), '[]'::json)
      FROM (SELECT plan, count(*) c FROM real_orgs GROUP BY plan) p
    ),
    'subscriptions', (
      SELECT json_build_object(
        'total', count(*),
        'active', count(*) FILTER (WHERE status = 'active'),
        'trialing', count(*) FILTER (WHERE status = 'trialing'),
        'past_due', count(*) FILTER (WHERE status = 'past_due'),
        'canceled', count(*) FILTER (WHERE status = 'canceled'),
        'paused', count(*) FILTER (WHERE status = 'paused'),
        'mrr', COALESCE(SUM(CASE plan WHEN 'starter' THEN price_starter WHEN 'pro' THEN price_pro WHEN 'business' THEN price_business ELSE 0 END) FILTER (WHERE status = 'active'), 0)
      ) FROM subscriptions
    ),
    'trials', (
      SELECT json_build_object(
        'active', count(*) FILTER (WHERE plan = 'free' AND trial_ends_at > now()),
        'expired', count(*) FILTER (WHERE plan = 'free' AND trial_ends_at <= now())
      ) FROM real_orgs
    ),
    'funnel', json_build_object(
      'signups',   (SELECT count(*) FROM real_users),
      'activated', (SELECT count(*) FROM real_users WHERE email_confirmed_at IS NOT NULL),
      'engaged',   (SELECT count(*) FROM real_users WHERE last_sign_in_at >= now() - interval '30 days'),
      'paying',    (SELECT count(*) FROM subscriptions WHERE status = 'active')
    ),
    'totals', json_build_object(
      'organizations', (SELECT count(*) FROM real_orgs),
      'projects', (SELECT count(*) FROM projects),
      'employees', (SELECT count(*) FROM employees),
      'work_days', (SELECT count(*) FROM work_days),
      'businesses', (SELECT count(*) FROM businesses),
      'team_members', (SELECT count(*) FROM team_members)
    ),
    'signups_monthly', (
      SELECT COALESCE(json_agg(json_build_object('month', to_char(m, 'YYYY-MM'), 'count', COALESCE(u.c, 0)) ORDER BY m), '[]'::json)
      FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      LEFT JOIN (SELECT date_trunc('month', created_at) mth, count(*) c FROM real_users GROUP BY 1) u ON u.mth = m
    ),
    'signups_daily', (
      SELECT COALESCE(json_agg(json_build_object('day', to_char(d, 'MM-DD'), 'count', COALESCE(u.c, 0)) ORDER BY d), '[]'::json)
      FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
      LEFT JOIN (SELECT date_trunc('day', created_at) dy, count(*) c FROM real_users GROUP BY 1) u ON u.dy = d
    ),
    'recent_users', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT au.id, au.email, COALESCE(p.full_name, '') AS name, au.created_at,
               au.email_confirmed_at IS NOT NULL AS confirmed, o.plan, o.trial_ends_at
        FROM real_users au
        LEFT JOIN profiles p ON p.id = au.id
        LEFT JOIN organizations o ON o.owner_id = au.id
        ORDER BY au.created_at DESC LIMIT 25
      ) r
    ),
    'generated_at', now()
  ) INTO result;
  RETURN result;
END;
$$;

-- ── 2. قائمة المستخدمين (بحث) ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_users(p_search text DEFAULT '', p_limit int DEFAULT 100)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result FROM (
    SELECT au.id, au.email, COALESCE(p.full_name, '') AS name, au.created_at,
           au.last_sign_in_at, au.email_confirmed_at IS NOT NULL AS confirmed,
           (au.banned_until IS NOT NULL AND au.banned_until > now()) AS banned,
           o.plan, o.trial_ends_at
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    LEFT JOIN organizations o ON o.owner_id = au.id
    WHERE (au.email IS NULL OR au.email NOT ILIKE '%@contractor.app')
      AND (p_search = '' OR au.email ILIKE '%' || p_search || '%' OR COALESCE(p.full_name,'') ILIKE '%' || p_search || '%')
    ORDER BY au.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 500))
  ) r;
  RETURN result;
END;
$$;

-- ── 3. تفاصيل مستخدم واحد (مع عدّادات استخدامه) ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_user_detail(p_uid uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'id', au.id,
    'email', au.email,
    'name', COALESCE(p.full_name, ''),
    'created_at', au.created_at,
    'last_sign_in_at', au.last_sign_in_at,
    'confirmed', au.email_confirmed_at IS NOT NULL,
    'banned', (au.banned_until IS NOT NULL AND au.banned_until > now()),
    'plan', o.plan,
    'trial_ends_at', o.trial_ends_at,
    'org_name', o.name,
    'counts', json_build_object(
      'projects',     (SELECT count(*) FROM projects     WHERE user_id = p_uid),
      'employees',    (SELECT count(*) FROM employees    WHERE user_id = p_uid),
      'work_days',    (SELECT count(*) FROM work_days    WHERE user_id = p_uid),
      'expenses',     (SELECT count(*) FROM expenses     WHERE user_id = p_uid),
      'businesses',   (SELECT count(*) FROM businesses   WHERE user_id = p_uid),
      'material_logs',(SELECT count(*) FROM material_logs WHERE owner_id = p_uid),
      'team_members', (SELECT count(*) FROM team_members WHERE owner_id = p_uid)
    )
  ) INTO result
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN organizations o ON o.owner_id = au.id
  WHERE au.id = p_uid;
  RETURN result;
END;
$$;

-- ── 4. بثّ إشعار لكل العملاء الحقيقيين ────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_broadcast(p_title text, p_body text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE n int;
BEGIN
  INSERT INTO notifications (user_id, title, body, type, read)
  SELECT au.id, p_title, p_body, 'admin', false
  FROM auth.users au
  WHERE au.email IS NULL OR au.email NOT ILIKE '%@contractor.app';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ── 5. قفل التنفيذ على service_role فقط ───────────────────────────────────────
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_get_stats()', 'admin_list_users(text,int)', 'admin_user_detail(uuid)', 'admin_broadcast(text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
