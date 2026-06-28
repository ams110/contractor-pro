// ─── نبض المصلحة — Business Pulse ────────────────────────────────────────────────
// محرّك ذكاء مالي: يحوّل كل أرقام المصلحة إلى مؤشّر صحّة واحد (0–100)،
// مع تفصيل العوامل ورؤى ذكية تلقائية. دوال نقيّة بالكامل — لا DOM، قابلة للاختبار.
// كل الدوال التي تُنتج نصاً تقبل وسيط لغة `lang` (افتراضي 'ar') لإخراج عربي/عبري/إنجليزي.

import { fmt, isPaymentOverdue } from './helpers.js'
import { calcProjectStats, calcOwnerCash, calcEarned, calcMustahaq } from './calculations.js'
import { tEnum } from './labels.js'

// مساعد ترجمة محلي للنصوص المولّدة (نفس منطق lib/labels.tl).
const T = (lang, ar, he, en) => (lang === 'he' ? he : lang === 'en' ? (en ?? ar) : ar)

// NaN لا يُقصَر بـ Math.max/min (يبقى NaN ويكسر الواجهة) — نعيده للحدّ الأدنى.
// أمّا ±Infinity فيُقصَر صحيحاً عبر Math، فلا نحتاج معالجته.
export const clamp = (n, lo = 0, hi = 100) => (Number.isNaN(n) ? lo : Math.max(lo, Math.min(hi, n)))

// ─── دوال العوامل (كل واحدة تُرجع 0–100) ─────────────────────────────────────────

/** السيولة: هل النقد بالجيب موجب ويغطّي مستحقات العمال؟ */
function liquidityScore({ cashOnHand, totalRevenue, owedToWorkers }) {
  if (totalRevenue <= 0) return 50
  if (cashOnHand <= 0) {
    const ratio = Math.abs(cashOnHand) / totalRevenue
    return clamp(30 - ratio * 60, 0, 30)
  }
  const cover = owedToWorkers > 0 ? cashOnHand / owedToWorkers : 2
  return clamp(55 + cover * 22, 55, 100)
}

/** الربحية: هامش الربح الصافي نسبةً للإيراد. */
function profitabilityScore({ netProfit, totalRevenue }) {
  if (totalRevenue <= 0) return 50
  const margin = netProfit / totalRevenue
  if (margin < 0) return clamp(40 + margin * 80, 0, 40)
  return clamp(40 + margin * 200, 40, 100)   // هامش 30% → 100
}

/** التحصيل: نسبة المحصّل من إجمالي المستحق + خصم على المتأخّرات. */
function collectionScore({ totalRevenue, owedByClients, overdueCount }) {
  if (totalRevenue + owedByClients <= 0) return 60
  const collected = totalRevenue / (totalRevenue + owedByClients)
  return clamp(collected * 100 - overdueCount * 12, 0, 100)
}

/** تسوية العمال: حجم المستحقات المفتوحة نسبةً للسيولة المتاحة. */
function workerBalanceScore({ owedToWorkers, cashOnHand, totalRevenue }) {
  if (owedToWorkers <= 0) return 100
  if (totalRevenue <= 0) return 60
  const ref   = Math.max(cashOnHand, totalRevenue * 0.1, 1)
  const ratio = owedToWorkers / ref
  return clamp(100 - ratio * 50, 0, 100)
}

/** الاتجاه: صافي آخر 3 أشهر مقابل الـ 3 اللي قبلها. */
function momentumScore(monthlyData) {
  if (!monthlyData || monthlyData.length < 6) return 50
  const prev = monthlyData.slice(0, 3).reduce((s, m) => s + (m.v || 0), 0)
  const last = monthlyData.slice(3).reduce((s, m) => s + (m.v || 0), 0)
  if (prev === 0 && last === 0) return 50
  const base = Math.abs(prev) || Math.abs(last) || 1
  return clamp(55 + ((last - prev) / base) * 45, 0, 100)
}

// نسبة تغيّر الزخم (للعرض في الرؤى)
function momentumPct(monthlyData) {
  if (!monthlyData || monthlyData.length < 6) return 0
  const prev = monthlyData.slice(0, 3).reduce((s, m) => s + (m.v || 0), 0)
  const last = monthlyData.slice(3).reduce((s, m) => s + (m.v || 0), 0)
  const base = Math.abs(prev) || Math.abs(last) || 0
  if (!base) return 0
  return Math.round(((last - prev) / base) * 100)
}

const WEIGHTS = { liquidity: 0.25, profitability: 0.30, collection: 0.20, workerBalance: 0.15, momentum: 0.10 }

const LABELS = {
  liquidity:     { ar: 'السيولة',       he: 'נזילות',           en: 'Liquidity' },
  profitability: { ar: 'الربحية',       he: 'רווחיות',          en: 'Profitability' },
  collection:    { ar: 'التحصيل',       he: 'גבייה',            en: 'Collection' },
  workerBalance: { ar: 'تسوية العمّال', he: 'התחשבנות עובדים',  en: 'Worker balance' },
  momentum:      { ar: 'الاتجاه',       he: 'מגמה',             en: 'Momentum' },
}

/** درجة تقدير + نبرة لونية حسب النتيجة. */
export function gradeFor(score, lang = 'ar') {
  if (score >= 85) return { tone: 'excellent', grade: T(lang, 'ممتازة', 'מצוינת', 'Excellent') }
  if (score >= 70) return { tone: 'good',      grade: T(lang, 'جيّدة',  'טובה',   'Good') }
  if (score >= 50) return { tone: 'fair',      grade: T(lang, 'مقبولة', 'סבירה',  'Fair') }
  if (score >= 30) return { tone: 'weak',      grade: T(lang, 'ضعيفة',  'חלשה',   'Weak') }
  return                  { tone: 'critical',  grade: T(lang, 'حرجة',   'קריטית', 'Critical') }
}

/**
 * المحرّك الرئيسي — يحسب مؤشّر النبض الكامل.
 * @param {object} a - أرقام مجمّعة من الداشبورد
 * @param {string} [lang='ar']
 * @returns {{ score, grade, tone, factors, insights, momentum }}
 */
export function computeBusinessPulse(a = {}, lang = 'ar') {
  const {
    cashOnHand = 0, netProfit = 0, totalRevenue = 0,
    owedToWorkers = 0, owedByClients = 0, overdueCount = 0,
    monthlyData = [],
  } = a

  const scores = {
    liquidity:     Math.round(liquidityScore({ cashOnHand, totalRevenue, owedToWorkers })),
    profitability: Math.round(profitabilityScore({ netProfit, totalRevenue })),
    collection:    Math.round(collectionScore({ totalRevenue, owedByClients, overdueCount })),
    workerBalance: Math.round(workerBalanceScore({ owedToWorkers, cashOnHand, totalRevenue })),
    momentum:      Math.round(momentumScore(monthlyData)),
  }

  const score = Math.round(
    Object.entries(WEIGHTS).reduce((s, [k, w]) => s + scores[k] * w, 0)
  )

  const factors = Object.keys(WEIGHTS).map(k => ({
    key: k, label: T(lang, LABELS[k].ar, LABELS[k].he, LABELS[k].en), score: scores[k], weight: WEIGHTS[k],
  }))

  return {
    score,
    ...gradeFor(score, lang),
    factors,
    momentum: momentumPct(monthlyData),
    insights: buildInsights({ cashOnHand, netProfit, totalRevenue, owedToWorkers, owedByClients, overdueCount, monthlyData }, lang),
  }
}

// ─── الرؤى الذكية ────────────────────────────────────────────────────────────────
// تُرتَّب: تحذيرات → نصائح → إيجابيات. أعلى 4. الأيقونات أسماء Lucide يُحوّلها المكوّن.
function buildInsights(a, lang = 'ar') {
  const { cashOnHand, netProfit, totalRevenue, owedToWorkers, owedByClients, overdueCount, monthlyData } = a
  const margin = totalRevenue > 0 ? netProfit / totalRevenue : 0
  const mom    = momentumPct(monthlyData)
  const out    = []

  if (cashOnHand < 0)
    out.push({ tone: 'warn', icon: 'Wallet', text: T(lang,
      `السيولة سالبة بـ ₪${fmt(-cashOnHand)} — المدفوع تجاوز المقبوض. ركّز على التحصيل.`,
      `הנזילות שלילית ב-₪${fmt(-cashOnHand)} — התשלומים עלו על התקבולים. התמקד בגבייה.`,
      `Cash is negative by ₪${fmt(-cashOnHand)} — payouts exceeded receipts. Focus on collection.`) })

  if (overdueCount > 0)
    out.push({ tone: 'warn', icon: 'Clock', text: T(lang,
      `${overdueCount} ${overdueCount === 1 ? 'مشروع متأخّر' : 'مشاريع متأخّرة'} بالتحصيل — تابع باقي لك عند العملاء.`,
      `${overdueCount} ${overdueCount === 1 ? 'פרויקט באיחור' : 'פרויקטים באיחור'} בגבייה — עקוב אחר החובות מהלקוחות.`,
      `${overdueCount} ${overdueCount === 1 ? 'project' : 'projects'} overdue — follow up on what clients owe you.`) })

  if (owedToWorkers > 0 && cashOnHand >= 0 && owedToWorkers > cashOnHand)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `مستحقات العمّال ₪${fmt(owedToWorkers)} أكبر من سيولتك ₪${fmt(cashOnHand)} — انتبه للتدفّق النقدي.`,
      `חוב לעובדים ₪${fmt(owedToWorkers)} גדול מהנזילות שלך ₪${fmt(cashOnHand)} — שים לב לתזרים המזומנים.`,
      `Worker dues ₪${fmt(owedToWorkers)} exceed your cash ₪${fmt(cashOnHand)} — watch your cash flow.`) })

  if (totalRevenue > 0 && margin < 0)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: T(lang,
      `هامش الربح سالب (${Math.round(margin * 100)}%) — راجع المصاريف أو سعّر أعلى.`,
      `שולי הרווח שליליים (${Math.round(margin * 100)}%) — בדוק את ההוצאות או תמחר גבוה יותר.`,
      `Profit margin is negative (${Math.round(margin * 100)}%) — review expenses or price higher.`) })

  if (owedByClients > 0)
    out.push({ tone: 'tip', icon: 'MessageCircle', text: T(lang,
      `عندك ₪${fmt(owedByClients)} غير محصّلة — أرسل تذكير للعملاء عبر واتساب بضغطة.`,
      `יש לך ₪${fmt(owedByClients)} שלא נגבו — שלח תזכורת ללקוחות בוואטסאפ בלחיצה.`,
      `You have ₪${fmt(owedByClients)} uncollected — send clients a WhatsApp reminder in one tap.`) })

  if (totalRevenue > 0 && margin >= 0.3)
    out.push({ tone: 'good', icon: 'TrendingUp', text: T(lang,
      `هامش ربح ممتاز ${Math.round(margin * 100)}% — استمر على نفس النهج.`,
      `שולי רווח מצוינים ${Math.round(margin * 100)}% — המשך באותו הקו.`,
      `Excellent profit margin ${Math.round(margin * 100)}% — keep it up.`) })

  if (mom >= 10)
    out.push({ tone: 'good', icon: 'Activity', text: T(lang,
      `أداؤك بتحسّن — صافي آخر 3 أشهر أعلى بـ ${mom}% عن السابق.`,
      `הביצועים שלך משתפרים — הרווח הנקי ב-3 החודשים האחרונים גבוה ב-${mom}% מהקודם.`,
      `You're improving — net of the last 3 months is up ${mom}% vs. before.`) })

  if (cashOnHand > 0 && owedToWorkers === 0 && owedByClients === 0 && totalRevenue > 0)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      'وضعك نظيف — لا ديون مفتوحة وسيولتك موجبة.',
      'המצב שלך נקי — אין חובות פתוחים והנזילות חיובית.',
      "You're all clear — no open debts and positive cash.") })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Sparkles', text: T(lang,
      'ابدأ بتسجيل مشاريعك ومدخولاتك ليتفعّل التحليل الذكي.',
      'התחל לרשום פרויקטים והכנסות כדי להפעיל את הניתוח החכם.',
      'Start logging projects and income to activate smart analysis.') })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 4)
}

// ─── التوقّع الذكي للتدفّق النقدي — Cash Flow Forecast / Runway ───────────────────
// يحلّل اتجاه السيولة الشهري ويتنبّأ بمسارها للأشهر القادمة، مع نطاق ثقة (cone)
// و«عدّاد أمان» (runway) يقدّر كم تكفي السيولة لو استمر النزيف. دوال نقيّة قابلة للاختبار.

/** متوسّط مرجّح للتدفّق الشهري — الأشهر الأحدث وزنها أعلى لالتقاط الزخم الحالي. */
export function weightedAvg(values) {
  if (!values.length) return 0
  let num = 0, den = 0
  values.forEach((v, i) => { const w = i + 1; num += v * w; den += w })
  return num / den
}

/** الانحراف المعياري — يقيس تذبذب التدفّق، ويحدّد عرض نطاق الثقة. */
export function stdDev(values) {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** صياغة مدّة بالأشهر بصيغة سليمة حسب اللغة. */
export function fmtMonths(m, lang = 'ar') {
  if (m >= 12) return T(lang, 'أكثر من سنة', 'יותר משנה', 'More than a year')
  const r = Math.max(1, Math.round(m))
  if (r === 1) return T(lang, 'شهر واحد', 'חודש', '1 month')
  if (r === 2) return T(lang, 'شهرين', 'חודשיים', '2 months')
  if (r <= 10) return T(lang, `${r} أشهر`, `${r} חודשים`, `${r} months`)
  return T(lang, `${r} شهر`, `${r} חודשים`, `${r} months`)
}

/**
 * يحسب توقّع التدفّق النقدي للأشهر القادمة.
 * @param {object} a
 * @param {string} [lang='ar']
 * @returns {object|null} null إذا لم يتوفّر تاريخ كافٍ للتنبّؤ
 */
export function computeCashForecast(a = {}, lang = 'ar') {
  const { cashOnHand = 0, totalRevenue = 0, monthlyData = [], horizon = 3 } = a

  const flows  = monthlyData.map(m => m.v || 0)
  const active = flows.filter(v => v !== 0)
  if (active.length < 2) return null   // تاريخ غير كافٍ — لا تُظهر التوقّع

  const avgFlow = Math.round(weightedAvg(flows))
  const vol     = stdDev(flows)

  // المسار التاريخي: نعيد بناء موضع السيولة بنهاية كل شهر بحيث ينتهي عند النقد الحالي
  const history = monthlyData.map(m => ({ label: m.month, actual: 0, forecast: null, kind: 'past' }))
  let pos = cashOnHand
  for (let i = monthlyData.length - 1; i >= 0; i--) {
    history[i].actual = Math.round(pos)
    pos -= flows[i]
  }

  // نقطة الوصل = الحاضر
  const last = history.length - 1
  if (last >= 0) {
    history[last].forecast = Math.round(cashOnHand)
    history[last].range    = [Math.round(cashOnHand), Math.round(cashOnHand)]
  }

  // المسار المتوقّع — النطاق يتّسع مع البُعد الزمني (√t)
  const future = []
  for (let j = 1; j <= horizon; j++) {
    const mid  = cashOnHand + avgFlow * j
    const band = vol * Math.sqrt(j)
    future.push({
      label: `+${j}`,
      actual: null,
      forecast: Math.round(mid),
      range: [Math.round(mid - band), Math.round(mid + band)],
      kind: 'future',
    })
  }

  const series    = [...history, ...future]
  const projected = cashOnHand + avgFlow * horizon

  // «عدّاد الأمان»
  let runway = null
  if (avgFlow < 0 && cashOnHand > 0) runway = cashOnHand / -avgFlow

  // النبرة اللونية
  let tone
  if (avgFlow > 0)      tone = (cashOnHand >= 0 && projected >= cashOnHand * 1.2) ? 'excellent' : 'good'
  else if (avgFlow < 0) tone = runway == null ? 'critical' : runway <= 2 ? 'critical' : runway <= 4 ? 'weak' : 'fair'
  else                  tone = 'fair'

  return {
    avgFlow, projected: Math.round(projected), runway, rising: avgFlow > 0, tone, horizon, series,
    insights: buildForecastInsights({ avgFlow, projected, cashOnHand, runway, horizon }, lang),
  }
}

// رؤى التوقّع — جملة أو جملتان تختصران المسار والإجراء المقترح.
function buildForecastInsights({ avgFlow, projected, cashOnHand, runway, horizon }, lang = 'ar') {
  const span = T(lang,
    horizon === 3 ? '٣ أشهر' : `${horizon} أشهر`,
    `${horizon} חודשים`,
    `${horizon} months`)
  const out  = []

  if (avgFlow < 0 && runway != null)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: T(lang,
      `تدفّقك النقدي سالب بمعدّل ₪${fmt(-avgFlow)}/شهر — بهذا المعدّل سيولتك تكفي ${fmtMonths(runway, 'ar')} فقط.`,
      `תזרים המזומנים שלך שלילי בקצב ₪${fmt(-avgFlow)}/חודש — בקצב הזה הנזילות תספיק ל${fmtMonths(runway, 'he')} בלבד.`,
      `Your cash flow is negative at ₪${fmt(-avgFlow)}/mo — at this rate your cash lasts only ${fmtMonths(runway, 'en')}.`) })
  else if (avgFlow < 0)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `تنزف نقداً بمعدّل ₪${fmt(-avgFlow)}/شهر وسيولتك سالبة — تحرّك بسرعة على التحصيل.`,
      `אתה מאבד מזומן בקצב ₪${fmt(-avgFlow)}/חודש והנזילות שלילית — פעל מהר על הגבייה.`,
      `You're bleeding cash at ₪${fmt(-avgFlow)}/mo and cash is negative — act fast on collection.`) })
  else if (avgFlow > 0)
    out.push({ tone: 'good', icon: 'TrendingUp', text: T(lang,
      `تدفّقك النقدي موجب بمعدّل ₪${fmt(avgFlow)}/شهر — مسارك تصاعدي.`,
      `תזרים המזומנים שלך חיובי בקצב ₪${fmt(avgFlow)}/חודש — אתה במגמת עלייה.`,
      `Your cash flow is positive at ₪${fmt(avgFlow)}/mo — you're trending up.`) })
  else
    out.push({ tone: 'tip', icon: 'Activity', text: T(lang,
      'تدفّقك النقدي شبه ثابت — لا نموّ ولا نزيف يُذكر.',
      'תזרים המזומנים שלך כמעט יציב — אין צמיחה ואין דימום משמעותי.',
      'Your cash flow is nearly flat — no growth and no real bleed.') })

  if (avgFlow > 0 && projected > cashOnHand)
    out.push({ tone: 'tip', icon: 'PiggyBank', text: T(lang,
      `لو استمر الأداء، رح تضيف ~₪${fmt(Math.round(projected - cashOnHand))} لسيولتك خلال ${span}.`,
      `אם הביצועים יימשכו, תוסיף ~₪${fmt(Math.round(projected - cashOnHand))} לנזילות שלך תוך ${span}.`,
      `If this keeps up, you'll add ~₪${fmt(Math.round(projected - cashOnHand))} to your cash within ${span}.`) })
  else if (projected < 0 && cashOnHand >= 0)
    out.push({ tone: 'warn', icon: 'Wallet', text: T(lang,
      `التوقّع يشير لعجز نقدي (₪${fmt(-Math.round(projected))}) قبل نهاية المدى — جدول مقبوضاتك مبكّراً.`,
      `התחזית מצביעה על גירעון מזומנים (₪${fmt(-Math.round(projected))}) לפני סוף התקופה — תזמן את התקבולים מוקדם.`,
      `Forecast shows a cash shortfall (₪${fmt(-Math.round(projected))}) before the horizon ends — schedule receipts early.`) })

  return out.slice(0, 2)
}

// ─── بصمة العامل — Worker DNA ─────────────────────────────────────────────────────

/** الإنتاجية: أجر العامل اليومي مقابل متوسّط فريقك. */
function productivityScore({ avgPerDay, fleetAvgPerDay }) {
  if (!fleetAvgPerDay || fleetAvgPerDay <= 0 || !avgPerDay) return 60
  const ratio = avgPerDay / fleetAvgPerDay
  return clamp(65 + (ratio - 1) * 70, 0, 100)
}

/** الانتظام: ثبات الحضور شهرياً. */
function regularityScore({ daysPerMonth }) {
  const active = (daysPerMonth || []).filter(d => d > 0)
  if (active.length < 2) return 55
  const mean = active.reduce((s, d) => s + d, 0) / active.length
  if (mean <= 0) return 55
  const cv = stdDev(active) / mean
  return clamp(100 - cv * 90, 0, 100)
}

/** الانضباط المالي: نسبة السلف من المستحق. */
function disciplineScore({ advances, earned }) {
  if (earned <= 0) return advances > 0 ? 30 : 70
  const ratio = advances / earned
  return clamp(100 - ratio * 150, 0, 100)
}

/** الاستمرارية: طول المدّة مع المصلحة. */
function tenureScore({ tenureMonths }) {
  if (!tenureMonths || tenureMonths <= 0) return 45
  return clamp(40 + tenureMonths * 10, 40, 100)
}

/** الموثوقية: نسبة الأيام المعتمدة من إجمالي المُقدّمة. */
function approvalScore({ approvedDays, pendingDays, rejectedDays }) {
  const total = approvedDays + pendingDays + rejectedDays
  if (total <= 0) return 50
  const rate = approvedDays / total
  return clamp(rate * 100 - rejectedDays * 6, 0, 100)
}

const DNA_WEIGHTS = { productivity: 0.25, regularity: 0.25, approval: 0.20, discipline: 0.15, tenure: 0.15 }

const DNA_LABELS = {
  productivity: { ar: 'الإنتاجية',    he: 'פריון',   en: 'Productivity' },
  regularity:   { ar: 'الانتظام',     he: 'סדירות',  en: 'Regularity' },
  approval:     { ar: 'الموثوقية',    he: 'אמינות',  en: 'Reliability' },
  discipline:   { ar: 'الانضباط',     he: 'משמעת',   en: 'Discipline' },
  tenure:       { ar: 'الاستمرارية',  he: 'ותק',     en: 'Tenure' },
}

/** تصنيف العامل حسب بصمته. */
export function workerTier(score, lang = 'ar') {
  if (score >= 80) return { tone: 'excellent', tier: T(lang, 'نخبة',          'מצטיין',     'Elite'),           star: true  }
  if (score >= 65) return { tone: 'good',      tier: T(lang, 'موثوق',         'אמין',       'Reliable'),        star: true  }
  if (score >= 50) return { tone: 'fair',      tier: T(lang, 'مقبول',         'סביר',       'Fair'),            star: false }
  if (score >= 35) return { tone: 'weak',      tier: T(lang, 'يحتاج متابعة',  'דורש מעקב',  'Needs follow-up'), star: false }
  return                  { tone: 'critical',  tier: T(lang, 'تحت المراقبة',  'במעקב',      'Under watch'),     star: false }
}

/**
 * المحرّك الرئيسي — يحسب بصمة العامل الكاملة.
 * @param {object} a
 * @param {string} [lang='ar']
 */
export function computeWorkerDNA(a = {}, lang = 'ar') {
  const {
    name = '', earned = 0, advances = 0,
    avgPerDay = 0, fleetAvgPerDay = 0,
    approvedDays = 0, pendingDays = 0, rejectedDays = 0,
    daysPerMonth = [], tenureMonths = 0,
  } = a

  const scores = {
    productivity: Math.round(productivityScore({ avgPerDay, fleetAvgPerDay })),
    regularity:   Math.round(regularityScore({ daysPerMonth })),
    approval:     Math.round(approvalScore({ approvedDays, pendingDays, rejectedDays })),
    discipline:   Math.round(disciplineScore({ advances, earned })),
    tenure:       Math.round(tenureScore({ tenureMonths })),
  }

  const score = Math.round(
    Object.entries(DNA_WEIGHTS).reduce((s, [k, w]) => s + scores[k] * w, 0)
  )

  const factors = Object.keys(DNA_WEIGHTS).map(k => ({
    key: k, label: T(lang, DNA_LABELS[k].ar, DNA_LABELS[k].he, DNA_LABELS[k].en), score: scores[k], weight: DNA_WEIGHTS[k],
  }))

  const productivityPct = fleetAvgPerDay > 0 && avgPerDay > 0
    ? Math.round((avgPerDay / fleetAvgPerDay - 1) * 100)
    : 0

  return {
    score,
    ...workerTier(score, lang),
    factors,
    productivityPct,
    insights: buildWorkerInsights({ name, earned, advances, productivityPct, pendingDays, tenureMonths, scores }, lang),
  }
}

// رؤى بصمة العامل — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildWorkerInsights(a, lang = 'ar') {
  const { name, earned, advances, productivityPct, pendingDays, tenureMonths, scores } = a
  const advRatio = earned > 0 ? advances / earned : 0
  const who = name ? name.split(' ')[0] : T(lang, 'العامل', 'העובד', 'the worker')
  const out = []

  if (advRatio >= 0.5)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `${who} سحب ${Math.round(advRatio * 100)}% من مستحقه سلفاً (₪${fmt(advances)}) — انتبه للتصفية النهائية.`,
      `${who} משך ${Math.round(advRatio * 100)}% מהזכאות שלו כמקדמה (₪${fmt(advances)}) — שים לב להתחשבנות הסופית.`,
      `${who} drew ${Math.round(advRatio * 100)}% of their dues as advances (₪${fmt(advances)}) — watch the final settlement.`) })

  if (scores.approval < 60 && pendingDays > 0)
    out.push({ tone: 'warn', icon: 'Clock', text: T(lang,
      `${pendingDays} يوم لـ${who} بانتظار موافقتك — راجِعها لتثبيت مستحقّه.`,
      `${pendingDays} ימים של ${who} ממתינים לאישורך — בדוק אותם כדי לקבע את זכאותו.`,
      `${pendingDays} of ${who}'s days await your approval — review them to lock their dues.`) })
  else if (pendingDays > 0)
    out.push({ tone: 'tip', icon: 'Clock', text: T(lang,
      `عند ${who} ${pendingDays} يوم بانتظار الموافقة.`,
      `ל${who} יש ${pendingDays} ימים הממתינים לאישור.`,
      `${who} has ${pendingDays} days awaiting approval.`) })

  if (productivityPct >= 25)
    out.push({ tone: 'good', icon: 'TrendingUp', text: T(lang,
      `${who} من نخبة عمّالك — أجره اليومي أعلى من متوسّط الفريق بـ ${productivityPct}%.`,
      `${who} מהעובדים המצטיינים שלך — שכרו היומי גבוה מממוצע הצוות ב-${productivityPct}%.`,
      `${who} is among your top workers — daily rate ${productivityPct}% above team average.`) })
  else if (productivityPct <= -25)
    out.push({ tone: 'tip', icon: 'TrendingDown', text: T(lang,
      `أجر ${who} اليومي أقل من متوسّط فريقك بـ ${Math.abs(productivityPct)}% — عامل اقتصادي.`,
      `שכרו היומי של ${who} נמוך מממוצע הצוות ב-${Math.abs(productivityPct)}% — עובד חסכוני.`,
      `${who}'s daily rate is ${Math.abs(productivityPct)}% below team average — an economical worker.`) })

  if (scores.regularity >= 75 && tenureMonths >= 3)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      `${who} ثابت ومنتظم — ${fmtMonths(tenureMonths, 'ar')} معك بحضور متّسق.`,
      `${who} יציב וסדיר — ${fmtMonths(tenureMonths, 'he')} איתך בנוכחות עקבית.`,
      `${who} is steady and regular — ${fmtMonths(tenureMonths, 'en')} with you, consistent attendance.`) })

  if (advRatio === 0 && earned > 0 && out.every(i => i.tone !== 'good'))
    out.push({ tone: 'good', icon: 'Sparkles', text: T(lang,
      `${who} ما سحب أي سلفة — انضباط مالي ممتاز.`,
      `${who} לא משך אף מקדמה — משמעת פיננסית מצוינת.`,
      `${who} took no advances — excellent financial discipline.`) })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: T(lang,
      `سجّل أيام عمل ودفعات لـ${who} ليكتمل تحليل بصمته.`,
      `רשום ימי עבודה ותשלומים ל${who} כדי להשלים את ניתוח הפרופיל שלו.`,
      `Log work days and payments for ${who} to complete their profile analysis.`) })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── صحّة المشروع — Project Health Score ──────────────────────────────────────────

/** الربحية: هامش ربح المشروع الفعلي. */
function pjMarginScore({ margin, hasData }) {
  if (!hasData) return 50
  return clamp(45 + margin * 2.2, 0, 100)
}

/** التحصيل: نسبة المحصّل من قيمة العقد. */
function pjCollectionScore({ price, revenue, overdue }) {
  let base
  if (price > 0) base = clamp((revenue / price) * 100, 0, 100)
  else           base = revenue > 0 ? 65 : 45
  return clamp(base - (overdue ? 25 : 0), 0, 100)
}

/** الميزانية: التكلفة مقابل قيمة العقد. */
function pjBudgetScore({ price, revenue, cost }) {
  const ref = price > 0 ? price : revenue
  if (ref <= 0) return cost > 0 ? 25 : 55
  const ratio = cost / ref
  return clamp((1 - ratio) * 200, 0, 100)
}

/** السيولة: نقد المالك المتبقّي نسبةً لإيراد المشروع. */
function pjCashScore({ ownerCash, revenue }) {
  if (revenue <= 0) return ownerCash >= 0 ? 55 : 30
  return clamp(55 + (ownerCash / revenue) * 90, 0, 100)
}

const PJ_WEIGHTS = { margin: 0.30, collection: 0.25, budget: 0.25, cash: 0.20 }
const PJ_LABELS  = {
  margin:     { ar: 'الربحية',   he: 'רווחיות', en: 'Profitability' },
  collection: { ar: 'التحصيل',   he: 'גבייה',   en: 'Collection' },
  budget:     { ar: 'الميزانية', he: 'תקציב',   en: 'Budget' },
  cash:       { ar: 'السيولة',   he: 'נזילות',  en: 'Liquidity' },
}

/**
 * المحرّك الرئيسي — صحّة المشروع الكاملة.
 * @param {object} a
 * @param {string} [lang='ar']
 */
export function computeProjectHealth(a = {}, lang = 'ar') {
  const {
    name = '', price = 0, revenue = 0, cost = 0,
    ownerCash = 0, profit = 0, margin = null, overdue = false,
  } = a

  const hasData = revenue > 0 || cost > 0 || price > 0
  const effMargin = margin != null ? margin : (revenue > 0 ? (profit / revenue) * 100 : 0)

  const scores = {
    margin:     Math.round(pjMarginScore({ margin: effMargin, hasData })),
    collection: Math.round(pjCollectionScore({ price, revenue, overdue })),
    budget:     Math.round(pjBudgetScore({ price, revenue, cost })),
    cash:       Math.round(pjCashScore({ ownerCash, revenue })),
  }

  const score = Math.round(
    Object.entries(PJ_WEIGHTS).reduce((s, [k, w]) => s + scores[k] * w, 0)
  )

  const factors = Object.keys(PJ_WEIGHTS).map(k => ({
    key: k, label: T(lang, PJ_LABELS[k].ar, PJ_LABELS[k].he, PJ_LABELS[k].en), score: scores[k], weight: PJ_WEIGHTS[k],
  }))

  // ── الإنذار المبكّر ──
  let projectedMargin = null
  if (price > 0 && revenue > 0 && revenue < price) {
    const progress = revenue / price
    if (progress >= 0.1 && progress <= 0.95) {
      const projCost   = cost / progress
      projectedMargin  = Math.round(((price - projCost) / price) * 100)
    }
  }

  return {
    score,
    ...gradeFor(score, lang),
    factors,
    projectedMargin,
    insights: buildProjectInsights({ name, price, revenue, cost, ownerCash, margin: effMargin, profit, overdue, projectedMargin }, lang),
  }
}

// رؤى صحّة المشروع — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildProjectInsights(a, lang = 'ar') {
  const { name, price, revenue, cost, ownerCash, margin, profit, overdue, projectedMargin } = a
  const out = []

  if (profit < 0)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: T(lang,
      `المشروع يخسر حالياً — الهامش ${Math.round(margin)}%. راجع المصاريف أو سعّر الإضافات.`,
      `הפרויקט מפסיד כרגע — השוליים ${Math.round(margin)}%. בדוק הוצאות או תמחר תוספות.`,
      `The project is losing now — margin ${Math.round(margin)}%. Review expenses or price extras.`) })

  if (price > 0 && cost > price)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `التكلفة (₪${fmt(cost)}) تجاوزت قيمة العقد (₪${fmt(price)}) بـ ₪${fmt(cost - price)} — المشروع بالسالب.`,
      `העלות (₪${fmt(cost)}) עברה את שווי החוזה (₪${fmt(price)}) ב-₪${fmt(cost - price)} — הפרויקט במינוס.`,
      `Cost (₪${fmt(cost)}) exceeded contract value (₪${fmt(price)}) by ₪${fmt(cost - price)} — the project is in the red.`) })

  if (overdue)
    out.push({ tone: 'warn', icon: 'Clock', text: T(lang,
      'في مقبوضات متأخّرة على هذا المشروع — تابع التحصيل مع العميل.',
      'יש תקבולים באיחור בפרויקט הזה — עקוב אחר הגבייה מול הלקוח.',
      'There are overdue receipts on this project — follow up collection with the client.') })

  if (projectedMargin != null && projectedMargin < 10 && profit >= 0)
    out.push({ tone: 'warn', icon: 'Activity', text: T(lang,
      `إنذار مبكّر: لو استمرّت التكلفة بنفس المعدّل، الهامش النهائي المتوقّع ~${projectedMargin}% فقط.`,
      `אזהרה מוקדמת: אם העלות תימשך באותו קצב, שולי הרווח הסופיים הצפויים ~${projectedMargin}% בלבד.`,
      `Early warning: if cost continues at this rate, projected final margin is only ~${projectedMargin}%.`) })

  if (price > 0 && revenue > 0 && revenue / price < 0.5)
    out.push({ tone: 'tip', icon: 'MessageCircle', text: T(lang,
      `حصّلت ${Math.round((revenue / price) * 100)}% فقط من قيمة العقد — تابع باقي المستحقّ.`,
      `גבית רק ${Math.round((revenue / price) * 100)}% משווי החוזה — עקוב אחר היתרה לתשלום.`,
      `You've collected only ${Math.round((revenue / price) * 100)}% of the contract — follow up the remaining balance.`) })

  if (margin >= 25 && profit > 0)
    out.push({ tone: 'good', icon: 'TrendingUp', text: T(lang,
      `هامش ربح ممتاز ${Math.round(margin)}% — مشروع رابح بقوّة.`,
      `שולי רווח מצוינים ${Math.round(margin)}% — פרויקט רווחי מאוד.`,
      `Excellent profit margin ${Math.round(margin)}% — a strongly profitable project.`) })

  if (ownerCash > 0 && margin >= 12 && out.every(i => i.tone !== 'good'))
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      `مشروع صحّي — سيولة موجبة (₪${fmt(ownerCash)}) وربح جيّد.`,
      `פרויקט בריא — נזילות חיובית (₪${fmt(ownerCash)}) ורווח טוב.`,
      `Healthy project — positive cash (₪${fmt(ownerCash)}) and good profit.`) })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Sparkles', text: T(lang,
      'سجّل المقبوضات والمصاريف ليتفعّل تحليل صحّة المشروع.',
      'רשום תקבולים והוצאות כדי להפעיל את ניתוח בריאות הפרויקט.',
      'Log receipts and expenses to activate project-health analysis.') })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── عدّاد الضريبة الحيّ — Tax Runway ──────────────────────────────────────────────

const MONTH_NAMES = {
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  he: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}
const monthName = (idx, lang = 'ar') => (MONTH_NAMES[lang] || MONTH_NAMES.ar)[idx]

/**
 * @param {object} a
 * @param {string} [lang='ar']
 * @returns {object|null} null إذا لا يوجد دخل لحساب معدّل
 */
export function computeTaxRunway(a = {}, lang = 'ar') {
  const {
    isOsekPatur = false, cap = 122833,
    yearIncome = 0, monthsElapsed = 1, annualTax = 0,
  } = a

  const months  = Math.max(1, Math.min(12, monthsElapsed))
  const monthly = yearIncome / months
  if (monthly <= 0 && annualTax <= 0) return null

  const projectedAnnual = Math.round(monthly * 12)
  const capPct       = cap > 0 ? Math.round((yearIncome / cap) * 100) : 0
  const projectedPct = cap > 0 ? Math.round((projectedAnnual / cap) * 100) : 0

  // متى يُتوقّع بلوغ السقف
  let capMonth = null, willExceed = false, alreadyExceeded = false
  if (isOsekPatur) {
    if (yearIncome >= cap) {
      alreadyExceeded = willExceed = true
      capMonth = monthName(Math.min(11, months - 1), lang)
    } else if (monthly > 0 && projectedAnnual > cap) {
      willExceed = true
      const monthsToCap = (cap - yearIncome) / monthly
      const idx = (months - 1) + monthsToCap
      if (idx < 12) capMonth = monthName(Math.floor(idx), lang)
    }
  }

  const monthlyProvision = annualTax > 0 ? Math.round(annualTax / 12) : 0

  // النبرة اللونية
  let tone
  if (isOsekPatur) {
    tone = projectedPct >= 100 ? 'critical' : projectedPct >= 85 ? 'weak' : projectedPct >= 70 ? 'fair' : 'good'
  } else {
    tone = 'good'
  }

  return {
    isOsekPatur, cap, yearIncome,
    capPct, projectedAnnual, projectedPct,
    capMonth, willExceed, alreadyExceeded,
    annualTax, monthlyProvision, tone,
    insights: buildTaxRunwayInsights({ isOsekPatur, cap, yearIncome, projectedAnnual, projectedPct, capMonth, willExceed, alreadyExceeded, annualTax, monthlyProvision }, lang),
  }
}

// رؤى عدّاد الضريبة — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildTaxRunwayInsights(a, lang = 'ar') {
  const { isOsekPatur, cap, yearIncome, projectedAnnual, projectedPct, capMonth, willExceed, alreadyExceeded, annualTax, monthlyProvision } = a
  const out = []

  if (isOsekPatur && alreadyExceeded)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `تجاوزت سقف עוסק פטור (₪${fmt(yearIncome)} من ₪${fmt(cap)}) — يجب الترقية إلى עוסק מורשה فوراً وإصدار فواتير ضريبية.`,
      `חרגת מתקרת עוסק פטור (₪${fmt(yearIncome)} מתוך ₪${fmt(cap)}) — יש לשדרג לעוסק מורשה מיד ולהפיק חשבוניות מס.`,
      `You exceeded the עוסק פטור cap (₪${fmt(yearIncome)} of ₪${fmt(cap)}) — upgrade to עוסק מורשה now and issue tax invoices.`) })
  else if (isOsekPatur && willExceed && capMonth)
    out.push({ tone: 'warn', icon: 'CalendarClock', text: T(lang,
      `بمعدّل دخلك الحالي رح توصل سقف الـ₪${fmt(cap)} في ${capMonth} — جهّز ترقية مصلحتك من الآن.`,
      `בקצב ההכנסה הנוכחי שלך תגיע לתקרה של ₪${fmt(cap)} ב${capMonth} — הכן את שדרוג העסק שלך כבר עכשיו.`,
      `At your current income rate you'll hit the ₪${fmt(cap)} cap in ${capMonth} — prepare your business upgrade now.`) })
  else if (isOsekPatur && projectedPct >= 70)
    out.push({ tone: 'tip', icon: 'Activity', text: T(lang,
      `توقّعك السنوي ${projectedPct}% من السقف — راقب دخلك في الأشهر القادمة.`,
      `התחזית השנתית שלך ${projectedPct}% מהתקרה — עקוב אחר ההכנסה בחודשים הקרובים.`,
      `Your annual projection is ${projectedPct}% of the cap — watch your income in the coming months.`) })
  else if (isOsekPatur)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      `ضمن حدّ עוסק פטור بأريحية — التوقّع السنوي ${projectedPct}% فقط من السقف.`,
      `בתוך מגבלת עוסק פטור בנוחות — התחזית השנתית ${projectedPct}% בלבד מהתקרה.`,
      `Comfortably within the עוסק פטור limit — annual projection only ${projectedPct}% of the cap.`) })

  if (annualTax > 0 && monthlyProvision > 0)
    out.push({ tone: 'tip', icon: 'PiggyBank', text: T(lang,
      `فاتورتك الضريبية المتوقّعة ₪${fmt(annualTax)} — جنّب ₪${fmt(monthlyProvision)} شهرياً لتكون جاهزاً نهاية السنة.`,
      `חשבון המס הצפוי שלך ₪${fmt(annualTax)} — הפרש ₪${fmt(monthlyProvision)} בחודש כדי להיות מוכן בסוף השנה.`,
      `Your projected tax bill is ₪${fmt(annualTax)} — set aside ₪${fmt(monthlyProvision)} monthly to be ready by year-end.`) })
  else if (annualTax === 0 && yearIncome > 0)
    out.push({ tone: 'good', icon: 'Sparkles', text: T(lang,
      'لا ضريبة دخل مقدّرة على أرباحك الحالية — وضعك مريح ضريبياً.',
      'אין מס הכנסה משוער על הרווחים הנוכחיים שלך — מצבך נוח מבחינת מס.',
      'No estimated income tax on your current profits — comfortable tax position.') })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: T(lang,
      'سجّل مدخولاتك ليتفعّل توقّع الضريبة والسقف السنوي.',
      'רשום את ההכנסות שלך כדי להפעיל את תחזית המס והתקרה השנתית.',
      'Log your income to activate tax and annual-cap forecasting.') })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── كاشف التسريب — Expense Anomaly Radar ─────────────────────────────────────────

/**
 * @param {object} a
 * @param {string} [lang='ar']
 * @returns {{ anomalies, leakTotal, leakCount, spikeCount, tone, hasData }}
 */
export function detectExpenseAnomalies(a = {}, lang = 'ar') {
  const { entries = [], monthKey = '', lookback = 3 } = a

  const cur = entries.filter(e => (e.date || '').startsWith(monthKey))
  if (entries.length === 0 || !monthKey) {
    return { anomalies: [], leakTotal: 0, leakCount: 0, spikeCount: 0, tone: 'fair', hasData: false }
  }

  const prevMonths = [...new Set(entries.map(e => (e.date || '').slice(0, 7)).filter(m => m && m < monthKey))]
    .sort().slice(-lookback)

  const byCatMonth = {}
  for (const e of entries) {
    const m = (e.date || '').slice(0, 7)
    const c = e.category || 'أخرى'
    byCatMonth[c] = byCatMonth[c] || {}
    byCatMonth[c][m] = (byCatMonth[c][m] || 0) + Number(e.amount || 0)
  }

  const anomalies = []
  let spikeCount = 0

  // ① قفزات الفئات
  for (const [cat, months] of Object.entries(byCatMonth)) {
    const curTotal = months[monthKey] || 0
    if (curTotal <= 0 || prevMonths.length === 0) continue
    const prevVals = prevMonths.map(m => months[m] || 0).filter(v => v > 0)
    if (prevVals.length === 0) continue
    const baseline = prevVals.reduce((s, v) => s + v, 0) / prevVals.length
    if (curTotal >= baseline * 1.4 && curTotal - baseline >= 300) {
      const pct = Math.round((curTotal / baseline - 1) * 100)
      const catL = tEnum(cat, lang)
      anomalies.push({ tone: 'warn', icon: 'TrendingUp', amount: Math.round(curTotal), text: T(lang,
        `مصروف «${catL}» هذا الشهر ₪${fmt(Math.round(curTotal))} — أعلى ${pct}% من معدّلك (₪${fmt(Math.round(baseline))}).`,
        `הוצאת «${catL}» החודש ₪${fmt(Math.round(curTotal))} — גבוהה ב-${pct}% מהממוצע שלך (₪${fmt(Math.round(baseline))}).`,
        `«${catL}» expense this month ₪${fmt(Math.round(curTotal))} — ${pct}% above your average (₪${fmt(Math.round(baseline))}).`) })
      spikeCount++
    }
  }

  // ② تسريب: مصاريف غير منسوبة لأي مشروع
  const leakRows  = cur.filter(e => !e.project_id && !e.is_general)
  const leakTotal = Math.round(leakRows.reduce((s, e) => s + Number(e.amount || 0), 0))
  const leakCount = leakRows.length
  if (leakCount > 0 && leakTotal >= 300) {
    anomalies.push({ tone: 'tip', icon: 'FolderInput', amount: leakTotal, text: T(lang,
      `${leakCount} ${leakCount === 1 ? 'مصروف' : 'مصاريف'} بدون مشروع — ₪${fmt(leakTotal)} غير محسوبة في ربحية مشاريعك.`,
      `${leakCount} ${leakCount === 1 ? 'הוצאה' : 'הוצאות'} ללא פרויקט — ₪${fmt(leakTotal)} לא נכללות ברווחיות הפרויקטים שלך.`,
      `${leakCount} ${leakCount === 1 ? 'expense' : 'expenses'} without a project — ₪${fmt(leakTotal)} not counted in your project profitability.`) })
  }

  // ③ قيمة متطرّفة
  if (cur.length >= 4) {
    const vals = cur.map(e => Number(e.amount || 0))
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const sd   = stdDev(vals)
    const top  = cur.reduce((mx, e) => (Number(e.amount || 0) > Number(mx.amount || 0) ? e : mx), cur[0])
    const topAmt = Number(top.amount || 0)
    if (sd > 0 && topAmt >= mean + 2 * sd && topAmt >= 1000) {
      const topCat = top.category ? tEnum(top.category, lang) : ''
      anomalies.push({ tone: 'tip', icon: 'AlertTriangle', amount: Math.round(topAmt), text: T(lang,
        `أكبر مصروف هذا الشهر ₪${fmt(Math.round(topAmt))}${topCat ? ` (${topCat})` : ''} — أعلى بكثير من معتاد مصاريفك.`,
        `ההוצאה הגדולה ביותר החודש ₪${fmt(Math.round(topAmt))}${topCat ? ` (${topCat})` : ''} — גבוהה בהרבה מהרגיל אצלך.`,
        `Largest expense this month ₪${fmt(Math.round(topAmt))}${topCat ? ` (${topCat})` : ''} — far above your usual spending.`) })
    }
  }

  // ترتيب: تحذيرات أولاً
  const order = { warn: 0, tip: 1, good: 2 }
  anomalies.sort((x, y) => (order[x.tone] - order[y.tone]) || (y.amount - x.amount))

  // الحالة النظيفة
  if (anomalies.length === 0)
    anomalies.push({ tone: 'good', icon: 'ShieldCheck', amount: 0, text: T(lang,
      'ما في تسريب أو مصاريف شاذّة — صرفك منتظم هذا الشهر.',
      'אין דליפה או הוצאות חריגות — ההוצאות שלך מסודרות החודש.',
      'No leaks or unusual expenses — your spending is in order this month.') })

  const tone = spikeCount >= 2 ? 'critical' : spikeCount === 1 ? 'weak'
             : anomalies.some(an => an.tone === 'tip') ? 'fair' : 'excellent'

  return { anomalies: anomalies.slice(0, 4), leakTotal, leakCount, spikeCount, tone, hasData: true }
}

// ─── رادار التحصيل — Collection Aging ──────────────────────────────────────────────

const AGING_BUCKETS = [
  { key: 'current', label: { ar: 'جاري (0–30 يوم)',    he: 'שוטף (0–30 ימים)', en: 'Current (0–30 days)' }, max: 30 },
  { key: 'd30',     label: { ar: '31–60 يوم',          he: '31–60 ימים',       en: '31–60 days' },          max: 60 },
  { key: 'd60',     label: { ar: '61–90 يوم',          he: '61–90 ימים',       en: '61–90 days' },          max: 90 },
  { key: 'd90',     label: { ar: 'أكثر من 90 يوم',     he: 'מעל 90 ימים',      en: '90+ days' },            max: Infinity },
]

/**
 * @param {object} a
 * @param {string} [lang='ar']
 */
export function computeCollectionAging(a = {}, lang = 'ar') {
  const { projects = [], receipts = [], now = Date.now() } = a

  const items = []
  for (const p of projects) {
    const price = parseFloat(p.price) || 0
    if (price <= 0) continue
    const projReceipts = receipts.filter(r => r.project_id === p.id)
    const received = projReceipts.reduce((s, r) => s + Number(r.amount || 0), 0)
    const outstanding = Math.round(price - received)
    if (outstanding < 1) continue

    const dates   = projReceipts.map(r => r.date || '').filter(Boolean).sort()
    const refDate = dates.at(-1) || (p.created_at ? String(p.created_at).slice(0, 10) : null)
    const daysSince = refDate ? Math.max(0, Math.floor((now - new Date(refDate).getTime()) / 86400000)) : 0
    const bucket = AGING_BUCKETS.find(b => daysSince <= b.max).key

    items.push({
      id: p.id, name: p.name || T(lang, 'مشروع', 'פרויקט', 'Project'), client: p.client_name || '', phone: p.client_phone || '',
      outstanding, daysSince, bucket,
    })
  }

  items.sort((x, y) => y.daysSince - x.daysSince || y.outstanding - x.outstanding)

  const buckets = AGING_BUCKETS.map(b => {
    const rows = items.filter(it => it.bucket === b.key)
    return { key: b.key, label: T(lang, b.label.ar, b.label.he, b.label.en), amount: rows.reduce((s, it) => s + it.outstanding, 0), count: rows.length }
  })

  const totalOutstanding = items.reduce((s, it) => s + it.outstanding, 0)
  const overdueTotal     = items.filter(it => it.bucket !== 'current').reduce((s, it) => s + it.outstanding, 0)
  const overdueCount     = items.filter(it => it.bucket !== 'current').length
  const d90Total         = buckets.find(b => b.key === 'd90').amount
  const worst            = items[0] || null
  const hasData          = projects.some(p => (parseFloat(p.price) || 0) > 0)

  const tone = d90Total > 0 ? 'critical' : overdueTotal > 0 ? 'weak'
             : totalOutstanding > 0 ? 'fair' : 'excellent'

  return {
    totalOutstanding, overdueTotal, overdueCount, d90Total,
    buckets, items, worst, tone, hasData,
    insights: buildAgingInsights({ totalOutstanding, overdueTotal, overdueCount, d90Total, worst }, lang),
  }
}

function buildAgingInsights({ totalOutstanding, overdueTotal, overdueCount, d90Total, worst }, lang = 'ar') {
  const out = []

  if (worst && worst.daysSince > 30)
    out.push({ tone: 'warn', icon: 'PhoneCall', text: T(lang,
      `اتّصل بـ${worst.client || worst.name} أولاً — ₪${fmt(worst.outstanding)} متأخّرة ${worst.daysSince} يوم.`,
      `התקשר ל${worst.client || worst.name} קודם — ₪${fmt(worst.outstanding)} באיחור של ${worst.daysSince} ימים.`,
      `Call ${worst.client || worst.name} first — ₪${fmt(worst.outstanding)} overdue by ${worst.daysSince} days.`) })

  if (d90Total > 0)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `₪${fmt(d90Total)} متأخّرة أكثر من 90 يوم — ديون متعثّرة، تابعها بجدّية.`,
      `₪${fmt(d90Total)} באיחור של מעל 90 ימים — חובות בעייתיים, טפל בהם ברצינות.`,
      `₪${fmt(d90Total)} overdue more than 90 days — bad debt, pursue seriously.`) })

  if (overdueTotal > 0 && overdueCount > 1)
    out.push({ tone: 'tip', icon: 'Clock', text: T(lang,
      `${overdueCount} مستحقّات متأخّرة بمجموع ₪${fmt(overdueTotal)} — رتّب جولة تحصيل.`,
      `${overdueCount} חובות באיחור בסך ₪${fmt(overdueTotal)} — ארגן סבב גבייה.`,
      `${overdueCount} overdue receivables totaling ₪${fmt(overdueTotal)} — organize a collection round.`) })
  else if (totalOutstanding > 0 && overdueTotal === 0)
    out.push({ tone: 'tip', icon: 'CalendarClock', text: T(lang,
      `₪${fmt(totalOutstanding)} مستحقّة لكن كلها ضمن المهلة الطبيعية (أقل من شهر).`,
      `₪${fmt(totalOutstanding)} לתשלום אך כולן בתוך הזמן הסביר (פחות מחודש).`,
      `₪${fmt(totalOutstanding)} outstanding but all within the normal window (under a month).`) })

  if (totalOutstanding === 0)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      'ما في ذمم مفتوحة — كل عملائك سدّدوا. ممتاز!',
      'אין חובות פתוחים — כל הלקוחות שילמו. מצוין!',
      'No open receivables — all your clients have paid. Excellent!') })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── نبض الفريق — Team Productivity Pulse ──────────────────────────────────────────

function teamRecencyScore(d) {
  if (d == null) return 10
  if (d <= 1)  return 100
  if (d <= 3)  return 85
  if (d <= 7)  return 60
  if (d <= 14) return 38
  return 18
}

/**
 * @param {object} a
 * @param {string} [lang='ar']
 */
export function computeTeamPulse(a = {}, lang = 'ar') {
  const { members = [], activity = [], now = Date.now(), idleDays = 12 } = a
  const active = members.filter(m => !m.is_blocked)

  const byEmail = {}
  for (const ev of activity) {
    const k = ev.actor_email || ''
    byEmail[k] = byEmail[k] || { count: 0, last: null, actions: {} }
    byEmail[k].count++
    const ts = new Date(ev.created_at).getTime()
    if (!byEmail[k].last || ts > byEmail[k].last) byEmail[k].last = ts
    byEmail[k].actions[ev.action] = (byEmail[k].actions[ev.action] || 0) + 1
  }

  const rows = active.map(m => {
    const rec = byEmail[m.auth_email] || { count: 0, last: null, actions: {} }
    const daysSince = rec.last != null ? Math.max(0, Math.floor((now - rec.last) / 86400000)) : null
    return { id: m.id, name: m.display_name || m.username || T(lang, 'عضو', 'חבר', 'Member'), count: rec.count, daysSince, actions: rec.actions }
  })

  const maxCount = Math.max(1, ...rows.map(r => r.count))
  for (const r of rows) {
    const rec = teamRecencyScore(r.daysSince)
    const vol = (r.count / maxCount) * 100
    r.score = Math.round(0.55 * rec + 0.45 * vol)
    r.tier  = r.score >= 75 ? T(lang, 'نشط جداً', 'פעיל מאוד', 'Very active')
            : r.score >= 55 ? T(lang, 'نشط', 'פעיל', 'Active')
            : r.score >= 35 ? T(lang, 'معتدل', 'בינוני', 'Moderate')
            :                 T(lang, 'خامل', 'רדום', 'Idle')
    r.tone  = r.score >= 75 ? 'excellent' : r.score >= 55 ? 'good' : r.score >= 35 ? 'fair' : 'weak'
  }
  rows.sort((x, y) => y.count - x.count || (x.daysSince ?? 9999) - (y.daysSince ?? 9999))

  const totalActions  = activity.length
  const activeMembers = rows.filter(r => r.count > 0 && r.daysSince != null && r.daysSince <= 14).length
  const engagement    = active.length > 0 ? activeMembers / active.length : 0
  const avgRecency    = rows.length ? rows.reduce((s, r) => s + teamRecencyScore(r.daysSince), 0) / rows.length : 50
  const score         = active.length === 0 ? 0 : Math.round(0.5 * engagement * 100 + 0.5 * avgRecency)

  const mostActive = rows.find(r => r.count > 0) || null
  const idle       = rows.filter(r => r.daysSince == null || r.daysSince >= idleDays)

  return {
    score, ...gradeFor(score, lang),
    rows, mostActive, totalActions, activeMembers, memberCount: active.length,
    hasData: active.length > 0,
    insights: buildTeamInsights({ rows, mostActive, idle, totalActions, idleDays }, lang),
  }
}

function buildTeamInsights({ rows, mostActive, idle, totalActions }, lang = 'ar') {
  const out = []

  const worstIdle = idle.find(r => r.daysSince != null)
  if (worstIdle)
    out.push({ tone: 'warn', icon: 'UserX', text: T(lang,
      `${worstIdle.name} ما سجّل أي نشاط من ${worstIdle.daysSince} يوم — تأكّد إنه شغّال.`,
      `${worstIdle.name} לא רשם פעילות כבר ${worstIdle.daysSince} ימים — ודא שהוא פעיל.`,
      `${worstIdle.name} hasn't logged any activity for ${worstIdle.daysSince} days — make sure they're working.`) })

  const neverActive = idle.find(r => r.daysSince == null)
  if (neverActive && totalActions > 0)
    out.push({ tone: 'tip', icon: 'UserMinus', text: T(lang,
      `${neverActive.name} ما سجّل أي عملية بعد — لسّا ما بدأ يستخدم حسابه.`,
      `${neverActive.name} עדיין לא ביצע אף פעולה — טרם התחיל להשתמש בחשבון שלו.`,
      `${neverActive.name} hasn't performed any action yet — hasn't started using their account.`) })

  const deleter = rows.find(r => (r.actions?.delete || r.actions?.DELETE || 0) >= 5)
  if (deleter) {
    const dc = deleter.actions.delete || deleter.actions.DELETE
    out.push({ tone: 'tip', icon: 'Trash2', text: T(lang,
      `${deleter.name} نفّذ ${dc} عملية حذف — راجع سجلّ نشاطه للاطمئنان.`,
      `${deleter.name} ביצע ${dc} פעולות מחיקה — בדוק את יומן הפעילות שלו לוודא.`,
      `${deleter.name} performed ${dc} deletions — review their activity log to be safe.`) })
  }

  if (mostActive && mostActive.count > 0)
    out.push({ tone: 'good', icon: 'Zap', text: T(lang,
      `${mostActive.name} أنشط عضو في فريقك — ${mostActive.count} عملية مسجّلة.`,
      `${mostActive.name} החבר הפעיל ביותר בצוות — ${mostActive.count} פעולות מתועדות.`,
      `${mostActive.name} is your most active member — ${mostActive.count} actions logged.`) })

  if (totalActions === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: T(lang,
      'ما في نشاط مسجّل بعد — يظهر التحليل لما يبدأ فريقك العمل.',
      'אין פעילות מתועדת עדיין — הניתוח יופיע כשהצוות יתחיל לעבוד.',
      'No activity logged yet — analysis appears once your team starts working.') })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── مركز القيادة الذكي — Smart Command Center ─────────────────────────────────────

/** يبني مدخلات بصمة العامل من البيانات الخام (مشترك بين الداشبورد وشاشة العمّال). */
function workerDNAFromRaw(emp, { workDays, expenses, advances, fleetAvgPerDay }, lang = 'ar') {
  const wds    = workDays.filter(w => w.employee_id === emp.id)
  const wdsApp = wds.filter(w => w.status === 'approved')
  const expApp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
  const advTot = advances.filter(a => a.employee_id === emp.id).reduce((s, a) => s + (a.amount || 0), 0)
  const avgPerDay = wdsApp.length ? calcEarned(wdsApp) / wdsApp.length : 0

  const byMonth = {}; let minK = null, maxK = null
  for (const w of wds) {
    if (!w.date) continue
    const k = w.date.slice(0, 7)
    if (w.status === 'approved') byMonth[k] = (byMonth[k] || 0) + 1
    if (!minK || k < minK) minK = k
    if (!maxK || k > maxK) maxK = k
  }
  let tenure = 0
  if (minK && maxK) {
    const [y1, m1] = minK.split('-').map(Number)
    const [y2, m2] = maxK.split('-').map(Number)
    tenure = (y2 - y1) * 12 + (m2 - m1) + 1
  }

  return computeWorkerDNA({
    name: emp.name, earned: calcMustahaq(wdsApp, expApp), advances: advTot,
    avgPerDay, fleetAvgPerDay,
    approvedDays: wdsApp.length,
    pendingDays:  wds.filter(w => w.status === 'pending').length,
    rejectedDays: wds.filter(w => w.status === 'rejected').length,
    daysPerMonth: Object.values(byMonth), tenureMonths: tenure,
  }, lang)
}

const CC_LABELS = {
  projects:   { ar: 'مشاريع بخطر',   he: 'פרויקטים בסיכון', en: 'At-risk projects' },
  collection: { ar: 'متأخّر تحصيله', he: 'באיחור בגבייה',   en: 'Overdue' },
  expenses:   { ar: 'تنبيهات صرف',   he: 'התראות הוצאה',    en: 'Expense alerts' },
  workers:    { ar: 'عمّال للمتابعة', he: 'עובדים למעקב',   en: 'Workers to watch' },
  team:       { ar: 'نبض الفريق',    he: 'דופק הצוות',      en: 'Team pulse' },
}

/**
 * @param {object} a
 * @param {string} [lang='ar']
 * @returns {{ scorecards, feed, alertCount, hasData }}
 */
export function computeCommandCenter(a = {}, lang = 'ar') {
  const {
    projects = [], employees = [], workDays = [], expenses = [],
    payments = [], advances = [], clientReceipts = [],
    monthKey = '', teamMembers = [], teamActivity = [], isOwner = true,
    now = Date.now(),
  } = a

  // ① صحّة المشاريع
  const activeProjects = projects.filter(p => p.status === 'نشط' || p.status === 'مكتمل')
  let worstProject = null, atRiskProjects = 0
  for (const p of activeProjects) {
    const stats = calcProjectStats(p.id, workDays, expenses, clientReceipts)
    if (stats.revenue <= 0 && stats.cost <= 0) continue
    const paidToWorkers = payments.filter(x => x.project_id === p.id).reduce((s, x) => s + (x.amount || 0), 0)
    const advancesPaid  = advances.filter(x => x.project_id === p.id).reduce((s, x) => s + (x.amount || 0), 0)
    const ownerCash = calcOwnerCash(stats.revenue, stats.projExpTotal, paidToWorkers, advancesPaid)
    const health = computeProjectHealth({
      name: p.name, price: parseFloat(p.price) || 0, revenue: stats.revenue, cost: stats.cost,
      ownerCash, profit: stats.profit, margin: stats.margin, overdue: !!isPaymentOverdue(p, clientReceipts),
    }, lang)
    if (health.score < 50) atRiskProjects++
    if (!worstProject || health.score < worstProject.score)
      worstProject = { name: p.name, score: health.score, insight: health.insights[0] }
  }

  // ② بصمة العمّال
  const approvedWDs = workDays.filter(w => w.status === 'approved')
  const fleetAvgPerDay = approvedWDs.length ? calcEarned(approvedWDs) / approvedWDs.length : 0
  let worstWorker = null, watchWorkers = 0
  for (const e of employees) {
    if (workDays.every(w => w.employee_id !== e.id)) continue
    const dna = workerDNAFromRaw(e, { workDays, expenses, advances, fleetAvgPerDay }, lang)
    if (dna.score < 50) watchWorkers++
    if (!worstWorker || dna.score < worstWorker.score)
      worstWorker = { name: e.name, score: dna.score, insight: dna.insights[0] }
  }

  // ③④⑤ التحصيل + المصاريف + الفريق
  const aging = computeCollectionAging({ projects, receipts: clientReceipts, now }, lang)
  const radar = detectExpenseAnomalies({ entries: expenses, monthKey }, lang)
  const team  = (isOwner && teamMembers.length) ? computeTeamPulse({ members: teamMembers, activity: teamActivity, now }, lang) : null

  // بطاقات المؤشّرات
  const L = (k) => T(lang, CC_LABELS[k].ar, CC_LABELS[k].he, CC_LABELS[k].en)
  const scorecards = [
    { key: 'projects',   label: L('projects'),   value: atRiskProjects, tone: atRiskProjects > 0 ? 'weak' : 'excellent', screen: 'projects', icon: 'ShieldCheck' },
    { key: 'collection', label: L('collection'), value: aging.overdueTotal, money: true, tone: aging.tone, screen: 'finance', icon: 'Hourglass' },
    { key: 'expenses',   label: L('expenses'),   value: radar.anomalies.filter(x => x.tone !== 'good').length, tone: radar.tone, screen: 'finance', icon: 'Radar' },
    { key: 'workers',    label: L('workers'),    value: watchWorkers, tone: watchWorkers > 0 ? 'fair' : 'excellent', screen: 'workers', icon: 'Fingerprint' },
  ]
  if (team) scorecards.push({ key: 'team', label: L('team'), value: team.score, score: true, tone: team.tone, screen: 'team', icon: 'Users' })

  // الموجز الموحّد
  const feed = []
  const push = (ins, screen) => { if (ins && ins.tone !== 'good') feed.push({ tone: ins.tone, icon: ins.icon, text: ins.text, screen }) }
  if (worstProject && worstProject.score < 60) push(worstProject.insight, 'projects')
  push(aging.insights[0], 'finance')
  push(radar.anomalies[0], 'finance')
  if (worstWorker && worstWorker.score < 50) push(worstWorker.insight, 'workers')
  if (team) push(team.insights[0], 'team')

  const order = { warn: 0, tip: 1, good: 2 }
  feed.sort((x, y) => order[x.tone] - order[y.tone])

  return {
    scorecards,
    feed: feed.slice(0, 5),
    alertCount: feed.filter(f => f.tone === 'warn').length,
    hasData: activeProjects.length > 0 || employees.length > 0,
  }
}

// ─── الذمّة الصافية — Net Worth / Equity Bridge ────────────────────────────────────

const NW_TONE_ORDER = { warn: 0, tip: 1, good: 2 }

/** نبرة لونية لمركزك حسب الصافي والسيولة وتغطية الالتزامات. */
function netWorthTone({ netWorth, cashOnHand, liabilities }) {
  if (netWorth < 0)            return 'critical'
  if (cashOnHand < 0)          return 'weak'
  if (liabilities > cashOnHand) return 'fair'
  if (liabilities > 0)         return 'good'
  return 'excellent'
}

const NW_LABELS = {
  cash:        { ar: 'نقد بالجيب',     he: 'מזומן ביד',      en: 'Cash on hand' },
  receivables: { ar: 'ذمم العملاء',    he: 'חייבים (לקוחות)', en: 'Receivables' },
  workers:     { ar: 'مستحق العمّال',  he: 'חוב לעובדים',    en: 'Worker dues' },
  pending:     { ar: 'مصاريف معلّقة',  he: 'הוצאות ממתינות', en: 'Pending expenses' },
  net:         { ar: 'صافي مركزك',     he: 'השווי הנקי שלך', en: 'Your net worth' },
}

/**
 * المحرّك الرئيسي — يحسب الذمّة الصافية وشلالها.
 * @param {object} a
 * @param {string} [lang='ar']
 */
export function computeNetWorth(a = {}, lang = 'ar') {
  const {
    cashOnHand = 0, owedByClients = 0,
    owedToWorkers = 0, pendingExpenses = 0,
  } = a

  const cash    = Math.round(cashOnHand)
  const recv    = Math.round(Math.max(0, owedByClients))
  const workers = Math.round(Math.max(0, owedToWorkers))
  const pending = Math.round(Math.max(0, pendingExpenses))

  const assets      = Math.max(0, cash) + recv
  const liabilities = workers + pending
  const netWorth    = cash + recv - workers - pending
  const coverage    = liabilities > 0 ? (Math.max(0, cash) + recv) / liabilities : null

  const NWL = (k) => T(lang, NW_LABELS[k].ar, NW_LABELS[k].he, NW_LABELS[k].en)

  // ── شلال البناء ──
  const segments = []
  let run = 0
  const step = (key, label, delta, kind, screen, icon) => {
    const start = run
    run += delta
    segments.push({ key, label, delta, start, end: run, kind, screen, icon })
  }

  step('cash', NWL('cash'), cash, 'base', 'finance', 'Wallet')
  if (recv > 0)    step('receivables', NWL('receivables'), recv,     'asset',     'projects', 'DollarSign')
  if (workers > 0) step('workers',     NWL('workers'),     -workers, 'liability', 'workers',  'Users')
  if (pending > 0) step('pending',     NWL('pending'),     -pending, 'liability', 'finance',  'Clock')
  segments.push({ key: 'net', label: NWL('net'), delta: netWorth, start: 0, end: netWorth, kind: 'net', screen: null, icon: 'Landmark' })

  const tone     = netWorthTone({ netWorth, cashOnHand: cash, liabilities })
  const hasData  = !!(cash || recv || workers || pending)

  return {
    netWorth, assets, liabilities, cashOnHand: cash, coverage,
    tone, segments, hasData,
    insights: buildNetWorthInsights({ netWorth, cash, recv, workers, pending, liabilities, coverage }, lang),
  }
}

// رؤى الذمّة الصافية — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildNetWorthInsights({ netWorth, cash, recv, workers, pending, liabilities, coverage }, lang = 'ar') {
  const out = []

  if (netWorth < 0)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: T(lang,
      `مركزك سالب بـ ₪${fmt(-netWorth)} — التزاماتك أكبر من موجوداتك. ركّز على التحصيل وقلّل الصرف.`,
      `השווי שלך שלילי ב-₪${fmt(-netWorth)} — ההתחייבויות גדולות מהנכסים. התמקד בגבייה והפחת הוצאות.`,
      `Your net worth is negative by ₪${fmt(-netWorth)} — liabilities exceed assets. Focus on collection and cut spending.`) })
  else if (cash < 0)
    out.push({ tone: 'warn', icon: 'Wallet', text: T(lang,
      `ذمّتك موجبة (₪${fmt(netWorth)}) لكن نقدك سالب — أنت مكشوف على تحصيل ₪${fmt(recv)}. سرّع القبض.`,
      `השווי שלך חיובי (₪${fmt(netWorth)}) אך המזומן שלילי — אתה תלוי בגביית ₪${fmt(recv)}. זרז את הגבייה.`,
      `Your net worth is positive (₪${fmt(netWorth)}) but cash is negative — you're exposed to collecting ₪${fmt(recv)}. Speed up receipts.`) })
  else if (workers > 0 && workers > cash)
    out.push({ tone: 'warn', icon: 'Users', text: T(lang,
      `مستحقّات العمّال ₪${fmt(workers)} أكبر من نقدك ₪${fmt(cash)} — حصّل قبل دورة الرواتب القادمة.`,
      `חוב לעובדים ₪${fmt(workers)} גדול מהמזומן שלך ₪${fmt(cash)} — גבה לפני מחזור המשכורות הבא.`,
      `Worker dues ₪${fmt(workers)} exceed your cash ₪${fmt(cash)} — collect before the next payroll cycle.`) })

  if (recv > 0)
    out.push({ tone: 'tip', icon: 'DollarSign', text: T(lang,
      `₪${fmt(recv)} محتجزة عند عملائك — تحصيلها يرفع نقدك مباشرة. ذكّرهم من رادار التحصيل.`,
      `₪${fmt(recv)} מוחזקים אצל הלקוחות שלך — גבייתם מעלה את המזומן ישירות. הזכר להם דרך רדאר הגבייה.`,
      `₪${fmt(recv)} held by your clients — collecting it raises your cash directly. Remind them from the collection radar.`) })

  if (pending > 0)
    out.push({ tone: 'tip', icon: 'Clock', text: T(lang,
      `₪${fmt(pending)} مصاريف معلّقة بانتظار اعتمادك — ستخصم من مركزك عند إقرارها.`,
      `₪${fmt(pending)} הוצאות ממתינות לאישורך — ינוכו מהשווי שלך עם אישורן.`,
      `₪${fmt(pending)} in pending expenses await your approval — they'll deduct from your net worth once approved.`) })

  if (netWorth > 0 && liabilities === 0)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: T(lang,
      `لا التزامات مفتوحة — كل ذمّتك (₪${fmt(netWorth)}) سائلة ومتاحة. وضع ممتاز.`,
      `אין התחייבויות פתוחות — כל השווי שלך (₪${fmt(netWorth)}) נזיל וזמין. מצב מצוין.`,
      `No open liabilities — all your net worth (₪${fmt(netWorth)}) is liquid and available. Excellent.`) })
  else if (netWorth > 0 && coverage != null && coverage >= 1.5)
    out.push({ tone: 'good', icon: 'ShieldCheck', text: T(lang,
      `مركزك متين — موجوداتك تغطّي التزاماتك ${coverage >= 9.5 ? '+9' : coverage.toFixed(1)} مرّة، وصافي ذمّتك ₪${fmt(netWorth)}.`,
      `המצב שלך איתן — הנכסים מכסים את ההתחייבויות ${coverage >= 9.5 ? '+9' : coverage.toFixed(1)} פעמים, והשווי הנקי ₪${fmt(netWorth)}.`,
      `Your position is solid — assets cover liabilities ${coverage >= 9.5 ? '+9' : coverage.toFixed(1)}×, and net worth is ₪${fmt(netWorth)}.`) })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Landmark', text: T(lang,
      'سجّل مقبوضاتك ومصاريفك ليتفعّل حساب ذمّتك الصافية.',
      'רשום תקבולים והוצאות כדי להפעיל את חישוב השווי הנקי.',
      'Log your receipts and expenses to activate net-worth calculation.') })

  return out.sort((x, y) => NW_TONE_ORDER[x.tone] - NW_TONE_ORDER[y.tone]).slice(0, 3)
}
