// ═══════════════════════════════════════════════════════════════════════════
//  إسناد التسويق (Attribution) — «نوقف العمى» (CONVERSION_PLAN §P2)
//  ───────────────────────────────────────────────────────────────────────────
//  بيلتقط مصدر الزائر (UTM + معرّفات النقر tiktok/google) **بأول زيارة** ويخزّنه
//  (first-touch، ما بينكتب فوقه)، عشان لمّا الزائر يسجّل نعرف **أي إعلان/حملة**
//  جابته. بلا هاد، التسجيلات بتيجي بلا هوية ومستشار الإعلانات بيضل أعمى عن
//  «أي زاوية بتحوّل فعلاً» — وهي كل الحلقة.
//
//  - `parseAttribution(search, referrer)` — دالة نقيّة (قابلة للاختبار).
//  - `captureAttribution()` — تُستدعى مرّة عند الإقلاع (main.jsx)؛ تخزّن first-touch.
//  - `getAttribution()` — تقرأ المخزّن (أو null).
//  - `attributionForSignup()` — نسخة مسطّحة جاهزة للحفظ في user_metadata/الأحداث.
// ═══════════════════════════════════════════════════════════════════════════

const KEY = 'cp_attribution'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

/**
 * يستخرج إشارات الإسناد من سلسلة استعلام + المُحيل (referrer). دالة نقيّة.
 * @param {string} search — مثل `?utm_source=tiktok&utm_campaign=haj`
 * @param {string} [referrer] — document.referrer
 * @returns {{source:string, medium:string|null, campaign:string|null, content:string|null, term:string|null, clickId:string|null, clickType:string|null, referrer:string|null}}
 */
export function parseAttribution(search = '', referrer = '') {
  const p = new URLSearchParams(search || '')

  const utm = {}
  for (const k of UTM_KEYS) utm[k] = p.get(k) || null

  // معرّفات النقر من المنصّات — أوثق من UTM (المنصّة بتحطّها تلقائياً).
  const ttclid = p.get('ttclid')
  const gclid = p.get('gclid')
  const fbclid = p.get('fbclid')
  let clickId = null, clickType = null
  if (ttclid) { clickId = ttclid; clickType = 'ttclid' }
  else if (gclid) { clickId = gclid; clickType = 'gclid' }
  else if (fbclid) { clickId = fbclid; clickType = 'fbclid' }

  // تصنيف المصدر: UTM صريح > معرّف نقر > تحليل المُحيل > مباشر.
  let source = utm.utm_source
  if (!source) {
    if (ttclid) source = 'tiktok'
    else if (gclid) source = 'google'
    else if (fbclid) source = 'facebook'
    else if (referrer) source = referrerSource(referrer)
    else source = 'direct'
  }

  return {
    source,
    medium: utm.utm_medium,
    campaign: utm.utm_campaign,
    content: utm.utm_content,
    term: utm.utm_term,
    clickId,
    clickType,
    referrer: referrer || null,
  }
}

/** يصنّف المُحيل لمصدر معروف (عضوي) — دالة نقيّة. */
export function referrerSource(referrer = '') {
  const r = referrer.toLowerCase()
  if (!r) return 'direct'
  if (r.includes('tiktok')) return 'tiktok'
  if (r.includes('google')) return 'google'
  if (r.includes('facebook') || r.includes('fb.')) return 'facebook'
  if (r.includes('instagram')) return 'instagram'
  if (r.includes('youtube')) return 'youtube'
  if (r.includes('whatsapp') || r.includes('wa.me')) return 'whatsapp'
  try {
    // أي نطاق خارجي غير معروف → اسم النطاق كمصدر إحالة
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (host && typeof window !== 'undefined' && host !== window.location.hostname) return host
  } catch { /* referrer مش URL صالح */ }
  return 'direct'
}

/**
 * يلتقط الإسناد عند أول زيارة ويخزّنه (first-touch). آمن خارج المتصفح.
 * بيضيف `firstSeen` (ISO) + `landingPath`. ما بينكتب فوق إسناد محفوظ مسبقاً.
 * @returns {object|null} الإسناد الحالي (المخزّن أو الجديد).
 */
export function captureAttribution() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return JSON.parse(existing) // first-touch محفوظ — لا تدُس عليه

    const attr = parseAttribution(window.location.search, document.referrer)
    // ما في إشارة إسناد فعلية + ما في معلومة مفيدة → لا تخزّن «direct» فاضي،
    // عشان زيارة لاحقة بـUTM تُلتقط بدل ما تنحبس على «direct».
    const meaningful = attr.source !== 'direct' || attr.clickId
    if (!meaningful) return attr

    const stored = {
      ...attr,
      firstSeen: new Date().toISOString(),
      landingPath: window.location.pathname,
    }
    localStorage.setItem(KEY, JSON.stringify(stored))
    return stored
  } catch {
    return null
  }
}

/** يقرأ الإسناد المخزّن (أو null). آمن خارج المتصفح. */
export function getAttribution() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * نسخة مسطّحة بادئتها `attr_` — جاهزة للحفظ في user_metadata أو كخصائص حدث.
 * بيرجّع `{}` لو ما في إسناد، فآمن للدمج (spread) دايماً.
 */
export function attributionForSignup() {
  const a = getAttribution()
  if (!a) return {}
  const out = {}
  if (a.source) out.attr_source = a.source
  if (a.medium) out.attr_medium = a.medium
  if (a.campaign) out.attr_campaign = a.campaign
  if (a.content) out.attr_content = a.content
  if (a.term) out.attr_term = a.term
  if (a.clickId) out.attr_click_id = a.clickId
  if (a.clickType) out.attr_click_type = a.clickType
  if (a.landingPath) out.attr_landing = a.landingPath
  if (a.firstSeen) out.attr_first_seen = a.firstSeen
  return out
}
