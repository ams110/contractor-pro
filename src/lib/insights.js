// ─── نبض المصلحة — Business Pulse ────────────────────────────────────────────────
// محرّك ذكاء مالي: يحوّل كل أرقام المصلحة إلى مؤشّر صحّة واحد (0–100)،
// مع تفصيل العوامل ورؤى ذكية تلقائية بالعربي. دوال نقيّة بالكامل — لا DOM، قابلة للاختبار.

import { fmt, isPaymentOverdue } from './helpers.js'
import { calcProjectStats, calcOwnerCash, calcEarned, calcMustahaq } from './calculations.js'

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

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
  liquidity:     'السيولة',
  profitability: 'الربحية',
  collection:    'التحصيل',
  workerBalance: 'تسوية العمّال',
  momentum:      'الاتجاه',
}

/** درجة تقدير + نبرة لونية حسب النتيجة. */
export function gradeFor(score) {
  if (score >= 85) return { tone: 'excellent', grade: 'ممتازة' }
  if (score >= 70) return { tone: 'good',      grade: 'جيّدة'  }
  if (score >= 50) return { tone: 'fair',      grade: 'مقبولة' }
  if (score >= 30) return { tone: 'weak',      grade: 'ضعيفة'  }
  return                  { tone: 'critical',  grade: 'حرجة'   }
}

/**
 * المحرّك الرئيسي — يحسب مؤشّر النبض الكامل.
 * @param {object} a - أرقام مجمّعة من الداشبورد
 * @returns {{ score, grade, tone, factors, insights, momentum }}
 */
export function computeBusinessPulse(a = {}) {
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
    key: k, label: LABELS[k], score: scores[k], weight: WEIGHTS[k],
  }))

  return {
    score,
    ...gradeFor(score),
    factors,
    momentum: momentumPct(monthlyData),
    insights: buildInsights({ cashOnHand, netProfit, totalRevenue, owedToWorkers, owedByClients, overdueCount, monthlyData }),
  }
}

// ─── الرؤى الذكية ────────────────────────────────────────────────────────────────
// تُرتَّب: تحذيرات → نصائح → إيجابيات. أعلى 4. الأيقونات أسماء Lucide يُحوّلها المكوّن.
function buildInsights(a) {
  const { cashOnHand, netProfit, totalRevenue, owedToWorkers, owedByClients, overdueCount, monthlyData } = a
  const margin = totalRevenue > 0 ? netProfit / totalRevenue : 0
  const mom    = momentumPct(monthlyData)
  const out    = []

  if (cashOnHand < 0)
    out.push({ tone: 'warn', icon: 'Wallet', text: `السيولة سالبة بـ ₪${fmt(-cashOnHand)} — المدفوع تجاوز المقبوض. ركّز على التحصيل.` })

  if (overdueCount > 0)
    out.push({ tone: 'warn', icon: 'Clock', text: `${overdueCount} ${overdueCount === 1 ? 'مشروع متأخّر' : 'مشاريع متأخّرة'} بالتحصيل — تابع باقي لك عند العملاء.` })

  if (owedToWorkers > 0 && cashOnHand >= 0 && owedToWorkers > cashOnHand)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `مستحقات العمّال ₪${fmt(owedToWorkers)} أكبر من سيولتك ₪${fmt(cashOnHand)} — انتبه للتدفّق النقدي.` })

  if (totalRevenue > 0 && margin < 0)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: `هامش الربح سالب (${Math.round(margin * 100)}%) — راجع المصاريف أو سعّر أعلى.` })

  if (owedByClients > 0)
    out.push({ tone: 'tip', icon: 'MessageCircle', text: `عندك ₪${fmt(owedByClients)} غير محصّلة — أرسل تذكير للعملاء عبر واتساب بضغطة.` })

  if (totalRevenue > 0 && margin >= 0.3)
    out.push({ tone: 'good', icon: 'TrendingUp', text: `هامش ربح ممتاز ${Math.round(margin * 100)}% — استمر على نفس النهج.` })

  if (mom >= 10)
    out.push({ tone: 'good', icon: 'Activity', text: `أداؤك بتحسّن — صافي آخر 3 أشهر أعلى بـ ${mom}% عن السابق.` })

  if (cashOnHand > 0 && owedToWorkers === 0 && owedByClients === 0 && totalRevenue > 0)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: 'وضعك نظيف — لا ديون مفتوحة وسيولتك موجبة.' })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Sparkles', text: 'ابدأ بتسجيل مشاريعك ومدخولاتك ليتفعّل التحليل الذكي.' })

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

/** صياغة مدّة بالأشهر بصيغة عربية سليمة. */
export function fmtMonths(m) {
  if (m >= 12) return 'أكثر من سنة'
  const r = Math.max(1, Math.round(m))
  if (r === 1) return 'شهر واحد'
  if (r === 2) return 'شهرين'
  if (r <= 10) return `${r} أشهر`
  return `${r} شهر`
}

/**
 * يحسب توقّع التدفّق النقدي للأشهر القادمة.
 * @param {object} a
 * @param {number} a.cashOnHand   - النقد الحالي بالجيب
 * @param {number} a.totalRevenue - إجمالي الإيراد (مرجع للحجم)
 * @param {Array}  a.monthlyData  - [{ month, v }] صافي شهري (v)، الأقدم أولاً
 * @param {number} [a.horizon=3]  - عدد الأشهر للتنبّؤ
 * @returns {object|null} null إذا لم يتوفّر تاريخ كافٍ للتنبّؤ
 */
export function computeCashForecast(a = {}) {
  const { cashOnHand = 0, totalRevenue = 0, monthlyData = [], horizon = 3 } = a

  const flows  = monthlyData.map(m => m.v || 0)
  const active = flows.filter(v => v !== 0)
  if (active.length < 2) return null   // تاريخ غير كافٍ — لا تُظهر التوقّع

  const avgFlow = Math.round(weightedAvg(flows))
  const vol     = stdDev(flows)

  // المسار التاريخي: نعيد بناء موضع السيولة بنهاية كل شهر بحيث ينتهي عند النقد الحالي
  // (يربط الرسم بالواقع). نمشي للخلف: pos[i] = pos[i+1] − v[i+1]
  const history = monthlyData.map(m => ({ label: m.month, actual: 0, forecast: null, kind: 'past' }))
  let pos = cashOnHand
  for (let i = monthlyData.length - 1; i >= 0; i--) {
    history[i].actual = Math.round(pos)
    pos -= flows[i]
  }

  // نقطة الوصل = الحاضر (لها actual + forecast لتتّصل الخطوط، ونطاق صفري للبداية)
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

  // «عدّاد الأمان»: كم شهر تكفي السيولة لو استمر النزيف بنفس المعدّل
  let runway = null
  if (avgFlow < 0 && cashOnHand > 0) runway = cashOnHand / -avgFlow

  // النبرة اللونية
  let tone
  if (avgFlow > 0)      tone = (cashOnHand >= 0 && projected >= cashOnHand * 1.2) ? 'excellent' : 'good'
  else if (avgFlow < 0) tone = runway == null ? 'critical' : runway <= 2 ? 'critical' : runway <= 4 ? 'weak' : 'fair'
  else                  tone = 'fair'

  return {
    avgFlow, projected: Math.round(projected), runway, rising: avgFlow > 0, tone, horizon, series,
    insights: buildForecastInsights({ avgFlow, projected, cashOnHand, runway, horizon }),
  }
}

// رؤى التوقّع — جملة أو جملتان تختصران المسار والإجراء المقترح.
function buildForecastInsights({ avgFlow, projected, cashOnHand, runway, horizon }) {
  const span = horizon === 3 ? '٣ أشهر' : `${horizon} أشهر`
  const out  = []

  if (avgFlow < 0 && runway != null)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: `تدفّقك النقدي سالب بمعدّل ₪${fmt(-avgFlow)}/شهر — بهذا المعدّل سيولتك تكفي ${fmtMonths(runway)} فقط.` })
  else if (avgFlow < 0)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `تنزف نقداً بمعدّل ₪${fmt(-avgFlow)}/شهر وسيولتك سالبة — تحرّك بسرعة على التحصيل.` })
  else if (avgFlow > 0)
    out.push({ tone: 'good', icon: 'TrendingUp', text: `تدفّقك النقدي موجب بمعدّل ₪${fmt(avgFlow)}/شهر — مسارك تصاعدي.` })
  else
    out.push({ tone: 'tip', icon: 'Activity', text: 'تدفّقك النقدي شبه ثابت — لا نموّ ولا نزيف يُذكر.' })

  if (avgFlow > 0 && projected > cashOnHand)
    out.push({ tone: 'tip', icon: 'PiggyBank', text: `لو استمر الأداء، رح تضيف ~₪${fmt(Math.round(projected - cashOnHand))} لسيولتك خلال ${span}.` })
  else if (projected < 0 && cashOnHand >= 0)
    out.push({ tone: 'warn', icon: 'Wallet', text: `التوقّع يشير لعجز نقدي (₪${fmt(-Math.round(projected))}) قبل نهاية المدى — جدول مقبوضاتك مبكّراً.` })

  return out.slice(0, 2)
}

// ─── بصمة العامل — Worker DNA ─────────────────────────────────────────────────────
// يحوّل تاريخ العامل (أيام، إنتاجية، سلف، استمرارية، انضباط) إلى مؤشّر موثوقية واحد
// (0–100) + رادار 5 محاور + رؤى ذكية تقارنه بمتوسّط فريقك. دوال نقيّة قابلة للاختبار.

/** الإنتاجية: أجر العامل اليومي مقابل متوسّط فريقك (مؤشّر قيمة/مهارة). */
function productivityScore({ avgPerDay, fleetAvgPerDay }) {
  if (!fleetAvgPerDay || fleetAvgPerDay <= 0 || !avgPerDay) return 60
  const ratio = avgPerDay / fleetAvgPerDay
  return clamp(65 + (ratio - 1) * 70, 0, 100)   // مساوٍ للمتوسّط = 65، أعلى 50% = 100
}

/** الانتظام: ثبات الحضور شهرياً — تذبذب أقل = درجة أعلى. */
function regularityScore({ daysPerMonth }) {
  const active = (daysPerMonth || []).filter(d => d > 0)
  if (active.length < 2) return 55
  const mean = active.reduce((s, d) => s + d, 0) / active.length
  if (mean <= 0) return 55
  const cv = stdDev(active) / mean                 // معامل الاختلاف
  return clamp(100 - cv * 90, 0, 100)
}

/** الانضباط المالي: نسبة السلف من المستحق — كلّما قلّت كان أفضل. */
function disciplineScore({ advances, earned }) {
  if (earned <= 0) return advances > 0 ? 30 : 70
  const ratio = advances / earned
  return clamp(100 - ratio * 150, 0, 100)          // سلف = 66% من المستحق → 0
}

/** الاستمرارية: طول المدّة مع المصلحة (ولاء). */
function tenureScore({ tenureMonths }) {
  if (!tenureMonths || tenureMonths <= 0) return 45
  return clamp(40 + tenureMonths * 10, 40, 100)    // 6 أشهر فأكثر → 100
}

/** الموثوقية: نسبة الأيام المعتمدة من إجمالي المُقدّمة − خصم على المرفوضة. */
function approvalScore({ approvedDays, pendingDays, rejectedDays }) {
  const total = approvedDays + pendingDays + rejectedDays
  if (total <= 0) return 50
  const rate = approvedDays / total
  return clamp(rate * 100 - rejectedDays * 6, 0, 100)
}

const DNA_WEIGHTS = { productivity: 0.25, regularity: 0.25, approval: 0.20, discipline: 0.15, tenure: 0.15 }

const DNA_LABELS = {
  productivity: 'الإنتاجية',
  regularity:   'الانتظام',
  approval:     'الموثوقية',
  discipline:   'الانضباط',
  tenure:       'الاستمرارية',
}

/** تصنيف العامل حسب بصمته. */
export function workerTier(score) {
  if (score >= 80) return { tone: 'excellent', tier: 'نخبة',          star: true  }
  if (score >= 65) return { tone: 'good',      tier: 'موثوق',         star: true  }
  if (score >= 50) return { tone: 'fair',      tier: 'مقبول',         star: false }
  if (score >= 35) return { tone: 'weak',      tier: 'يحتاج متابعة',  star: false }
  return                  { tone: 'critical',  tier: 'تحت المراقبة',  star: false }
}

/**
 * المحرّك الرئيسي — يحسب بصمة العامل الكاملة.
 * @param {object} a - أرقام مجمّعة لعامل واحد + مرجع الفريق
 * @returns {{ score, tier, tone, star, factors, insights, productivityPct }}
 */
export function computeWorkerDNA(a = {}) {
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
    key: k, label: DNA_LABELS[k], score: scores[k], weight: DNA_WEIGHTS[k],
  }))

  const productivityPct = fleetAvgPerDay > 0 && avgPerDay > 0
    ? Math.round((avgPerDay / fleetAvgPerDay - 1) * 100)
    : 0

  return {
    score,
    ...workerTier(score),
    factors,
    productivityPct,
    insights: buildWorkerInsights({ name, earned, advances, productivityPct, pendingDays, tenureMonths, scores }),
  }
}

// رؤى بصمة العامل — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildWorkerInsights(a) {
  const { name, earned, advances, productivityPct, pendingDays, tenureMonths, scores } = a
  const advRatio = earned > 0 ? advances / earned : 0
  const who = name ? name.split(' ')[0] : 'العامل'
  const out = []

  if (advRatio >= 0.5)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `${who} سحب ${Math.round(advRatio * 100)}% من مستحقه سلفاً (₪${fmt(advances)}) — انتبه للتصفية النهائية.` })

  if (scores.approval < 60 && pendingDays > 0)
    out.push({ tone: 'warn', icon: 'Clock', text: `${pendingDays} يوم لـ${who} بانتظار موافقتك — راجِعها لتثبيت مستحقّه.` })
  else if (pendingDays > 0)
    out.push({ tone: 'tip', icon: 'Clock', text: `عند ${who} ${pendingDays} يوم بانتظار الموافقة.` })

  if (productivityPct >= 25)
    out.push({ tone: 'good', icon: 'TrendingUp', text: `${who} من نخبة عمّالك — أجره اليومي أعلى من متوسّط الفريق بـ ${productivityPct}%.` })
  else if (productivityPct <= -25)
    out.push({ tone: 'tip', icon: 'TrendingDown', text: `أجر ${who} اليومي أقل من متوسّط فريقك بـ ${Math.abs(productivityPct)}% — عامل اقتصادي.` })

  if (scores.regularity >= 75 && tenureMonths >= 3)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: `${who} ثابت ومنتظم — ${fmtMonths(tenureMonths)} معك بحضور متّسق.` })

  if (advRatio === 0 && earned > 0 && out.every(i => i.tone !== 'good'))
    out.push({ tone: 'good', icon: 'Sparkles', text: `${who} ما سحب أي سلفة — انضباط مالي ممتاز.` })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: `سجّل أيام عمل ودفعات لـ${who} ليكتمل تحليل بصمته.` })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── صحّة المشروع — Project Health Score ──────────────────────────────────────────
// «الصندوق الأسود» للمشروع: يحوّل أرقامه (ربحية/تحصيل/ميزانية/سيولة) إلى مؤشّر صحّة
// (0–100) + إنذار مبكّر بالهامش النهائي المتوقّع لو استمرّت التكلفة بنفس المعدّل.
// دوال نقيّة قابلة للاختبار.

/** الربحية: هامش ربح المشروع الفعلي. */
function pjMarginScore({ margin, hasData }) {
  if (!hasData) return 50
  return clamp(45 + margin * 2.2, 0, 100)   // هامش 25% → 100، صفر → 45، سالب ينزل
}

/** التحصيل: نسبة المحصّل من قيمة العقد − خصم على التأخّر. */
function pjCollectionScore({ price, revenue, overdue }) {
  let base
  if (price > 0) base = clamp((revenue / price) * 100, 0, 100)
  else           base = revenue > 0 ? 65 : 45        // مشروع يومي/مفتوح بلا عقد محدّد
  return clamp(base - (overdue ? 25 : 0), 0, 100)
}

/** الميزانية: التكلفة مقابل قيمة العقد (أو الإيراد إن لم يوجد عقد). */
function pjBudgetScore({ price, revenue, cost }) {
  const ref = price > 0 ? price : revenue
  if (ref <= 0) return cost > 0 ? 25 : 55
  const ratio = cost / ref
  return clamp((1 - ratio) * 200, 0, 100)            // تكلفة 50% → 100، 100% → 0
}

/** السيولة: نقد المالك المتبقّي نسبةً لإيراد المشروع. */
function pjCashScore({ ownerCash, revenue }) {
  if (revenue <= 0) return ownerCash >= 0 ? 55 : 30
  return clamp(55 + (ownerCash / revenue) * 90, 0, 100)
}

const PJ_WEIGHTS = { margin: 0.30, collection: 0.25, budget: 0.25, cash: 0.20 }
const PJ_LABELS  = { margin: 'الربحية', collection: 'التحصيل', budget: 'الميزانية', cash: 'السيولة' }

/**
 * المحرّك الرئيسي — صحّة المشروع الكاملة.
 * @returns {{ score, grade, tone, factors, insights, projectedMargin }}
 */
export function computeProjectHealth(a = {}) {
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
    key: k, label: PJ_LABELS[k], score: scores[k], weight: PJ_WEIGHTS[k],
  }))

  // ── الإنذار المبكّر: الهامش النهائي المتوقّع ──
  // نعتبر نسبة التحصيل من العقد تقديراً لنسبة الإنجاز، ونمدّ التكلفة على هذا الأساس.
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
    ...gradeFor(score),
    factors,
    projectedMargin,
    insights: buildProjectInsights({ name, price, revenue, cost, ownerCash, margin: effMargin, profit, overdue, projectedMargin }),
  }
}

// رؤى صحّة المشروع — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildProjectInsights(a) {
  const { name, price, revenue, cost, ownerCash, margin, profit, overdue, projectedMargin } = a
  const out = []

  if (profit < 0)
    out.push({ tone: 'warn', icon: 'TrendingDown', text: `المشروع يخسر حالياً — الهامش ${Math.round(margin)}%. راجع المصاريف أو سعّر الإضافات.` })

  if (price > 0 && cost > price)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `التكلفة (₪${fmt(cost)}) تجاوزت قيمة العقد (₪${fmt(price)}) بـ ₪${fmt(cost - price)} — المشروع بالسالب.` })

  if (overdue)
    out.push({ tone: 'warn', icon: 'Clock', text: 'في مقبوضات متأخّرة على هذا المشروع — تابع التحصيل مع العميل.' })

  if (projectedMargin != null && projectedMargin < 10 && profit >= 0)
    out.push({ tone: 'warn', icon: 'Activity', text: `إنذار مبكّر: لو استمرّت التكلفة بنفس المعدّل، الهامش النهائي المتوقّع ~${projectedMargin}% فقط.` })

  if (price > 0 && revenue > 0 && revenue / price < 0.5)
    out.push({ tone: 'tip', icon: 'MessageCircle', text: `حصّلت ${Math.round((revenue / price) * 100)}% فقط من قيمة العقد — تابع باقي المستحقّ.` })

  if (margin >= 25 && profit > 0)
    out.push({ tone: 'good', icon: 'TrendingUp', text: `هامش ربح ممتاز ${Math.round(margin)}% — مشروع رابح بقوّة.` })

  if (ownerCash > 0 && margin >= 12 && out.every(i => i.tone !== 'good'))
    out.push({ tone: 'good', icon: 'CheckCircle2', text: `مشروع صحّي — سيولة موجبة (₪${fmt(ownerCash)}) وربح جيّد.` })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Sparkles', text: 'سجّل المقبوضات والمصاريف ليتفعّل تحليل صحّة المشروع.' })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── عدّاد الضريبة الحيّ — Tax Runway ──────────────────────────────────────────────
// يتوقّع متى يتجاوز עוסק פטור سقفه السنوي (بمعدّل دخله الحالي)، ويقدّر الفاتورة
// الضريبية القادمة + كم يحتاج أن يجنّب شهرياً ليكون جاهزاً. دوال نقيّة قابلة للاختبار.

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

/**
 * @param {object} a
 * @param {boolean} a.isOsekPatur
 * @param {number} [a.cap=120000]      - سقف עוסק פטور السنوي
 * @param {number} a.yearIncome        - المدخول المحصّل هذه السنة حتى الآن
 * @param {number} a.monthsElapsed     - عدد الأشهر المنقضية من السنة (1–12)
 * @param {number} [a.annualTax=0]     - الضريبة السنوية المقدّرة (دخل + ביטוח לאומי)
 * @returns {object|null} null إذا لا يوجد دخل لحساب معدّل
 */
export function computeTaxRunway(a = {}) {
  const {
    isOsekPatur = false, cap = 120000,
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
      capMonth = MONTH_NAMES[Math.min(11, months - 1)]
    } else if (monthly > 0 && projectedAnnual > cap) {
      willExceed = true
      const monthsToCap = (cap - yearIncome) / monthly      // من الآن
      const idx = (months - 1) + monthsToCap                 // فهرس الشهر داخل السنة (0-based)
      if (idx < 12) capMonth = MONTH_NAMES[Math.floor(idx)]
    }
  }

  // الفاتورة الضريبية + التجنيب الشهري المقترح
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
    insights: buildTaxRunwayInsights({ isOsekPatur, cap, yearIncome, projectedAnnual, projectedPct, capMonth, willExceed, alreadyExceeded, annualTax, monthlyProvision }),
  }
}

// رؤى عدّاد الضريبة — تحذيرات → نصائح → إيجابيات. أعلى 3.
function buildTaxRunwayInsights(a) {
  const { isOsekPatur, cap, yearIncome, projectedAnnual, projectedPct, capMonth, willExceed, alreadyExceeded, annualTax, monthlyProvision } = a
  const out = []

  if (isOsekPatur && alreadyExceeded)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `تجاوزت سقف עוסק פטור (₪${fmt(yearIncome)} من ₪${fmt(cap)}) — يجب الترقية لـעוסק מורשה فوراً وإصدار فواتير ضريبية.` })
  else if (isOsekPatur && willExceed && capMonth)
    out.push({ tone: 'warn', icon: 'CalendarClock', text: `بمعدّل دخلك الحالي رح توصل سقف الـ₪${fmt(cap)} في ${capMonth} — جهّز ترقية مصلحتك من الآن.` })
  else if (isOsekPatur && projectedPct >= 70)
    out.push({ tone: 'tip', icon: 'Activity', text: `توقّعك السنوي ${projectedPct}% من السقف — راقب دخلك في الأشهر القادمة.` })
  else if (isOsekPatur)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: `ضمن حدّ עוסק פטور بأريحية — التوقّع السنوي ${projectedPct}% فقط من السقف.` })

  if (annualTax > 0 && monthlyProvision > 0)
    out.push({ tone: 'tip', icon: 'PiggyBank', text: `فاتورتك الضريبية المتوقّعة ₪${fmt(annualTax)} — جنّب ₪${fmt(monthlyProvision)} شهرياً لتكون جاهزاً نهاية السنة.` })
  else if (annualTax === 0 && yearIncome > 0)
    out.push({ tone: 'good', icon: 'Sparkles', text: 'لا ضريبة دخل مقدّرة على أرباحك الحالية — وضعك مريح ضريبياً.' })

  if (out.length === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: 'سجّل مدخولاتك ليتفعّل توقّع الضريبة والسقف السنوي.' })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── كاشف التسريب — Expense Anomaly Radar ─────────────────────────────────────────
// يرصد المصاريف الشاذّة تلقائياً: قفزات الفئات مقابل المعدّل، المصاريف غير المنسوبة
// لمشاريع (تسريب من تحليل الربحية)، والقيم المتطرّفة. دوال نقيّة قابلة للاختبار.

/**
 * @param {object} a
 * @param {Array}  a.entries   - [{ amount, category, date 'YYYY-MM-DD', project_id }]
 * @param {string} a.monthKey  - الشهر الحالي 'YYYY-MM'
 * @param {number} [a.lookback=3] - عدد الأشهر السابقة لحساب المعدّل
 * @returns {{ anomalies, leakTotal, leakCount, spikeCount, tone, hasData }}
 */
export function detectExpenseAnomalies(a = {}) {
  const { entries = [], monthKey = '', lookback = 3 } = a

  const cur = entries.filter(e => (e.date || '').startsWith(monthKey))
  if (entries.length === 0 || !monthKey) {
    return { anomalies: [], leakTotal: 0, leakCount: 0, spikeCount: 0, tone: 'fair', hasData: false }
  }

  // الأشهر السابقة الموجودة فعلاً في البيانات (أحدث lookback)
  const prevMonths = [...new Set(entries.map(e => (e.date || '').slice(0, 7)).filter(m => m && m < monthKey))]
    .sort().slice(-lookback)

  // مجموع كل فئة لكل شهر
  const byCatMonth = {}
  for (const e of entries) {
    const m = (e.date || '').slice(0, 7)
    const c = e.category || 'أخرى'
    byCatMonth[c] = byCatMonth[c] || {}
    byCatMonth[c][m] = (byCatMonth[c][m] || 0) + Number(e.amount || 0)
  }

  const anomalies = []
  let spikeCount = 0

  // ① قفزات الفئات: الشهر الحالي مقابل معدّل الأشهر السابقة
  for (const [cat, months] of Object.entries(byCatMonth)) {
    const curTotal = months[monthKey] || 0
    if (curTotal <= 0 || prevMonths.length === 0) continue
    const prevVals = prevMonths.map(m => months[m] || 0).filter(v => v > 0)
    if (prevVals.length === 0) continue
    const baseline = prevVals.reduce((s, v) => s + v, 0) / prevVals.length
    if (curTotal >= baseline * 1.4 && curTotal - baseline >= 300) {
      const pct = Math.round((curTotal / baseline - 1) * 100)
      anomalies.push({ tone: 'warn', icon: 'TrendingUp', amount: Math.round(curTotal),
        text: `مصروف «${cat}» هذا الشهر ₪${fmt(Math.round(curTotal))} — أعلى ${pct}% من معدّلك (₪${fmt(Math.round(baseline))}).` })
      spikeCount++
    }
  }

  // ② تسريب: مصاريف غير منسوبة لأي مشروع هذا الشهر
  const leakRows  = cur.filter(e => !e.project_id && !e.is_general)
  const leakTotal = Math.round(leakRows.reduce((s, e) => s + Number(e.amount || 0), 0))
  const leakCount = leakRows.length
  if (leakCount > 0 && leakTotal >= 300) {
    anomalies.push({ tone: 'tip', icon: 'FolderInput', amount: leakTotal,
      text: `${leakCount} ${leakCount === 1 ? 'مصروف' : 'مصاريف'} بدون مشروع — ₪${fmt(leakTotal)} غير محسوبة في ربحية مشاريعك.` })
  }

  // ③ قيمة متطرّفة: أكبر مصروف مفرد هذا الشهر أعلى بكثير من المعتاد
  if (cur.length >= 4) {
    const vals = cur.map(e => Number(e.amount || 0))
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const sd   = stdDev(vals)
    const top  = cur.reduce((mx, e) => (Number(e.amount || 0) > Number(mx.amount || 0) ? e : mx), cur[0])
    const topAmt = Number(top.amount || 0)
    if (sd > 0 && topAmt >= mean + 2 * sd && topAmt >= 1000) {
      anomalies.push({ tone: 'tip', icon: 'AlertTriangle', amount: Math.round(topAmt),
        text: `أكبر مصروف هذا الشهر ₪${fmt(Math.round(topAmt))}${top.category ? ` (${top.category})` : ''} — أعلى بكثير من معتاد مصاريفك.` })
    }
  }

  // ترتيب: تحذيرات أولاً
  const order = { warn: 0, tip: 1, good: 2 }
  anomalies.sort((x, y) => (order[x.tone] - order[y.tone]) || (y.amount - x.amount))

  // الحالة النظيفة
  if (anomalies.length === 0)
    anomalies.push({ tone: 'good', icon: 'ShieldCheck', amount: 0, text: 'ما في تسريب أو مصاريف شاذّة — صرفك منتظم هذا الشهر.' })

  const tone = spikeCount >= 2 ? 'critical' : spikeCount === 1 ? 'weak'
             : anomalies.some(an => an.tone === 'tip') ? 'fair' : 'excellent'

  return { anomalies: anomalies.slice(0, 4), leakTotal, leakCount, spikeCount, tone, hasData: true }
}

// ─── رادار التحصيل — Collection Aging ──────────────────────────────────────────────
// يرتّب ذمم العملاء حسب العمر (0–30 / 31–60 / 61–90 / 90+) ويقترح أولوية الاتصال.
// دوال نقيّة قابلة للاختبار.

const AGING_BUCKETS = [
  { key: 'current', label: 'جاري (0–30 يوم)', max: 30 },
  { key: 'd30',     label: '31–60 يوم',       max: 60 },
  { key: 'd60',     label: '61–90 يوم',       max: 90 },
  { key: 'd90',     label: 'أكثر من 90 يوم',  max: Infinity },
]

/**
 * @param {object} a
 * @param {Array}  a.projects - [{ id, name, price, client_name, client_phone, created_at }]
 * @param {Array}  a.receipts - [{ project_id, amount, date }]
 * @param {number} [a.now=Date.now()]
 * @returns {{ totalOutstanding, overdueTotal, buckets, items, worst, tone, insights, hasData }}
 */
export function computeCollectionAging(a = {}) {
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
      id: p.id, name: p.name || 'مشروع', client: p.client_name || '', phone: p.client_phone || '',
      outstanding, daysSince, bucket,
    })
  }

  items.sort((x, y) => y.daysSince - x.daysSince || y.outstanding - x.outstanding)

  const buckets = AGING_BUCKETS.map(b => {
    const rows = items.filter(it => it.bucket === b.key)
    return { key: b.key, label: b.label, amount: rows.reduce((s, it) => s + it.outstanding, 0), count: rows.length }
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
    insights: buildAgingInsights({ totalOutstanding, overdueTotal, overdueCount, d90Total, worst }),
  }
}

function buildAgingInsights({ totalOutstanding, overdueTotal, overdueCount, d90Total, worst }) {
  const out = []

  if (worst && worst.daysSince > 30)
    out.push({ tone: 'warn', icon: 'PhoneCall', text: `اتّصل بـ${worst.client || worst.name} أولاً — ₪${fmt(worst.outstanding)} متأخّرة ${worst.daysSince} يوم.` })

  if (d90Total > 0)
    out.push({ tone: 'warn', icon: 'AlertTriangle', text: `₪${fmt(d90Total)} متأخّرة أكثر من 90 يوم — ديون متعثّرة، تابعها بجدّية.` })

  if (overdueTotal > 0 && overdueCount > 1)
    out.push({ tone: 'tip', icon: 'Clock', text: `${overdueCount} مستحقّات متأخّرة بمجموع ₪${fmt(overdueTotal)} — رتّب جولة تحصيل.` })
  else if (totalOutstanding > 0 && overdueTotal === 0)
    out.push({ tone: 'tip', icon: 'CalendarClock', text: `₪${fmt(totalOutstanding)} مستحقّة لكن كلها ضمن المهلة الطبيعية (أقل من شهر).` })

  if (totalOutstanding === 0)
    out.push({ tone: 'good', icon: 'CheckCircle2', text: 'ما في ذمم مفتوحة — كل عملائك سدّدوا. ممتاز!' })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── نبض الفريق — Team Productivity Pulse ──────────────────────────────────────────
// يحوّل سجلّ نشاط الفريق (audit_log) إلى مؤشّر تفاعل (0–100) + ترتيب الأعضاء حسب
// النشاط والحداثة + تنبيهات الخمول. للمالك فقط. دوال نقيّة قابلة للاختبار.

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
 * @param {Array}  a.members  - [{ id, display_name, username, auth_email, is_blocked }]
 * @param {Array}  a.activity - [{ actor_email, action, tbl, created_at }]
 * @param {number} [a.now=Date.now()]
 * @param {number} [a.idleDays=12]
 * @returns {{ score, grade, tone, rows, mostActive, totalActions, activeMembers, memberCount, insights, hasData }}
 */
export function computeTeamPulse(a = {}) {
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
    return { id: m.id, name: m.display_name || m.username || 'عضو', count: rec.count, daysSince, actions: rec.actions }
  })

  const maxCount = Math.max(1, ...rows.map(r => r.count))
  for (const r of rows) {
    const rec = teamRecencyScore(r.daysSince)
    const vol = (r.count / maxCount) * 100
    r.score = Math.round(0.55 * rec + 0.45 * vol)
    r.tier  = r.score >= 75 ? 'نشط جداً' : r.score >= 55 ? 'نشط' : r.score >= 35 ? 'معتدل' : 'خامل'
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
    score, ...gradeFor(score),
    rows, mostActive, totalActions, activeMembers, memberCount: active.length,
    hasData: active.length > 0,
    insights: buildTeamInsights({ rows, mostActive, idle, totalActions, idleDays }),
  }
}

function buildTeamInsights({ rows, mostActive, idle, totalActions }) {
  const out = []

  const worstIdle = idle.find(r => r.daysSince != null) // خامل سجّل سابقاً ثم توقّف
  if (worstIdle)
    out.push({ tone: 'warn', icon: 'UserX', text: `${worstIdle.name} ما سجّل أي نشاط من ${worstIdle.daysSince} يوم — تأكّد إنه شغّال.` })

  const neverActive = idle.find(r => r.daysSince == null)
  if (neverActive && totalActions > 0)
    out.push({ tone: 'tip', icon: 'UserMinus', text: `${neverActive.name} ما سجّل أي عملية بعد — لسّا ما بدأ يستخدم حسابه.` })

  const deleter = rows.find(r => (r.actions?.delete || r.actions?.DELETE || 0) >= 5)
  if (deleter) {
    const dc = deleter.actions.delete || deleter.actions.DELETE
    out.push({ tone: 'tip', icon: 'Trash2', text: `${deleter.name} نفّذ ${dc} عملية حذف — راجع سجلّ نشاطه للاطمئنان.` })
  }

  if (mostActive && mostActive.count > 0)
    out.push({ tone: 'good', icon: 'Zap', text: `${mostActive.name} أنشط عضو في فريقك — ${mostActive.count} عملية مسجّلة.` })

  if (totalActions === 0)
    out.push({ tone: 'tip', icon: 'Activity', text: 'ما في نشاط مسجّل بعد — يظهر التحليل لما يبدأ فريقك العمل.' })

  const order = { warn: 0, tip: 1, good: 2 }
  return out.sort((x, y) => order[x.tone] - order[y.tone]).slice(0, 3)
}

// ─── مركز القيادة الذكي — Smart Command Center ─────────────────────────────────────
// يركّب كل المحرّكات الذكية (صحّة المشاريع، بصمة العمّال، رادار التحصيل، كاشف
// التسريب، نبض الفريق) في لوحة واحدة: بطاقات مؤشّرات + موجز موحّد لأهم التنبيهات
// عبر التطبيق، كلٌّ مع وجهة تنقّل. دالة نقيّة تعيد استخدام المحرّكات أعلاه.

/** يبني مدخلات بصمة العامل من البيانات الخام (مشترك بين الداشبورد وشاشة العمّال). */
function workerDNAFromRaw(emp, { workDays, expenses, advances, fleetAvgPerDay }) {
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
  })
}

/**
 * @returns {{ scorecards, feed, alertCount, hasData }}
 */
export function computeCommandCenter(a = {}) {
  const {
    projects = [], employees = [], workDays = [], expenses = [],
    payments = [], advances = [], clientReceipts = [],
    monthKey = '', teamMembers = [], teamActivity = [], isOwner = true,
    now = Date.now(),
  } = a

  // ① صحّة المشاريع — أسوأ مشروع + عدد المشاريع بخطر
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
    })
    if (health.score < 50) atRiskProjects++
    if (!worstProject || health.score < worstProject.score)
      worstProject = { name: p.name, score: health.score, insight: health.insights[0] }
  }

  // ② بصمة العمّال — أسوأ عامل + عدد العمّال للمتابعة
  const approvedWDs = workDays.filter(w => w.status === 'approved')
  const fleetAvgPerDay = approvedWDs.length ? calcEarned(approvedWDs) / approvedWDs.length : 0
  let worstWorker = null, watchWorkers = 0
  for (const e of employees) {
    if (workDays.every(w => w.employee_id !== e.id)) continue   // لا تاريخ بعد
    const dna = workerDNAFromRaw(e, { workDays, expenses, advances, fleetAvgPerDay })
    if (dna.score < 50) watchWorkers++
    if (!worstWorker || dna.score < worstWorker.score)
      worstWorker = { name: e.name, score: dna.score, insight: dna.insights[0] }
  }

  // ③④⑤ التحصيل + المصاريف + الفريق
  const aging = computeCollectionAging({ projects, receipts: clientReceipts, now })
  const radar = detectExpenseAnomalies({ entries: expenses, monthKey })
  const team  = (isOwner && teamMembers.length) ? computeTeamPulse({ members: teamMembers, activity: teamActivity, now }) : null

  // بطاقات المؤشّرات (قابلة للنقر)
  const scorecards = [
    { key: 'projects',   label: 'مشاريع بخطر',   value: atRiskProjects, tone: atRiskProjects > 0 ? 'weak' : 'excellent', screen: 'projects', icon: 'ShieldCheck' },
    { key: 'collection', label: 'متأخّر تحصيله', value: aging.overdueTotal, money: true, tone: aging.tone, screen: 'finance', icon: 'Hourglass' },
    { key: 'expenses',   label: 'تنبيهات صرف',   value: radar.anomalies.filter(x => x.tone !== 'good').length, tone: radar.tone, screen: 'finance', icon: 'Radar' },
    { key: 'workers',    label: 'عمّال للمتابعة', value: watchWorkers, tone: watchWorkers > 0 ? 'fair' : 'excellent', screen: 'workers', icon: 'Fingerprint' },
  ]
  if (team) scorecards.push({ key: 'team', label: 'نبض الفريق', value: team.score, score: true, tone: team.tone, screen: 'team', icon: 'Users' })

  // الموجز الموحّد — أهم إشارة من كل محرّك (نتجاهل الإيجابيات)
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
