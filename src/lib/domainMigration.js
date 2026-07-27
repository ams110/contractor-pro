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

/**
 * يرصد روابط مصادقة Supabase — بتحمل التوكن في الـhash (تدفّق implicit):
 * `#access_token=...&refresh_token=...&type=recovery`.
 * لازم يمرّ الـhash كما هو للنطاق الجديد وإلا بينكسر تأكيد الإيميل/استعادة كلمة السر.
 */
export function isAuthCallbackHash(hash = '') {
  return /(?:(?:access_token|refresh_token|error_description)=|type=(?:recovery|signup|magiclink|invite|email_change))/.test(hash)
}

/**
 * يبني رابط الوجهة على النطاق الجديد.
 * **يحافظ على الـhash الأصلي** ويضيف الحمولة كمقطع مستقلّ بعده — لأنّ الـhash قد يحمل
 * توكن جلسة قادم من رابط مصادقة. (الحمولة مُرمَّزة بـencodeURIComponent فما بتحوي
 * `&` ولا `=` غير مرمَّزين، فالفصل بـ`&` آمن.)
 */
export function buildMigrationUrl({ pathname, search, hash = '', payload, origin = NEW_ORIGIN }) {
  const base     = origin + (pathname || '/') + (search || '')
  const origHash = (hash || '').replace(/^#/, '')

  let encoded = ''
  if (payload && Object.keys(payload).length) {
    try {
      const candidate = encodeURIComponent(JSON.stringify(payload))
      if (candidate.length <= MAX_BYTES) encoded = candidate   // الضخم يُسقَط — التحويل أهمّ
    } catch { /* حمولة غير قابلة للترميز — تجاهل */ }
  }

  const seg = encoded ? `${HASH_KEY}=${encoded}` : ''
  const out = [origHash, seg].filter(Boolean).join('&')
  return out ? `${base}#${out}` : base
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
  const raw = (location.hash || '').replace(/^#/, '')
  if (!raw.includes(`${HASH_KEY}=`)) return 0

  // نفصل مقطع الحمولة عن باقي الـhash — الباقي قد يكون توكن جلسة من رابط مصادقة
  // وما يجوز نمسحه قبل ما يقرأه supabase-js.
  const segs = raw.split('&')
  const mine = segs.filter(s => s.startsWith(`${HASH_KEY}=`))
  const rest = segs.filter(s => !s.startsWith(`${HASH_KEY}=`)).join('&')

  let count = 0
  try {
    const data = JSON.parse(decodeURIComponent(mine[0].slice(HASH_KEY.length + 1)))
    for (const [k, v] of Object.entries(data)) {
      if (DENY_PATTERNS.some(re => re.test(k))) continue
      if (localStorage.getItem(k) !== null) continue
      if (typeof v !== 'string') continue
      localStorage.setItem(k, v)
      count++
    }
  } catch { /* حمولة تالفة — تجاهل */ }

  // نشيل مقطع الحمولة فقط ونُبقي باقي الـhash كما هو
  try {
    history.replaceState(null, '', location.pathname + location.search + (rest ? `#${rest}` : ''))
  } catch { /* تجاهل */ }
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
    hash:     location.hash,
    payload,
  })
  const go = () => { location.replace(target) }

  // رابط مصادقة: حوّل **فوراً وتزامنياً** حتى لا يستهلك supabase-js التوكن من الـhash
  // ويخزّن الجلسة على الأصل القديم (وجلسات Supabase غير مُرحَّلة عمداً). تنظيف الـSW
  // بيصير بأي زيارة تانية للنطاق القديم.
  if (isAuthCallbackHash(location.hash)) { go(); return true }

  // الحالة العادية: نلغّي الـSW ثم نحوّل، بمهلة حتى ما يعلق المستخدم لو تعطّل الإلغاء.
  Promise.race([
    tearDownServiceWorker(),
    new Promise(res => setTimeout(res, 1500)),
  ]).then(go, go)

  return true
}
