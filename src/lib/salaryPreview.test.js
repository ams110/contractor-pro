import { describe, it, expect } from 'vitest'
import { computeSalaryPreview } from './salaryPreview.js'
import { calcSalary } from './helpers.js'

describe('computeSalaryPreview', () => {
  it('يوم 8 ساعات = الأجر اليومي بلا إضافي', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 8, days: 22 })
    expect(r.dayPay).toBe(400)
    expect(r.monthTotal).toBe(8800)
    expect(r.hasOvertime).toBe(false)
    expect(r.ot125Hours).toBe(0)
    expect(r.ot150Hours).toBe(0)
  })

  it('يوم 10 ساعات يضيف ساعتين ×125%', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 10, days: 22 })
    // 8×50 + 2×50×1.25 = 525
    expect(r.dayPay).toBe(525)
    expect(r.monthTotal).toBe(11550)
    expect(r.regularHours).toBe(8)
    expect(r.ot125Hours).toBe(2)
    expect(r.ot150Hours).toBe(0)
    expect(r.hasOvertime).toBe(true)
  })

  it('يوم 12 ساعة يضيف 2×125% + 2×150%', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 12, days: 1 })
    // 400 + 125 + 2×50×1.5(=150) = 675
    expect(r.dayPay).toBe(675)
    expect(r.ot125Hours).toBe(2)
    expect(r.ot150Hours).toBe(2)
  })

  it('يطابق محرّك الرواتب calcSalary بالضبط (فرع الساعات)', () => {
    expect(computeSalaryPreview({ dailyWage: 380, hoursPerDay: 11, days: 1 }).dayPay)
      .toBe(calcSalary(380, 'ساعات', 11))
  })

  it('مدخلات فارغة/سالبة → أصفار بلا انهيار', () => {
    const r = computeSalaryPreview({ dailyWage: '', hoursPerDay: '', days: '' })
    expect(r.dayPay).toBe(0)
    expect(r.monthTotal).toBe(0)
  })
})
