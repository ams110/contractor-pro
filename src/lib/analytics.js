// ─── Google Analytics 4 — تحميل مشروط بالموافقة ───────────────────────────────
// لا يُحمَّل gtag إطلاقاً إلا بعد موافقة المستخدم الصريحة على لافتة الكوكيز.
// هذا يحترم وعد الخصوصية: لا تتبّع ولا كوكيز تحليلات قبل القبول. الدالة النقيّة
// isGranted قابلة للاختبار، وبقيّة الدوال تلمس DOM/window بحراسة آمنة.

export const GA_ID = 'G-KFGX0K1VT5'

let loaded = false

/** نقيّة: هل القيمة المخزّنة تعني موافقة على التحليلات؟ */
export function isGranted(value) {
  return value === 'granted'
}

/**
 * يحقن سكربت gtag مرّة واحدة ويهيّئ GA4. يُستدعى فقط بعد الموافقة.
 * anonymize_ip لتقليل البيانات الشخصية المُرسلة.
 */
export function loadGtag(id = GA_ID) {
  if (loaded || typeof document === 'undefined' || !id) return
  loaded = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', id, { anonymize_ip: true })
}
