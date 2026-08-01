// ── محرّك الإشعارات — دوال نقيّة (مصدر واحد لسلوك كل إشعار) ─────────────────
//
// أي شي بيخصّ «شو نوع هذا الإشعار، قدّيش مهم، وين بوديني، هل بستاهل push،
// وهل الوقت مناسب أصلاً» بينحسب هون — لا بالمكوّنات ولا بالهوكس.
// السبب: كان كل ملف يعرّف خريطة أنواع محليّة، فتعتّقت الخرائط واختلفت عن
// الأنواع اللي فعلياً بتنكتب بالقاعدة (مثلاً TYPE_TAG كان فيه 'work_day'
// والقاعدة بتكتب 'pending_day') → كل الإشعارات كانت تاخد tag عام وتدهس بعضها.

/** رتب الأولوية — الأعلى أهمّ. الحرِج يخترق ساعات الهدوء. */
export const PRIORITY = { low: 0, normal: 1, high: 2, critical: 3 }

/** مجموعات التفضيل — المستخدم بيكتم مجموعة كاملة لا نوعاً نوعاً. */
export const NOTIF_GROUPS = ['requests', 'money', 'insights', 'system']

export const GROUP_LABELS = {
  requests: { ar: 'طلبات العمّال',   he: 'בקשות עובדים',  en: 'Worker requests' },
  money:    { ar: 'تنبيهات مالية',   he: 'התראות כספיות', en: 'Money alerts' },
  insights: { ar: 'ملخّصات ورؤى',    he: 'סיכומים ותובנות', en: 'Digests & insights' },
  system:   { ar: 'حساب واشتراك',    he: 'חשבון ומנוי',   en: 'Account & billing' },
}

// icon = اسم أيقونة Lucide (المكوّن بيحوّله لعنصر) · color = مفتاح من C
// nav  = شاشة الوجهة داخل التطبيق · push = يستاهل إشعار خلفي؟
const T = (group, icon, color, priority, nav, push = true) =>
  ({ group, icon, color, priority, nav, push })

/** سجلّ كل نوع إشعار يولّده التطبيق (client + RPCs + triggers). */
export const NOTIF_TYPES = {
  // ── طلبات بوّابة العامل (RPCs: worker_submit_day/expense, worker_request_payment) ──
  pending_day:      T('requests', 'CalendarDays',  'cyan',    'high',     'workdays'),
  pending_expense:  T('requests', 'Receipt',       'warning', 'high',     'expenses'),
  pending_payment:  T('requests', 'Banknote',      'gold',    'high',     'payments'),
  advance_request:  T('requests', 'HandCoins',     'gold',    'high',     'payments'),
  material_log:     T('requests', 'Package',       'secondary','normal',  'materials'),
  stale_pending:    T('requests', 'Clock',         'warning', 'high',     'workdays'),

  // ── تنبيهات مالية ──
  salary_overdue:   T('money',    'AlertCircle',   'accent',  'critical', 'workers'),
  patur_cap_70:     T('money',    'TrendingUp',    'warning', 'high',     'finance'),
  patur_cap_90:     T('money',    'AlertTriangle', 'accent',  'critical', 'finance'),
  overdue_receipt:  T('money',    'FileWarning',   'warning', 'high',     'finance'),

  // ── ملخّصات ورؤى — تُقرأ داخل التطبيق، بلا إزعاج خلفي ──
  daily_digest:     T('insights', 'Sunrise',       'primary', 'low',      'dashboard', false),
  insight:          T('insights', 'Lightbulb',     'cyan',    'low',      'dashboard', false),

  // ── حساب واشتراك ──
  subscription:     T('system',   'CreditCard',    'secondary','high',    'settings'),
  payment_failed:   T('system',   'CreditCard',    'accent',  'critical', 'settings'),
  team:             T('system',   'Users',         'secondary','normal',  'team'),
  broadcast:        T('system',   'Megaphone',     'primary', 'normal',   null),

  // ── عام ──
  info:             T('insights', 'Lightbulb',     'cyan',    'low',      null, false),
  warning:          T('money',    'AlertTriangle', 'warning', 'high',     null),
}

const FALLBACK = NOTIF_TYPES.info

/** بيانات نوع الإشعار مع fallback آمن لأي نوع غير معروف (أنواع مستقبلية). */
export function notifMeta(type) {
  return NOTIF_TYPES[type] || FALLBACK
}

/** رتبة رقمية للأولوية — للفرز والمقارنة. */
export function priorityRank(type) {
  return PRIORITY[notifMeta(type).priority] ?? PRIORITY.normal
}

/** وسم الإشعار النظامي — لازم يطابق اللي بيبعتو الـSW حتى لا يتكرّر الإشعار. */
export function notifTag(type) {
  return type || 'general'
}

// ── ساعات الهدوء ────────────────────────────────────────────────────────────

export const DEFAULT_QUIET = { enabled: true, start: 22, end: 7 }

/**
 * هل الوقت ضمن ساعات الهدوء؟ يدعم المدى العابر لمنتصف الليل (22→7).
 * start===end يعني «بلا هدوء» (مدى صفري) لا «هدوء ٢٤ ساعة».
 */
export function isQuietHours(date = new Date(), quiet = DEFAULT_QUIET) {
  if (!quiet || quiet.enabled === false) return false
  const start = Number(quiet.start), end = Number(quiet.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false
  const h = date.getHours()
  return start < end ? (h >= start && h < end) : (h >= start || h < end)
}

/**
 * قرار الإزعاج الخلفي لإشعار: يحترم كتم المجموعة وساعات الهدوء،
 * لكن **الحرِج يخترق الهدوء** (راتب متأخّر · تجاوز سقف · فشل دفع).
 *
 * @param {string} type نوع الإشعار
 * @param {object} prefs { muted: string[], quiet: {enabled,start,end} }
 */
export function shouldPush(type, prefs = {}, now = new Date()) {
  const meta = notifMeta(type)
  if (!meta.push) return false
  if (Array.isArray(prefs.muted) && prefs.muted.includes(meta.group)) return false
  if (isQuietHours(now, prefs.quiet ?? DEFAULT_QUIET)) {
    return meta.priority === 'critical'
  }
  return true
}

// ── التجميع (grouping) ──────────────────────────────────────────────────────

const GROUP_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 ساعات

/**
 * يضمّ الإشعارات المتتالية من نفس النوع داخل نافذة زمنية في مجموعة واحدة،
 * فبدل 7 صفوف «طلب حضور جديد» يشوف المالك سطراً واحداً «7 طلبات حضور».
 * الترتيب محفوظ (الأحدث أولاً) — بس المتجاورات بتنضمّ.
 *
 * @returns {Array<{key,type,items,latest,count,unread}>}
 */
export function groupNotifications(rows = [], { windowMs = GROUP_WINDOW_MS } = {}) {
  const out = []
  for (const n of rows) {
    const prev = out[out.length - 1]
    const sameType = prev && prev.type === n.type
    const inWindow = sameType &&
      Math.abs(new Date(prev.latest.created_at) - new Date(n.created_at)) <= windowMs
    if (inWindow) {
      prev.items.push(n)
      prev.count++
      if (!n.read) prev.unread++
    } else {
      out.push({
        key:    n.id,
        type:   n.type,
        items:  [n],
        latest: n,
        count:  1,
        unread: n.read ? 0 : 1,
      })
    }
  }
  return out
}

/** إحصاء غير المقروء: الإجمالي + الحرِج + توزيع حسب المجموعة. */
export function unreadStats(rows = []) {
  const stats = { total: 0, critical: 0, high: 0, byGroup: {} }
  for (const n of rows) {
    if (n.read) continue
    stats.total++
    const meta = notifMeta(n.type)
    if (meta.priority === 'critical') stats.critical++
    else if (meta.priority === 'high') stats.high++
    stats.byGroup[meta.group] = (stats.byGroup[meta.group] || 0) + 1
  }
  return stats
}

/** فرز: غير المقروء أولاً، ثم الأولوية، ثم الأحدث. */
export function sortSmart(rows = []) {
  return [...rows].sort((a, b) => {
    if (!!a.read !== !!b.read) return a.read ? 1 : -1
    const p = priorityRank(b.type) - priorityRank(a.type)
    if (p) return p
    return new Date(b.created_at) - new Date(a.created_at)
  })
}
