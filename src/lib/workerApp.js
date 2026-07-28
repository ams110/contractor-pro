// ─── بوّابة العامل = تطبيق منفصل على **نطاق فرعي خاص** ─────────────────────────
// العامل ينزّل «بوّابة العامل» كتطبيق مستقل على هاتفه. الفصل على ثلاث طبقات:
//   1. وثيقة/حزمة: `worker.html` → `src/worker-main.jsx` (بلا أي كود من App.jsx)
//   2. manifest/أيقونة: `public/worker.webmanifest` + `worker-*.png`
//   3. 🔴 **الأصل (origin)**: `worker.kabblan.com` — منفصل عن `app.kabblan.com`
//
// **ليش نطاق فرعي ولا يكفي مسار `/worker`؟** جرّبنا المسار أوّلاً وفشل عملياً:
// manifest تطبيق المالك عنده `scope = "/"`، وهو **يشمل** `/worker`. وكروم قاعدته:
// إذا الصفحة الحالية واقعة داخل نطاق تطبيق **مثبَّت أصلاً**، يعتبرها «مثبّتة»
// ويعرض «open the app instead» بدل التثبيت — فيفتح تطبيق المالك. يعني أي واحد
// عنده تطبيق المالك مثبّت (المقاول نفسه، وكل عامل ثبّت البوّابة القديمة بـ`?portal`
// لأنّها كانت تثبّت manifest المالك) صار **محجوباً** عن تثبيت البوّابة.
// ونطاق المالك `/` ما ينفع نضيّقه (المسارات مش متجاورة)، فالحلّ الوحيد المضمون
// هو أصل مختلف: أصل مختلف = سجلّ تطبيقات وscope وتخزين وService Worker مستقلّين.
//
// ⚠️ ملاحظة نشر: المسار على نطاق البوّابة يبقى `/worker` (مش الجذر) لأنّ Vercel
// يخدم الملفات الثابتة **قبل** الـrewrites، فـ`/` يلتقط `index.html` تبع المالك
// ولا يصل للـrewrite. وبدل middleware: تحويل `worker.kabblan.com/` → `/worker`
// (التحويلات تُنفَّذ قبل الملفات). التفاصيل في `vercel.json` و`CLAUDE.md` §4.1.
//
// هذا الملف = المصدر الوحيد لكل قرار يخصّ تطبيق البوّابة. يستعمله `Router.jsx`،
// `lib/hosts.js`، `store/useAppStore.js`، `components/CookieConsent.jsx`، وكل
// مكان يشارك الرابط (`WorkersScreen`/`SettingsScreen`/`WorkerCard`).

/** مسار البوّابة (بلا الـbase). */
export const WORKER_PATH = '/worker'

/** نطاق تطبيق البوّابة على الإنتاج. */
export const WORKER_HOST   = 'worker.kabblan.com'
export const WORKER_ORIGIN = `https://${WORKER_HOST}`

// يطابق `/worker`، `/worker/`، `/worker/xx`، `/worker.html`، وكذلك مع بادئة base
// (مرآة GitHub Pages: `/contractor-pro/worker`).
const WORKER_RE = /(?:^|\/)worker(?:\.html)?(?:\/|$)/

// نطاق الإنتاج (بكل نطاقاته الفرعية). غير ذلك = localhost أو معاينة Vercel،
// وهناك **كل شي يُخدَم من نفس الأصل** فالبوّابة تبقى على المسار `/worker`.
const PROD_DOMAIN_RE = /(?:^|\.)kabblan\.com$/i

/** نطاق إنتاج فعلي؟ (يحدّد: نطاق فرعي للبوّابة أم مسار) */
export function isProdDomain(hostname = '') {
  return PROD_DOMAIN_RE.test(String(hostname))
}

/** هل نحن على نطاق تطبيق البوّابة؟ */
export function isWorkerHost(hostname = '') {
  return String(hostname).toLowerCase() === WORKER_HOST
}

/** هل هذا المسار يخصّ تطبيق البوّابة؟ */
export function isWorkerPath(pathname = '') {
  return WORKER_RE.test(pathname)
}

/** الروابط القديمة المنتشرة عند العمّال: `?portal` / `?worker`. */
export function hasLegacyPortalQuery(search = '') {
  try {
    const q = new URLSearchParams(search)
    return q.has('portal') || q.has('worker')
  } catch { return false }
}

/** أي دخول للبوّابة (نطاقها، أو مسارها، أو رابط قديم). */
export function isWorkerEntry({ hostname = '', pathname = '', search = '' } = {}) {
  return isWorkerHost(hostname) || isWorkerPath(pathname) || hasLegacyPortalQuery(search)
}

/** مسار البوّابة مع احترام الـbase (GitHub Pages يُخدَم من `/contractor-pro/`). */
export function workerPath(base = '/') {
  return String(base).replace(/\/+$/, '') + WORKER_PATH
}

/**
 * وجهة التحويل لأي دخول للبوّابة وصل المكان الغلط.
 *   الإنتاج: أي `/worker` أو `?portal` على نطاق المالك/التسويق → نطاق البوّابة.
 *   التطوير/المعاينة: الروابط القديمة → المسار `/worker` على نفس الأصل.
 * @returns {string|null} الرابط/المسار للتحويل، أو `null` إذا كنّا بمحلّنا
 */
export function workerRedirect({ hostname = '', pathname = '', search = '', hash = '', base = '/' } = {}) {
  if (isWorkerHost(hostname)) return null          // على نطاق البوّابة — بمحلّه

  const onPath = isWorkerPath(pathname)
  const legacy = hasLegacyPortalQuery(search)
  if (!onPath && !legacy) return null               // ما إلها علاقة بالبوّابة

  const q = new URLSearchParams(search)
  q.delete('portal')
  q.delete('worker')
  const rest = q.toString()
  const qs = rest ? `?${rest}` : ''

  // إنتاج → نطاق البوّابة المستقل (هون بيتحلّ تصادم الـscope)
  if (isProdDomain(hostname)) return `${WORKER_ORIGIN}${WORKER_PATH}${qs}${hash}`

  // تطوير/معاينة: نفس الأصل. إذا أصلاً على المسار وبلا رابط قديم فما في تحويل.
  if (onPath && !legacy) return null
  return workerPath(base) + qs + hash
}

/**
 * الرابط الكامل الذي يُشارَك مع العامل (واتساب/QR).
 * على الإنتاج = نطاق البوّابة المستقل، وبالتطوير/المعاينة = مسار على نفس الأصل.
 */
export function workerPortalUrl({ hostname = '', origin = '', base = '/' } = {}) {
  if (isWorkerHost(hostname) || isProdDomain(hostname)) return WORKER_ORIGIN + WORKER_PATH
  return String(origin).replace(/\/+$/, '') + workerPath(base)
}

/** مساعد للمتصفّح: يقرأ `window.location` بنفسه. */
export function currentWorkerPortalUrl() {
  if (typeof window === 'undefined') return WORKER_ORIGIN + WORKER_PATH
  return workerPortalUrl({
    hostname: window.location.hostname,
    origin:   window.location.origin,
    base:     import.meta.env?.BASE_URL || '/',
  })
}
