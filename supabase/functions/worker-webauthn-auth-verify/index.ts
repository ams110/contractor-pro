import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeBase64url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  return decodeBase64(b64 + pad)
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

    const { data: storedCred } = await supabase
      .from('worker_passkey_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .single()

    if (!storedCred) return json({ error: 'بصمة غير معروفة' }, 400)

    const { data: ch } = await supabase
      .from('worker_passkey_challenges')
      .select('challenge')
      .eq('employee_id', storedCred.employee_id)
      .eq('type', 'authentication')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!ch) return json({ error: 'انتهت صلاحية التحقق، أعد المحاولة' }, 400)

    const verification = await verifyAuthenticationResponse({
      response:          credential,
      expectedChallenge: ch.challenge,
      expectedOrigin:    origin,
      expectedRPID:      rpID,
      authenticator: {
        credentialID:        decodeBase64url(storedCred.credential_id),
        credentialPublicKey: decodeBase64(storedCred.public_key),
        counter:             storedCred.counter,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) return json({ error: 'فشل التحقق من البصمة' }, 400)

    await supabase.from('worker_passkey_credentials').update({
      counter:      verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq('credential_id', credentialId)

    await supabase.from('worker_passkey_challenges').delete()
      .eq('employee_id', storedCred.employee_id)
      .eq('type', 'authentication')

    // إنشاء توكن جلسة جديد للعامل (نفس آلية worker_login)
    const newToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { data: emp, error: updErr } = await supabase
      .from('employees')
      .update({ worker_session_token: newToken, worker_session_expires_at: expiresAt })
      .eq('id', storedCred.employee_id)
      .select('id, name, specialization, daily_rate, status, user_id')
      .single()

    if (updErr || !emp) return json({ error: 'تعذّر إنشاء الجلسة' }, 400)

    // تسجيل النشاط
    await supabase.from('worker_activity_log').insert({
      owner_id: emp.user_id, employee_id: emp.id, worker_name: emp.name,
      action: 'login', resource_type: 'auth', meta: { method: 'passkey' },
    })

    return json({
      id:             emp.id,
      name:           emp.name,
      specialization: emp.specialization,
      daily_rate:     emp.daily_rate,
      status:         emp.status,
      token:          newToken,
    })
  } catch (err) {
    return json({ error: err.message }, 400)
  }
})
