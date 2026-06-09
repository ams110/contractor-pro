import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// حذف الحساب الذاتي نهائياً — للمالك. يحذف مستخدم auth (يتتالى حذف كل بياناته
// عبر ON DELETE CASCADE)، وكذلك يحذف حسابات أعضاء الفريق الفرعية التابعة له.
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

    // تحقّق من هوية المُرسِل عبر جلسته
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // تأكيد صريح مطلوب لمنع الحذف العَرَضي
    const body = await req.json().catch(() => ({}))
    if (body?.confirm !== true) return json({ error: 'تأكيد مطلوب' }, 400)

    // احذف حسابات أعضاء الفريق الفرعية التابعة لهذا المالك (أفضل جهد)
    const { data: members } = await adminClient
      .from('team_members')
      .select('member_id')
      .eq('owner_id', user.id)

    for (const m of members || []) {
      if (m.member_id && m.member_id !== user.id) {
        await adminClient.auth.admin.deleteUser(m.member_id).catch(() => {})
      }
    }

    // احذف المالك — يتتالى حذف كل بياناته عبر ON DELETE CASCADE على auth.users
    const { error: delErr } = await adminClient.auth.admin.deleteUser(user.id)
    if (delErr) return json({ error: delErr.message }, 400)

    return json({ success: true })
  } catch (e) {
    return json({ error: e.message || 'خطأ غير متوقع' }, 500)
  }
})
