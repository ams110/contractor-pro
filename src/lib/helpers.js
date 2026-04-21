/** توليد معرّف فريد */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/** تاريخ اليوم بصيغة YYYY-MM-DD */
export const todayStr = () => new Date().toISOString().split('T')[0]

/** تنسيق الأرقام بفواصل */
export const fmt = (n) => (n || 0).toLocaleString('en-US')

/** تحويل YYYY-MM-DD إلى DD/MM/YYYY */
export const fmtDate = (d) => {
  if (!d) return ''
  const p = d.split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

/**
 * حساب راتب العامل
 * @param {number} rate - الأجر اليومي
 * @param {'كامل'|'نص يوم'|'ساعات'} dayType - نوع اليوم
 * @param {number|string} hours - عدد الساعات (للحالة الساعية فقط)
 * @returns {number} المبلغ المحسوب
 */
export function calcSalary(rate, dayType, hours) {
  if (dayType === 'كامل')   return rate
  if (dayType === 'نص يوم') return rate / 2

  const hourly = rate / 8
  const h = parseFloat(hours) || 0
  let total = 0

  if (h <= 8)       total = h * hourly
  else if (h <= 10) total = 8 * hourly + (h - 8)  * hourly * 1.25
  else              total = 8 * hourly + 2          * hourly * 1.25 + (h - 10) * hourly * 1.5

  return Math.round(total)
}

/**
 * التحقق من صحة نموذج المشروع
 * @returns {string|null} رسالة الخطأ أو null إذا كان صحيحاً
 */
export function validateProject(form) {
  if (!form.name?.trim())         return 'اسم المشروع مطلوب'
  if (!form.type)                 return 'نوع المشروع مطلوب'
  if (form.price && parseFloat(form.price) < 0) return 'السعر لا يمكن أن يكون سالباً'
  return null
}

/**
 * التحقق من صحة نموذج العامل
 */
export function validateWorker(form) {
  if (!form.name?.trim())               return 'اسم العامل مطلوب'
  if (!form.dailyRate)                  return 'الأجر اليومي مطلوب'
  if (parseFloat(form.dailyRate) <= 0)  return 'الأجر اليومي يجب أن يكون أكبر من صفر'
  return null
}

/**
 * التحقق من صحة نموذج المصروف
 */
export function validateExpense(form) {
  if (!form.amount)                     return 'المبلغ مطلوب'
  if (parseFloat(form.amount) <= 0)     return 'المبلغ يجب أن يكون أكبر من صفر'
  if (!form.category)                   return 'التصنيف مطلوب'
  if (!form.date)                       return 'التاريخ مطلوب'
  return null
}

/**
 * التحقق من صحة نموذج الدفعة
 */
export function validatePayment(form) {
  if (!form.employeeId)                 return 'اختر العامل'
  if (!form.amount)                     return 'المبلغ مطلوب'
  if (parseFloat(form.amount) <= 0)     return 'المبلغ يجب أن يكون أكبر من صفر'
  return null
}

/**
 * حساب VAT الصافي المستحق للضريبة لفترة زمنية معينة
 * VAT محصّل من العملاء - VAT مدفوع في المشتريات
 */
export function calcVATNet(clientReceipts, expenses, fromDate, toDate) {
  const inRange = (d) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  const vatOut = clientReceipts
    .filter(r => inRange(r.date || ''))
    .reduce((s, r) => s + (r.amount || 0), 0) * (0.17 / 1.17)
  const vatIn = expenses
    .filter(e => (e.status !== 'pending') && inRange(e.date || ''))
    .reduce((s, e) => s + (e.amount || 0), 0) * (0.17 / 1.17)
  return { vatOut: Math.round(vatOut), vatIn: Math.round(vatIn), net: Math.round(vatOut - vatIn) }
}

/**
 * تقدير ביטוח לאומי الشهري بناءً على متوسط الدخل الشهري الصافي
 */
export function calcBituachLeumi(monthlyNetProfit) {
  if (monthlyNetProfit <= 0) return 0
  return Math.round(monthlyNetProfit * 0.105)
}

/**
 * تقدير ضريبة الدخل السنوية (מס הכנסה) للعمل الحر — شرائح 2024
 * يطرح نقاط الزيكوي الشخصية (2.25 نقطة × 2,904₪)
 */
export function estimateIncomeTax(annualNetProfit) {
  if (annualNetProfit <= 0) return 0
  const brackets = [
    [81480,    0.10],
    [35280,    0.14],
    [70680,    0.20],
    [73080,    0.31],
    [281640,   0.35],
    [Infinity, 0.47],
  ]
  let tax = 0
  let remaining = annualNetProfit
  for (const [size, rate] of brackets) {
    const taxable = Math.min(remaining, size)
    tax += taxable * rate
    remaining -= taxable
    if (remaining <= 0) break
  }
  return Math.max(0, Math.round(tax - 6534)) // طرح نقاط الزيكوي الشخصية
}

/**
 * هل الدفعة متأخرة؟ (آخر إيصال + رصيد مفتوح + N يوم)
 */
export function isPaymentOverdue(project, clientReceipts, overdueDays = 30) {
  if (!project.price || project.price <= 0) return false
  const projReceipts = clientReceipts.filter(r => r.project_id === project.id)
  const received     = projReceipts.reduce((s, r) => s + (r.amount || 0), 0)
  const balance      = (parseFloat(project.price) || 0) - received
  if (balance <= 0) return false
  if (projReceipts.length === 0) return false
  const lastDate = projReceipts.map(r => r.date || '').sort().at(-1)
  if (!lastDate) return false
  const daysSince = Math.floor((Date.now() - new Date(lastDate)) / 86400000)
  return daysSince >= overdueDays ? { balance, daysSince } : false
}

/**
 * التحقق من صحة نموذج يوم العمل
 */
export function validateWorkDay(form) {
  if (!form.employee_id) return 'اختر العامل'
  if (!form.project_id)  return 'اختر المشروع'
  if (!form.date)        return 'التاريخ مطلوب'
  if (form.day_type === 'ساعات') {
    const h = parseFloat(form.hours)
    if (!h || h <= 0)    return 'عدد الساعات يجب أن يكون أكبر من صفر'
    if (h > 24)          return 'عدد الساعات لا يمكن أن يتجاوز 24'
  }
  return null
}
