import { describe, it, expect } from 'vitest'
import {
  calcIncomeTaxAnnual, calcWorkerDeductions, calcVATReport,
} from './useTaxEngine.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات المحرّك الضريبي المركزي — المصدر الموحّد لحساب الضرائب في كل الشاشات.
// (بعد توحيد TaxSummaryTab على هذا المحرّك بدل حسبته المكرّرة)
// ════════════════════════════════════════════════════════════════════════════

describe('calcIncomeTaxAnnual', () => {
  it('صفر للدخل غير الموجب', () => {
    expect(calcIncomeTaxAnnual(0)).toBe(0)
    expect(calcIncomeTaxAnnual(-5000)).toBe(0)
  })

  it('دخل منخفض تغطّيه نقاط الزكاء بالكامل → صفر', () => {
    // _calcIT(50,000)=5,000 < نقاط الزكاء (2.25×2,904=6,534)
    expect(calcIncomeTaxAnnual(50_000)).toBe(0)
  })

  it('يحسب الضريبة بالشرائح ناقص نقاط الزكاء (حالة معروفة)', () => {
    // دخل 200,000: شرائح = 30,074 ، زكاء = 6,534 → 23,540
    expect(calcIncomeTaxAnnual(200_000)).toBe(23_540)
  })

  it('خصم الپنسيה يخفّض الضريبة (حتى سقف 16% من الدخل)', () => {
    const noPension   = calcIncomeTaxAnnual(200_000)
    const withPension = calcIncomeTaxAnnual(200_000, 2.25, 30_000)
    expect(withPension).toBeLessThan(noPension)
    expect(withPension).toBe(16_858)
  })

  it('سقف خصم الپنسيה 16% من الدخل — ما يتجاوزه', () => {
    // پنسيه ضخمة تُقصّ عند 16% من 200,000 = 32,000
    const capped   = calcIncomeTaxAnnual(200_000, 2.25, 32_000)
    const overCap  = calcIncomeTaxAnnual(200_000, 2.25, 999_999)
    expect(overCap).toBe(capped)
  })

  it('نقاط زكاء أكثر = ضريبة أقل', () => {
    expect(calcIncomeTaxAnnual(200_000, 5)).toBeLessThan(calcIncomeTaxAnnual(200_000, 2.25))
  })
})

describe('calcWorkerDeductions', () => {
  it('عامل مستقل (self) بلا استقطاع', () => {
    const d = calcWorkerDeductions(10_000, 'self')
    expect(d.total).toBe(0)
    expect(d.net).toBe(10_000)
  })

  it('فلسطيني: 20% ضريبة دخل وביטוח לאומي على صاحب العمل (صفر على العامل)', () => {
    const d = calcWorkerDeductions(10_000, 'palestinian')
    expect(d.incomeTax).toBe(2_000)
    expect(d.bituachLeumi).toBe(0)
  })

  it('israeli worker: National Insurance two-tier at 2025 rates (3.63% / 12.17%)', () => {
    // 7,522×3.63% + (10,000−7,522)×12.17% = 273 + 302 = 575
    const d = calcWorkerDeductions(10_000, 'israeli', 2.25)
    expect(d.bituachLeumi).toBe(575)
  })
})

describe('calcVATReport', () => {
  it('מע"מ المُحصّل من المدخولات بنسبة 18% (2025)', () => {
    const r = calcVATReport(
      [{ amount: 11_800, date: '2025-03-01' }],
      [],
      '2025-01-01', '2025-12-31'
    )
    // 11,800 × (0.18 / 1.18) = 1,800
    expect(r.vatOut).toBe(1_800)
    expect(r.toPay).toBe(1_800)
  })

  it('المصاريف المعلّقة (pending) لا تُحتسب في מע"מ المدخلات', () => {
    const r = calcVATReport(
      [],
      [{ amount: 11_800, date: '2025-03-01', category: 'بضاعة', status: 'pending' }],
      '2025-01-01', '2025-12-31'
    )
    expect(r.vatIn).toBe(0)
  })
})
