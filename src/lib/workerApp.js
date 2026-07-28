// ─── بوّابة العامل = تطبيق منفصل ────────────────────────────────────────────────
// العامل ينزّل «بوّابة العامل» كتطبيق مستقل على هاتفه: مدخل HTML خاص
// (`worker.html` → يُخدَم على `/worker`)، manifest وscope وأيقونة منفصلة تماماً
// عن تطبيق المالك. سابقاً كانت البوّابة تُفتح بـ`?portal` على نفس الوثيقة
// والـmanifest، فكان الـ`start_url` يرجّع العامل لتطبيق المالك عند التثبيت
// (وأيقونة واحدة للاثنين) → خربطة. لا تُرجِع هذا الوضع.
//
// هذا الملف = المصدر الوحيد لقرار «هل هذا مسار البوّابة؟» و«ما رابط البوّابة؟».
// يستعمله: `Router.jsx` (تحويل الروابط القديمة + شبكة أمان بالتطوير وعلى مرآة
// Pages حيث لا يوجد rewrite)، `lib/hosts.js` (تقسيم النطاقات)، وكل مكان يشارك
// الرابط للعامل (واتساب/QR في `WorkersScreen`/`SettingsScreen`/`WorkerCard`).

/** مسار البوّابة (بلا الـbase). Vercel يعمل rewrite له إلى `worker.html`. */
export const WORKER_PATH = '/worker'

// يطابق `/worker`، `/worker/`، `/worker/xx`، `/worker.html`، وكذلك مع بادئة base
// (مرآة GitHub Pages: `/contractor-pro/worker`).
const WORKER_RE = /(?:^|\/)worker(?:\.html)?(?:\/|$)/

/** هل هذا المسار يخصّ تطبيق بوّابة العامل؟ */
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

/** أي دخول للبوّابة (مسار جديد أو رابط قديم). */
export function isWorkerEntry({ pathname = '', search = '' } = {}) {
  return isWorkerPath(pathname) || hasLegacyPortalQuery(search)
}

/**
 * تحويل الروابط القديمة (`?portal`/`?worker`) إلى `/worker` — كي يهبط العامل على
 * التطبيق المنفصل الحقيقي (وثيقة + manifest خاصّين) بدل وثيقة المالك.
 * يحافظ على باقي الـquery والـhash، ويُرجع `null` إذا ما في شي للتحويل.
 * @returns {string|null} مسار نسبي للتحويل
 */
export function legacyPortalRedirect({ pathname = '', search = '', hash = '', base = '/' } = {}) {
  if (isWorkerPath(pathname)) return null
  if (!hasLegacyPortalQuery(search)) return null
  const q = new URLSearchParams(search)
  q.delete('portal')
  q.delete('worker')
  const rest = q.toString()
  return workerPath(base) + (rest ? `?${rest}` : '') + hash
}

/** مسار البوّابة مع احترام الـbase (GitHub Pages يُخدَم من `/contractor-pro/`). */
export function workerPath(base = '/') {
  return String(base).replace(/\/+$/, '') + WORKER_PATH
}

/** الرابط الكامل الذي يُشارَك مع العامل (واتساب/QR). */
export function workerPortalUrl(origin = '', base = '/') {
  return String(origin).replace(/\/+$/, '') + workerPath(base)
}
