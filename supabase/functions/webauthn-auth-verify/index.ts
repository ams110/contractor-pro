// Supabase Edge Function: التحقق من البصمة وإنشاء جلسة
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, credential } = await req.json()
    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // جلب المستخدم
    const { data: userData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const user = userData?.users?.find(u => u.email === email)
    if (!user) throw new Error('المستخدم غير موجود')

    // جلب challenge وبيانات الاعتماد
    const [{ data: ch }, { data: cred }] = await Promise.all([
      supabase.from('passkey_challenges').select('challenge').eq('user_id', user.id).eq('type', 'authentication').maybeSingle(),
      supabase.from('passkey_credentials').select('*').eq('credential_id', credential.id).eq('user_id', user.id).maybeSingle(),
    ])

    if (!ch)   throw new Error('انتهت صلاحية التحقق، أعد المحاولة')
    if (!cred) throw new Error('بصمة غير معروفة')

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: ch.challenge,
      expectedOrigin:    origin,
      expectedRPID:      rpID,
      authenticator: {
        credentialID:        cred.credential_id,
        credentialPublicKey: Buffer.from(cred.public_key, 'base64'),
        counter:             cred.counter,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) throw new Error('فشل التحقق من البصمة')

    // تحديث الـ counter
    await supabase.from('passkey_credentials').update({
      counter:      verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq('credential_id', credential.id)

    // حذف الـ challenge
    await supabase.from('passkey_challenges').delete().eq('user_id', user.id).eq('type', 'authentication')

    // إنشاء جلسة مخصصة
    const { data: session } = await supabase.auth.admin.createSession({ userId: user.id })

    return new Response(JSON.stringify({
      access_token:  session?.access_token,
      refresh_token: session?.refresh_token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
