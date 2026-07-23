// منقول حرفياً من src/lib/calculations.js + src/lib/helpers.js — أي تعديل هناك
// يجب مزامنته هنا. اختبار التكافؤ src/lib/mcpCalcParity.test.js يفشل عند الانحراف.
// الملف نقي 100% (بلا Deno APIs) حتى يستطيع Vitest استيراده للمقارنة.

type Row = Record<string, unknown> & { amount?: number | null }

// ── دوال العمال ───────────────────────────────────────────────────────────────

export const calcEarned = (workDays: Row[] = []) =>
  workDays.reduce((s, w) => s + (w.amount || 0), 0)

export const calcWorkerExpenses = (expenses: Row[] = []) =>
  expenses.reduce((s, e) => s + (e.amount || 0), 0)

// مستحق = أيام عمل + مصروفات العامل
export const calcMustahaq = (workDays: Row[] = [], workerExpenses: Row[] = []) =>
  calcEarned(workDays) + calcWorkerExpenses(workerExpenses)

export const calcPaid = (payments: Row[] = []) =>
  payments.reduce((s, p) => s + (p.amount || 0), 0)

export const calcAdvances = (advances: Row[] = []) =>
  advances.reduce((s, a) => s + (a.amount || 0), 0)

// واصل = مدفوع + سلف
export const calcWasel = (payments: Row[] = [], advances: Row[] = []) =>
  calcPaid(payments) + calcAdvances(advances)

// متبقي = مستحق - واصل
export const calcMutabqi = (
  workDays: Row[] = [], workerExpenses: Row[] = [],
  payments: Row[] = [], advances: Row[] = [],
) => calcMustahaq(workDays, workerExpenses) - calcWasel(payments, advances)

// ── دوال المشاريع ─────────────────────────────────────────────────────────────

export const calcRevenue = (clientReceipts: Row[] = []) =>
  clientReceipts.reduce((s, r) => s + (r.amount || 0), 0)

export const calcProfit = (revenue: number, cost: number) => revenue - cost

export const calcMargin = (revenue: number, profit: number) =>
  revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : null

export const calcProjectStats = (
  projectId: unknown, workDays: Row[] = [], expenses: Row[] = [], clientReceipts: Row[] = [],
) => {
  const wdList    = workDays.filter(w => w.project_id === projectId && w.status === 'approved')
  const receipts  = clientReceipts.filter(r => r.project_id === projectId)
  const projExp   = expenses.filter(e => e.project_id === projectId && !e.employee_id && e.status === 'approved')
  const workerExp = expenses.filter(e => e.project_id === projectId && e.employee_id && e.status === 'approved')

  const revenue        = calcRevenue(receipts)
  const wdCost         = calcEarned(wdList)
  const projExpTotal   = calcWorkerExpenses(projExp)
  const workerExpTotal = calcWorkerExpenses(workerExp)
  const expTotal       = projExpTotal + workerExpTotal
  const cost           = wdCost + expTotal
  const profit         = calcProfit(revenue, cost)
  const margin         = calcMargin(revenue, profit)

  return {
    revenue, wdCost, projExpTotal, workerExpTotal, expTotal, cost, profit, margin,
    wdCount: wdList.length,
    pending: workDays.filter(w => w.project_id === projectId && w.status === 'pending').length,
  }
}

// ── الرواتب (من helpers.js) ──────────────────────────────────────────────────

export function calcSalary(rate: number, dayType: string, hours?: number | string) {
  if (dayType === 'عطلة')   return 0
  if (dayType === 'كامل')   return rate
  if (dayType === 'نص يوم') return rate / 2

  const hourly = rate / 8
  const h = parseFloat(String(hours)) || 0
  let total = 0

  if (h <= 8)       total = h * hourly
  else if (h <= 10) total = 8 * hourly + (h - 8) * hourly * 1.25
  else              total = 8 * hourly + 2 * hourly * 1.25 + (h - 10) * hourly * 1.5

  return Math.round(total)
}

// ── الضرائب (من helpers.js) ──────────────────────────────────────────────────

// نسبة استرداد מס תשומות حسب الفئة (2025)
export const CAT_DEDUCT: Record<string, number> = {
  'مواد بناء / خامات': 1.00,
  'بضاعة':             1.00,
  'عدد وأدوات':        1.00,
  'إيجار معدات':       1.00,
  'خدمات مهنية':       1.00,
  'وقود وتنقلات':      0.667,
  'صيانة مركبات':      0.667,
  'رواتب عمال':        0.00,
  'تأمين':             0.00,
  'أخرى':              1.00,
}

export function calcVATNet(
  clientReceipts: Row[], expenses: Row[], fromDate?: string, toDate?: string,
) {
  const inRange = (d: string) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate)

  const vatOut = clientReceipts
    .filter(r => inRange((r.date as string) || ''))
    .reduce((s, r) => {
      const rate = ((r.date as string) || '') >= '2025-01-01' ? 0.18 : 0.17
      return s + (r.amount || 0) * (rate / (1 + rate))
    }, 0)

  const vatIn = expenses
    .filter(e => (e.status !== 'pending') && inRange((e.date as string) || ''))
    .reduce((s, e) => {
      const rate   = ((e.date as string) || '') >= '2025-01-01' ? 0.18 : 0.17
      const deduct = CAT_DEDUCT[(e.category as string)] ?? 1.00
      return s + (e.amount || 0) * deduct * (rate / (1 + rate))
    }, 0)

  return { vatOut: Math.round(vatOut), vatIn: Math.round(vatIn), net: Math.round(vatOut - vatIn) }
}

// ثوابت ביטוח לאומי 2025 (شريحتان) + شرائح מס הכנסה 2025
const _BL_TIER1_Y = 90264
const _BL_CAP_Y   = 608340
const _BL_R1      = 0.077
const _BL_R2      = 0.18

const _IT_BRACKETS: Array<[number, number]> = [
  [84120,    0.10],
  [36600,    0.14],
  [73080,    0.20],
  [75480,    0.31],
  [291000,   0.35],
  [161280,   0.47],
  [Infinity, 0.50],
]
const _IT_CREDIT = 6534

export function calcBituachLeumiAnnual(annualNetProfit: number) {
  if (annualNetProfit <= 0) return 0
  const income = Math.min(annualNetProfit, _BL_CAP_Y)
  const t1     = Math.min(income, _BL_TIER1_Y) * _BL_R1
  const t2     = Math.max(0, income - _BL_TIER1_Y) * _BL_R2
  return Math.round(t1 + t2)
}

export function estimateIncomeTax(annualNetProfit: number, pensionDeduction = 0) {
  if (annualNetProfit <= 0) return 0
  const maxPension    = Math.min(pensionDeduction, annualNetProfit * 0.16)
  const taxableIncome = Math.max(0, annualNetProfit - maxPension)
  let tax = 0
  let remaining = taxableIncome
  for (const [size, rate] of _IT_BRACKETS) {
    const taxable = Math.min(remaining, size)
    tax += taxable * rate
    remaining -= taxable
    if (remaining <= 0) break
  }
  return Math.max(0, Math.round(tax - _IT_CREDIT))
}
