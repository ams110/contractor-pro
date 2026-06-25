import { describe, it, expect } from 'vitest'
import { calcBituachLeumi, calcBituachLeumiAnnual, calcVATNet } from './helpers.js'

// ביטוח לאומי + ביטוח בריאות للعمل الحر — يجب أن يُحسب بشريحتين (مخفّضة ثم كاملة)
// وليس بنسبة مسطّحة واحدة. هذه الاختبارات تثبّت سلوك الشريحتين والسقف.
describe('calcBituachLeumi (شهري — شريحتان)', () => {
  it('يرجّع صفر لدخل صفر أو سالب', () => {
    expect(calcBituachLeumi(0)).toBe(0)
    expect(calcBituachLeumi(-5000)).toBe(0)
  })

  it('يطبّق النسبة المخفّضة داخل الشريحة الأولى', () => {
    // 5000 × 7.70% (نسب 2025)
    expect(calcBituachLeumi(5000)).toBe(385)
  })

  it('يطبّق النسبة الكاملة على الجزء فوق الشريحة الأولى', () => {
    // 7522×7.70% + (10000−7522)×18.00% (نسب 2025)
    expect(calcBituachLeumi(10000)).toBe(1025)
  })

  it('المعدّل الحدّي فوق الشريحة الأولى أعلى منه داخلها', () => {
    const within = calcBituachLeumi(7000) - calcBituachLeumi(6000)   // معدّل مخفّض
    const above  = calcBituachLeumi(20000) - calcBituachLeumi(19000) // معدّل كامل
    expect(above).toBeGreaterThan(within)
  })

  it('يحترم السقف الشهري (لا زيادة فوق السقف)', () => {
    expect(calcBituachLeumi(100000)).toBe(calcBituachLeumi(50695))
  })
})

describe('calcBituachLeumiAnnual (سنوي — شريحتان)', () => {
  it('يرجّع صفر لدخل صفر أو سالب', () => {
    expect(calcBituachLeumiAnnual(0)).toBe(0)
    expect(calcBituachLeumiAnnual(-1000)).toBe(0)
  })

  it('ليس نسبة مسطّحة 10.5% — الشريحتان تعطيان نتيجة مختلفة', () => {
    // الإصلاح: استبدال 200000×10.5%=21000 بحساب الشريحتين (نسب 2025)
    expect(calcBituachLeumiAnnual(200000)).toBe(26703)
    expect(calcBituachLeumiAnnual(200000)).not.toBe(Math.round(200000 * 0.105))
  })

  it('يحترم السقف السنوي', () => {
    expect(calcBituachLeumiAnnual(1_000_000)).toBe(calcBituachLeumiAnnual(608340))
  })
})

// מע"מ يُستخرج من المبالغ الشاملة (amount × rate/(1+rate)) — لا amount × rate.
// المدخولات/المصاريف تُحفظ شاملة الضريبة، فالاستخراج هو الصحيح. (إصلاح بَغّ TaxSummaryTab.)
describe('calcVATNet (استخراج מע"מ من مبالغ شاملة)', () => {
  it('يستخرج 18% من المبلغ الشامل لسنة 2025 — لا يضربه بـ18%', () => {
    // 1180 شامل 18% → المُحصّل 180 (وليس 1180×0.18=212.4)
    const { vatOut } = calcVATNet([{ amount: 1180, date: '2025-03-01' }], [])
    expect(vatOut).toBe(180)
    expect(vatOut).not.toBe(Math.round(1180 * 0.18))
  })

  it('يطبّق 17% للتواريخ قبل 2025', () => {
    // 1170 شامل 17% → المُحصّل 170
    const { vatOut } = calcVATNet([{ amount: 1170, date: '2024-12-01' }], [])
    expect(vatOut).toBe(170)
  })

  it('يحترم نسبة استرداد מס תשומות حسب الفئة (رواتب=0 · مواد=100%)', () => {
    const expenses2025 = [
      { amount: 1180, date: '2025-02-01', category: 'رواتب عمال' },        // 0% خصم
      { amount: 1180, date: '2025-02-01', category: 'مواد بناء / خامات' }, // 100% خصم
    ]
    const { vatIn } = calcVATNet([], expenses2025)
    expect(vatIn).toBe(180) // فقط المواد تُخصم
  })

  it('يستثني المصاريف المعلّقة (status=pending) من الخصم', () => {
    const expenses = [
      { amount: 1180, date: '2025-02-01', category: 'مواد بناء / خامات', status: 'pending' },
    ]
    const { vatIn } = calcVATNet([], expenses)
    expect(vatIn).toBe(0)
  })

  it('الصافي = المُحصّل − القابل للخصم', () => {
    const { net } = calcVATNet(
      [{ amount: 1180, date: '2025-01-15' }],                                  // out 180
      [{ amount: 590, date: '2025-01-20', category: 'مواد بناء / خامات' }],    // in 90
    )
    expect(net).toBe(90)
  })
})
