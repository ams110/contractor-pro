// ─── TikTok Pixel helper ──────────────────────────────────────────────────────
// البيكسل JS مُحمّل في index.html ويعمل دائماً (بلا ربط بموافقة الكوكيز).
// + قناة ثانية server-side عبر Edge Function `track-tiktok-event` للأحداث
// الحسّاسة (Lead/CompleteRegistration/CompletePayment/Subscribe) — تعمل حتى مع
// adblock وiOS، وتُدمج مع حدث الـclient بنفس `event_id` (deduplication).

function ttq() {
  return typeof window !== 'undefined' ? window.ttq : null
}

/** عرض صفحة — يُطلق عند كل تنقّل client-side (الـHTML يطلق الأولى تلقائياً). */
export function ttPage() {
  try { ttq()?.page?.() } catch { /* noop */ }
}

/** حدث client-side فقط — للأحداث الخفيفة (ViewContent/ClickButton). */
export function ttTrack(event, params) {
  try { ttq()?.track?.(event, params || {}) } catch { /* noop */ }
}

/** ربط هوية المستخدم (بريد/هاتف مجزّأين تلقائياً من TikTok) لتطابق أفضل. */
export function ttIdentify(data) {
  try { ttq()?.identify?.(data || {}) } catch { /* noop */ }
}

/** يولّد UUID آمن للأحداث (لمشاركة `event_id` بين client و server للـdedup). */
export function ttEventId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* noop */ }
  // احتياط نادر — توافق المتصفحات القديمة
  return 'tt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

/**
 * حدث server-side عبر Edge Function (events API).
 * صامت إن فشل الاتصال أو لم يكن العميل جاهزاً (مثلاً بيئة الاختبار).
 * @param {string} event اسم الحدث (Lead/CompleteRegistration/Subscribe/...)
 * @param {object} [opts] { event_id, user:{email,phone,external_id,ttclid,ttp}, properties }
 */
export async function ttServerTrack(event, opts = {}) {
  if (!event) return
  try {
    const { supabase } = await import('./supabase.js')
    const page = typeof window !== 'undefined'
      ? { url: window.location.href, referrer: document.referrer || undefined }
      : undefined
    await supabase.functions.invoke('track-tiktok-event', {
      body: {
        event,
        event_id:   opts.event_id,
        event_time: opts.event_time,
        user:       opts.user,
        page,
        properties: opts.properties,
      },
    })
  } catch { /* noop — لا نريد كسر التطبيق على فشل تتبّع */ }
}

/**
 * يطلق نفس الحدث على القناتين بنفس `event_id` — TikTok يدمجهما (deduplication).
 * استعمله للأحداث المهمّة (Lead/CompleteRegistration/Subscribe/CompletePayment)
 * حيث adblock أو iOS قد يبلّك الـclient.
 * @returns {string} event_id الذي تم إطلاقه (مفيد للتتبّع لاحقاً)
 */
export function ttTrackBoth(event, opts = {}) {
  const event_id = opts.event_id || ttEventId()
  // client first (فوري) — يستعمل properties فقط
  ttTrack(event, { ...(opts.properties || {}), event_id })
  // server بالخلفية (لا ننتظر)
  ttServerTrack(event, { ...opts, event_id })
  return event_id
}
