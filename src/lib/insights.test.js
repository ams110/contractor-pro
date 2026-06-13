import { describe, it, expect } from 'vitest'
import {
  computeBusinessPulse, gradeFor, clamp,
  computeCashForecast, weightedAvg, stdDev, fmtMonths,
  computeWorkerDNA, workerTier,
  computeProjectHealth,
  computeTaxRunway,
  detectExpenseAnomalies,
  computeCollectionAging,
  computeTeamPulse,
  computeCommandCenter,
  computeNetWorth,
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
  it('يعيد الحدّ الأدنى عند NaN/قيمة غير منتهية بدل تمرير NaN', () => {
    expect(clamp(NaN)).toBe(0)
    expect(clamp(Infinity)).toBe(100)
    expect(clamp(NaN, 5, 90)).toBe(5)
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

// ════════════════════════════════════════════════════════════════════════════
// اختبارات كاشف التسريب — قفزات الفئات، المصاريف غير المنسوبة، والمتطرّفات.
// ════════════════════════════════════════════════════════════════════════════

describe('detectExpenseAnomalies', () => {
  it('حالة فارغة = لا بيانات', () => {
    const r = detectExpenseAnomalies({ entries: [], monthKey: '2026-06' })
    expect(r.hasData).toBe(false)
    expect(r.anomalies).toHaveLength(0)
  })

  it('يرصد قفزة فئة مقابل معدّل الأشهر السابقة', () => {
    const entries = [
      { amount: 1000, category: 'وقود', date: '2026-03-10', project_id: 'p1' },
      { amount: 1000, category: 'وقود', date: '2026-04-10', project_id: 'p1' },
      { amount: 1000, category: 'وقود', date: '2026-05-10', project_id: 'p1' },
      { amount: 2500, category: 'وقود', date: '2026-06-10', project_id: 'p1' },   // +150%
    ]
    const r = detectExpenseAnomalies({ entries, monthKey: '2026-06' })
    expect(r.spikeCount).toBe(1)
    expect(r.tone).toBe('weak')
    expect(r.anomalies[0].tone).toBe('warn')
    expect(r.anomalies[0].text).toContain('وقود')
  })

  it('يرصد المصاريف غير المنسوبة لمشروع (تسريب)', () => {
    const entries = [
      { amount: 2000, category: 'مواد', date: '2026-06-01' },               // بدون project_id
      { amount: 1500, category: 'أدوات', date: '2026-06-05', project_id: '' },
      { amount: 800,  category: 'بضاعة', date: '2026-06-08', project_id: 'p1' },
    ]
    const r = detectExpenseAnomalies({ entries, monthKey: '2026-06' })
    expect(r.leakCount).toBe(2)
    expect(r.leakTotal).toBe(3500)
    expect(r.anomalies.some(an => an.icon === 'FolderInput')).toBe(true)
  })

  it('لا يعدّ المصاريف العامّة (is_general) تسريباً', () => {
    const entries = [
      { amount: 2000, category: 'إيجار', date: '2026-06-01', is_general: true },
      { amount: 800,  category: 'بضاعة', date: '2026-06-08', project_id: 'p1' },
    ]
    const r = detectExpenseAnomalies({ entries, monthKey: '2026-06' })
    expect(r.leakCount).toBe(0)
  })

  it('حالة نظيفة = نبرة ممتازة ورسالة إيجابية', () => {
    const entries = [
      { amount: 1000, category: 'مواد', date: '2026-05-10', project_id: 'p1' },
      { amount: 1000, category: 'مواد', date: '2026-06-10', project_id: 'p1' },
    ]
    const r = detectExpenseAnomalies({ entries, monthKey: '2026-06' })
    expect(r.spikeCount).toBe(0)
    expect(r.leakCount).toBe(0)
    expect(r.tone).toBe('excellent')
    expect(r.anomalies[0].tone).toBe('good')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات رادار التحصيل — أعمار الذمم، أولوية الاتصال، والرؤى.
// ════════════════════════════════════════════════════════════════════════════

describe('computeCollectionAging', () => {
  const now = new Date('2026-06-15').getTime()

  it('لا مشاريع بأسعار = لا بيانات وذمم صفرية', () => {
    const r = computeCollectionAging({ projects: [{ id: 'p1', price: 0 }], receipts: [], now })
    expect(r.hasData).toBe(false)
    expect(r.totalOutstanding).toBe(0)
    expect(r.tone).toBe('excellent')
  })

  it('يصنّف الذمم في الدلاء الصحيحة حسب آخر قبضة', () => {
    const projects = [
      { id: 'p1', name: 'فيلا', price: 100000, client_name: 'سامي' },
      { id: 'p2', name: 'مخزن', price: 50000, client_name: 'رامي' },
    ]
    const receipts = [
      { project_id: 'p1', amount: 40000, date: '2026-06-10' },  // قبل 5 أيام → جاري، متبقي 60k
      { project_id: 'p2', amount: 10000, date: '2026-02-01' },  // قبل ~134 يوم → 90+، متبقي 40k
    ]
    const r = computeCollectionAging({ projects, receipts, now })
    expect(r.totalOutstanding).toBe(100000)
    expect(r.buckets.find(b => b.key === 'current').amount).toBe(60000)
    expect(r.buckets.find(b => b.key === 'd90').amount).toBe(40000)
    expect(r.worst.id).toBe('p2')           // الأقدم أولاً
    expect(r.tone).toBe('critical')
    expect(r.insights[0].tone).toBe('warn')
  })

  it('ذمم ضمن المهلة = نبرة جيّدة بلا تحذير', () => {
    const projects = [{ id: 'p1', name: 'شقة', price: 30000, client_name: 'ليلى' }]
    const receipts = [{ project_id: 'p1', amount: 10000, date: '2026-06-01' }]  // قبل 14 يوم
    const r = computeCollectionAging({ projects, receipts, now })
    expect(r.overdueTotal).toBe(0)
    expect(r.tone).toBe('fair')
    expect(r.insights.some(i => i.tone === 'tip')).toBe(true)
  })

  it('كل العملاء سدّدوا = نبرة ممتازة', () => {
    const projects = [{ id: 'p1', price: 20000 }]
    const receipts = [{ project_id: 'p1', amount: 20000, date: '2026-05-01' }]
    const r = computeCollectionAging({ projects, receipts, now })
    expect(r.totalOutstanding).toBe(0)
    expect(r.tone).toBe('excellent')
    expect(r.insights[0].tone).toBe('good')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات نبض الفريق — مؤشّر التفاعل، ترتيب الأعضاء، وتنبيهات الخمول.
// ════════════════════════════════════════════════════════════════════════════

describe('computeTeamPulse', () => {
  const now = new Date('2026-06-15T12:00:00Z').getTime()
  const day = (n) => new Date(now - n * 86400000).toISOString()

  it('لا أعضاء = لا بيانات ودرجة صفر', () => {
    const r = computeTeamPulse({ members: [], activity: [], now })
    expect(r.hasData).toBe(false)
    expect(r.score).toBe(0)
  })

  it('يرتّب الأعضاء حسب النشاط ويحدّد الأنشط', () => {
    const members = [
      { id: 'm1', display_name: 'سامي', auth_email: 's@x.co' },
      { id: 'm2', display_name: 'رامي', auth_email: 'r@x.co' },
    ]
    const activity = [
      { actor_email: 's@x.co', action: 'insert', tbl: 'work_days', created_at: day(0) },
      { actor_email: 's@x.co', action: 'update', tbl: 'expenses',  created_at: day(1) },
      { actor_email: 's@x.co', action: 'insert', tbl: 'payments',  created_at: day(0) },
      { actor_email: 'r@x.co', action: 'insert', tbl: 'work_days', created_at: day(2) },
    ]
    const r = computeTeamPulse({ members, activity, now })
    expect(r.totalActions).toBe(4)
    expect(r.mostActive.name).toBe('سامي')
    expect(r.rows[0].count).toBe(3)
    expect(r.activeMembers).toBe(2)
    expect(r.insights.some(i => i.tone === 'good')).toBe(true)
  })

  it('يحذّر من العضو الخامل', () => {
    const members = [
      { id: 'm1', display_name: 'نشيط', auth_email: 'a@x.co' },
      { id: 'm2', display_name: 'خامل', auth_email: 'b@x.co' },
    ]
    const activity = [
      { actor_email: 'a@x.co', action: 'insert', tbl: 'work_days', created_at: day(0) },
      { actor_email: 'b@x.co', action: 'insert', tbl: 'work_days', created_at: day(30) },
    ]
    const r = computeTeamPulse({ members, activity, now })
    const warn = r.insights.find(i => i.tone === 'warn')
    expect(warn).toBeTruthy()
    expect(warn.text).toContain('خامل')
  })

  it('يتجاهل الأعضاء المحجوبين', () => {
    const members = [
      { id: 'm1', display_name: 'نشيط', auth_email: 'a@x.co' },
      { id: 'm2', display_name: 'محجوب', auth_email: 'c@x.co', is_blocked: true },
    ]
    const activity = [{ actor_email: 'a@x.co', action: 'insert', tbl: 'work_days', created_at: day(0) }]
    const r = computeTeamPulse({ members, activity, now })
    expect(r.memberCount).toBe(1)
    expect(r.rows).toHaveLength(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات مركز القيادة الذكي — تجميع المحرّكات في بطاقات وموجز موحّد.
// ════════════════════════════════════════════════════════════════════════════

describe('computeCommandCenter', () => {
  const now = new Date('2026-06-15').getTime()

  it('فارغ = لا بيانات', () => {
    const r = computeCommandCenter({})
    expect(r.hasData).toBe(false)
    expect(r.feed).toHaveLength(0)
  })

  it('يبني 4 بطاقات بلا فريق، و5 مع فريق', () => {
    const base = {
      projects: [{ id: 'p1', name: 'فيلا', status: 'نشط', price: 100000 }],
      clientReceipts: [{ project_id: 'p1', amount: 30000, date: '2026-01-01' }],
      monthKey: '2026-06', now,
    }
    expect(computeCommandCenter(base).scorecards).toHaveLength(4)

    const withTeam = computeCommandCenter({
      ...base, isOwner: true,
      teamMembers: [{ id: 'm1', display_name: 'سامي', auth_email: 's@x.co' }],
      teamActivity: [{ actor_email: 's@x.co', action: 'insert', tbl: 'work_days', created_at: new Date(now).toISOString() }],
    })
    expect(withTeam.scorecards).toHaveLength(5)
    expect(withTeam.scorecards.find(s => s.key === 'team').value).toBeGreaterThan(0)
  })

  it('يجمّع تنبيهات عبر المجالات في الموجز ويرتّبها', () => {
    // مشروع متعثّر + ذمم متأخّرة جداً → تحذيرات في الموجز
    const r = computeCommandCenter({
      projects: [{ id: 'p1', name: 'متعثّر', status: 'نشط', price: 80000 }],
      clientReceipts: [{ project_id: 'p1', amount: 20000, date: '2026-01-01' }],   // متأخّر >90 يوم
      expenses: [{ amount: 95000, category: 'مواد', date: '2026-06-02', project_id: 'p1', status: 'approved' }],
      monthKey: '2026-06', now,
    })
    expect(r.feed.length).toBeGreaterThan(0)
    expect(r.feed[0].tone).toBe('warn')
    expect(r.feed[0]).toHaveProperty('screen')
    expect(r.alertCount).toBeGreaterThan(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// اختبارات الذمّة الصافية — صحّة المعادلة، شلال البناء، النبرة، والرؤى.
// ════════════════════════════════════════════════════════════════════════════

describe('computeNetWorth', () => {
  it('يطبّق المعادلة: نقد + ذمم − عمّال − معلّقة', () => {
    const r = computeNetWorth({
      cashOnHand: 20000, owedByClients: 50000,
      owedToWorkers: 12000, pendingExpenses: 3000,
    })
    expect(r.netWorth).toBe(20000 + 50000 - 12000 - 3000) // 55000
    expect(r.assets).toBe(70000)        // نقد موجب + ذمم
    expect(r.liabilities).toBe(15000)   // عمّال + معلّقة
    expect(r.hasData).toBe(true)
  })

  it('شلال متّصل: نهاية كل بند = بداية التالي، والصافي يُرسَم من صفر', () => {
    const r = computeNetWorth({
      cashOnHand: 10000, owedByClients: 20000,
      owedToWorkers: 5000, pendingExpenses: 2000,
    })
    const flow = r.segments.filter(s => s.key !== 'net')
    for (let i = 1; i < flow.length; i++) {
      expect(flow[i].start).toBe(flow[i - 1].end)
    }
    expect(flow[0].start).toBe(0)
    const net = r.segments.find(s => s.key === 'net')
    expect(net.start).toBe(0)
    expect(net.end).toBe(r.netWorth)
    // آخر بند تدفّقي ينتهي عند الصافي
    expect(flow.at(-1).end).toBe(r.netWorth)
  })

  it('يحذف الشرائح الصفرية ويُبقي النقد والصافي دائماً', () => {
    const r = computeNetWorth({ cashOnHand: 8000 })
    const keys = r.segments.map(s => s.key)
    expect(keys).toContain('cash')
    expect(keys).toContain('net')
    expect(keys).not.toContain('receivables')
    expect(keys).not.toContain('workers')
    expect(keys).not.toContain('pending')
    expect(r.liabilities).toBe(0)
    expect(r.tone).toBe('excellent')   // لا ديون
  })

  it('نبرة حرجة عند المركز السالب + رؤية تحذير', () => {
    const r = computeNetWorth({
      cashOnHand: -5000, owedByClients: 4000,
      owedToWorkers: 20000, pendingExpenses: 0,
    })
    expect(r.netWorth).toBeLessThan(0)
    expect(r.tone).toBe('critical')
    expect(r.insights[0].tone).toBe('warn')
    expect(r.insights[0].icon).toBe('AlertTriangle')
  })

  it('نبرة ضعيفة: ذمّة موجبة لكن نقد سالب (مكشوف على التحصيل)', () => {
    const r = computeNetWorth({
      cashOnHand: -3000, owedByClients: 40000, owedToWorkers: 5000,
    })
    expect(r.netWorth).toBeGreaterThan(0)
    expect(r.tone).toBe('weak')
    expect(r.insights.some(i => i.icon === 'Wallet' && i.tone === 'warn')).toBe(true)
  })

  it('نبرة مقبولة: النقد وحده لا يغطّي الالتزامات', () => {
    const r = computeNetWorth({
      cashOnHand: 4000, owedByClients: 60000, owedToWorkers: 30000,
    })
    expect(r.tone).toBe('fair')      // liabilities(30k) > cash(4k)
    expect(r.coverage).toBeGreaterThan(1)
  })

  it('coverage = null عند غياب الالتزامات، ورقم عند وجودها', () => {
    expect(computeNetWorth({ cashOnHand: 5000 }).coverage).toBeNull()
    const r = computeNetWorth({ cashOnHand: 10000, owedToWorkers: 5000 })
    expect(r.coverage).toBeCloseTo(2, 5)
  })

  it('حالة فارغة: hasData=false ورؤية إرشادية', () => {
    const r = computeNetWorth({})
    expect(r.hasData).toBe(false)
    expect(r.netWorth).toBe(0)
    expect(r.insights[0].icon).toBe('Landmark')
  })

  it('يربط رؤية الذمم برادار التحصيل عند وجود مستحقّات', () => {
    const r = computeNetWorth({ cashOnHand: 50000, owedByClients: 25000 })
    expect(r.insights.some(i => i.text.includes('رادار التحصيل'))).toBe(true)
    expect(r.tone).toBe('excellent') // لا التزامات
  })
})
