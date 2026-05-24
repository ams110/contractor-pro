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

    const { memberId, newPassword, ownerId } = await req.json()

    if (user.id !== ownerId) return json({ error: 'غير مصرح' }, 403)
    if (!memberId || !newPassword) return json({ error: 'memberId و newPassword مطلوبان' }, 400)
    if (newPassword.length < 8)   return json({ error: 'كلمة المرور 8 أحرف على الأقل' }, 400)
    if (newPassword.length > 128) return json({ error: 'كلمة المرور 128 حرفاً كحد أقصى' }, 400)

    // جلب member_id من team_members للتأكد من الملكية
    const { data: member, error: fetchErr } = await adminClient
      .from('team_members')
      .select('member_id')
      .eq('id', memberId)
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (fetchErr || !member) return json({ error: 'العضو غير موجود أو غير مصرح' }, 404)
    if (!member.member_id) return json({ error: 'لا يوجد حساب مرتبط بهذا العضو' }, 400)

    // تحديث الباسورد مباشرة — بدون حذف أو إعادة إنشاء
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(
      member.member_id,
      { password: newPassword },
    )
    if (updateErr) return json({ error: updateErr.message }, 400)

    return json({ success: true })
  } catch (e) {
    return json({ error: e.message || 'خطأ غير متوقع' }, 500)
  }
})
