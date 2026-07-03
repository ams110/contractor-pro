// ── نظام الإحالة — الالتقاط والمشاركة ─────────────────────────────────────────
// من محاكاة referral-program: 12/12 رفضوا «رسالة البيّاع» — فالرسالة هدية
// للصاحب (شهره المجاني)، بلا ذكر مكافأة المُرسِل، وقابلة للتعديل قبل الإرسال.
//
// الالتقاط: ?ref=CODE من رابط الهبوط → localStorage بمفتاح مستقل (attribution.js
// أول-لمسة وما بينكتب فوقه، فالكود بده مفتاحه الخاص) → يُقرأ عند التسجيل ويمرَّر
// بـsignUp metadata → handle_new_user يسجّل صف referrals.

const REF_KEY = 'kbl_ref_code'

/** يلتقط ?ref=CODE ويخزّنه — يُستدعى من Router عند الإقلاع (قبل أي تنقّل) */
export function captureReferralCode(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    const code = normalizeRefCode(new URLSearchParams(search).get('ref'))
    if (code) localStorage.setItem(REF_KEY, code)
    return code
  } catch { return null }
}

/** الكود المخزّن (إن وجد) — يُمرَّر بالتسجيل */
export function getStoredRefCode() {
  try { return normalizeRefCode(localStorage.getItem(REF_KEY)) } catch { return null }
}

/** تطبيع الكود: uppercase، 4-10 محارف أبجدرقمية فقط — دالة نقيّة */
export function normalizeRefCode(raw) {
  if (!raw) return null
  const code = String(raw).trim().toUpperCase()
  return /^[A-Z0-9]{4,10}$/.test(code) ? code : null
}

/** رابط الإحالة الشخصي — دالة نقيّة */
export function referralShareUrl(code, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin}/?ref=${code}`
}
