// Supabase Edge Function: التحقق من تسجيل البصمة وحفظها
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, credential } = await req.json()
    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // جلب الـ challenge المحفوظ
    const { data: ch } = await supabase
      .from('passkey_challenges')
      .select('challenge')
      .eq('user_id', userId)
      .eq('type', 'registration')
      .single()

    if (!ch) throw new Error('Challenge منتهي أو غير موجود')

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: ch.challenge,
      expectedOrigin:    origin,
      expectedRPID:      rpID,
      requireUserVerification: true,
    })

    if (!verification.verified) throw new Error('فشل التحقق من البصمة')

    const { registrationInfo } = verification
    await supabase.from('passkey_credentials').insert({
      user_id:       userId,
      credential_id: registrationInfo!.credentialID,
      public_key:    Buffer.from(registrationInfo!.credentialPublicKey).toString('base64'),
      counter:       registrationInfo!.counter,
      device_type:   registrationInfo!.credentialDeviceType,
    })

    // حذف الـ challenge
    await supabase.from('passkey_challenges').delete().eq('user_id', userId).eq('type', 'registration')

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
