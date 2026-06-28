-- ════════════════════════════════════════════════════════════════════
-- استعلامات المنتور — الأرقام الحقيقية لكبلان من Supabase
-- المشروع: rvhjrzbhugvytvktdhor
-- قاعدة: تستثني كل الحسابات الداخلية (المؤسس + الديمو + QA + أعضاء الفريق tm_)
-- كل رقم من هون = حقيقي. ممنوع اختراع أي رقم خارج هالاستعلامات.
-- ════════════════════════════════════════════════════════════════════

-- فلتر الحسابات الداخلية المشترك (استعمله بكل استعلام):
--   email NOT ILIKE 'a.m.shaqra20100@%'
--   AND email NOT ILIKE 'demo.reel@%'
--   AND email NOT ILIKE 'qa.admin@%'
--   AND email NOT ILIKE 'qa.tester@%'
--   AND split_part(email,'@',1) NOT LIKE 'tm_%'

-- ── ① اللوحة الرئيسية: تسجيلات + تفعيل + دفع ──────────────────────────
WITH ext AS (
  SELECT id, email, created_at, email_confirmed_at
  FROM auth.users
  WHERE email NOT ILIKE 'a.m.shaqra20100@%'
    AND email NOT ILIKE 'demo.reel@%'
    AND email NOT ILIKE 'qa.admin@%'
    AND email NOT ILIKE 'qa.tester@%'
    AND split_part(email,'@',1) NOT LIKE 'tm_%'
)
SELECT
  (SELECT COUNT(*) FROM ext WHERE created_at > now() - interval '24 hours')           AS signups_24h,
  (SELECT COUNT(*) FROM ext WHERE created_at > now() - interval '7 days')             AS signups_7d,
  (SELECT COUNT(*) FROM ext WHERE created_at > now() - interval '30 days')            AS signups_30d,
  (SELECT COUNT(*) FROM ext)                                                          AS total_external_users,
  (SELECT COUNT(*) FROM ext WHERE email_confirmed_at IS NOT NULL)                     AS confirmed_users,
  (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active','trialing'))          AS paying_subs,
  (SELECT COUNT(DISTINCT b.user_id) FROM businesses b JOIN ext ON ext.id=b.user_id)   AS users_with_business,
  (SELECT COUNT(DISTINCT e.user_id) FROM employees e JOIN ext ON ext.id=e.user_id)    AS users_with_worker,
  (SELECT COUNT(DISTINCT e.user_id) FROM employees e JOIN ext ON ext.id=e.user_id
     WHERE EXISTS (SELECT 1 FROM work_days w WHERE w.user_id=e.user_id))              AS users_activated;
-- نسبة التفعيل = users_with_worker ÷ total_external_users

-- ── ② قمع التفعيل خطوة بخطوة (لتشخيص أين يتسرّب الناس) ────────────────
WITH ext AS (
  SELECT id FROM auth.users
  WHERE email NOT ILIKE 'a.m.shaqra20100@%' AND email NOT ILIKE 'demo.reel@%'
    AND email NOT ILIKE 'qa.admin@%' AND email NOT ILIKE 'qa.tester@%'
    AND split_part(email,'@',1) NOT LIKE 'tm_%'
)
SELECT
  (SELECT COUNT(*) FROM ext)                                                                       AS step0_signed_up,
  (SELECT COUNT(*) FROM ext e WHERE EXISTS(SELECT 1 FROM auth.users u WHERE u.id=e.id AND u.email_confirmed_at IS NOT NULL)) AS step1_confirmed_email,
  (SELECT COUNT(DISTINCT b.user_id) FROM businesses b JOIN ext ON ext.id=b.user_id)                AS step2_created_business,
  (SELECT COUNT(DISTINCT p.user_id) FROM projects p JOIN ext ON ext.id=p.user_id)                  AS step3_created_project,
  (SELECT COUNT(DISTINCT e2.user_id) FROM employees e2 JOIN ext ON ext.id=e2.user_id)              AS step4_added_worker,
  (SELECT COUNT(DISTINCT w.user_id) FROM work_days w JOIN ext ON ext.id=w.user_id)                 AS step5_logged_workday;

-- ── ③ المستخدمون العالقون (مؤكَّد بريدهم + >يومين + 0 عامل) ───────────
WITH ext AS (
  SELECT id, email, created_at, email_confirmed_at FROM auth.users
  WHERE email NOT ILIKE 'a.m.shaqra20100@%' AND email NOT ILIKE 'demo.reel@%'
    AND email NOT ILIKE 'qa.admin@%' AND email NOT ILIKE 'qa.tester@%'
    AND split_part(email,'@',1) NOT LIKE 'tm_%'
)
SELECT ext.email, p.full_name, ext.created_at,
       date_part('day', now() - ext.created_at) AS days_since_signup,
       EXISTS(SELECT 1 FROM businesses b WHERE b.user_id=ext.id) AS has_business,
       EXISTS(SELECT 1 FROM projects  pr WHERE pr.user_id=ext.id) AS has_project
FROM ext LEFT JOIN profiles p ON p.id=ext.id
WHERE ext.email_confirmed_at IS NOT NULL
  AND ext.created_at < now() - interval '2 days'
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id=ext.id)
ORDER BY ext.created_at DESC;

-- ── ④ آخر المسجّلين (آخر 14 يوم) لقراءة الزخم ────────────────────────
SELECT u.email, p.full_name, u.created_at, u.email_confirmed_at IS NOT NULL AS confirmed
FROM auth.users u LEFT JOIN profiles p ON p.id=u.id
WHERE u.email NOT ILIKE 'a.m.shaqra20100@%' AND u.email NOT ILIKE 'demo.reel@%'
  AND u.email NOT ILIKE 'qa.admin@%' AND u.email NOT ILIKE 'qa.tester@%'
  AND split_part(u.email,'@',1) NOT LIKE 'tm_%'
  AND u.created_at > now() - interval '14 days'
ORDER BY u.created_at DESC;
