import { describe, it, expect } from 'vitest'
import {
  buildAttendanceHeatmap, buildFleetDna, buildRadarData,
  detectWorkerAnomalies, buildWorkerTimeline, buildFleetLeaderboard,
} from './workerInsights.js'

const TODAY = new Date('2026-06-05T12:00:00')

describe('buildAttendanceHeatmap', () => {
  it('builds a weeks×7 grid aligned to weeks', () => {
    const hm = buildAttendanceHeatmap([], { weeks: 4, today: TODAY })
    expect(hm.grid).toHaveLength(4)
    expect(hm.cells).toHaveLength(28)
    hm.grid.forEach(col => expect(col).toHaveLength(7))
    expect(hm.cells[0].weekday).toBe(0)      // يبدأ بالأحد
    expect(hm.cells[27].weekday).toBe(6)     // ينتهي بالسبت
  })

  it('counts approved + pending days and scales heat level', () => {
    const wd = [
      { date: '2026-06-01', amount: 100, status: 'approved' },
      { date: '2026-06-02', amount: 400, status: 'approved' },
      { date: '2026-06-03', amount: 200, status: 'pending' },
    ]
    const hm = buildAttendanceHeatmap(wd, { weeks: 4, today: TODAY })
    expect(hm.maxAmount).toBe(400)
    expect(hm.totalActiveDays).toBe(3)
    const c1 = hm.cells.find(c => c.date === '2026-06-01')
    const c2 = hm.cells.find(c => c.date === '2026-06-02')
    const c3 = hm.cells.find(c => c.date === '2026-06-03')
    expect(c2.level).toBe(4)                 // أعلى يوم
    expect(c1.level).toBeGreaterThanOrEqual(1)
    expect(c1.level).toBeLessThan(c2.level)
    expect(c3.pending).toBe(1)
  })

  it('marks future cells and empty cells level 0', () => {
    const hm = buildAttendanceHeatmap([], { weeks: 2, today: TODAY })
    expect(hm.cells.every(c => c.level === 0)).toBe(true)
    expect(hm.cells.some(c => c.future)).toBe(true)
  })

  it('computes longest consecutive streak', () => {
    const wd = [
      { date: '2026-06-01', amount: 100, status: 'approved' },
      { date: '2026-06-02', amount: 100, status: 'approved' },
      { date: '2026-06-03', amount: 100, status: 'approved' },
      { date: '2026-06-05', amount: 100, status: 'approved' },
    ]
    const hm = buildAttendanceHeatmap(wd, { weeks: 4, today: TODAY })
    expect(hm.longestStreak).toBe(3)
  })
})

describe('buildFleetDna + buildRadarData', () => {
  const mk = (p, r) => ({ score: Math.round((p + r) / 2), factors: [
    { key: 'productivity', label: 'إنتاجية', score: p },
    { key: 'regularity', label: 'انتظام', score: r },
  ] })

  it('averages factors across workers', () => {
    const fleet = buildFleetDna([mk(80, 60), mk(40, 100)])
    expect(fleet.factors.find(f => f.key === 'productivity').score).toBe(60)
    expect(fleet.factors.find(f => f.key === 'regularity').score).toBe(80)
    expect(fleet.count).toBe(2)
  })

  it('returns null with no valid dna', () => {
    expect(buildFleetDna([null, {}])).toBeNull()
  })

  it('maps radar data with worker + fleet values', () => {
    const fleet = buildFleetDna([mk(80, 60), mk(40, 100)])
    const data = buildRadarData(mk(100, 50), fleet)
    expect(data).toHaveLength(2)
    expect(data[0]).toMatchObject({ axis: 'إنتاجية', worker: 100, fleet: 60 })
  })

  it('defaults fleet to 50 when missing', () => {
    const data = buildRadarData(mk(100, 50), null)
    expect(data[0].fleet).toBe(50)
  })
})

describe('detectWorkerAnomalies', () => {
  const W = { id: 'w1', name: 'أحمد' }

  it('flags duplicate days', () => {
    const a = detectWorkerAnomalies(W, { workDays: [
      { employee_id: 'w1', date: '2026-06-01', project_id: 'p1', status: 'approved', amount: 100 },
      { employee_id: 'w1', date: '2026-06-01', project_id: 'p1', status: 'approved', amount: 100 },
    ], today: TODAY })
    expect(a.some(x => x.type === 'duplicate' && x.severity === 'high')).toBe(true)
  })

  it('flags advances exceeding earned', () => {
    const a = detectWorkerAnomalies(W, {
      workDays: [{ employee_id: 'w1', date: '2026-06-01', status: 'approved', amount: 100 }],
      advances: [{ employee_id: 'w1', amount: 500 }],
      today: TODAY,
    })
    expect(a.some(x => x.type === 'over_advance' && x.severity === 'high')).toBe(true)
  })

  it('flags long inactivity', () => {
    const a = detectWorkerAnomalies(W, {
      workDays: [{ employee_id: 'w1', date: '2026-05-01', status: 'approved', amount: 100 }],
      today: TODAY,
    })
    expect(a.some(x => x.type === 'inactive')).toBe(true)
  })

  it('flags amount outliers vs median', () => {
    const wd = [
      { employee_id: 'w1', date: '2026-06-01', status: 'approved', amount: 100 },
      { employee_id: 'w1', date: '2026-06-02', status: 'approved', amount: 100 },
      { employee_id: 'w1', date: '2026-06-03', status: 'approved', amount: 100 },
      { employee_id: 'w1', date: '2026-06-04', status: 'approved', amount: 1000 },
    ]
    const a = detectWorkerAnomalies(W, { workDays: wd, today: TODAY })
    expect(a.some(x => x.type === 'amount_outlier')).toBe(true)
  })

  it('returns empty for a clean worker', () => {
    const a = detectWorkerAnomalies(W, {
      workDays: [{ employee_id: 'w1', date: toRecent(2), status: 'approved', amount: 300 }],
      today: TODAY,
    })
    expect(a).toHaveLength(0)
  })

  it('sorts high severity first', () => {
    const a = detectWorkerAnomalies(W, {
      workDays: [
        { employee_id: 'w1', date: '2026-05-01', status: 'approved', amount: 100 },
        { employee_id: 'w1', date: '2026-05-01', project_id: 'p1', status: 'approved', amount: 100 },
        { employee_id: 'w1', date: '2026-05-01', project_id: 'p1', status: 'approved', amount: 100 },
      ],
      today: TODAY,
    })
    expect(a[0].severity).toBe('high')
  })
})

function toRecent(daysAgo) {
  const d = new Date(TODAY); d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

describe('buildWorkerTimeline', () => {
  const W = { id: 'w1' }
  const data = {
    workDays: [{ id: 1, employee_id: 'w1', date: '2026-06-01', amount: 300, status: 'approved', project_id: 'p1' }],
    payments: [{ id: 2, employee_id: 'w1', date: '2026-06-03', amount: 500, method: 'كاش' }],
    advances: [{ id: 3, employee_id: 'w1', date: '2026-06-02', amount: 100 }],
    expenses: [{ id: 4, employee_id: 'w1', date: '2026-05-30', amount: 50, category: 'مواد' }],
    projects: [{ id: 'p1', name: 'فيلا' }],
  }

  it('merges all event kinds sorted newest first', () => {
    const tl = buildWorkerTimeline(W, data)
    expect(tl).toHaveLength(4)
    expect(tl[0].date).toBe('2026-06-03')
    expect(tl[tl.length - 1].date).toBe('2026-05-30')
  })

  it('assigns sign and resolves project name', () => {
    const tl = buildWorkerTimeline(W, data)
    expect(tl.find(e => e.kind === 'payment').sign).toBe(-1)
    expect(tl.find(e => e.kind === 'workday').title).toBe('فيلا')
    expect(tl.find(e => e.kind === 'workday').sign).toBe(+1)
  })

  it('respects the limit', () => {
    expect(buildWorkerTimeline(W, data, { limit: 2 })).toHaveLength(2)
  })
})

describe('buildFleetLeaderboard', () => {
  const employees = [
    { id: 'a', name: 'علي' }, { id: 'b', name: 'سامي' }, { id: 'c', name: 'خالد' }, { id: 'd', name: 'نور' },
  ]
  const dnaMap = { a: { score: 70 }, b: { score: 90 }, c: { score: 50 }, d: { score: 0 } }
  const statsMap = { a: { earned: 1000, days: 5 }, b: { earned: 2000, days: 8 }, c: { earned: 500, days: 3 }, d: { earned: 0, days: 0 } }

  it('ranks by score and assigns medals to top 3', () => {
    const lb = buildFleetLeaderboard(employees, dnaMap, statsMap)
    expect(lb.map(r => r.name)).toEqual(['سامي', 'علي', 'خالد'])  // نور مستبعد (لا أيام)
    expect(lb[0].medal).toBe('gold')
    expect(lb[1].medal).toBe('silver')
    expect(lb[2].medal).toBe('bronze')
    expect(lb[0].rank).toBe(1)
  })

  it('excludes workers with no activity', () => {
    const lb = buildFleetLeaderboard(employees, dnaMap, statsMap)
    expect(lb.find(r => r.id === 'd')).toBeUndefined()
  })
})
