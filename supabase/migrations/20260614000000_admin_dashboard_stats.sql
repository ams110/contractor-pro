-- =====================================================
-- Admin Dashboard — aggregated platform stats
-- =====================================================
-- دالة تجمّع إحصائيات المنصّة كاملةً (كل العملاء/الاشتراكات/الإيرادات)
-- لمركز قيادة الأدمن. SECURITY DEFINER تتخطّى RLS، لذلك:
--   🔒 محصورة على دور service_role فقط (يُستدعى من edge function `admin-stats`
--      بعد التحقّق من اسم المستخدم/كلمة المرور). ممنوع كشفها لـ anon/authenticated.
-- تستثني حسابات أعضاء الفريق الاصطناعية (@contractor.app) فتعدّ العملاء الحقيقيين فقط.
-- Safe to re-run (idempotent).

CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result json;
  -- أسعار الخطط الشهرية (₪) — مطابقة لـ src/lib/paddle.js (PLAN_META)
  price_starter  numeric := 129;
  price_pro      numeric := 249;
  price_business numeric := 499;
BEGIN
  -- العملاء الحقيقيون فقط (استثناء حسابات أعضاء الفريق الاصطناعية @contractor.app)
  WITH real_users AS (
    SELECT * FROM auth.users WHERE email IS NULL OR email NOT ILIKE '%@contractor.app'
  ),
  real_orgs AS (
    SELECT o.* FROM organizations o JOIN real_users ru ON ru.id = o.owner_id
  )
  SELECT json_build_object(

    -- ── المستخدمون ──────────────────────────────────────────────
    'users', (
      SELECT json_build_object(
        'total',     count(*),
        'new_today', count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
        'new_7d',    count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
        'new_30d',   count(*) FILTER (WHERE created_at >= now() - interval '30 days'),
        'confirmed', count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)
      ) FROM real_users
    ),

    -- ── توزيع الخطط (من المؤسّسات) ───────────────────────────────
    'plans', (
      SELECT COALESCE(json_agg(json_build_object('plan', plan, 'count', c) ORDER BY c DESC), '[]'::json)
      FROM (SELECT plan, count(*) c FROM real_orgs GROUP BY plan) p
    ),

    -- ── الاشتراكات + الإيراد الشهري المتكرّر (MRR) ────────────────
    'subscriptions', (
      SELECT json_build_object(
        'total',     count(*),
        'active',    count(*) FILTER (WHERE status = 'active'),
        'trialing',  count(*) FILTER (WHERE status = 'trialing'),
        'past_due',  count(*) FILTER (WHERE status = 'past_due'),
        'canceled',  count(*) FILTER (WHERE status = 'canceled'),
        'paused',    count(*) FILTER (WHERE status = 'paused'),
        -- MRR = مجموع أسعار الاشتراكات النشطة حسب الخطّة
        'mrr', COALESCE(SUM(
          CASE plan
            WHEN 'starter'  THEN price_starter
            WHEN 'pro'      THEN price_pro
            WHEN 'business' THEN price_business
            ELSE 0
          END
        ) FILTER (WHERE status = 'active'), 0)
      ) FROM subscriptions
    ),

    -- ── التجارب (مؤسّسات على الخطّة المجانية) ────────────────────
    'trials', (
      SELECT json_build_object(
        'active',  count(*) FILTER (WHERE plan = 'free' AND trial_ends_at > now()),
        'expired', count(*) FILTER (WHERE plan = 'free' AND trial_ends_at <= now())
      ) FROM real_orgs
    ),

    -- ── إجماليات الاستخدام عبر المنصّة ───────────────────────────
    'totals', json_build_object(
      'organizations', (SELECT count(*) FROM real_orgs),
      'projects',      (SELECT count(*) FROM projects),
      'employees',     (SELECT count(*) FROM employees),
      'work_days',     (SELECT count(*) FROM work_days),
      'businesses',    (SELECT count(*) FROM businesses),
      'team_members',  (SELECT count(*) FROM team_members)
    ),

    -- ── نمو التسجيلات: آخر 12 شهراً ──────────────────────────────
    'signups_monthly', (
      SELECT COALESCE(json_agg(json_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'count', COALESCE(u.c, 0)
      ) ORDER BY m), '[]'::json)
      FROM generate_series(
        date_trunc('month', now()) - interval '11 months',
        date_trunc('month', now()),
        interval '1 month'
      ) m
      LEFT JOIN (
        SELECT date_trunc('month', created_at) mth, count(*) c
        FROM real_users
        GROUP BY 1
      ) u ON u.mth = m
    ),

    -- ── آخر المسجّلين (أحدث 25) ──────────────────────────────────
    'recent_users', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT
          au.id,
          au.email,
          COALESCE(p.full_name, '') AS name,
          au.created_at,
          au.email_confirmed_at IS NOT NULL AS confirmed,
          o.plan,
          o.trial_ends_at
        FROM real_users au
        LEFT JOIN profiles p      ON p.id = au.id
        LEFT JOIN organizations o ON o.owner_id = au.id
        ORDER BY au.created_at DESC
        LIMIT 25
      ) r
    ),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- 🔒 احصر التنفيذ على service_role فقط (إلغاء الوصول العام/anon/authenticated)
REVOKE ALL ON FUNCTION admin_get_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_stats() FROM anon;
REVOKE ALL ON FUNCTION admin_get_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_stats() TO service_role;

NOTIFY pgrst, 'reload schema';
