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
