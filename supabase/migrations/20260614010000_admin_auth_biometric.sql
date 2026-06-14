-- =====================================================
-- Admin auth: changeable password + WebAuthn (biometric) passkeys
-- =====================================================
-- جداول مصادقة لوحة الأدمن المستقلّة (منفصلة عن مصادقة Supabase).
-- 🔒 كلها RLS مفعّل بلا أي policy → غير قابلة للقراءة/الكتابة من anon/authenticated؛
--    يصل لها فقط دور service_role (عبر edge function `admin-stats`).
-- Safe to re-run (idempotent).

-- ── 1. بيانات الدخول القابلة للتغيير (سجل واحد) ───────────────────────────────
-- إن كان الجدول فارغاً، يستعمل edge function أسرار ADMIN_USERNAME/ADMIN_PASSWORD
-- كقيمة بدئية (bootstrap). أول تغيير لكلمة المرور يكتب سجلاً هنا ويصبح المرجع.
CREATE TABLE IF NOT EXISTS admin_auth (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  username      text NOT NULL,
  password_hash text NOT NULL,   -- sha256( salt || password ) بصيغة hex
  password_salt text NOT NULL,
  updated_at    timestamptz DEFAULT now()
);

-- ── 2. مفاتيح البصمة (WebAuthn passkeys) للأدمن ───────────────────────────────
CREATE TABLE IF NOT EXISTS admin_passkeys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text UNIQUE NOT NULL,   -- base64url
  public_key    text NOT NULL,          -- base64 (COSE)
  counter       bigint NOT NULL DEFAULT 0,
  label         text,
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz
);

-- ── 3. تحدّيات WebAuthn المؤقتة (تسجيل/مصادقة) ────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_challenges (
  type       text PRIMARY KEY,          -- 'registration' | 'authentication'
  challenge  text NOT NULL,
  expires_at timestamptz NOT NULL
);

-- ── 4. قفل كامل (RLS بلا policies = لا وصول لأحد عدا service_role) ─────────────
ALTER TABLE admin_auth       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_passkeys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON admin_auth       FROM anon, authenticated;
REVOKE ALL ON admin_passkeys   FROM anon, authenticated;
REVOKE ALL ON admin_challenges FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
