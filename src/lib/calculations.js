// Single source of truth for all financial calculations.
//
// المعادلة الصحيحة:
//   مستحق = أيام العمل + مصروفات العامل
//   واصل  = مدفوع + سلف
//   متبقي = مستحق - واصل
//
// تكلفة المشروع = أيام العمل + مصروفات المشروع + مصروفات العمال

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

// تكلفة المشروع = عمل + مصاريف مشروع + مصاريف عمال
export const calcProjectCost = (workDays = [], projectExpenses = [], workerExpenses = []) =>
  calcEarned(workDays) +
  projectExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
  calcWorkerExpenses(workerExpenses)
