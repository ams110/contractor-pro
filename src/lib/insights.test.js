import { describe, it, expect } from 'vitest'
import {
  computeBusinessPulse, gradeFor, clamp,
  computeCashForecast, weightedAvg, stdDev, fmtMonths,
} from './insights.js'

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

// ════════════════════════════════════════════════════════════════════════════
// اختبارات محرّك التوقّع النقدي — المتوسّط المرجّح، النطاق، وعدّاد الأمان (runway).
// ════════════════════════════════════════════════════════════════════════════

describe('weightedAvg', () => {
  it('يعطي وزناً أعلى للقيم الأحدث', () => {
    // [10, 20] بأوزان [1, 2] = (10·1 + 20·2) / 3 = 50/3 ≈ 16.67
    expect(weightedAvg([10, 20])).toBeCloseTo(16.667, 2)
    expect(weightedAvg([])).toBe(0)
  })
})

describe('stdDev', () => {
  it('صفر لقيم متطابقة، وموجب للمتذبذبة', () => {
    expect(stdDev([5, 5, 5])).toBe(0)
    expect(stdDev([0, 10])).toBeGreaterThan(0)
    expect(stdDev([7])).toBe(0)
  })
})

describe('fmtMonths', () => {
  it('يصيغ المدّة بالعربي حسب العدد', () => {
    expect(fmtMonths(1)).toBe('شهر واحد')
    expect(fmtMonths(2)).toBe('شهرين')
    expect(fmtMonths(5)).toBe('5 أشهر')
    expect(fmtMonths(13)).toBe('أكثر من سنة')
  })
})

describe('computeCashForecast', () => {
  it('يُرجع null عند غياب تاريخ كافٍ', () => {
    expect(computeCashForecast({})).toBeNull()
    expect(computeCashForecast({ monthlyData: [{ v: 5000 }] })).toBeNull()
    expect(computeCashForecast({ monthlyData: [{ v: 0 }, { v: 0 }, { v: 0 }] })).toBeNull()
  })

  it('اتجاه صاعد → نبرة إيجابية، بلا عدّاد أمان، ورؤية تصاعدية', () => {
    const f = computeCashForecast({
      cashOnHand: 50000, totalRevenue: 200000,
      monthlyData: [
        { month: '01', v: 4000 }, { month: '02', v: 5000 }, { month: '03', v: 6000 },
        { month: '04', v: 7000 }, { month: '05', v: 8000 }, { month: '06', v: 9000 },
      ],
    })
    expect(f.avgFlow).toBeGreaterThan(0)
    expect(f.rising).toBe(true)
    expect(f.runway).toBeNull()
    expect(['good', 'excellent']).toContain(f.tone)
    expect(f.projected).toBeGreaterThan(50000)
    expect(f.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('اتجاه نازل بسيولة موجبة → يحسب عدّاد الأمان (runway) ويحذّر', () => {
    const f = computeCashForecast({
      cashOnHand: 30000, totalRevenue: 120000,
      monthlyData: [
        { month: '01', v: 2000 },  { month: '02', v: -1000 }, { month: '03', v: -3000 },
        { month: '04', v: -5000 }, { month: '05', v: -6000 }, { month: '06', v: -8000 },
      ],
    })
    expect(f.avgFlow).toBeLessThan(0)
    expect(f.runway).toBeGreaterThan(0)
    expect(['weak', 'critical', 'fair']).toContain(f.tone)
    expect(f.insights[0].tone).toBe('warn')
  })

  it('يبني سلسلة بطول التاريخ + أفق التوقّع، وتنتهي عند النقد الحالي', () => {
    const monthlyData = [
      { month: '01', v: 1000 }, { month: '02', v: 1000 }, { month: '03', v: 1000 },
      { month: '04', v: 1000 }, { month: '05', v: 1000 }, { month: '06', v: 1000 },
    ]
    const f = computeCashForecast({ cashOnHand: 40000, totalRevenue: 100000, monthlyData, horizon: 3 })
    expect(f.series).toHaveLength(6 + 3)
    // آخر نقطة تاريخية = النقد الحالي (نقطة الوصل)
    const junction = f.series[5]
    expect(junction.actual).toBe(40000)
    expect(junction.forecast).toBe(40000)
    // نقاط المستقبل تحمل نطاق ثقة [lo, hi]
    expect(f.series[6].range).toHaveLength(2)
    expect(f.series[8].forecast).toBe(40000 + f.avgFlow * 3)
  })
})
