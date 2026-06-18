import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// icount-webhook — يستقبل إشعار iCount (IPN) عند الدفع/التجديد/الإلغاء ويزامن
// جدولَي subscriptions + organizations. نظير paddle-webhook بالضبط.
//
// التحقّق: يُسجَّل رابط الـIPN في icount-billing بسرّ في الـquery (?secret=...)؛
// نرفض أي طلب لا يحمل السرّ الصحيح. (iCount لا يوقّع HMAC افتراضياً، فالسرّ في
// الرابط هو آلية الإثبات — مثل مفتاح مشترك.)
//
// ⚠️ أسماء الحقول الواردة من iCount تختلف حسب إعداد الحساب — عدّل خريطة الحقول
// في extractFields() عند تأكيد بنية الـIPN مع حسابك.
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const WEBHOOK_SECRET = Deno.env.get('ICOUNT_WEBHOOK_SECRET') ?? ''

// active/trialing → أبقِ الخطة · غير ذلك → free
function orgPlanFromStatus(status: string, plan: string): string {
  return ['active', 'trialing'].includes(status) ? plan : 'free'
}

async function notifyUser(userId: string | null | undefined, title: string, body: string, type = 'info') {
  if (!userId) return
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title, body, type })
  if (error) console.error('icount-webhook: notification insert error', error)
}

interface IpnFields {
  custom: { user_id?: string; org_id?: string; plan?: string; cycle?: string }
  subId: string | null
  docId: string | null
  customerId: string | null
  status: string          // 'active' | 'canceled' | 'past_due'
}

/** يطبّع حمولة الـIPN (قد تأتي JSON أو form-urlencoded) إلى حقولنا الداخلية */
function extractFields(raw: Record<string, unknown>): IpnFields {
  let custom: IpnFields['custom'] = {}
  const rawCustom = raw.custom ?? raw.custom_data
  if (typeof rawCustom === 'string') { try { custom = JSON.parse(rawCustom) } catch { /* ignore */ } }
  else if (rawCustom && typeof rawCustom === 'object') custom = rawCustom as IpnFields['custom']

  // خريطة الحالة: iCount يرسل أنواع أحداث مختلفة — طبّعها
  const evt = String(raw.event_type ?? raw.status ?? raw.type ?? 'paid').toLowerCase()
  let status = 'active'
  if (['cancel', 'canceled', 'cancelled', 'stop'].some(s => evt.includes(s))) status = 'canceled'
  else if (['fail', 'failed', 'declined', 'past_due', 'error'].some(s => evt.includes(s))) status = 'past_due'

  return {
    custom,
    subId:      (raw.hk_id ?? raw.sub_id ?? raw.subscription_id ?? null) as string | null,
    docId:      (raw.doc_id ?? raw.docnum ?? raw.invoice_id ?? null) as string | null,
    customerId: (raw.client_id ?? raw.customer_id ?? raw.cc_id ?? null) as string | null,
    status,
  }
}

function periodEndFor(cycle: string | undefined): string {
  const d = new Date()
  d.setDate(d.getDate() + (cycle === 'year' ? 365 : 30))
  return d.toISOString()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // تحقّق السرّ المشترك (من الـquery المُسجَّل وقت إنشاء الصفحة)
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') ?? req.headers.get('x-icount-secret') ?? ''
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    console.error('icount-webhook: invalid/missing secret')
    return new Response('Unauthorized', { status: 401 })
  }

  // اقرأ الحمولة (JSON أو form-urlencoded)
  let raw: Record<string, unknown> = {}
  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      raw = await req.json()
    } else {
      const form = await req.formData()
      for (const [k, v] of form.entries()) raw[k] = typeof v === 'string' ? v : ''
    }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { custom, subId, docId, customerId, status } = extractFields(raw)
  const { user_id, org_id, plan = 'starter', cycle } = custom

  if (!user_id || !org_id) {
    console.error('icount-webhook: missing custom user_id/org_id', raw)
    // أعد 200 حتى لا يعيد iCount المحاولة بلا فائدة
    return new Response('OK (no custom data)', { status: 200 })
  }

  const effectivePlan = orgPlanFromStatus(status, plan)

  try {
    if (status === 'canceled') {
      // إلغاء — أنزل لـ free
      await supabase.from('subscriptions')
        .update({ status: 'canceled', plan: 'free', cancel_at_period_end: false })
        .eq('user_id', user_id).eq('provider', 'icount')
      await supabase.from('organizations')
        .update({ plan: 'free', updated_at: new Date().toISOString() }).eq('id', org_id)
      await notifyUser(user_id, 'تم إلغاء الاشتراك',
        'تمّ إلغاء اشتراكك. يمكنك إعادة الاشتراك في أي وقت من صفحة الأسعار.', 'info')
    } else {
      // دفع ناجح / تجديد — فعّل الخطة
      await supabase.from('subscriptions').upsert({
        user_id,
        org_id,
        provider:            'icount',
        icount_sub_id:       subId,
        icount_customer_id:  customerId,
        icount_doc_id:       docId,
        plan:                effectivePlan,
        status,
        current_period_end:  periodEndFor(cycle),
        cancel_at_period_end: false,
      }, { onConflict: 'icount_sub_id' })

      await supabase.from('organizations')
        .update({ plan: effectivePlan, updated_at: new Date().toISOString() }).eq('id', org_id)

      if (status === 'past_due') {
        await notifyUser(user_id, 'فشلت عملية الدفع',
          'تعذّر تجديد اشتراكك. يُرجى تحديث وسيلة الدفع لتجنّب تعليق الحساب.', 'warning')
      }
    }
  } catch (err) {
    console.error('icount-webhook: db error', err)
    // 200 حتى لا يعيد iCount المحاولة على خطأ تطبيقي
  }

  return new Response('OK', { status: 200 })
})
