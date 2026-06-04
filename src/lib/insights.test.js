import { describe, it, expect } from 'vitest'
import { computeBusinessPulse, gradeFor, clamp } from './insights.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات محرّك نبض المصلحة — التحقّق من حدود الدرجات والرؤى الذكية.
// ════════════════════════════════════════════════════════════════════════════

describe('clamp', () => {
  it('يحصر القيمة ضمن المدى', () => {
    expect(clamp(150)).toBe(100)
    expect(clamp(-20)).toBe(0)
    expect(clamp(63)).toBe(63)
  })
})

describe('gradeFor', () => {
  it('يطابق الدرجة والنبرة عند الحدود', () => {
    expect(gradeFor(90).tone).toBe('excellent')
    expect(gradeFor(85).grade).toBe('ممتازة')
    expect(gradeFor(70).tone).toBe('good')
    expect(gradeFor(50).tone).toBe('fair')
    expect(gradeFor(30).tone).toBe('weak')
    expect(gradeFor(10).tone).toBe('critical')
  })
})

describe('computeBusinessPulse', () => {
  it('يُرجع نتيجة محايدة عند غياب البيانات', () => {
    const p = computeBusinessPulse({})
    expect(p.score).toBeGreaterThanOrEqual(0)
    expect(p.score).toBeLessThanOrEqual(100)
    expect(p.factors).toHaveLength(5)
    expect(p.insights.length).toBeGreaterThan(0)
  })

  it('مصلحة صحّية = درجة عالية بلا تحذيرات', () => {
    const p = computeBusinessPulse({
      cashOnHand: 80000, netProfit: 60000, totalRevenue: 150000,
      owedToWorkers: 0, owedByClients: 0, overdueCount: 0,
      monthlyData: [
        { v: 5000 }, { v: 6000 }, { v: 7000 },
        { v: 9000 }, { v: 10000 }, { v: 12000 },
      ],
    })
    expect(p.score).toBeGreaterThanOrEqual(85)
    expect(p.tone).toBe('excellent')
    expect(p.insights.some(i => i.tone === 'warn')).toBe(false)
    expect(p.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('مصلحة متعثّرة = درجة منخفضة مع تحذيرات', () => {
    const p = computeBusinessPulse({
      cashOnHand: -30000, netProfit: -20000, totalRevenue: 50000,
      owedToWorkers: 40000, owedByClients: 60000, overdueCount: 3,
      monthlyData: [
        { v: 8000 }, { v: 6000 }, { v: 4000 },
        { v: 1000 }, { v: -2000 }, { v: -5000 },
      ],
    })
    expect(p.score).toBeLessThan(50)
    expect(['weak', 'critical', 'fair']).toContain(p.tone)
    expect(p.insights.some(i => i.tone === 'warn')).toBe(true)
    // السيولة السالبة لازم تظهر أول رؤية (تحذير)
    expect(p.insights[0].tone).toBe('warn')
  })

  it('وجود مبالغ غير محصّلة يقترح تذكير واتساب', () => {
    const p = computeBusinessPulse({
      cashOnHand: 20000, netProfit: 15000, totalRevenue: 60000,
      owedByClients: 25000,
    })
    const wa = p.insights.find(i => i.icon === 'MessageCircle')
    expect(wa).toBeTruthy()
    expect(wa.text).toContain('واتساب')
  })

  it('يحسب نسبة الزخم بين النصفين', () => {
    const p = computeBusinessPulse({
      totalRevenue: 100000,
      monthlyData: [
        { v: 1000 }, { v: 1000 }, { v: 1000 },   // مجموع 3000
        { v: 2000 }, { v: 2000 }, { v: 2000 },   // مجموع 6000 → +100%
      ],
    })
    expect(p.momentum).toBe(100)
  })

  it('يحدّ الرؤى بأربع كحد أقصى', () => {
    const p = computeBusinessPulse({
      cashOnHand: -10000, netProfit: -5000, totalRevenue: 40000,
      owedToWorkers: 30000, owedByClients: 20000, overdueCount: 2,
    })
    expect(p.insights.length).toBeLessThanOrEqual(4)
  })
})
