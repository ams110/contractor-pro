import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── مدّة صلاحية توكن الأدمن: 8 ساعات ───────────────────────────────────────────
const TOKEN_TTL_SECONDS = 8 * 60 * 60

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg))
  return b64url(new Uint8Array(sig))
}

// مقارنة ثابتة الزمن لمنع تسريب التوقيت
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function issueToken(secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })))
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

async function verifyToken(secret: string, token: string): Promise<boolean> {
  const parts = (token || '').split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = await hmac(secret, payload)
  if (!timingSafeEqual(sig, expected)) return false
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' && json.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const ADMIN_USERNAME = Deno.env.get('ADMIN_USERNAME') || ''
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || ''
    // سرّ توقيع التوكن — يُفضّل ضبط ADMIN_JWT_SECRET، وإلا يُشتقّ من كلمة المرور
    const TOKEN_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || (ADMIN_PASSWORD + ':contractor-admin')

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return json({ error: 'لوحة الأدمن غير مهيّأة — اضبط ADMIN_USERNAME و ADMIN_PASSWORD في أسرار Supabase.' }, 503)
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'stats'

    // ── تسجيل الدخول: تحقّق من الاسم/كلمة المرور وأصدِر توكن ──────────────────
    if (action === 'login') {
      const okUser = timingSafeEqual(String(body?.username || ''), ADMIN_USERNAME)
      const okPass = timingSafeEqual(String(body?.password || ''), ADMIN_PASSWORD)
      if (!okUser || !okPass) {
        return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401)
      }
      const token = await issueToken(TOKEN_SECRET)
      return json({ token, expires_in: TOKEN_TTL_SECONDS })
    }

    // ── جلب الإحصائيات: يتطلّب توكن صالح ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '') || body?.token || ''
    if (!(await verifyToken(TOKEN_SECRET, token))) {
      return json({ error: 'انتهت الجلسة — سجّل الدخول من جديد' }, 401)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await adminClient.rpc('admin_get_stats')
    if (error) return json({ error: error.message }, 500)

    return json({ stats: data })
  } catch (e) {
    return json({ error: e.message || 'خطأ غير متوقع' }, 500)
  }
})
