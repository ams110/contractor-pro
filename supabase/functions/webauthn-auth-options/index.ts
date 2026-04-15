// Supabase Edge Function: توليد خيارات مصادقة البصمة
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // جلب معرّف المستخدم من الإيميل
    const { data: userData } = await supabase.auth.admin.listUsers()
    const user = userData?.users?.find(u => u.email === email)
    if (!user) throw new Error('البريد الإلكتروني غير مسجّل')

    // جلب بيانات اعتماد البصمة
    const { data: credentials } = await supabase
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', user.id)

    if (!credentials?.length) throw new Error('لا توجد بصمة مسجّلة لهذا الحساب')

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
