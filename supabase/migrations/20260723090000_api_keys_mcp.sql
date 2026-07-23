-- مفاتيح API لربط Claude بالمصلحة عبر MCP (ميزة خطة Business)
-- يُخزَّن هاش المفتاح فقط (sha256) — المفتاح الكامل يظهر للمالك مرة واحدة عند التوليد.
-- التوليد من العميل: crypto.getRandomValues(32 بايت) → cpk_ + hex، ويُدخل الهاش عبر RLS.
-- التحقق في edge function `mcp-server` بالـ service role (بحث بالهاش + timingSafeEqual).

CREATE TABLE IF NOT EXISTS public.api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Claude MCP',
  key_prefix   TEXT NOT NULL CHECK (key_prefix LIKE 'cpk_%'),          -- أول 12 حرفاً للعرض فقط
  key_hash     TEXT NOT NULL UNIQUE CHECK (char_length(key_hash) = 64), -- sha256 hex
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- المالك يدير مفاتيحه فقط. لا سياسة DELETE — الإلغاء عبر revoked_at (أثر تدقيقي دائم).
CREATE POLICY api_keys_select ON public.api_keys
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY api_keys_insert ON public.api_keys
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY api_keys_update ON public.api_keys
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
-- UNIQUE(key_hash) أعلاه يوفّر فهرس البحث السريع للـ edge function

NOTIFY pgrst, 'reload schema';
