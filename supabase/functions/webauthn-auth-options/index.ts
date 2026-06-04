import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    let body: { credentialId?: string }
    try { body = await req.json() } catch { return json({ error: 'JSON غير صالح' }, 400) }

    const { credentialId } = body
    if (!credentialId || typeof credentialId !== 'string') {
      return json({ error: 'بصمة غير صالحة' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Look up the user who owns this credential
    const { data: cred } = await supabase
      .from('passkey_credentials')
      .select('user_id')
      .eq('credential_id', credentialId)
      .single()

    if (!cred) {
      await new Promise(r => setTimeout(r, 150))
      return json({ error: 'بصمة غير معروفة — أعد التسجيل من الإعدادات' }, 400)
    }

    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: credentialId, type: 'public-key' }],
      userVerification: 'required',
    })

    // Store challenge linked to this user (one auth challenge per user at a time)
    await supabase.from('passkey_challenges').upsert({
      user_id:    cred.user_id,
      challenge:  options.challenge,
      type:       'authentication',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (_err) {
    return json({ error: 'بصمة غير متوفرة — أعد التسجيل من الإعدادات' }, 400)
  }
})
