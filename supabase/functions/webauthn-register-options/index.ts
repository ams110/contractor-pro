import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// base64url -> Uint8Array (v9 excludeCredentials expects a BufferSource id)
function decodeBase64url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const binary = atob(b64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
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

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization') || ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID = origin.replace(/^https?:\/\//, '').split(':')[0]

    // Get existing credentials to exclude
    const { data: existing } = await supabase
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', user.id)

    const options = await generateRegistrationOptions({
      rpName: 'Kabblan',
      rpID,
      userID: new TextEncoder().encode(user.id.replace(/-/g, '').slice(0, 32)),
      userName: user.email!,
      userDisplayName: user.user_metadata?.full_name || user.email!,
      excludeCredentials: (existing || []).map(c => ({
        id: decodeBase64url(c.credential_id),
        type: 'public-key',
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
    })

    // Store challenge temporarily
    await supabase.from('passkey_challenges').upsert({
      user_id:    user.id,
      challenge:  options.challenge,
      type:       'registration',
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
