import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// icount-billing — يُنشئ صفحة دفع iCount المستضافة (checkout) ويلغي الاشتراك (cancel).
//
// كل أسرار iCount تعيش هنا خادمياً (cid/user/pass، المبالغ). الواجهة لا تمرّر مبالغ.
// خامل بأمان: يرجع 503 حتى تُضبط الأسرار.
//
// ⚠️ ملاحظة تكامل: أسماء نقاط النهاية/الحقول أدناه مبنيّة على واجهة iCount v3
// العامّة، لكنها **تختلف حسب إعداد حساب السليقة (דף סליקה) عندك**. قبل الإطلاق
// أكّدها مع iCount/مزوّد السليقة (الأرجح أن المسار = إعداد «עמוד תשלום/דף סליקה»
// الخاص بحسابك). الكود معزول وسهل التعديل في `createPaymentPage` أدناه.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ICOUNT_BASE = Deno.env.get('ICOUNT_API_BASE') ?? 'https://api.icount.co.il/api/v3.php'
const APP_URL     = Deno.env.get('APP_URL') ?? ''
const SUPA_URL    = Deno.env.get('SUPABASE_URL')!
const WEBHOOK_SECRET = Deno.env.get('ICOUNT_WEBHOOK_SECRET') ?? ''

// بيانات اعتماد iCount (تُضبط عبر supabase secrets)
const ICOUNT_CID  = Deno.env.get('ICOUNT_CID')  ?? ''
const ICOUNT_USER = Deno.env.get('ICOUNT_USER') ?? ''
const ICOUNT_PASS = Deno.env.get('ICOUNT_PASS') ?? ''

// السعر الشهري (₪) لكل خطة — السنوي = ×10 (خصم شهرين، مطابق لصفحة الأسعار)
function monthlyPrice(plan: string): number {
  const map: Record<string, number> = {
    starter:  Number(Deno.env.get('ICOUNT_PRICE_STARTER')  ?? 129),
    pro:      Number(Deno.env.get('ICOUNT_PRICE_PRO')      ?? 249),
    business: Number(Deno.env.get('ICOUNT_PRICE_BUSINESS') ?? 499),
  }
  return map[plan] ?? 0
}

const PLAN_NAMES: Record<string, string> = {
  starter:  'Contractor Pro — מנוי Starter',
  pro:      'Contractor Pro — מנוי Pro',
  business: 'Contractor Pro — מנוי Business',
}

function isConfigured(): boolean {
  return !!(ICOUNT_CID && ICOUNT_USER && ICOUNT_PASS)
}

/**
 * يُنشئ صفحة دفع iCount مستضافة (إعادة توجيه) مع تفعيل التكرار (הוראת קבע)
 * ويُمرّر البيانات المخصّصة (user_id/org_id/plan/cycle) لتعود في الـIPN.
 * يرجع رابط الصفحة للتحويل إليه.
 */
async function createPaymentPage(opts: {
  plan: string; cycle: string; amount: number; user: { id: string; email: string }; orgId: string
}): Promise<string> {
  const { plan, cycle, amount, user, orgId } = opts
  const ipnUrl = `${SUPA_URL}/functions/v1/icount-webhook${WEBHOOK_SECRET ? `?secret=${encodeURIComponent(WEBHOOK_SECRET)}` : ''}`

  const payload = {
    cid:  ICOUNT_CID,
    user: ICOUNT_USER,
    pass: ICOUNT_PASS,
    // تفاصيل العملية
    sum:        amount,
    currency_code: 'ILS',
    description: PLAN_NAMES[plan] ?? 'Contractor Pro',
    email:      user.email,
    // تفعيل الدفع المتكرّر (הוראת קבע) — شهري/سنوي
    hk:           true,
    hk_recurring: cycle === 'year' ? 'yearly' : 'monthly',
    // روابط العودة + إشعار الخادم (IPN)
    success_url: `${APP_URL}/thankyou?plan=${plan}&cycle=${cycle}`,
    failure_url: `${APP_URL}/pricing?checkout=failed`,
    ipn_url:     ipnUrl,
    // بيانات مخصّصة ترجع كما هي في الـIPN
    custom: JSON.stringify({ user_id: user.id, org_id: orgId, plan, cycle }),
  }

  const res = await fetch(`${ICOUNT_BASE}/cc/page`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  // iCount يعيد رابط الصفحة في أحد هذه الحقول حسب إعداد الحساب
  const url = data?.url || data?.redirect_url || data?.page_url || data?.payment_url
  if (!res.ok || !url) {
    console.error('icount-billing: createPaymentPage failed', res.status, data)
    throw new Error(data?.reason || data?.error_description || 'iCount payment page creation failed')
  }
  return url as string
}

/** يلغي أمر التكرار (הוראת קבע) في iCount */
async function cancelRecurring(subId: string): Promise<boolean> {
  if (!subId) return false
  const res = await fetch(`${ICOUNT_BASE}/hk/cancel`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ cid: ICOUNT_CID, user: ICOUNT_USER, pass: ICOUNT_PASS, hk_id: subId }),
  })
  const data = await res.json().catch(() => ({}))
  return res.ok && (data?.status === true || data?.status === 'success' || data?.success === true)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)
  if (!isConfigured()) return json({ error: 'بوّابة iCount غير مهيّأة بعد' }, 503)

  try {
    // تحقّق من هوية المُرسِل عبر جلسته
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const callerClient = createClient(
      SUPA_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    // ── إنشاء صفحة الدفع ──────────────────────────────────────────────────────
    if (action === 'checkout') {
      const plan  = String(body?.plan ?? '')
      const cycle = body?.cycle === 'year' ? 'year' : 'month'
      const orgId = String(body?.org_id ?? '')

      if (!['starter', 'pro', 'business'].includes(plan)) return json({ error: 'خطة غير صالحة' }, 400)
      if (!orgId) return json({ error: 'معرّف الحساب مفقود' }, 400)

      const amount = monthlyPrice(plan) * (cycle === 'year' ? 10 : 1)
      if (!amount) return json({ error: 'سعر الخطة غير مُعدّ' }, 400)

      const url = await createPaymentPage({
        plan, cycle, amount,
        user: { id: user.id, email: user.email ?? '' },
        orgId,
      })
      return json({ url })
    }

    // ── إلغاء الاشتراك (إلغاء أمر التكرار في iCount) ──────────────────────────
    if (action === 'cancel') {
      const subId = String(body?.sub_id ?? '')
      const ok = await cancelRecurring(subId)
      // ملاحظة: التحديث الفعلي لحالة الاشتراك في قاعدتنا يتمّ عبر الـIPN
      // (icount-webhook) عند تأكيد iCount للإلغاء — مصدر الحقيقة الوحيد.
      return json({ success: ok })
    }

    return json({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    console.error('icount-billing error:', e)
    return json({ error: (e as Error).message || 'خطأ غير متوقّع' }, 500)
  }
})
