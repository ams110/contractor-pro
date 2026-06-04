import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Deno-compatible base64 encoder (no Buffer)
function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get('Authorization') || ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { credential } = await req.json()
    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const { data: ch } = await supabase
      .from('passkey_challenges')
      .select('challenge')
      .eq('user_id', user.id)
      .eq('type', 'registration')
      .single()

    if (!ch) return json({ error: 'انتهت صلاحية التحقق، أعد المحاولة' }, 400)

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })

    if (!verification.verified) return json({ error: 'فشل التحقق من البصمة' }, 400)

    const { registrationInfo } = verification
    // v9 flat API: credentialID (Base64URLString), credentialPublicKey (Uint8Array), counter
    const credentialID   = registrationInfo!.credentialID
    const publicKeyBytes = registrationInfo!.credentialPublicKey
    const counter        = registrationInfo!.counter

    await supabase.from('passkey_credentials').delete().eq('user_id', user.id)
    await supabase.from('passkey_credentials').insert({
      user_id:       user.id,
      credential_id: credentialID,
      public_key:    encodeBase64(publicKeyBytes),
      counter,
      device_type:   registrationInfo!.credentialDeviceType || 'platform',
    })

    await supabase.from('passkey_challenges').delete()
      .eq('user_id', user.id)
      .eq('type', 'registration')

    return json({ verified: true, credentialId: credentialID })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
