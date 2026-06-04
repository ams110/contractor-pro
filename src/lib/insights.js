// ─── نبض المصلحة — Business Pulse ────────────────────────────────────────────────
// محرّك ذكاء مالي: يحوّل كل أرقام المصلحة إلى مؤشّر صحّة واحد (0–100)،
// مع تفصيل العوامل ورؤى ذكية تلقائية بالعربي. دوال نقيّة بالكامل — لا DOM، قابلة للاختبار.

import { fmt } from './helpers.js'

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
