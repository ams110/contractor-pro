import { describe, it, expect } from 'vitest'
import {
  computeBusinessPulse, gradeFor, clamp,
  computeCashForecast, weightedAvg, stdDev, fmtMonths,
  computeWorkerDNA, workerTier,
  computeProjectHealth,
  computeTaxRunway,
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

// ════════════════════════════════════════════════════════════════════════════
// اختبارات بصمة العامل — المؤشّر، الرادار، التصنيف، والرؤى المقارِنة.
// ════════════════════════════════════════════════════════════════════════════

describe('workerTier', () => {
  it('يصنّف العامل حسب درجته', () => {
    expect(workerTier(85).tier).toBe('نخبة')
    expect(workerTier(85).star).toBe(true)
    expect(workerTier(70).tier).toBe('موثوق')
    expect(workerTier(55).tier).toBe('مقبول')
    expect(workerTier(55).star).toBe(false)
    expect(workerTier(40).tone).toBe('weak')
    expect(workerTier(10).tone).toBe('critical')
  })
})

describe('computeWorkerDNA', () => {
  it('يُرجع 5 محاور ودرجة ضمن المدى عند غياب البيانات', () => {
    const d = computeWorkerDNA({})
    expect(d.score).toBeGreaterThanOrEqual(0)
    expect(d.score).toBeLessThanOrEqual(100)
    expect(d.factors).toHaveLength(5)
    expect(d.insights.length).toBeGreaterThan(0)
  })

  it('عامل نخبة: إنتاجية عالية، منتظم، بلا سلف، مستمرّ', () => {
    const d = computeWorkerDNA({
      name: 'أحمد علي', earned: 60000, advances: 0,
      avgPerDay: 500, fleetAvgPerDay: 350,
      approvedDays: 40, pendingDays: 0, rejectedDays: 0,
      daysPerMonth: [20, 22, 21, 20], tenureMonths: 6,
    })
    expect(d.score).toBeGreaterThanOrEqual(80)
    expect(d.tier).toBe('نخبة')
    expect(d.star).toBe(true)
    expect(d.productivityPct).toBeGreaterThan(0)
    expect(d.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('عامل تحت المراقبة: سلف عالية ومرفوضات تُنتج تحذيراً', () => {
    const d = computeWorkerDNA({
      name: 'خالد', earned: 20000, advances: 14000,
      avgPerDay: 250, fleetAvgPerDay: 350,
      approvedDays: 5, pendingDays: 4, rejectedDays: 3,
      daysPerMonth: [2, 8, 1], tenureMonths: 1,
    })
    expect(d.score).toBeLessThan(50)
    expect(d.insights[0].tone).toBe('warn')
    expect(d.insights.some(i => i.text.includes('سلف'))).toBe(true)
  })

  it('يحسب نسبة الإنتاجية مقابل متوسّط الفريق', () => {
    const d = computeWorkerDNA({ earned: 30000, avgPerDay: 420, fleetAvgPerDay: 350, approvedDays: 10 })
    expect(d.productivityPct).toBe(20)   // (420/350 − 1) = 20%
  })

  it('يحدّ الرؤى بثلاث كحدّ أقصى', () => {
    const d = computeWorkerDNA({
      name: 'سمير', earned: 10000, advances: 8000,
      avgPerDay: 200, fleetAvgPerDay: 400,
      approvedDays: 3, pendingDays: 5, rejectedDays: 2,
      daysPerMonth: [1, 9], tenureMonths: 0,
    })
    expect(d.insights.length).toBeLessThanOrEqual(3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات صحّة المشروع — المؤشّر، العوامل، الإنذار المبكّر، والرؤى.
// ════════════════════════════════════════════════════════════════════════════

describe('computeProjectHealth', () => {
  it('يُرجع 4 عوامل ودرجة ضمن المدى عند غياب البيانات', () => {
    const h = computeProjectHealth({})
    expect(h.score).toBeGreaterThanOrEqual(0)
    expect(h.score).toBeLessThanOrEqual(100)
    expect(h.factors).toHaveLength(4)
    expect(h.insights.length).toBeGreaterThan(0)
  })

  it('مشروع رابح ومحصّل = درجة عالية ورؤية إيجابية', () => {
    const h = computeProjectHealth({
      name: 'فيلا الشمال', price: 100000, revenue: 100000,
      cost: 70000, ownerCash: 30000, profit: 30000, margin: 30, overdue: false,
    })
    expect(h.score).toBeGreaterThanOrEqual(75)
    expect(['good', 'excellent']).toContain(h.tone)
    expect(h.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('مشروع خاسر (تكلفة تجاوزت العقد) = تحذيرات ودرجة منخفضة', () => {
    const h = computeProjectHealth({
      name: 'مشروع متعثّر', price: 80000, revenue: 40000,
      cost: 95000, ownerCash: -20000, profit: -55000, margin: -137, overdue: true,
    })
    expect(h.score).toBeLessThan(45)
    expect(h.insights[0].tone).toBe('warn')
    expect(h.insights.some(i => i.text.includes('تجاوزت'))).toBe(true)
  })

  it('يحسب الهامش النهائي المتوقّع (إنذار مبكّر) عند الإنجاز الجزئي', () => {
    // أُنجز 50% (حصّل نصف العقد) بتكلفة 40k → تكلفة نهائية متوقّعة 80k، هامش ~20%
    const h = computeProjectHealth({
      price: 100000, revenue: 50000, cost: 40000,
      ownerCash: 10000, profit: 10000, margin: 20,
    })
    expect(h.projectedMargin).toBe(20)
  })

  it('لا يحسب إنذاراً مبكّراً للمشاريع المكتملة أو بلا عقد', () => {
    expect(computeProjectHealth({ price: 100000, revenue: 100000, cost: 60000 }).projectedMargin).toBeNull()
    expect(computeProjectHealth({ price: 0, revenue: 50000, cost: 30000 }).projectedMargin).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات عدّاد الضريبة — توقّع السقف، التجنيب الشهري، والرؤى.
// ════════════════════════════════════════════════════════════════════════════

describe('computeTaxRunway', () => {
  it('يُرجع null إذا لا دخل ولا ضريبة', () => {
    expect(computeTaxRunway({ yearIncome: 0, annualTax: 0 })).toBeNull()
  })

  it('עוסק פטور سيتجاوز السقف: يحسب الشهر المتوقّع ويحذّر', () => {
    // 6 أشهر × ₪12,000 = ₪72k، التوقّع السنوي ₪144k > 120k
    const r = computeTaxRunway({ isOsekPatur: true, cap: 120000, yearIncome: 72000, monthsElapsed: 6 })
    expect(r.willExceed).toBe(true)
    expect(r.projectedAnnual).toBe(144000)
    expect(r.capMonth).toBeTruthy()
    expect(r.tone).toBe('critical')
    expect(r.insights[0].tone).toBe('warn')
  })

  it('עוסק פטור ضمن الحد بأريحية = نبرة جيّدة', () => {
    const r = computeTaxRunway({ isOsekPatur: true, cap: 120000, yearIncome: 20000, monthsElapsed: 6 })
    expect(r.willExceed).toBe(false)
    expect(r.projectedAnnual).toBe(40000)
    expect(r.tone).toBe('good')
    expect(r.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('يكتشف تجاوز السقف الواقع فعلاً', () => {
    const r = computeTaxRunway({ isOsekPatur: true, cap: 120000, yearIncome: 130000, monthsElapsed: 8 })
    expect(r.alreadyExceeded).toBe(true)
    expect(r.insights[0].text).toContain('تجاوزت')
  })

  it('يحسب التجنيب الشهري للفاتورة الضريبية', () => {
    const r = computeTaxRunway({ isOsekPatur: false, yearIncome: 200000, monthsElapsed: 6, annualTax: 36000 })
    expect(r.monthlyProvision).toBe(3000)   // 36000 / 12
    expect(r.insights.some(i => i.icon === 'PiggyBank')).toBe(true)
  })
})
