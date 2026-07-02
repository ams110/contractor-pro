// ─── طبقة تتبّع موحّدة (Google Analytics 4 + TikTok) ──────────────────────────
// مصدر واحد لكل أحداث قمع التحويل. كل دالة هنا تمثّل خطوة في رحلة الزبون
// وتطلق الحدث على **القناتين معاً** بأسماء كل منصّة القياسية:
//   • Google Analytics 4  — أحداث GA4 الموصى بها (page_view/sign_up/login/
//     generate_lead/begin_checkout/purchase/view_item_list) لتقارير القمع وربط
//     Google Ads (تحويلات + Enhanced Conversions).
//   • TikTok Pixel        — أحداث TikTok القياسية (ClickButton/ViewContent/
//     InitiateCheckout/CompleteRegistration/Lead/CompletePayment) لتحسين الحملات.
//
// الأحداث الحسّاسة (تسجيل/شراء) تُطلق server-side أيضاً عبر TikTok Events API
// (deduplication بـ event_id) فتصمد رغم adblock/iOS. كل الدوال آمنة تماماً:
// تبتلع الأخطاء داخلياً (عبر طبقات analytics.js/tiktok.js) ولا تكسر التطبيق إن
// غاب أي مزوّد. **استعمل هذه الطبقة بدل نداء analytics/tiktok مباشرة** لأي حدث
// قمع جديد — هيك يبقى القياس موحّداً على المنصّتين بلا تكرار أو انجراف.

import { trackEvent, pageview, setAnalyticsUser, trackAdsConversion } from './analytics.js'
import { ttTrack, ttTrackBoth, ttIdentify } from './tiktok.js'

const CUR = 'ILS' // كل المبالغ بالشيكل — لازم لحساب ROAS بدقّة على المنصّتين

/** عملة المتجر (شيكل) — مُصدَّرة للاستعمال الخارجي عند الحاجة. */
export const CURRENCY = CUR

// ─── مشاهدة صفحة (SPA) ────────────────────────────────────────────────────────
/** مشاهدة صفحة عند كل تنقّل client-side: GA4 page_view + TikTok PageView. */
export function trackPageview(path) {
  pageview(path)
  // TikTok page() يُطلق من Router مباشرة (ttPage) — لا نكرّره هنا.
}

// ─── أعلى القمع: نقر CTA / عرض محتوى ──────────────────────────────────────────
/**
 * نقر زرّ دعوة لإجراء (هبوط/أسعار): GA4 cta_click + TikTok ClickButton.
 * @param {string} location موضع الزرّ (مثلاً landing_hero / landing_pricing_cta)
 */
export function trackCtaClick(location, extra = {}) {
  trackEvent('cta_click', { location, ...extra })
  ttTrack('ClickButton', { content_name: location, ...extra })
}

/** عرض صفحة الأسعار: GA4 view_item_list + TikTok ViewContent. */
export function trackViewPricing(cycle) {
  trackEvent('view_item_list', { item_list_name: 'pricing', cycle })
  ttTrack('ViewContent', { content_category: 'pricing', content_name: 'pricing_page', ...(cycle ? { content_type: cycle } : {}) })
}

/** فتح الديمو التفاعلي: GA4 demo_view + TikTok ViewContent (إشارة اهتمام قويّة). */
export function trackDemoView() {
  trackEvent('demo_view')
  ttTrack('ViewContent', { content_category: 'demo', content_name: 'interactive_demo' })
}

// ─── وسط القمع: بدء الدفع ──────────────────────────────────────────────────────
/**
 * بدء الدفع (فتح Paddle): GA4 begin_checkout + TikTok InitiateCheckout.
 * @param {object} o
 * @param {string} o.plan باقة (starter/pro/business)
 * @param {string} o.cycle دورة الفوترة (month/year)
 * @param {number} o.value قيمة الصفقة بالشيكل (للـ ROAS)
 */
export function trackBeginCheckout({ plan, cycle, value } = {}) {
  trackEvent('begin_checkout', {
    currency: CUR, value,
    items: [{ item_id: plan, item_name: plan, item_category: cycle, price: value }],
  })
  ttTrack('InitiateCheckout', { content_name: plan, content_type: cycle, currency: CUR, value })
}

// ─── أسفل القمع: تسجيل / شراء (القناتان + server-side) ─────────────────────────
/**
 * إنشاء حساب جديد (بدء تجربة): GA4 sign_up + generate_lead، وTikTok
 * CompleteRegistration + Lead — كلاهما client + server (deduplication بـ event_id).
 * @param {object} [o] { email, userId } لمطابقة أفضل على TikTok (يُجزّأ خادمياً)
 */
export function trackSignUp({ email, userId } = {}) {
  trackEvent('sign_up', { method: 'email' })
  trackEvent('generate_lead', { currency: CUR })
  // تحويل Google Ads — إجراء التحويل المُنشأ في حساب الإعلانات (يُحتسب فقط إن
  // ضُبط GADS_ID؛ وإلا يبقى حدثاً عادياً في GA4 بلا كسر).
  trackAdsConversion('conversion_event_signup')
  const user = { email, external_id: userId }
  ttTrackBoth('CompleteRegistration', { properties: { content_name: 'signup' }, user })
  ttTrackBoth('Lead', { properties: { content_name: 'trial_signup' }, user })
}

/** تسجيل دخول: GA4 login (ليس حدث تحويل إعلاني، فلا يُطلق على TikTok). */
export function trackLogin(method = 'password') {
  trackEvent('login', { method })
}

/**
 * إتمام شراء: GA4 purchase + TikTok CompletePayment — client + server.
 * (paddle-webhook يطلق Subscribe خادمياً مستقلاً.)
 * @param {object} o { plan, cycle, value, email, userId }
 */
export function trackPurchase({ plan, cycle, value, email, userId } = {}) {
  trackEvent('purchase', {
    currency: CUR, value,
    items: [{ item_id: plan, item_name: plan, item_category: cycle, price: value }],
  })
  ttTrackBoth('CompletePayment', {
    properties: { content_name: plan, content_type: cycle, currency: CUR, value },
    user: { email, external_id: userId },
  })
}

// ─── التفعيل (Activation) — لحظات القيمة الأولى داخل التطبيق ──────────────────────
// أحداث «أول مرة» تقيس عبور المستخدم لجدار التفعيل:
//   سجّل → أضاف أوّل عامل → سجّل أوّل يوم → صرف أوّل دفعة → سجّل أوّل مقبوض.
// هي المقياس الأهم حالياً (نسبة التفعيل = 0%، راجع docs/founder/PLAN.md): بدونها
// ما منعرف عند أي زرّ بالضبط يتسرّب المستخدمون. كل حدث يُطلق **مرّة واحدة فقط لكل
// مستخدم** عبر حارس localStorage، فلا يتكرّر مع كل إضافة ولا عند إعادة الإضافة بعد
// حذف في نفس المتصفح. يُرسَل على القناتين (GA4 حدث قمع مخصّص + TikTok حدث مخصّص).
const ACT_PREFIX = 'cp_act_'

/**
 * يطلق دالة `fire` مرّة واحدة فقط لكل (خطوة، مستخدم) عبر حارس localStorage.
 * يُرجع true إن أُطلق فعلاً هذه المرّة. آمن تماماً: إن غاب localStorage (SSR/محجوب)
 * يطلق بلا حارس بدل أن يكسر. غياب userId (نادر) يطلق كذلك دون تخزين.
 * @param {string} step اسم الخطوة (employee/workday/payment/receipt)
 * @param {string} userId هوية صاحب الحساب (eid)
 * @param {() => void} fire ما يُطلق فعلياً على القناتين
 */
function fireOnce(step, userId, fire) {
  const key = userId ? `${ACT_PREFIX}${step}_${userId}` : null
  try {
    if (key && typeof localStorage !== 'undefined') {
      if (localStorage.getItem(key)) return false
      localStorage.setItem(key, '1')
    }
  } catch { /* localStorage محجوب — نطلق مرّة على الأقل بدل الكسر */ }
  fire()
  return true
}

/** أوّل عامل يُضاف — لحظة التفعيل #1 (الجدار الحالي). GA4 first_employee + TikTok. */
export function trackFirstEmployee(userId) {
  return fireOnce('employee', userId, () => {
    trackEvent('first_employee')
    ttTrack('first_employee', { content_name: 'first_employee' })
  })
}

/** أوّل يوم عمل يُسجَّل — لحظة التفعيل #2. GA4 first_workday + TikTok. */
export function trackFirstWorkday(userId) {
  return fireOnce('workday', userId, () => {
    trackEvent('first_workday')
    ttTrack('first_workday', { content_name: 'first_workday' })
  })
}

/** أوّل دفعة راتب تُصرَف — لحظة التفعيل #3. GA4 first_payment + TikTok. */
export function trackFirstPayment(userId) {
  return fireOnce('payment', userId, () => {
    trackEvent('first_payment')
    ttTrack('first_payment', { content_name: 'first_payment' })
  })
}

/** أوّل مقبوض/فاتورة يُسجَّل — لحظة التفعيل #4. GA4 first_receipt + TikTok. */
export function trackFirstReceipt(userId) {
  return fireOnce('receipt', userId, () => {
    trackEvent('first_receipt')
    ttTrack('first_receipt', { content_name: 'first_receipt' })
  })
}

// ─── ربط الهوية ────────────────────────────────────────────────────────────────
/**
 * يربط هوية المستخدم بالقناتين: GA4 user_id + TikTok identify (بريد مجزّأ تلقائياً
 * من TikTok). تمرير null/فارغ يلغي الربط (تسجيل خروج). يُستدعى من App.jsx مع تغيّر
 * المستخدم (بجانب Sentry) فيغطّي كل الجلسات المصادَقة.
 * @param {{id?:string, email?:string}|null} user
 */
export function identifyUser(user) {
  setAnalyticsUser(user?.id || null)
  if (user?.email || user?.id) {
    ttIdentify({ email: user.email || undefined, external_id: user.id || undefined })
  }
}
