/**
 * useTaxEngine — محرك الضرائب الإسرائيلية 2025
 * יחס לרשות המסים: עצמאים, שכירים ישראלים, עובדים זרים, פלסטינים
 * ملاحظة: ביטוח לאومي للعمل الحر (עצמאי) مصدره الموحّد = helpers.calcBituachLeumiAnnual.
 * قيم 2026: سقف الدخل المؤمّن 51,910/شهر · עוסק פטור 122,833.
 */

import { calcBituachLeumiAnnual } from '../lib/helpers.js'

// ─── ثوابت 2025 ─────────────────────────────────────────────────────────────

export const VAT_RATE         = 0.18         // מע"מ 18% من يناير 2025
export const OSEK_PATUR_CAP  = 120_000      // تقرير سنوي (עוסק פטור) ₪120k
const IT_CREDIT_PER_POINT     = 2_904        // زيكوي אחת ₪2,904/سنة (2025)
const DEFAULT_POINTS_ISRAELI  = 2.25         // نقاط أساسية: مقيم عزب

// شرائح מס הכנסה 2025
const IT_BRACKETS_2025 = [
  { to: 84_120,    rate: 0.10 },
  { to: 120_720,   rate: 0.14 },
  { to: 193_800,   rate: 0.20 },
  { to: 269_280,   rate: 0.31 },
  { to: 560_280,   rate: 0.35 },
  { to: 721_560,   rate: 0.47 },
  { to: Infinity,  rate: 0.50 },
]

// شرائح ביטוח לאומי شكيר (موظف) 2025
// مخفّضة (حتى 60% من الأجر المتوسط): 0.40% + صحة 3.23% = 3.63%
// كاملة (حتى السقف 50,695/شهر 2025): 7.00% + صحة 5.17% = 12.17% · فوق السقف: 0%
const BL_EMP_BRACKETS = [
  { to: 7_522,     rate: 0.0363 },
  { to: 50_695,    rate: 0.1217 },
  { to: Infinity,  rate: 0      },
]

// ─── حسابات المحور: מס הכנסה ────────────────────────────────────────────────

function _calcIT(annualIncome) {
  let tax = 0, prev = 0
  for (const { to, rate } of IT_BRACKETS_2025) {
    if (annualIncome <= prev) break
    tax += (Math.min(annualIncome, to) - prev) * rate
    prev = to
  }
  return Math.max(0, tax)
}

/** حساب مس הכנסה السنوي مع نقاط الزكاء */
export function calcIncomeTaxAnnual(annualIncome, taxPoints = DEFAULT_POINTS_ISRAELI, pensionDeduction = 0) {
  if (annualIncome <= 0) return 0
  const maxPension    = Math.min(pensionDeduction, annualIncome * 0.16)
  const taxableIncome = Math.max(0, annualIncome - maxPension)
  const credit        = taxPoints * IT_CREDIT_PER_POINT
  return Math.max(0, Math.round(_calcIT(taxableIncome) - credit))
}

/** تقدير مس הכנסה الشهري من الراتب الشهري */
export function calcIncomeTaxMonthly(monthlyGross, taxPoints = DEFAULT_POINTS_ISRAELI) {
  return Math.round(calcIncomeTaxAnnual(monthlyGross * 12, taxPoints) / 12)
}

// ─── ביטוח לאומי للموظف ────────────────────────────────────────────────────

export function calcBituachLeumiEmployee(monthlyGross) {
  if (monthlyGross <= 0) return 0
  let bl = 0, prev = 0
  for (const { to, rate } of BL_EMP_BRACKETS) {
    if (monthlyGross <= prev) break
    bl += (Math.min(monthlyGross, to) - prev) * rate
    prev = to
  }
  return Math.round(bl)
}

// ─── استقطاعات العامل حسب النوع ────────────────────────────────────────────

/**
 * أنواع العمال:
 * 'israeli'      — عامل إسرائيلي / مقيم (مدرجات عادية + نقاط زكاء)
 * 'foreign_res'  — أجنبي مقيم (نفس المدرجات، نقاط أقل)
 * 'foreign_non'  — أجنبي غير مقيم (20% ثابت، بدون نقاط)
 * 'palestinian'  — فلسطيني (20% מס הכנסה، ביטוח לאומי يدفعه صاحب العمل)
 * 'self'         — عامل مستقل (לא שכיר — لا استقطاع)
 */
export function calcWorkerDeductions(monthlyGross, workerType = 'israeli', taxPoints = DEFAULT_POINTS_ISRAELI) {
  if (monthlyGross <= 0 || workerType === 'self') {
    return { incomeTax: 0, bituachLeumi: 0, total: 0, net: monthlyGross }
  }

  let incomeTax, bituachLeumi

  switch (workerType) {
    case 'foreign_non':
    case 'palestinian':
      incomeTax    = Math.round(monthlyGross * 0.20)
      bituachLeumi = workerType === 'palestinian' ? 0 : calcBituachLeumiEmployee(monthlyGross)
      break
    case 'foreign_res':
      incomeTax    = calcIncomeTaxMonthly(monthlyGross, 0.75)
      bituachLeumi = calcBituachLeumiEmployee(monthlyGross)
      break
    default: // 'israeli'
      incomeTax    = calcIncomeTaxMonthly(monthlyGross, taxPoints)
      bituachLeumi = calcBituachLeumiEmployee(monthlyGross)
  }

  const total = incomeTax + bituachLeumi
  return { incomeTax, bituachLeumi, total, net: Math.round(monthlyGross - total) }
}

// ─── ملخص استقطاعات كل العمال ───────────────────────────────────────────────

export function calcAllWorkersDeductions(employees, payments) {
  const thisMonth = new Date().toISOString().slice(0, 7)
  return employees.map(emp => {
    const monthPay = payments
      .filter(p => p.employee_id === emp.id && (p.date || '').startsWith(thisMonth))
      .reduce((s, p) => s + (p.amount || 0), 0)
    const deductions = calcWorkerDeductions(monthPay, emp.worker_tax_type || 'self')
    return { emp, monthPay, ...deductions }
  }).filter(r => r.monthPay > 0)
}

// ─── VAT ربعي / شهري ────────────────────────────────────────────────────────

export function calcVATReport(clientReceipts, expenses, fromDate, toDate) {
  const inRange = d => (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  const rate    = d => d >= '2025-01-01' ? 0.18 : 0.17

  const CAT_DEDUCT = {
    'مواد بناء / خامات': 1.00, 'بضاعة': 1.00, 'عدد وأدوات': 1.00,
    'إيجار معدات': 1.00, 'خدمات مهنية': 1.00, 'أخرى': 1.00,
    'وقود وتنقلات': 0.667, 'صيانة مركبات': 0.667,
    'رواتب عمال': 0.00, 'تأمين': 0.00,
  }

  const vatOut = clientReceipts
    .filter(r => inRange(r.date || ''))
    .reduce((s, r) => {
      const v = rate(r.date || '')
      return s + (r.amount || 0) * (v / (1 + v))
    }, 0)

  const vatIn = expenses
    .filter(e => e.status !== 'pending' && inRange(e.date || ''))
    .reduce((s, e) => {
      const v      = rate(e.date || '')
      const deduct = CAT_DEDUCT[e.category] ?? 1.00
      return s + (e.amount || 0) * deduct * (v / (1 + v))
    }, 0)

  const net = vatOut - vatIn
  return {
    vatOut: Math.round(vatOut),
    vatIn:  Math.round(vatIn),
    net:    Math.round(net),
    toPay:  Math.max(0, Math.round(net)),
    refund: Math.max(0, Math.round(-net)),
  }
}

// ─── ملخص سنوي شامل ────────────────────────────────────────────────────────

export function calcAnnualTaxSummary({
  payments, clientReceipts, expenses, taxAdvances = [],
  businessType = 'osek_moreh', pensionMonthly = 0,
}) {
  const year = new Date().getFullYear().toString()

  const revenue   = clientReceipts.filter(r => (r.date||'').startsWith(year)).reduce((s,r) => s+(r.amount||0), 0)
  const expTotal  = expenses.filter(e => e.status !== 'pending' && (e.date||'').startsWith(year)).reduce((s,e) => s+(e.amount||0), 0)
  const salaries  = payments.filter(p => (p.date||'').startsWith(year)).reduce((s,p) => s+(p.amount||0), 0)
  const netProfit = Math.max(0, revenue - expTotal - salaries)

  const pensionAnnual = (pensionMonthly || 0) * 12
  const incomeTax     = calcIncomeTaxAnnual(netProfit, DEFAULT_POINTS_ISRAELI, pensionAnnual)
  // مصدر موحّد لحساب ביטוח לاومي للعمل الحر (شريحتان، ثوابت 2025) — بدل نسخة inline
  const bituachLeumi  = calcBituachLeumiAnnual(netProfit)

  const itPaid  = taxAdvances.filter(a => a.type === 'income_tax'    && (a.date||'').startsWith(year)).reduce((s,a) => s+a.amount, 0)
  const blPaid  = taxAdvances.filter(a => a.type === 'bituach_leumi' && (a.date||'').startsWith(year)).reduce((s,a) => s+a.amount, 0)

  const vatReport = calcVATReport(
    clientReceipts.filter(r => (r.date||'').startsWith(year)),
    expenses.filter(e => (e.date||'').startsWith(year)),
    `${year}-01-01`, `${year}-12-31`
  )

  return {
    year, revenue, expTotal, salaries, netProfit,
    incomeTax, bituachLeumi,
    itPaid, blPaid,
    itRemaining:  Math.max(0, incomeTax - itPaid),
    blRemaining:  Math.max(0, bituachLeumi - blPaid),
    vatReport,
    isOsekPatur:  businessType === 'osek_patur',
    overCap:      businessType === 'osek_patur' && revenue > OSEK_PATUR_CAP,
  }
}
