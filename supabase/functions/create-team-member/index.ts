import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify JWT and get owner ID
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { displayName, username, password, role, expiresAt, perms } = await req.json()

    if (!username?.trim() || !password) {
      return new Response(JSON.stringify({ error: 'اسم المستخدم والباسورد مطلوبان' }), { status: 400, headers: corsHeaders })
    }

    // Check username not taken
    const { data: existing } = await supabaseAdmin
      .from('team_members').select('id').eq('owner_id', user.id).eq('username', username).maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ error: 'اسم المستخدم مستخدم مسبقاً' }), { status: 400, headers: corsHeaders })
    }

    // Create auth user via admin API (no email confirmation needed)
    const authEmail = `tm_${user.id.slice(0, 8)}_${username}_${Date.now()}@contractor.app`
    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    })
    if (createErr) throw new Error(createErr.message)

    // Insert team_members row
    const { error: insertErr } = await supabaseAdmin.from('team_members').insert({
      owner_id:     user.id,
      member_id:    authData.user.id,
      display_name: displayName,
      username,
      auth_email:   authEmail,
      email:        authEmail,
      role:         role || 'عضو',
      status:       'active',
      expires_at:   expiresAt || null,
      ...perms,
    })
    if (insertErr) {
      // Clean up orphaned auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(insertErr.message)
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
