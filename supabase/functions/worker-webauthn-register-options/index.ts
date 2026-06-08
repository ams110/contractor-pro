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

    const { emp_id, token } = await req.json()
    if (!emp_id || !token) return json({ error: 'بيانات غير صالحة' }, 400)

    // مصادقة العامل عبر توكن الجلسة (لا JWT)
    const { data: emp } = await supabase
      .from('employees')
      .select('id, name, worker_username')
      .eq('id', emp_id)
      .eq('worker_session_token', token)
      .single()
    if (!emp) return json({ error: 'جلسة منتهية، أعد تسجيل الدخول' }, 401)

    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID = origin.replace(/^https?:\/\//, '').split(':')[0]

    const { data: existing } = await supabase
      .from('worker_passkey_credentials')
      .select('credential_id')
      .eq('employee_id', emp.id)

    const options = await generateRegistrationOptions({
      rpName: 'Contractor Pro',
      rpID,
      userID: new TextEncoder().encode(String(emp.id).replace(/-/g, '').slice(0, 32)),
      userName: emp.worker_username || emp.name || 'worker',
      userDisplayName: emp.name || emp.worker_username || 'worker',
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

    await supabase.from('worker_passkey_challenges').upsert({
      employee_id: emp.id,
      challenge:   options.challenge,
      type:        'registration',
      expires_at:  new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    return json(options)
  } catch (err) {
    return json({ error: err.message }, 400)
  }
})
