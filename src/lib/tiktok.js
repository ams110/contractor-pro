// ─── TikTok Pixel helper ──────────────────────────────────────────────────────
// البيكسل نفسه مُحمّل في index.html ويعمل دائماً (بلا ربط بموافقة الكوكيز).
// هذا الملف مجرّد غلاف آمن لإطلاق أحداث الصفحة/التحويلات من داخل التطبيق (SPA).
// كل الدوال صامتة إن لم يكن `ttq` موجوداً (مثلاً في بيئة الاختبار/الساندبوكس).

function ttq() {
  return typeof window !== 'undefined' ? window.ttq : null
}

/** عرض صفحة — يُطلق عند كل تنقّل client-side (الـHTML يطلق الأولى تلقائياً). */
export function ttPage() {
  try { ttq()?.page?.() } catch { /* noop */ }
}

/** حدث عام — مثل CompleteRegistration / Subscribe / InitiateCheckout. */
export function ttTrack(event, params) {
  try { ttq()?.track?.(event, params || {}) } catch { /* noop */ }
}

/** ربط هوية المستخدم (بريد/هاتف مجزّأين تلقائياً من TikTok) لتطابق أفضل. */
export function ttIdentify(data) {
  try { ttq()?.identify?.(data || {}) } catch { /* noop */ }
}
