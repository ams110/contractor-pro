// ─── تقسيم النطاقات: تسويق × تطبيق ──────────────────────────────────────────────
// مصدر واحد لقرار «أي مسار يعيش على أي نطاق». يستعمله `Router.jsx` (تحويل عبر
// النطاقات) و`domainMigration.js` (وجهة الترحيل من النطاق القديم).
//
//   kabblan.com      → التسويق: الهبوط، الأسعار، الحاسبات، المدوّنة، القانونية
//   app.kabblan.com  → التطبيق: الشاشات، الدخول/التسجيل، بوّابة العامل، الأدمن
//
// **قاعدة حاسمة**: التقسيم يُطبَّق **فقط على نطاقات الإنتاج**. على `localhost`
// ومعاينات Vercel (`*.vercel.app`) يُخدَم **كل شي من نفس الأصل** — وإلا انكسر
// التطوير المحلي وكل معاينة PR (بتحوّل على الإنتاج بدل ما تعرض التغيير).

import { WORKER_PATH, WORKER_HOST, isWorkerEntry } from './workerApp.js'

export const MARKETING_ORIGIN = 'https://kabblan.com'
export const APP_ORIGIN       = 'https://app.kabblan.com'

export const MARKETING_HOST = 'kabblan.com'
export const APP_HOST       = 'app.kabblan.com'
// الـwww بيتحوّل على الجذر بـ308 من Vercel. منتعامل معه بالكود كمان كشبكة أمان:
// لو تعطّل إعداد التحويل لأي سبب، منحوّله بدل ما ينكسر منطق الفصل بصمت
// (النطاق الرسمي بالـcanonical/sitemap/OG هو الجذر بلا www).
export const WWW_HOST       = 'www.kabblan.com'

// مسارات التطبيق — تعيش على app.kabblan.com حصراً.
// `/worker` = تطبيق بوّابة العامل المنفصل (وثيقة وmanifest خاصّين — انظر
// `lib/workerApp.js`). لازم يكون هنا صريحاً كي يُحوَّل رابط انتشر على نطاق
// التسويق بالغلط إلى نطاق التطبيق بدل ما ينكسر.
const APP_PATHS = new Set([
  '/app', '/login', '/register', '/welcome', '/thankyou', '/admin', WORKER_PATH,
])

// مسارات التسويق — تعيش على kabblan.com حصراً (صفحات مفهرسة بجوجل).
const MARKETING_PATHS = new Set(['/', '/calculator', '/vat-calculator', '/blog', '/demo'])

// مسارات مشتركة تُعرَض على النطاقين: الأسعار (ترقية من داخل التطبيق) والصفحات
// القانونية (مرتبطة من الإعدادات). الـcanonical تبعها دايماً على نطاق التسويق،
// ونطاق التطبيق كله `noindex` فما بيصير تكرار عند جوجل.
const SHARED_PATHS = new Set([
  '/pricing', '/terms', '/privacy', '/refund', '/contact', '/delete-account',
])

/** نطاق إنتاج فعلي؟ (غير ذلك = تطوير/معاينة → بلا تقسيم)
 *  🔴 نطاق بوّابة العامل (`worker.kabblan.com`) **مستثنى عمداً**: هو تطبيق ثالث
 *  مستقل بأصله الخاص، و`Router` يتعامل معه قبل تقسيم النطاقات. لو دخل هون
 *  لصار `crossHostRedirect` يسحب العامل على نطاق المالك. */
export function isSplitHost(hostname) {
  if (hostname === WORKER_HOST) return false
  return hostname === MARKETING_HOST || hostname === APP_HOST || hostname === WWW_HOST
}

export function isAppHost(hostname)       { return hostname === APP_HOST }
export function isMarketingHost(hostname) { return hostname === MARKETING_HOST }

/** هل المسار خاصّ بالتطبيق؟ (بوّابة العامل: `/worker` أو روابطها القديمة) */
export function isAppPath(pathname, search = '') {
  if (APP_PATHS.has(pathname)) return true
  if (isWorkerEntry({ pathname, search })) return true
  // أي مسار غير معروف يسقط على التطبيق (زي ما بيعمل الـRouter)
  return !MARKETING_PATHS.has(pathname) &&
         !SHARED_PATHS.has(pathname) &&
         !pathname.startsWith('/calculator/')
}

export function isMarketingPath(pathname) {
  return MARKETING_PATHS.has(pathname) || pathname.startsWith('/calculator/')
}

export function isSharedPath(pathname) { return SHARED_PATHS.has(pathname) }

/**
 * الأصل الصحيح لمسار معيّن. المشترك يُترك على الأصل الحالي (بلا تحويل).
 * @returns {string|null} الأصل المطلوب، أو null إذا المسار مشترك
 */
export function originForPath(pathname, search = '') {
  if (isSharedPath(pathname)) return null
  return isAppPath(pathname, search) ? APP_ORIGIN : MARKETING_ORIGIN
}

/**
 * هل لازم نحوّل الزائر لنطاق تاني؟ يُستدعى من الـRouter قبل أي عرض.
 * @returns {string|null} الرابط الكامل للتحويل، أو null إذا كل شي بمحلّه
 */
export function crossHostRedirect({ hostname, pathname, search = '', hash = '' }) {
  if (!isSplitHost(hostname)) return null       // تطوير/معاينة → بلا تقسيم

  // www → دايماً بره (على الجذر أو على نطاق التطبيق حسب المسار)
  if (hostname === WWW_HOST) {
    const want = originForPath(pathname, search) || MARKETING_ORIGIN
    return want + pathname + search + hash
  }

  // الجذر `/` يُعرَض محلياً على كل نطاق ولا يُحوَّل أبداً:
  //   kabblan.com/      → صفحة الهبوط
  //   app.kabblan.com/  → التطبيق مباشرة (بلا صفحة هبوط)
  // إلا لو كان يحمل ?portal/?worker فهو مسار تطبيق صريح.
  if (pathname === '/' && !isAppPath('/', search)) return null

  const want = originForPath(pathname, search)
  if (!want) return null                        // مسار مشترك
  const here = isAppHost(hostname) ? APP_ORIGIN : MARKETING_ORIGIN
  if (want === here) return null                // بمحلّه
  return want + pathname + search + hash
}
