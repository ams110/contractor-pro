// Supabase Edge Function: توليد خيارات مصادقة البصمة
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// رسالة خطأ موحّدة — لا تكشف ما إذا كان البريد مسجّلاً أم لا
const GENERIC_ERROR = 'البصمة غير متوفرة لهذا الحساب'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    let body: { email?: string }
    try { body = await req.json() } catch { return json({ error: 'JSON غير صالح' }, 400) }

    const { email } = body
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return json({ error: 'البريد الإلكتروني غير صالح' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // ── البحث عن المستخدم بالبريد — بدون listUsers() لتجنب تعداد كل المستخدمين ──
    // نستخدم صفحة واحدة فقط بدل تحميل كل المستخدمين
    const { data: userData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = userData?.users?.find(u => u.email === email)

    // جلب بيانات اعتماد البصمة (null-safe — لا نكشف وجود المستخدم)
    const credentials = user ? (await supabase
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', user.id)
    ).data : null

    // ── رسالة خطأ موحّدة لكلا الحالتين (user not found / no passkey) ──
    if (!user || !credentials?.length) {
      // تأخير ثابت لمنع timing-based enumeration
      await new Promise(r => setTimeout(r, 150))
      return json({ error: GENERIC_ERROR }, 400)
    }

    const options = await generateAuthenticationOptions({
      rpID: req.headers.get('origin')?.replace(/^https?:\/\//, '').split(':')[0] || 'localhost',
      allowCredentials: credentials.map(c => ({
        id:   c.credential_id,
        type: 'public-key',
      })),
      userVerification: 'required',
    })

    // احفظ challenge مع userId
    await supabase.from('passkey_challenges').upsert({
      user_id:    user.id,
      challenge:  options.challenge,
      type:       'authentication',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // لا تعيد تفاصيل الخطأ الداخلي
    return json({ error: GENERIC_ERROR }, 400)
  }
})
