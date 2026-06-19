// ─── Google Analytics 4 ───────────────────────────────────────────────────────
// نُحمّل gtag لكل الزوّار من أول ثانية بموافقة افتراضية = granted (تتبّع كامل
// دائماً، بلا انتظار قرار المستخدم) — لجمع بيانات تحليلية حقيقية لتقييم الإعلانات،
// بنفس سلوك TikTok Pixel. الدالة النقيّة isGranted قابلة للاختبار.

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
 * يحقن gtag مرّة واحدة ويهيّئ GA4 بموافقة افتراضية = granted (تتبّع كامل دائماً).
 * آمن للاستدعاء مرّة واحدة عند الإقلاع.
 * @param {boolean} _alreadyGranted (مُتجاهَل — التتبّع مُفعّل دائماً)
 */
export function initAnalytics(_alreadyGranted = false, id = GA_ID) {
  if (initialized || typeof document === 'undefined' || !id) return
  initialized = true
  window.dataLayer = window.dataLayer || []
  // موافقة افتراضية granted — تتبّع كامل للجميع بلا انتظار قرار المستخدم
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
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

/**
 * يسجّل مشاهدة صفحة في GA4 يدوياً — ضروري للتطبيق أحادي الصفحة (SPA): GA يرسل
 * مشاهدة واحدة تلقائياً عند الإقلاع فقط، فأي تنقّل client-side لاحق لا يُحتسب
 * إلا بنداء هذه الدالة. آمن: لا يفعل شيئاً إن لم يُحمّل gtag بعد.
 * @param {string} [path] مسار الصفحة (افتراضياً location.pathname)
 * @param {string} [title] عنوان الصفحة (افتراضياً document.title)
 */
export function pageview(path, title) {
  if (typeof window === 'undefined' || !window.dataLayer) return
  const loc = typeof location !== 'undefined' ? location : null
  gtag('event', 'page_view', {
    page_path:     path  || loc?.pathname,
    page_location: loc?.href,
    page_title:    title || (typeof document !== 'undefined' ? document.title : undefined),
  })
}

/**
 * يربط هوية المستخدم بـ GA4 (user_id) لتوحيد الجلسات عبر الأجهزة وقياس أدقّ
 * لمسار التحويل. تمرير null يلغي الربط (تسجيل خروج). آمن إن لم يُحمّل gtag.
 * @param {string|null} id معرّف المستخدم (مثلاً Supabase auth uid)
 */
export function setAnalyticsUser(id) {
  if (typeof window === 'undefined' || !window.dataLayer) return
  gtag('set', { user_id: id || undefined })
  if (id) gtag('config', GA_ID, { user_id: id })
}

/**
 * يسجّل حدث تحويل في GA4 (قمع: زيارة هبوط · دخول ديمو · بدء تسجيل · ...).
 * آمن: لا يفعل شيئاً إن لم يُحمّل gtag بعد (بلا أخطاء).
 * @param {string} name اسم الحدث
 * @param {object} [params] خصائص إضافية
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !window.dataLayer || !name) return
  gtag('event', name, params)
}
