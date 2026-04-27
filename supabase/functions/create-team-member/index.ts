import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // تحقق من هوية المُرسِل
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { displayName, username, password, role, expiresAt, perms, ownerId, allowedProjectIds } = await req.json()

    // تحقق أن المُرسِل هو المالك
    if (user.id !== ownerId) return json({ error: 'غير مصرح' }, 403)

    if (!username || !password) return json({ error: 'username و password مطلوبان' }, 400)

    // تحقق من تكرار اسم المستخدم (per-owner فقط)
    const { data: existing } = await adminClient
      .from('team_members').select('id').eq('owner_id', ownerId).eq('username', username).maybeSingle()
    if (existing) return json({ error: 'اسم المستخدم مستخدم مسبقاً لدى هذا الحساب' }, 409)

    // إنشاء auth user بإيميل داخلي — email_confirm: true يتجاوز تأكيد الإيميل
    const authEmail = `tm_${ownerId.slice(0, 8)}_${username}_${Date.now()}@contractor.app`
    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const newUserId = authData.user.id

    // إضافة السجل في team_members
    const { error: dbErr } = await adminClient.from('team_members').insert({
      owner_id:     ownerId,
      member_id:    newUserId,
      display_name: displayName,
      username,
      auth_email:   authEmail,
      email:        authEmail,
      role:         role || 'عضو',
      status:       'active',
      expires_at:   expiresAt || null,
      ...perms,
      allowed_project_ids: (allowedProjectIds?.length > 0) ? allowedProjectIds : null,
    })

    if (dbErr) {
      // rollback: احذف auth user إذا فشل الـ insert
      await adminClient.auth.admin.deleteUser(newUserId)
      return json({ error: dbErr.message }, 400)
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: e.message || 'خطأ غير متوقع' }, 500)
  }
})
