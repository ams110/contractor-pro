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
 * التحقق من صحة نموذج يوم العمل
 */
export function validateWorkDay(form) {
  if (!form.employeeId)  return 'اختر العامل'
  if (!form.projectId)   return 'اختر المشروع'
  if (!form.date)        return 'التاريخ مطلوب'
  if (form.dayType === 'ساعات') {
    const h = parseFloat(form.hours)
    if (!h || h <= 0)    return 'عدد الساعات يجب أن يكون أكبر من صفر'
    if (h > 24)          return 'عدد الساعات لا يمكن أن يتجاوز 24'
  }
  return null
}
