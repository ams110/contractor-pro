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

const _DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const _MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

/** تحويل YYYY-MM-DD إلى "الثلاثاء، 15 أبريل 2025" */
export const fmtDateFull = (d) => {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${_DAYS_AR[dt.getDay()]}، ${dt.getDate()} ${_MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`
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
  if (!form.employee_id)                 return 'اختر العامل'
  if (!form.amount)                      return 'المبلغ مطلوب'
  if (parseFloat(form.amount) <= 0)      return 'المبلغ يجب أن يكون أكبر من صفر'
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

// ─── ثوابت الضرائب الإسرائيلية 2024 ─────────────────────────────────────────
// ביטוח לאומי + ביטוח בריאות للعمل الحر (עצמאי)
// شريحة 1: حتى 60% من الأجر المتوسط (₪7,522/شهر = ₪90,264/سنة)
//   ضمان اجتماعي 6.72% + تأمين صحي 3.10% = 9.82%
// شريحة 2: من ₪7,522 حتى سقف ₪47,465/شهر (₪569,580/سنة)
//   ضمان اجتماعي 11.23% + تأمين صحي 5.00% = 16.23%
const _BL_TIER1_M  = 7522     // شريحة 1 شهرية
const _BL_CAP_M    = 47465    // سقف شهري
const _BL_TIER1_Y  = 90264    // شريحة 1 سنوية
const _BL_CAP_Y    = 569580   // سقف سنوي
const _BL_R1       = 0.0982   // نسبة شريحة 1
const _BL_R2       = 0.1623   // نسبة شريحة 2

// شرائح מס הכנסה 2024 (أحجام الشرائح السنوية)
const _IT_BRACKETS = [
  [81480,    0.10],
  [35280,    0.14],
  [70680,    0.20],
  [73080,    0.31],
  [281640,   0.35],
  [Infinity, 0.47],
]
const _IT_CREDIT = 6534  // نقاط زيكوي شخصية: 2.25 × ₪2,904

/**
 * تقدير ביטוח לאומי + ביטוח בריאות الشهري للعمل الحر — شرائح 2024
 */
export function calcBituachLeumi(monthlyNetProfit) {
  if (monthlyNetProfit <= 0) return 0
  const income = Math.min(monthlyNetProfit, _BL_CAP_M)
  const t1     = Math.min(income, _BL_TIER1_M) * _BL_R1
  const t2     = Math.max(0, income - _BL_TIER1_M) * _BL_R2
  return Math.round(t1 + t2)
}

/**
 * تقدير ביטוח לאומי + ביטוח בריאות السنوي — شرائح 2024
 */
export function calcBituachLeumiAnnual(annualNetProfit) {
  if (annualNetProfit <= 0) return 0
  const income = Math.min(annualNetProfit, _BL_CAP_Y)
  const t1     = Math.min(income, _BL_TIER1_Y) * _BL_R1
  const t2     = Math.max(0, income - _BL_TIER1_Y) * _BL_R2
  return Math.round(t1 + t2)
}

/**
 * تقدير מס הכנסה السنوي للعمل الحر — شرائح 2024
 * @param annualNetProfit  - صافي الربح السنوي (إيرادات - مصاريف - رواتب عمال)
 * @param pensionDeduction - مساهمات الپنסيה السنوية المدفوعة (تُخصم من الوعاء الضريبي)
 *   الحد الأقصى للخصم: 16% من الدخل (תקרת ניכוי לעצמאי 2024)
 * نقاط زيكوي شخصية: 2.25 × ₪2,904 = ₪6,534 خصم من الضريبة المحسوبة
 */
export function estimateIncomeTax(annualNetProfit, pensionDeduction = 0) {
  if (annualNetProfit <= 0) return 0
  const maxPension  = Math.min(pensionDeduction, annualNetProfit * 0.16)
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

/**
 * حساب الوفر الضريبي من مساهمات الپנסיה
 */
export function pensionTaxSaving(annualNetProfit, pensionDeduction) {
  return estimateIncomeTax(annualNetProfit, 0) - estimateIncomeTax(annualNetProfit, pensionDeduction)
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
  if (form.day_type === 'مبلغ مسكر') {
    const a = parseFloat(form.customAmount)
    if (!a || a <= 0)    return 'أدخل المبلغ المسكر'
  }
  return null
}
