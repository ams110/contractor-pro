import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify JWT
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { memberId, newPassword } = await req.json()
    if (!memberId || !newPassword) {
      return new Response(JSON.stringify({ error: 'معرّف العضو والباسورد مطلوبان' }), { status: 400, headers: corsHeaders })
    }

    // Get member's auth user ID (must belong to this owner)
    const { data: member, error: fetchErr } = await supabaseAdmin
      .from('team_members').select('member_id').eq('id', memberId).eq('owner_id', user.id).maybeSingle()
    if (fetchErr || !member) {
      return new Response(JSON.stringify({ error: 'العضو غير موجود أو ليس لديك صلاحية' }), { status: 403, headers: corsHeaders })
    }

    // Update password via admin API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(member.member_id, { password: newPassword })
    if (updateErr) throw new Error(updateErr.message)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
