// ─── جاهزية الحساب — Account Readiness ───────────────────────────────────────────
// محرّك يقرأ إشارات إعداد الحساب (الملف، المصلحة، الأمان) ويحوّلها لمؤشّر جاهزية
// واحد (0–100) مع قائمة بالبنود الناقصة وكيف تُكمّلها. دالة نقيّة قابلة للاختبار.

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

// البنود وأوزانها (المجموع = 100). كل بند يُقيَّم done/ناقص حسب الإشارات.
const ITEMS = [
  { key: 'name',       label: 'اسم المصلحة',        weight: 15, icon: 'User',        hint: 'عرّف باسمك أو اسم مصلحتك من الملف الشخصي' },
  { key: 'passkey',    label: 'البصمة (Passkey)',   weight: 25, icon: 'Fingerprint', hint: 'فعّل البصمة لتأمين العمليات الحسّاسة', critical: true },
  { key: 'taxNumber',  label: 'رقم العوسيك / ח.פ',  weight: 15, icon: 'Tag',         hint: 'أضف رقمك الضريبي ليظهر على الفواتير' },
  { key: 'spendLimit', label: 'حدّ الصرف اليومي',   weight: 15, icon: 'Banknote',    hint: 'اضبط حدّاً يطلب توقيعاً عند تجاوزه', critical: true },
  { key: 'pension',    label: 'قسط الپنسيה',        weight: 10, icon: 'Wallet',      hint: 'سجّل قسطك ليُخصم من الوعاء الضريبي' },
  { key: 'notify',     label: 'الإشعارات',           weight: 10, icon: 'Bell',        hint: 'فعّل الإشعارات لتنبيهات الموافقات والمتأخرات' },
  { key: 'avatar',     label: 'شعار / صورة',         weight: 10, icon: 'Camera',      hint: 'ارفع شعارك ليظهر في التطبيق' },
]

/** درجة الجاهزية → نبرة لونية + وصف. */
export function readinessGrade(score) {
  if (score >= 85) return { tone: 'excellent', label: 'جاهز' }
  if (score >= 60) return { tone: 'good',      label: 'شبه جاهز' }
  if (score >= 35) return { tone: 'fair',      label: 'ناقص' }
  return                  { tone: 'weak',      label: 'يحتاج إعداد' }
}

/**
 * يحسب جاهزية الحساب من الإشارات الحقيقية.
 * @param {object} s إشارات: displayName, hasAvatar, contractorNumber, pensionMonthly,
 *                   hasPasskey, notifGranted, dailySpendLimit
 * @returns {{ score, tone, label, total, doneCount, items, missing }}
 */
export function computeAccountReadiness(s = {}) {
  const done = {
    name:       !!(s.displayName && String(s.displayName).trim()),
    passkey:    !!s.hasPasskey,
    taxNumber:  !!(s.contractorNumber && String(s.contractorNumber).trim()),
    spendLimit: Number(s.dailySpendLimit) > 0,
    pension:    Number(s.pensionMonthly) > 0,
    notify:     !!s.notifGranted,
    avatar:     !!s.hasAvatar,
  }

  const items = ITEMS.map(it => ({ ...it, done: !!done[it.key] }))
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0)
  const gained      = items.reduce((sum, it) => sum + (it.done ? it.weight : 0), 0)
  const score       = clamp(Math.round((gained / totalWeight) * 100))

  // البنود الناقصة مرتّبة: الحرجة أولاً ثم الأعلى وزناً
  const missing = items
    .filter(it => !it.done)
    .sort((a, b) => (b.critical === a.critical ? b.weight - a.weight : (b.critical ? 1 : 0) - (a.critical ? 1 : 0)))

  return {
    score,
    ...readinessGrade(score),
    total:     items.length,
    doneCount: items.filter(it => it.done).length,
    items,
    missing,
  }
}
