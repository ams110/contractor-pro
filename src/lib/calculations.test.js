import { describe, it, expect } from 'vitest'
import {
  calcEarned, calcWorkerExpenses, calcMustahaq, calcPaid, calcAdvances,
  calcWasel, calcMutabqi, calcRevenue, calcProjectCost, calcProfit,
  calcMargin, calcOwnerCash, calcProjectStats,
} from './calculations.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات الآلة الحاسبة المالية — المصدر الموحّد لكل الأرقام في التطبيق.
// أي تعديل على معادلة يكسر اختباراً هنا = إنذار مبكر قبل ما يوصل لزبون.
// ════════════════════════════════════════════════════════════════════════════

describe('دوال الجمع الأساسية', () => {
  it('calcEarned يجمع مبالغ أيام العمل', () => {
    expect(calcEarned([{ amount: 100 }, { amount: 250 }])).toBe(350)
  })
  it('يتعامل مع قائمة فارغة أو قيم ناقصة', () => {
    expect(calcEarned([])).toBe(0)
    expect(calcEarned([{ amount: 100 }, {}])).toBe(100)
    expect(calcEarned()).toBe(0)
  })
  it('calcWorkerExpenses / calcPaid / calcAdvances / calcRevenue تجمع بشكل صحيح', () => {
    expect(calcWorkerExpenses([{ amount: 40 }, { amount: 60 }])).toBe(100)
    expect(calcPaid([{ amount: 500 }])).toBe(500)
    expect(calcAdvances([{ amount: 200 }, { amount: 50 }])).toBe(250)
    expect(calcRevenue([{ amount: 1000 }, { amount: 500 }])).toBe(1500)
  })
})

describe('حسابات العامل (مستحق / واصل / متبقي)', () => {
  const workDays = [{ amount: 800 }, { amount: 200 }]   // أجور = 1000
  const workerExp = [{ amount: 150 }]                    // مصاريف العامل = 150
  const payments = [{ amount: 600 }]                     // مدفوع = 600
  const advances = [{ amount: 100 }]                     // سلف = 100

  it('المستحق = أيام العمل + مصاريف العامل', () => {
    expect(calcMustahaq(workDays, workerExp)).toBe(1150)
  })
  it('الواصل = المدفوعات + السلف', () => {
    expect(calcWasel(payments, advances)).toBe(700)
  })
  it('المتبقي = المستحق − الواصل (العامل دائن)', () => {
    expect(calcMutabqi(workDays, workerExp, payments, advances)).toBe(450)
  })
  it('المتبقي يطلع سالباً إذا تجاوز الواصل المستحق (العامل مدين)', () => {
    // مستحق 100 ، واصل 300 → −200
    expect(calcMutabqi([{ amount: 100 }], [], [{ amount: 200 }], [{ amount: 100 }])).toBe(-200)
  })
})

describe('حسابات المشروع (تكلفة / ربح / هامش)', () => {
  it('التكلفة = أيام العمل + مصاريف المشروع + مصاريف العمال', () => {
    expect(calcProjectCost([{ amount: 1000 }], [{ amount: 300 }], [{ amount: 200 }])).toBe(1500)
  })
  it('الربح = الإيرادات − التكلفة', () => {
    expect(calcProfit(2000, 1500)).toBe(500)
    expect(calcProfit(1000, 1500)).toBe(-500)
  })
  it('الهامش = ربح/إيراد ×100 ، و null إذا لا يوجد إيراد', () => {
    expect(calcMargin(2000, 500)).toBe(25)
    expect(calcMargin(0, -100)).toBeNull()
  })
})

describe('calcOwnerCash — نقد المالك (يمنع ازدواج حسبة مصاريف العمال)', () => {
  it('= إيرادات − مصاريف المشروع − مدفوعات − سلف', () => {
    expect(calcOwnerCash(10000, 2000, 3000, 500)).toBe(4500)
  })
  it('لا يطرح مصاريف العمال — هي تُسوّى ضمن المدفوعات (لا ازدواج)', () => {
    // لو كنا نطرح مصاريف العمال هنا لكانت النتيجة أقل — هذا الاختبار يحرس ضد الباگ القديم.
    const owner = calcOwnerCash(10000, /*projExp*/2000, /*paid*/3000, /*adv*/0)
    expect(owner).toBe(5000)
  })
  it('السلف اختيارية (افتراضي 0)', () => {
    expect(calcOwnerCash(10000, 2000, 3000)).toBe(5000)
  })
})

describe('calcProjectStats — التجميع الكامل للمشروع', () => {
  const PID = 'proj-1'
  const workDays = [
    { project_id: PID, amount: 1000, status: 'approved' },
    { project_id: PID, amount: 500,  status: 'pending'  },   // غير معتمد → لا يدخل التكلفة
    { project_id: 'other', amount: 999, status: 'approved' },// مشروع آخر → يُستبعد
  ]
  const expenses = [
    { project_id: PID, amount: 300, status: 'approved' },                       // مصروف مشروع
    { project_id: PID, amount: 200, status: 'approved', employee_id: 'e1' },     // مصروف عامل
    { project_id: PID, amount: 700, status: 'pending'  },                        // غير معتمد → يُستبعد
  ]
  const receipts = [
    { project_id: PID, amount: 5000 },
    { project_id: 'other', amount: 123 },
  ]
  const s = calcProjectStats(PID, workDays, expenses, receipts)

  it('يحسب أيام العمل المعتمدة فقط ولهذا المشروع فقط', () => {
    expect(s.wdCost).toBe(1000)
  })
  it('يفصل مصاريف المشروع عن مصاريف العمال', () => {
    expect(s.projExpTotal).toBe(300)
    expect(s.workerExpTotal).toBe(200)
    expect(s.expTotal).toBe(500)
  })
  it('يستثني المصاريف وأيام العمل غير المعتمدة من التكلفة', () => {
    expect(s.cost).toBe(1500) // 1000 + 300 + 200 (بلا الـ pending)
  })
  it('الإيراد محصور بهذا المشروع', () => {
    expect(s.revenue).toBe(5000)
  })
  it('الربح والهامش صحيحان', () => {
    expect(s.profit).toBe(3500)
    expect(s.margin).toBe(70)
  })
  it('يعدّ أيام العمل المعلّقة (pending) بشكل صحيح', () => {
    expect(s.pending).toBe(1)
    expect(s.wdCount).toBe(1)
  })
  it('مشروع بلا بيانات يعطي أصفاراً وهامشاً null', () => {
    const empty = calcProjectStats('none', workDays, expenses, receipts)
    expect(empty.revenue).toBe(0)
    expect(empty.cost).toBe(0)
    expect(empty.profit).toBe(0)
    expect(empty.margin).toBeNull()
  })
})
