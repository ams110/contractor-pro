-- ════════════════════════════════════════════════════════════════════════════
-- نظام الإحالة الكامل (من محاكاة referral-program 2026-07-03):
--   «جيب صاحبك — شهر مجاني إلك وإله» — رسالة هدية، مكافأة صامتة، والتقاط
--   الإحالات الشفهية بحقل «مين نصحك فينا؟».
-- ────────────────────────────────────────────────────────────────────────────
-- 1) profiles.referral_code — كود قصير مقروء لكل مستخدم + backfill
-- 2) جدول referrals (مين أحال مين + الحالة)
-- 3) توسيع handle_new_user: كود من الرابط (?ref=) أو نص حر من فورم التسجيل
-- 4) grant_referral_reward(p_referee): منح شهر (تمديد trial_ends_at) للطرفين
--    — خادمي لأن trial_ends_at مقفول عن العميل (20260625120000). idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. كود الإحالة ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;  -- النص الحر «مين نصحك؟» (للأدمن)

-- توليد كود 6 أحرف base32 بلا حروف ملتبسة (0/O/1/I) مع إعادة المحاولة على التصادم
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;$$;

-- backfill لكل المستخدمين القائمين
UPDATE public.profiles SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- ── 2. جدول الإحالات ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = إحالة شفهية بلا كود مطابق
  referee_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code             TEXT,
  source           TEXT NOT NULL CHECK (source IN ('link', 'field')),
  free_text        TEXT,           -- نص «مين نصحك فينا؟» كما كتبه المستخدم
  status           TEXT NOT NULL DEFAULT 'signed_up'
                   CHECK (status IN ('signed_up', 'subscribed', 'rewarded', 'reward_pending')),
  subscribed_at    TIMESTAMPTZ,
  rewarded_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id, created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- الطرفان يقرآن صفوفهما فقط؛ الكتابة service_role/triggers فقط (بلا سياسات كتابة)
DROP POLICY IF EXISTS "referral_parties_read" ON public.referrals;
CREATE POLICY "referral_parties_read" ON public.referrals
  FOR SELECT USING (
    (SELECT auth.uid()) = referrer_user_id OR (SELECT auth.uid()) = referee_user_id
  );

-- ── 3. توسيع handle_new_user ─────────────────────────────────────────────────
-- ⚠️ نسخة مدموجة من التعريف **الحي بالقاعدة** (يتضمن التقاط phone من
-- 20260627154335_add_phone_to_profiles_from_signup — لا تُسقطه) + منطق الإحالة.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  display_name TEXT;
  signup_phone TEXT;
  v_ref_code TEXT;
  v_ref_text TEXT;
  v_referrer UUID;
BEGIN
  display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(NEW.email, '@', 1),
    'مقاول'
  );
  signup_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  v_ref_code := upper(NULLIF(TRIM(NEW.raw_user_meta_data->>'ref_code'), ''));
  v_ref_text := NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by_text'), '');

  -- Create profile (ignore if exists from a manual insert)
  INSERT INTO profiles (id, full_name, phone, referral_code, referred_by)
  VALUES (NEW.id, display_name, signup_phone, public.generate_referral_code(), v_ref_text)
  ON CONFLICT (id) DO NOTHING;

  -- Create organization
  INSERT INTO organizations (name, owner_id, trial_ends_at)
  VALUES (display_name, NEW.id, now() + INTERVAL '14 days')
  RETURNING id INTO new_org_id;

  -- Link user → org as owner
  INSERT INTO user_organizations (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  -- صف إحالة: كود من الرابط له الأولوية، وإلا نص حر (شفهية — بلا مُحيل مطابق)
  IF v_ref_code IS NOT NULL OR v_ref_text IS NOT NULL THEN
    v_referrer := NULL;
    IF v_ref_code IS NOT NULL THEN
      SELECT id INTO v_referrer FROM profiles
      WHERE referral_code = v_ref_code AND id <> NEW.id;  -- تجاهل الكود الذاتي
    END IF;
    INSERT INTO referrals (referrer_user_id, referee_user_id, code, source, free_text)
    VALUES (v_referrer, NEW.id,
            CASE WHEN v_referrer IS NOT NULL THEN v_ref_code END,
            CASE WHEN v_referrer IS NOT NULL THEN 'link' ELSE 'field' END,
            v_ref_text)
    ON CONFLICT (referee_user_id) DO NOTHING;

    -- إشعار فوري للمُحيل: «صاحبك سجّل من رابطك» (المكافأة عند اشتراكه)
    IF v_referrer IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, ref_id)
      VALUES (v_referrer, 'صاحبك سجّل من رابطك',
        display_name || ' سجّل بكبلان من رابط الإحالة تبعك — إذا اشترك بعد التجربة بتاخد شهر مجاني.',
        'referral_signup', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. منح مكافأة الإحالة (يناديها paddle-webhook بالـservice role) ──────────
-- تمديد trial_ends_at +30 يوم للطرفين (لغير المشترك النشط). idempotent:
-- الصف بحالة signed_up فقط يُمنح؛ إعادة النداء لا تكرر المنح.
CREATE OR REPLACE FUNCTION public.grant_referral_reward(p_referee UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref referrals%ROWTYPE;
  referrer_has_active_sub BOOLEAN;
BEGIN
  SELECT * INTO ref FROM referrals
  WHERE referee_user_id = p_referee AND status = 'signed_up'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'no_pending_referral'); END IF;

  UPDATE referrals SET status = 'subscribed', subscribed_at = now() WHERE id = ref.id;

  IF ref.referrer_user_id IS NULL THEN
    -- إحالة شفهية بلا مُحيل مطابق — تُسوى يدوياً من الأدمن إن لزم
    RETURN json_build_object('ok', true, 'granted', false, 'reason', 'no_referrer')
    ;
  END IF;

  -- هل المُحيل مشترك Paddle نشط؟ (شهره المجاني وقتها يحتاج Paddle API — يُعلَّم reward_pending)
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = ref.referrer_user_id AND status IN ('active', 'trialing')
  ) INTO referrer_has_active_sub;

  IF referrer_has_active_sub THEN
    UPDATE referrals SET status = 'reward_pending' WHERE id = ref.id;
    INSERT INTO notifications (user_id, title, body, type, ref_id)
    VALUES (ref.referrer_user_id, 'صاحبك اشترك بكبلان',
      'إحالتك نجحت — شهرك المجاني بانتظار التفعيل وسينخصم من فاتورتك الجاية.',
      'referral_reward', ref.id);
  ELSE
    -- غير مشترك (تجربة/منتهية): تمديد trial_ends_at +30 يوم — يعمل فوراً بلا Paddle
    UPDATE organizations SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + INTERVAL '30 days'
    WHERE owner_id = ref.referrer_user_id;
    UPDATE referrals SET status = 'rewarded', rewarded_at = now() WHERE id = ref.id;
    INSERT INTO notifications (user_id, title, body, type, ref_id)
    VALUES (ref.referrer_user_id, 'صاحبك اشترك — أخذت شهر مجاني',
      'إحالتك نجحت وانضاف شهر كامل مجاناً لحسابك. جيب صاحب ثاني وخد شهر كمان.',
      'referral_reward', ref.id);
  END IF;

  RETURN json_build_object('ok', true, 'granted', true);
END;$$;

-- تنفيذ عبر service_role فقط (يناديها paddle-webhook) — لا تعريض للعملاء
REVOKE EXECUTE ON FUNCTION public.grant_referral_reward(UUID) FROM PUBLIC, anon, authenticated;

-- ── 5. قائمة الإحالات للأدمن (تُستدعى بالـservice role من edge admin-stats) ──
CREATE OR REPLACE FUNCTION public.admin_list_referrals(p_limit INT DEFAULT 200)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_json), '[]'::json) INTO result FROM (
    SELECT json_build_object(
      'id', r.id,
      'status', r.status,
      'source', r.source,
      'code', r.code,
      'free_text', r.free_text,
      'referrer_name', rp.full_name,
      'referrer_email', ru.email,
      'referee_name', ep.full_name,
      'referee_email', eu.email,
      'created_at', r.created_at,
      'subscribed_at', r.subscribed_at,
      'rewarded_at', r.rewarded_at
    ) AS row_json
    FROM referrals r
    LEFT JOIN profiles rp ON rp.id = r.referrer_user_id
    LEFT JOIN auth.users ru ON ru.id = r.referrer_user_id
    LEFT JOIN profiles ep ON ep.id = r.referee_user_id
    LEFT JOIN auth.users eu ON eu.id = r.referee_user_id
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  ) t;
  RETURN result;
END;$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_referrals(INT) FROM PUBLIC, anon, authenticated;
