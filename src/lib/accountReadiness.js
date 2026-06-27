// ─── جاهزية الحساب — Account Readiness ───────────────────────────────────────────
// محرّك يقرأ إشارات إعداد الحساب (الملف، المصلحة، الأمان) ويحوّلها لمؤشّر جاهزية
// واحد (0–100) مع قائمة بالبنود الناقصة وكيف تُكمّلها. دالة نقيّة قابلة للاختبار.

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

// مساعد ترجمة محلي (افتراضي عربي) — يبقي مخرجات الاختبارات كما هي.
const T = (lang, ar, he, en) => (lang === 'he' ? he : lang === 'en' ? (en ?? ar) : ar)

// البنود وأوزانها (المجموع = 100). كل بند يُقيَّم done/ناقص حسب الإشارات.
// label/hint كائنات {ar,he,en} تُحَلّ حسب اللغة وقت الحساب.
const ITEMS = [
  { key: 'name',       weight: 15, icon: 'User',        label: { ar: 'اسم المصلحة', he: 'שם העסק', en: 'Business name' },                 hint: { ar: 'عرّف باسمك أو اسم مصلحتك من الملف الشخصي', he: 'הגדר את שמך או שם העסק מהפרופיל', en: 'Set your name or business name in your profile' } },
  { key: 'passkey',    weight: 25, icon: 'Fingerprint', label: { ar: 'البصمة (Passkey)', he: 'מפתח גישה (Passkey)', en: 'Passkey' },       hint: { ar: 'فعّل البصمة لتأمين العمليات الحسّاسة', he: 'הפעל מפתח גישה לאבטחת פעולות רגישות', en: 'Enable a passkey to secure sensitive actions' }, critical: true },
  { key: 'taxNumber',  weight: 15, icon: 'Tag',         label: { ar: 'رقم العوسيك / ח.פ', he: 'מספר עוסק / ח.פ', en: 'Business / tax number' }, hint: { ar: 'أضف رقمك الضريبي ليظهر على الفواتير', he: 'הוסף את מספר העוסק שלך כדי שיופיע בחשבוניות', en: 'Add your tax number to show it on invoices' } },
  { key: 'spendLimit', weight: 15, icon: 'Banknote',    label: { ar: 'حدّ الصرف اليومي', he: 'תקרת הוצאה יומית', en: 'Daily spend limit' }, hint: { ar: 'اضبط حدّاً يطلب توقيعاً عند تجاوزه', he: 'הגדר תקרה שתדרוש אישור בחריגה', en: 'Set a limit that requires a signature when exceeded' }, critical: true },
  { key: 'pension',    weight: 10, icon: 'Wallet',      label: { ar: 'قسط التقاعد', he: 'הפקדת פנסיה', en: 'Pension contribution' },        hint: { ar: 'سجّل قسطك ليُخصم من الوعاء الضريبي', he: 'רשום את ההפקדה כדי שתנוכה מבסיס המס', en: 'Log your contribution to deduct it from your tax base' } },
  { key: 'notify',     weight: 10, icon: 'Bell',        label: { ar: 'الإشعارات', he: 'התראות', en: 'Notifications' },                       hint: { ar: 'فعّل الإشعارات لتنبيهات الموافقات والمتأخرات', he: 'הפעל התראות לאישורים ולפיגורים', en: 'Enable notifications for approvals and overdue alerts' } },
  { key: 'avatar',     weight: 10, icon: 'Camera',      label: { ar: 'شعار / صورة', he: 'לוגו / תמונה', en: 'Logo / photo' },               hint: { ar: 'ارفع شعارك ليظهر في التطبيق', he: 'העלה את הלוגו שלך כדי שיופיע באפליקציה', en: 'Upload your logo to show it in the app' } },
]

/** درجة الجاهزية → نبرة لونية + وصف. */
export function readinessGrade(score, lang = 'ar') {
  if (score >= 85) return { tone: 'excellent', label: T(lang, 'جاهز', 'מוכן', 'Ready') }
  if (score >= 60) return { tone: 'good',      label: T(lang, 'شبه جاهز', 'כמעט מוכן', 'Almost ready') }
  if (score >= 35) return { tone: 'fair',      label: T(lang, 'ناقص', 'חסר', 'Incomplete') }
  return                  { tone: 'weak',      label: T(lang, 'يحتاج إعداد', 'דורש הגדרה', 'Needs setup') }
}

/**
 * يحسب جاهزية الحساب من الإشارات الحقيقية.
 * @param {object} s إشارات: displayName, hasAvatar, contractorNumber, pensionMonthly,
 *                   hasPasskey, notifGranted, dailySpendLimit
 * @param {string} [lang='ar']
 * @returns {{ score, tone, label, total, doneCount, items, missing }}
 */
export function computeAccountReadiness(s = {}, lang = 'ar') {
  const done = {
    name:       !!(s.displayName && String(s.displayName).trim()),
    passkey:    !!s.hasPasskey,
    taxNumber:  !!(s.contractorNumber && String(s.contractorNumber).trim()),
    spendLimit: Number(s.dailySpendLimit) > 0,
    pension:    Number(s.pensionMonthly) > 0,
    notify:     !!s.notifGranted,
    avatar:     !!s.hasAvatar,
  }

  const items = ITEMS.map(it => ({
    ...it,
    label: T(lang, it.label.ar, it.label.he, it.label.en),
    hint:  T(lang, it.hint.ar, it.hint.he, it.hint.en),
    done:  !!done[it.key],
  }))
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0)
  const gained      = items.reduce((sum, it) => sum + (it.done ? it.weight : 0), 0)
  const score       = clamp(Math.round((gained / totalWeight) * 100))

  // البنود الناقصة مرتّبة: الحرجة أولاً ثم الأعلى وزناً
  const missing = items
    .filter(it => !it.done)
    .sort((a, b) => (b.critical === a.critical ? b.weight - a.weight : (b.critical ? 1 : 0) - (a.critical ? 1 : 0)))

  return {
    score,
    ...readinessGrade(score, lang),
    total:     items.length,
    doneCount: items.filter(it => it.done).length,
    items,
    missing,
  }
}
