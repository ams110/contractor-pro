import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// الأدوار المسموحة فقط
const ALLOWED_ROLES = new Set(['مدير', 'محاسب', 'مشرف', 'عضو', 'عارض'])

// قواعد التحقق من المدخلات
const validate = {
  username:    (v: string) => /^[a-zA-Z0-9._-]{3,30}$/.test(v),
  displayName: (v: string) => typeof v === 'string' && v.trim().length >= 2 && v.length <= 60,
  password:    (v: string) => typeof v === 'string' && v.length >= 8 && v.length <= 128,
  role:        (v: string) => ALLOWED_ROLES.has(v),
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

    let body: Record<string, unknown>
    try { body = await req.json() }
    catch { return json({ error: 'JSON غير صالح' }, 400) }

    const { displayName, username, password, role, expiresAt, perms, ownerId, allowedProjectIds } = body as {
      displayName?: string; username?: string; password?: string; role?: string
      expiresAt?: string;   perms?: object;    ownerId?: string;  allowedProjectIds?: string[]
    }

    // تحقق أن المُرسِل هو المالك
    if (!ownerId || user.id !== ownerId) return json({ error: 'غير مصرح' }, 403)

    // ── التحقق من المدخلات ────────────────────────────────────────────────
    if (!username || !validate.username(username)) {
      return json({ error: 'اسم المستخدم: 3-30 حرفاً (حروف لاتينية وأرقام و . _ - فقط)' }, 400)
    }
    if (!password || !validate.password(password)) {
      return json({ error: 'كلمة المرور: 8 أحرف على الأقل، 128 كحد أقصى' }, 400)
    }
    if (displayName && !validate.displayName(displayName)) {
      return json({ error: 'الاسم: 2-60 حرفاً' }, 400)
    }
    if (role && !validate.role(role)) {
      return json({ error: 'الدور غير مسموح' }, 400)
    }
    // allowedProjectIds: يجب أن يكون مصفوفة من UUIDs صالحة إذا وُجد
    if (allowedProjectIds !== undefined && allowedProjectIds !== null) {
      if (!Array.isArray(allowedProjectIds) || allowedProjectIds.length > 100) {
        return json({ error: 'allowedProjectIds: مصفوفة بحد أقصى 100 مشروع' }, 400)
      }
      const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!allowedProjectIds.every((id: unknown) => typeof id === 'string' && uuidRx.test(id))) {
        return json({ error: 'allowedProjectIds: UUIDs غير صالحة' }, 400)
      }
    }

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
      display_name: displayName?.trim() || username,
      username,
      auth_email:   authEmail,
      email:        authEmail,
      role:         role || 'عضو',
      status:       'active',
      expires_at:   expiresAt || null,
      ...(perms && typeof perms === 'object' ? perms : {}),
      allowed_project_ids: (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0)
        ? allowedProjectIds : null,
    })

    if (dbErr) {
      // rollback: احذف auth user إذا فشل الـ insert
      await adminClient.auth.admin.deleteUser(newUserId)
      return json({ error: dbErr.message }, 400)
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: 'خطأ غير متوقع' }, 500) // لا تعيد تفاصيل الخطأ الداخلي
  }
})
