import { calcSalary } from './helpers.js'

// معاينة راتب عامل: راتب يوم واحد (مع ساعات إضافية) × عدد الأيام، + تفصيل الساعات للعرض.
// يعيد استخدام calcSalary (نفس محرّك الرواتب) — لا منطق رواتب مكرّر.
// dayType='ساعات' هو الفرع الذي يطبّق الإضافي: 9-10 ساعة ×1.25، 11+ ×1.5 (helpers.js).
export function computeSalaryPreview({ dailyWage, hoursPerDay, days }) {
  const rate = Number(dailyWage) || 0
  const h    = Number(hoursPerDay) || 0
  const d    = Math.max(0, Math.floor(Number(days) || 0))

  const dayPay     = calcSalary(rate, 'ساعات', h)   // مدوّر داخل calcSalary
  const monthTotal = Math.round(dayPay * d)

  const regularHours = Math.min(Math.max(h, 0), 8)
  const ot125Hours   = Math.max(0, Math.min(h, 10) - 8)
  const ot150Hours   = Math.max(0, h - 10)

  return {
    hourly:      Math.round(rate / 8),
    dayPay,
    monthTotal,
    regularHours,
    ot125Hours,
    ot150Hours,
    hasOvertime: ot125Hours + ot150Hours > 0,
  }
}
