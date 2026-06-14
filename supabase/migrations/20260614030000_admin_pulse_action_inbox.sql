-- =====================================================
-- Admin: Platform Pulse inputs + Smart Action Inbox
-- =====================================================
-- توسعة admin_get_stats (دلتا أسبوعية) + دالة admin_action_items (صندوق إجراءات ذكي).
-- كلها SECURITY DEFINER ومحصورة على service_role. Safe to re-run.

-- ── admin_get_stats: إضافة new_prev_7d لحساب اتجاه النمو ───────────────────────
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
        'new_prev_7d', count(*) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days'),
        'new_30d', count(*) FILTER (WHERE created_at >= now() - interval '30 days'),
        'confirmed', count(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
        'active_7d',  count(*) FILTER (WHERE last_sign_in_at >= now() - interval '7 days'),
        'active_30d', count(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days')
      ) FROM real_users
    ),
    'plans', (SELECT COALESCE(json_agg(json_build_object('plan', plan, 'count', c) ORDER BY c DESC), '[]'::json) FROM (SELECT plan, count(*) c FROM real_orgs GROUP BY plan) p),
    'subscriptions', (
      SELECT json_build_object(
        'total', count(*), 'active', count(*) FILTER (WHERE status = 'active'),
        'trialing', count(*) FILTER (WHERE status = 'trialing'), 'past_due', count(*) FILTER (WHERE status = 'past_due'),
        'canceled', count(*) FILTER (WHERE status = 'canceled'), 'paused', count(*) FILTER (WHERE status = 'paused'),
        'mrr', COALESCE(SUM(CASE plan WHEN 'starter' THEN price_starter WHEN 'pro' THEN price_pro WHEN 'business' THEN price_business ELSE 0 END) FILTER (WHERE status = 'active'), 0)
      ) FROM subscriptions
    ),
    'trials', (SELECT json_build_object('active', count(*) FILTER (WHERE plan = 'free' AND trial_ends_at > now()), 'expired', count(*) FILTER (WHERE plan = 'free' AND trial_ends_at <= now())) FROM real_orgs),
    'funnel', json_build_object(
      'signups', (SELECT count(*) FROM real_users),
      'activated', (SELECT count(*) FROM real_users WHERE email_confirmed_at IS NOT NULL),
      'engaged', (SELECT count(*) FROM real_users WHERE last_sign_in_at >= now() - interval '30 days'),
      'paying', (SELECT count(*) FROM subscriptions WHERE status = 'active')
    ),
    'totals', json_build_object(
      'organizations', (SELECT count(*) FROM real_orgs), 'projects', (SELECT count(*) FROM projects),
      'employees', (SELECT count(*) FROM employees), 'work_days', (SELECT count(*) FROM work_days),
      'businesses', (SELECT count(*) FROM businesses), 'team_members', (SELECT count(*) FROM team_members)
    ),
    'signups_monthly', (SELECT COALESCE(json_agg(json_build_object('month', to_char(m, 'YYYY-MM'), 'count', COALESCE(u.c, 0)) ORDER BY m), '[]'::json)
      FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      LEFT JOIN (SELECT date_trunc('month', created_at) mth, count(*) c FROM real_users GROUP BY 1) u ON u.mth = m),
    'signups_daily', (SELECT COALESCE(json_agg(json_build_object('day', to_char(d, 'MM-DD'), 'count', COALESCE(u.c, 0)) ORDER BY d), '[]'::json)
      FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
      LEFT JOIN (SELECT date_trunc('day', created_at) dy, count(*) c FROM real_users GROUP BY 1) u ON u.dy = d),
    'recent_users', (SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) FROM (
        SELECT au.id, au.email, COALESCE(p.full_name, '') AS name, au.created_at,
               au.email_confirmed_at IS NOT NULL AS confirmed, o.plan, o.trial_ends_at
        FROM real_users au LEFT JOIN profiles p ON p.id = au.id LEFT JOIN organizations o ON o.owner_id = au.id
        ORDER BY au.created_at DESC LIMIT 25) r),
    'generated_at', now()
  ) INTO result;
  RETURN result;
END;
$$;

-- ── صندوق الإجراءات الذكي ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_action_items()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  WITH real_users AS (
    SELECT * FROM auth.users WHERE email IS NULL OR email NOT ILIKE '%@contractor.app'
  )
  SELECT json_build_object(
    -- تجارب تنتهي خلال 3 أيام
    'trials_ending', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.trial_ends_at), '[]'::json) FROM (
        SELECT o.owner_id AS id, ru.email, COALESCE(p.full_name,'') AS name, o.trial_ends_at,
               GREATEST(0, EXTRACT(day FROM (o.trial_ends_at - now()))::int) AS days_left
        FROM organizations o JOIN real_users ru ON ru.id = o.owner_id LEFT JOIN profiles p ON p.id = o.owner_id
        WHERE o.plan = 'free' AND o.trial_ends_at > now() AND o.trial_ends_at < now() + interval '3 days'
        LIMIT 15
      ) t
    ),
    -- معرّضون للهجر: لم يدخلوا منذ 14+ يوم
    'churn_risk', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT ru.id, ru.email, COALESCE(p.full_name,'') AS name, ru.last_sign_in_at,
               EXTRACT(day FROM (now() - ru.last_sign_in_at))::int AS days_inactive
        FROM real_users ru LEFT JOIN profiles p ON p.id = ru.id
        WHERE ru.last_sign_in_at IS NOT NULL AND ru.last_sign_in_at < now() - interval '14 days'
              AND (ru.banned_until IS NULL OR ru.banned_until < now())
        ORDER BY ru.last_sign_in_at LIMIT 10
      ) t
    ),
    -- مرشّحون للترقية: استخدام عالٍ على الخطة المجانية
    'upsell', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT * FROM (
          SELECT ru.id, ru.email, COALESCE(p.full_name,'') AS name, o.plan,
            ((SELECT count(*) FROM projects WHERE user_id = ru.id)
            +(SELECT count(*) FROM employees WHERE user_id = ru.id)
            +(SELECT count(*) FROM work_days WHERE user_id = ru.id))::int AS usage
          FROM real_users ru JOIN organizations o ON o.owner_id = ru.id LEFT JOIN profiles p ON p.id = ru.id
          WHERE o.plan = 'free'
        ) x WHERE x.usage > 0 ORDER BY x.usage DESC LIMIT 8
      ) t
    ),
    -- حسابات لم تُفعّل بريدها
    'unconfirmed', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json) FROM (
        SELECT ru.id, ru.email, COALESCE(p.full_name,'') AS name, ru.created_at
        FROM real_users ru LEFT JOIN profiles p ON p.id = ru.id
        WHERE ru.email_confirmed_at IS NULL LIMIT 10
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['admin_get_stats()', 'admin_action_items()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
