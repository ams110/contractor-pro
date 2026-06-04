import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Deno-compatible base64 decoder (no Buffer)
function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { credentialId, credential } = await req.json()
    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Load stored credential
    const { data: storedCred } = await supabase
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .single()

    if (!storedCred) return json({ error: 'بصمة غير معروفة' }, 400)

    // Load challenge
    const { data: ch } = await supabase
      .from('passkey_challenges')
      .select('challenge')
      .eq('user_id', storedCred.user_id)
      .eq('type', 'authentication')
      .single()

    if (!ch) return json({ error: 'انتهت صلاحية التحقق، أعد المحاولة' }, 400)

    // Verify assertion — v9 API uses 'credential' (not 'authenticator')
    const verification = await verifyAuthenticationResponse({
      response:           credential,
      expectedChallenge:  ch.challenge,
      expectedOrigin:     origin,
      expectedRPID:       rpID,
      credential: {
        id:        storedCred.credential_id,
        publicKey: decodeBase64(storedCred.public_key),
        counter:   storedCred.counter,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) return json({ error: 'فشل التحقق من البصمة' }, 400)

    // Update counter and timestamp
    await supabase.from('passkey_credentials').update({
      counter:      verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq('credential_id', credentialId)

    // Consume challenge
    await supabase.from('passkey_challenges').delete()
      .eq('user_id', storedCred.user_id)
      .eq('type', 'authentication')

    // Issue a one-time login token (no email sent)
    const { data: userData } = await supabase.auth.admin.getUserById(storedCred.user_id)
    if (!userData?.user?.email) return json({ error: 'مستخدم غير موجود' }, 400)

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type:  'magiclink',
      email: userData.user.email,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      return json({ error: 'فشل إنشاء الجلسة' }, 400)
    }

    return json({ token_hash: linkData.properties.hashed_token })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
