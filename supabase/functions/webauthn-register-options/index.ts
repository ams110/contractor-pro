// Supabase Edge Function: توليد خيارات تسجيل البصمة
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, userEmail } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // جلب بيانات اعتماد موجودة للمستخدم
    const { data: existing } = await supabase
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', userId)

    const options = await generateRegistrationOptions({
      rpName: 'Contractor Pro',
      rpID: req.headers.get('origin')?.replace(/^https?:\/\//, '') || 'localhost',
      userID: userId,
      userName: userEmail,
      userDisplayName: userEmail,
      excludeCredentials: (existing || []).map(c => ({
        id: c.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
    })

    // احفظ challenge مؤقتاً
    await supabase.from('passkey_challenges').upsert({
      user_id:   userId,
      challenge: options.challenge,
      type:      'registration',
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
