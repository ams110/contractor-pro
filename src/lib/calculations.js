// Single source of truth for all financial calculations.
//
// ── العمال ────────────────────────────────────────────────────────────────────
//   مستحق = أيام العمل + مصروفات العامل
//   واصل  = مدفوع + سلف
//   متبقي = مستحق - واصل
//
// ── المشاريع ──────────────────────────────────────────────────────────────────
//   إيرادات = مقبوضات العملاء
//   تكلفة   = أيام عمل + مصاريف مشروع + مصاريف عمال
//   ربح     = إيرادات - تكلفة
//   هامش    = ربح / إيرادات × 100

// ── دوال العمال ───────────────────────────────────────────────────────────────

export const calcEarned = (workDays = []) =>
  workDays.reduce((s, w) => s + (w.amount || 0), 0)

export const calcWorkerExpenses = (expenses = []) =>
  expenses.reduce((s, e) => s + (e.amount || 0), 0)

// مستحق = أيام عمل + مصروفات العامل
export const calcMustahaq = (workDays = [], workerExpenses = []) =>
  calcEarned(workDays) + calcWorkerExpenses(workerExpenses)

export const calcPaid = (payments = []) =>
  payments.reduce((s, p) => s + (p.amount || 0), 0)

export const calcAdvances = (advances = []) =>
  advances.reduce((s, a) => s + (a.amount || 0), 0)

// واصل = مدفوع + سلف
export const calcWasel = (payments = [], advances = []) =>
  calcPaid(payments) + calcAdvances(advances)

// متبقي = مستحق - واصل
export const calcMutabqi = (workDays = [], workerExpenses = [], payments = [], advances = []) =>
  calcMustahaq(workDays, workerExpenses) - calcWasel(payments, advances)

// ── دوال المشاريع ─────────────────────────────────────────────────────────────

// إيرادات المشروع = مقبوضات العملاء
export const calcRevenue = (clientReceipts = []) =>
  clientReceipts.reduce((s, r) => s + (r.amount || 0), 0)

// تكلفة المشروع = عمل + مصاريف مشروع + مصاريف عمال
export const calcProjectCost = (workDays = [], projectExpenses = [], workerExpenses = []) =>
  calcEarned(workDays) +
  projectExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
  calcWorkerExpenses(workerExpenses)

// ربح المشروع = إيرادات - تكلفة
export const calcProfit = (revenue, cost) => revenue - cost

// هامش الربح % (null إذا ما في إيرادات)
export const calcMargin = (revenue, profit) =>
  revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : null

// نقد المالك المتبقي للمشروع (تدفّق نقدي حقيقي)
//   = إيرادات محصّلة − مصاريف المشروع المدفوعة − ما دُفع للعمال − سلف العمال
//   ملاحظة: لا نطرح "مصاريف العامل" (workerExp) هنا لأنها جزء من المستحق
//   للعامل، ويُسوّى نقداً عبر المدفوعات/السلف — طرحها مرة ثانية = ازدواج حسبة.
export const calcOwnerCash = (revenue, projExpTotal, paidToWorkers, advancesPaid = 0) =>
  revenue - projExpTotal - paidToWorkers - advancesPaid

// إحصائيات مشروع كاملة من البيانات الخام
export const calcProjectStats = (projectId, workDays = [], expenses = [], clientReceipts = []) => {
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
    revenue,
    wdCost,
    projExpTotal,    // مصاريف المشروع البحتة (بدون مصاريف العمال)
    workerExpTotal,  // مصاريف العمال (تدخل ضمن المستحق لهم)
    expTotal,
    cost,
    profit,
    margin,
    wdCount: wdList.length,
    pending: wdList.filter(w => w.status === 'pending').length,
  }
}
