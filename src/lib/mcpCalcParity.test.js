// اختبار تكافؤ: النسخة المنقولة للـ edge function (mcp-server/calc.ts)
// يجب أن تطابق مصدر الحقيقة (calculations.js + helpers.js) بالمخرجات حرفياً.
// إذا فشل هذا الاختبار: عدّلت الأصل بلا مزامنة النسخة — زامنهما.
import { describe, it, expect } from 'vitest'
import * as orig from './calculations.js'
import {
  calcSalary as origSalary, calcVATNet as origVAT,
  calcBituachLeumiAnnual as origBL, estimateIncomeTax as origIT,
} from './helpers.js'
import * as port from '../../supabase/functions/mcp-server/calc.ts'

const P1 = 'p1', P2 = 'p2'
const workDays = [
  { project_id: P1, employee_id: 'e1', date: '2026-06-01', amount: 400, status: 'approved' },
  { project_id: P1, employee_id: 'e1', date: '2026-06-02', amount: 400, status: 'approved' },
  { project_id: P1, employee_id: 'e2', date: '2026-06-02', amount: 350, status: 'pending' },
  { project_id: P2, employee_id: 'e1', date: '2026-06-03', amount: 500, status: 'approved' },
]
const expenses = [
  { project_id: P1, employee_id: null, amount: 1200, date: '2026-06-05', category: 'مواد بناء / خامات', status: 'approved' },
  { project_id: P1, employee_id: 'e1', amount: 80,  date: '2026-06-06', category: 'وقود وتنقلات', status: 'approved' },
  { project_id: P1, employee_id: null, amount: 300, date: '2026-06-07', category: 'أخرى', status: 'pending' },
  { project_id: null, employee_id: null, amount: 90, date: '2024-12-20', category: 'وقود وتنقلات', status: 'approved' },
]
const receipts = [
  { project_id: P1, amount: 5000, date: '2026-06-10' },
  { project_id: P1, amount: 2000, date: '2024-12-15' },
  { project_id: P2, amount: 1000, date: '2026-06-11' },
]
const payments = [{ employee_id: 'e1', amount: 600, date: '2026-06-15' }]
const advances = [{ employee_id: 'e1', amount: 200, date: '2026-06-16' }]

describe('تكافؤ حسابات العمال والمشاريع', () => {
  it('calcMustahaq / calcWasel / calcMutabqi', () => {
    expect(port.calcMustahaq(workDays, expenses)).toBe(orig.calcMustahaq(workDays, expenses))
    expect(port.calcWasel(payments, advances)).toBe(orig.calcWasel(payments, advances))
    expect(port.calcMutabqi(workDays, expenses, payments, advances))
      .toBe(orig.calcMutabqi(workDays, expenses, payments, advances))
  })

  it('calcProjectStats بمشروعين', () => {
    for (const pid of [P1, P2]) {
      expect(port.calcProjectStats(pid, workDays, expenses, receipts))
        .toEqual(orig.calcProjectStats(pid, workDays, expenses, receipts))
    }
  })

  it('calcRevenue / calcMargin', () => {
    expect(port.calcRevenue(receipts)).toBe(orig.calcRevenue(receipts))
    expect(port.calcMargin(8000, 2500)).toBe(orig.calcMargin(8000, 2500))
    expect(port.calcMargin(0, 100)).toBe(orig.calcMargin(0, 100))
  })
})

describe('تكافؤ الرواتب (calcSalary)', () => {
  const cases = [
    [400, 'كامل', undefined], [400, 'نص يوم', undefined], [400, 'عطلة', undefined],
    [400, 'ساعات', 8], [400, 'ساعات', 9.5], [400, 'ساعات', 12], [400, 'ساعات', 0],
    [377, 'ساعات', 10.5], // كسور + أوفرتايم مزدوج
  ]
  it.each(cases)('rate=%s type=%s hours=%s', (rate, type, hours) => {
    expect(port.calcSalary(rate, type, hours)).toBe(origSalary(rate, type, hours))
  })
})

describe('تكافؤ الضرائب', () => {
  it('calcVATNet — يعبر حدود نسبة 17%→18% ويخصم حسب الفئة', () => {
    expect(port.calcVATNet(receipts, expenses, '2024-01-01', '2026-12-31'))
      .toEqual(origVAT(receipts, expenses, '2024-01-01', '2026-12-31'))
    expect(port.calcVATNet(receipts, expenses, '2026-06-01', '2026-06-30'))
      .toEqual(origVAT(receipts, expenses, '2026-06-01', '2026-06-30'))
  })

  it('calcBituachLeumiAnnual — الشرائح والسقف', () => {
    for (const v of [0, 50_000, 90_264, 120_000, 700_000]) {
      expect(port.calcBituachLeumiAnnual(v)).toBe(origBL(v))
    }
  })

  it('estimateIncomeTax — الشرائح ونقاط الزيكوي والبنسيا', () => {
    for (const v of [0, 60_000, 100_000, 250_000, 800_000]) {
      expect(port.estimateIncomeTax(v)).toBe(origIT(v))
    }
    expect(port.estimateIncomeTax(200_000, 40_000)).toBe(origIT(200_000, 40_000))
  })
})
