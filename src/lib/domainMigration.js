// ─── ترحيل النطاق: app.linko.services → kabblan.com ─────────────────────────────
// المشكلة اللي بتصير بأي ترحيل نطاق لتطبيق PWA:
//   1. الـService Worker مسجَّل على النطاق القديم ومعه precache كامل — لو حوّلنا
//      بـredirect من الخادم بس، الـSW القديم بيظلّ يعترض التنقّلات ويخدم نسخة
//      مخزّنة إلى الأبد (التحديث بيفشل لأنّ /sw.js نفسه صار redirect).
//   2. الـlocalStorage معزول لكل origin — بيانات متتبّع الوحدات (tracker_*/extras_*/
//      blueprints_*) موجودة **محلياً فقط** (مش بالقاعدة) وبتضيع كلياً.
//   3. الروابط القديمة المنتشرة (بوّابة العامل بالواتساب، صفحات الحاسبة بجوجل)
//      لازم توصل للمسار نفسه على النطاق الجديد بلا ما يضيع الـquery.
//
// هذا الملف بيعالج الثلاثة على العميل: بيلغّي تسجيل الـSW ويمسح الكاش، بيصدّر
// المفاتيح غير الحسّاسة عبر الـhash (الـhash ما بينبعث للخادم ولا بـReferer)،
// وبيحوّل للنطاق الجديد بنفس المسار والـquery.
//
// الأسرار (بيانات دخول PIN/passkey، مفتاح التشفير، توكن جلسة العامل) **ما بتُرحَّل**
// عمداً — المستخدم بيعيد ضبط الـPIN/البصمة على النطاق الجديد.

export const NEW_ORIGIN  = 'https://kabblan.com'
export const LEGACY_HOSTS = ['app.linko.services', 'www.kabblan.com']

const HASH_KEY  = '__kblmig'
const MAX_BYTES = 300 * 1024   // سقف أمان لحجم الـhash

// مفاتيح تستحقّ الترحيل (بادئات) — بيانات محلية بحتة أو تفضيلات.
const ALLOW_PREFIXES = [
  'tracker_', 'extras_', 'blueprints_',   // متتبّع الوحدات (محلي فقط — الأهم)
  'settings_',                            // تفضيلات المستخدم (تخصّصات/فئات/طرق دفع)
  'contractor-pro-businesses',            // مخزن المصالح (zustand persist)
  'cp_lang', 'cp_theme', 'cp_onboarded', 'cp_consent_v2',
  'cpro_notif_dismissed', 'kbl_analytics_open', 'kbl_calc_vals',
  'kbl_attribution', 'kbl_ref_code',
]

// أي مفتاح بيطابق واحد من هدول ما بيُرحَّل أبداً (حتى لو طابق ALLOW).
const DENY_PATTERNS = [/passkey/i, /pin/i, /cred/i, /token/i, /session/i, /enc_key/i, /^sb-/i]

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

export function shouldMigrate(host = isBrowser() ? location.hostname : '') {
  return LEGACY_HOSTS.includes(host)
}

/** يجمع المفاتيح القابلة للترحيل من localStorage (نقيّة — قابلة للاختبار). */
export function collectMigratableKeys(store) {
  const out = {}
  for (const key of Object.keys(store)) {
    if (DENY_PATTERNS.some(re => re.test(key))) continue
    if (!ALLOW_PREFIXES.some(p => key === p || key.startsWith(p))) continue
    const val = store[key]
    if (typeof val === 'string') out[key] = val
  }
  return out
}

/** يبني رابط الوجهة على النطاق الجديد مع الحمولة بالـhash. */
export function buildMigrationUrl({ pathname, search, payload, origin = NEW_ORIGIN }) {
  const base = origin + (pathname || '/') + (search || '')
  if (!payload || !Object.keys(payload).length) return base
  let encoded
  try { encoded = encodeURIComponent(JSON.stringify(payload)) } catch { return base }
  if (encoded.length > MAX_BYTES) return base   // بلا ترحيل بيانات — التحويل أهمّ
  return `${base}#${HASH_KEY}=${encoded}`
}

/** يلغّي تسجيل كل الـService Workers ويمسح كل الكاشات (best-effort، بلا رمي). */
async function tearDownServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister().catch(() => {})))
    }
  } catch { /* تجاهل */ }
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n).catch(() => {})))
    }
  } catch { /* تجاهل */ }
}

/**
 * يستورد الحمولة المرحَّلة من الـhash (يُستدعى على النطاق الجديد).
 * ما بيدوس على مفتاح موجود أصلاً — النطاق الجديد هو المرجع.
 * @returns {number} عدد المفاتيح المستوردة
 */
export function importMigrationPayload() {
  if (!isBrowser()) return 0
  const hash = location.hash || ''
  const at   = hash.indexOf(`${HASH_KEY}=`)
  if (at === -1) return 0
  let count = 0
  try {
    const raw  = decodeURIComponent(hash.slice(at + HASH_KEY.length + 1))
    const data = JSON.parse(raw)
    for (const [k, v] of Object.entries(data)) {
      if (DENY_PATTERNS.some(re => re.test(k))) continue
      if (localStorage.getItem(k) !== null) continue
      if (typeof v !== 'string') continue
      localStorage.setItem(k, v)
      count++
    }
  } catch { /* حمولة تالفة — تجاهل */ }
  // نظّف الـhash من التاريخ حتى ما يظلّ بالرابط
  try { history.replaceState(null, '', location.pathname + location.search) } catch { /* تجاهل */ }
  return count
}

/**
 * نقطة الدخول — تُستدعى أوّل شي في main.jsx.
 * @returns {boolean} true إذا الصفحة عم تتحوّل (لا تُركّب React)
 */
export function runDomainMigration() {
  if (!isBrowser()) return false

  if (!shouldMigrate()) {
    importMigrationPayload()
    return false
  }

  let payload = {}
  try { payload = collectMigratableKeys({ ...localStorage }) } catch { /* تجاهل */ }
  const target = buildMigrationUrl({
    pathname: location.pathname,
    search:   location.search,
    payload,
  })

  // نلغّي الـSW ثم نحوّل. مهلة قصيرة حتى ما يعلق المستخدم لو تعطّل الإلغاء.
  const go = () => { location.replace(target) }
  Promise.race([
    tearDownServiceWorker(),
    new Promise(res => setTimeout(res, 1500)),
  ]).then(go, go)

  return true
}
