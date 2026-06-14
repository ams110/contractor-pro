-- فصل بروفايلات المقاولات عن جدول المتجر المشترك.
-- كان: public.profiles = VIEW على store.profiles (التطبيقان يتشاركان جدول الهوية).
-- صار: جدول حقيقي مملوك للمقاولات. يُصلح أيضاً حفظ contractor_number
-- (عمود لم يكن موجوداً في جدول المتجر → كان الحفظ يفشل بصمت).
-- (طُبّقت على الإنتاج عبر Supabase MCP؛ هذا الملف للحفظ في نسخة الكود.)

CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         text,
  avatar_url        text,
  contractor_number text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

INSERT INTO public.contractor_profiles (id, full_name, avatar_url)
SELECT sp.id, sp.full_name, sp.avatar_url
FROM store.profiles sp
WHERE sp.id IN (SELECT id FROM auth.users)
ON CONFLICT (id) DO NOTHING;

DROP VIEW IF EXISTS public.profiles;
ALTER TABLE public.contractor_profiles RENAME TO profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_profiles_updated_at();
