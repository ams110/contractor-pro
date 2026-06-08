import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function encodeBase64url(bytes: Uint8Array): string {
  return encodeBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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

    const { emp_id, token, credential, prev_credential_id } = await req.json()
    if (!emp_id || !token || !credential) return json({ error: 'بيانات غير صالحة' }, 400)

    const { data: emp } = await supabase
      .from('employees')
      .select('id, name, user_id')
      .eq('id', emp_id)
      .eq('worker_session_token', token)
      .single()
    if (!emp) return json({ error: 'جلسة منتهية، أعد تسجيل الدخول' }, 401)

    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID   = origin.replace(/^https?:\/\//, '').split(':')[0]

    const { data: ch } = await supabase
      .from('worker_passkey_challenges')
      .select('challenge')
      .eq('employee_id', emp.id)
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
    const rawId          = registrationInfo!.credentialID
    const credentialID   = typeof rawId === 'string' ? rawId : encodeBase64url(rawId as Uint8Array)
    const publicKeyBytes = registrationInfo!.credentialPublicKey
    const counter        = registrationInfo!.counter

    // دعم عدّة أجهزة: نستبدل بصمة هذا الجهاز فقط (إن وُجدت) ونُبقي بقية الأجهزة
    if (prev_credential_id) {
      await supabase.from('worker_passkey_credentials').delete()
        .eq('employee_id', emp.id).eq('credential_id', prev_credential_id)
    }
    await supabase.from('worker_passkey_credentials').insert({
      employee_id:   emp.id,
      credential_id: credentialID,
      public_key:    encodeBase64(publicKeyBytes),
      counter,
      device_type:   registrationInfo!.credentialDeviceType || 'platform',
    })

    await supabase.from('worker_passkey_challenges').delete()
      .eq('employee_id', emp.id)
      .eq('type', 'registration')

    // تسجيل النشاط
    await supabase.from('worker_activity_log').insert({
      owner_id: emp.user_id, employee_id: emp.id, worker_name: emp.name,
      action: 'enable_passkey', resource_type: 'auth', meta: {},
    })

    return json({ verified: true, credentialId: credentialID })
  } catch (err) {
    return json({ error: err.message }, 400)
  }
})
