import { describe, it, expect } from 'vitest'
import { calcBituachLeumi, calcBituachLeumiAnnual } from './helpers.js'

// ביטוח לאומי + ביטוח בריאות للعمل الحر — يجب أن يُحسب بشريحتين (مخفّضة ثم كاملة)
// وليس بنسبة مسطّحة واحدة. هذه الاختبارات تثبّت سلوك الشريحتين والسقف.
describe('calcBituachLeumi (شهري — شريحتان)', () => {
  it('يرجّع صفر لدخل صفر أو سالب', () => {
    expect(calcBituachLeumi(0)).toBe(0)
    expect(calcBituachLeumi(-5000)).toBe(0)
  })

  it('يطبّق النسبة المخفّضة داخل الشريحة الأولى', () => {
    // 5000 × 9.82%
    expect(calcBituachLeumi(5000)).toBe(491)
  })

  it('يطبّق النسبة الكاملة على الجزء فوق الشريحة الأولى', () => {
    // 7522×9.82% + (10000−7522)×16.23%
    expect(calcBituachLeumi(10000)).toBe(1141)
  })

  it('المعدّل الحدّي فوق الشريحة الأولى أعلى منه داخلها', () => {
    const within = calcBituachLeumi(7000) - calcBituachLeumi(6000)   // معدّل مخفّض
    const above  = calcBituachLeumi(20000) - calcBituachLeumi(19000) // معدّل كامل
    expect(above).toBeGreaterThan(within)
  })

  it('يحترم السقف الشهري (لا زيادة فوق السقف)', () => {
    expect(calcBituachLeumi(100000)).toBe(calcBituachLeumi(47465))
  })
})

describe('calcBituachLeumiAnnual (سنوي — شريحتان)', () => {
  it('يرجّع صفر لدخل صفر أو سالب', () => {
    expect(calcBituachLeumiAnnual(0)).toBe(0)
    expect(calcBituachLeumiAnnual(-1000)).toBe(0)
  })

  it('ليس نسبة مسطّحة 10.5% — الشريحتان تعطيان نتيجة مختلفة', () => {
    // الإصلاح: استبدال 200000×10.5%=21000 بحساب الشريحتين
    expect(calcBituachLeumiAnnual(200000)).toBe(26674)
    expect(calcBituachLeumiAnnual(200000)).not.toBe(Math.round(200000 * 0.105))
  })

  it('يحترم السقف السنوي', () => {
    expect(calcBituachLeumiAnnual(1_000_000)).toBe(calcBituachLeumiAnnual(569580))
  })
})
