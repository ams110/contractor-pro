// ─── Supabase "Send Email" Auth Hook → Resend ───────────────────────────────
// يستقبل أحداث بريد المصادقة من Supabase (تأكيد التسجيل، استعادة كلمة السر،
// رابط الدخول السحري، تغيير البريد) ويرسلها عبر Resend بقوالب عربية RTL.
//
// الإعداد المطلوب (أسرار الـ Edge Function):
//   RESEND_API_KEY            — مفتاح Resend
//   SEND_EMAIL_HOOK_SECRET    — سرّ الـ hook من Supabase (صيغة Standard Webhooks: v1,whsec_...)
//   EMAIL_FROM                — مثال: "Contractor Pro <noreply@linko.services>"
//   APP_URL                   — رابط التطبيق (افتراضي https://app.linko.services)
//   SUPABASE_URL              — متوفّر تلقائياً
//
// التفعيل: Supabase Dashboard ← Authentication ← Hooks ← Send Email → هذا الرابط.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const HOOK_SECRET    = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
const EMAIL_FROM     = Deno.env.get('EMAIL_FROM') ?? 'Contractor Pro <noreply@linko.services>'
const APP_URL        = Deno.env.get('APP_URL') ?? 'https://app.linko.services'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''

const C = { bg: '#07080F', card: '#12152A', primary: '#F97316', text: '#F8FAFC', dim: '#94A3B8' }

// ─── بناء رابط الإجراء (verify) ───────────────────────────────────────────────
function buildActionLink(tokenHash: string, type: string, redirectTo: string): string {
  const redirect = redirectTo || APP_URL
  return `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirect)}`
}

// ─── قالب HTML موحّد (RTL) ───────────────────────────────────────────────────
function shell(title: string, body: string, ctaText: string, ctaUrl: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${C.bg};font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:54px;height:54px;line-height:54px;border-radius:16px;background:linear-gradient(135deg,#F97316,#DC2626);color:#fff;font-size:26px;font-weight:900">🏗️</div>
      <div style="color:${C.text};font-size:18px;font-weight:800;margin-top:10px">Contractor Pro</div>
    </div>
    <div style="background:${C.card};border:1px solid rgba(249,115,22,0.18);border-radius:18px;padding:28px 24px">
      <h1 style="color:${C.text};font-size:20px;font-weight:800;margin:0 0 14px">${title}</h1>
      <div style="color:${C.dim};font-size:14px;line-height:1.8;margin-bottom:24px">${body}</div>
      <a href="${ctaUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#F97316,#DC2626);color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:14px;border-radius:12px">${ctaText}</a>
      <div style="color:${C.dim};font-size:11px;line-height:1.7;margin-top:20px;word-break:break-all">
        إذا لم يعمل الزر، انسخ هذا الرابط في المتصفّح:<br>${ctaUrl}
      </div>
    </div>
    <div style="text-align:center;color:${C.dim};font-size:11px;margin-top:20px;line-height:1.6">
      إذا لم تطلب هذا الإيميل، تجاهله بأمان.<br>© ${new Date().getFullYear()} Contractor Pro
    </div>
  </div>
</body></html>`
}

// ─── اختيار القالب حسب نوع الإجراء ───────────────────────────────────────────
function renderEmail(type: string, link: string): { subject: string; html: string } {
  switch (type) {
    case 'signup':
      return {
        subject: 'فعّل حسابك في Contractor Pro',
        html: shell('مرحباً بك! 👋', 'يسعدنا انضمامك. اضغط الزر لتأكيد بريدك وبدء تجربتك المجانية لمدة 14 يوماً.', 'تأكيد البريد وبدء التجربة', link),
      }
    case 'recovery':
      return {
        subject: 'إعادة تعيين كلمة المرور',
        html: shell('إعادة تعيين كلمة المرور', 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر لتعيين كلمة مرور جديدة. الرابط صالح لفترة محدودة.', 'تعيين كلمة مرور جديدة', link),
      }
    case 'magiclink':
      return {
        subject: 'رابط الدخول إلى Contractor Pro',
        html: shell('رابط الدخول السريع', 'اضغط الزر للدخول إلى حسابك مباشرة بدون كلمة مرور.', 'الدخول الآن', link),
      }
    case 'email_change':
    case 'email_change_current':
    case 'email_change_new':
      return {
        subject: 'تأكيد تغيير البريد الإلكتروني',
        html: shell('تأكيد تغيير البريد', 'اضغط الزر لتأكيد تغيير عنوان بريدك الإلكتروني المرتبط بالحساب.', 'تأكيد التغيير', link),
      }
    case 'invite':
      return {
        subject: 'دعوة للانضمام إلى Contractor Pro',
        html: shell('تمّت دعوتك 🎉', 'تمّت دعوتك للانضمام. اضغط الزر لقبول الدعوة وإعداد حسابك.', 'قبول الدعوة', link),
      }
    default:
      return {
        subject: 'Contractor Pro',
        html: shell('إشعار من Contractor Pro', 'اضغط الزر للمتابعة.', 'متابعة', link),
      }
  }
}

// ─── إرسال عبر Resend ─────────────────────────────────────────────────────────
async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Resend error ${res.status}: ${t}`)
  }
}

// ─── المعالج ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const payload = await req.text()

  // تحقّق توقيع الـ hook (Standard Webhooks)
  let data: any
  try {
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(HOOK_SECRET)
    data = wh.verify(payload, headers)
  } catch (err) {
    console.error('send-auth-email: signature verification failed', err)
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const email = data?.user?.email as string
    const ed = data?.email_data ?? {}
    const type = (ed.email_action_type as string) || 'signup'
    const link = buildActionLink(ed.token_hash, type, ed.redirect_to)

    const { subject, html } = renderEmail(type, link)
    await sendViaResend(email, subject, html)

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('send-auth-email: send failed', err)
    // أعد 500 ليعيد Supabase المحاولة
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
