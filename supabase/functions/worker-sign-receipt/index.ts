import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// توقيع رابط إيصال عامل بعد رفعه — البوّابة مجهولة على طبقة التخزين، فلا يمكن
// تقييدها بـ RLS؛ هنا نتحقّق من worker_session_token عبر service role ثم نوقّع
// رابطاً مؤقّتاً للمسار العائد للعامل فقط (يمنع توقيع مسار عامل آخر).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 // سنة

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { emp_id, token, path } = await req.json()
    if (!emp_id || !token || !path) return json({ error: 'بيانات غير صالحة' }, 400)

    // تحقّق من جلسة العامل
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', emp_id)
      .eq('worker_session_token', token)
      .single()
    if (!emp) return json({ error: 'جلسة منتهية، أعد تسجيل الدخول' }, 401)

    // المسار يجب أن يبدأ بمجلّد العامل نفسه (<emp_id>/...) — يمنع توقيع ملفات الغير
    if (!String(path).startsWith(`${emp_id}/`)) return json({ error: 'مسار غير مصرّح' }, 403)

    const { data, error } = await supabase.storage
      .from('worker-receipts')
      .createSignedUrl(path, SIGNED_URL_TTL)
    if (error || !data?.signedUrl) return json({ error: 'فشل توليد الرابط' }, 500)

    return json({ signedUrl: data.signedUrl })
  } catch {
    return json({ error: 'خطأ غير متوقّع' }, 500)
  }
})
