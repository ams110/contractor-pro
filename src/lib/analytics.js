// ─── Google Analytics 4 + Consent Mode v2 ─────────────────────────────────────
// نُحمّل gtag لكل الزوّار من أول ثانية، لكن مع حالة موافقة افتراضية = denied
// (بلا كوكيز تحليلات). عند ضغط المستخدم «موافق» نرفعها إلى granted فتُفعَّل
// الكوكيز كاملةً. بهذا نقيس الجميع تقريباً (جوجل تقدّر بيانات غير الموافقين
// إحصائياً) مع الالتزام بالخصوصية. الدالة النقيّة isGranted قابلة للاختبار.

export const GA_ID = 'G-KFGX0K1VT5'

let initialized = false

/** نقيّة: هل القيمة المخزّنة تعني موافقة على التحليلات؟ */
export function isGranted(value) {
  return value === 'granted'
}

function gtag() {
  // gtag يعتمد على arguments الحقيقية (لا rest spread)
  window.dataLayer.push(arguments)
}

/**
 * يحقن gtag مرّة واحدة ويضبط الموافقة الافتراضية = denied (Consent Mode v2)،
 * ثم يهيّئ GA4. آمن للاستدعاء قبل أي قرار موافقة.
 * @param {boolean} alreadyGranted لو وافق المستخدم سابقاً، نبدأ بـ granted مباشرة
 */
export function initAnalytics(alreadyGranted = false, id = GA_ID) {
  if (initialized || typeof document === 'undefined' || !id) return
  initialized = true
  window.dataLayer = window.dataLayer || []
  // الموافقة الافتراضية قبل تحميل السكربت — منع كوكيز التحليلات حتى القبول
  gtag('consent', 'default', {
    analytics_storage: alreadyGranted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)
  gtag('js', new Date())
  gtag('config', id, { anonymize_ip: true })
}

/** يرفع الموافقة إلى granted بعد ضغط المستخدم «موافق» (يفعّل كوكيز التحليلات). */
export function grantConsent() {
  if (typeof window === 'undefined' || !window.dataLayer) return
  gtag('consent', 'update', { analytics_storage: 'granted' })
}
