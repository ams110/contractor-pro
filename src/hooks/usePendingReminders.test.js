import { describe, it, expect } from 'vitest'
import { countStalePending } from './usePendingReminders.js'

const NOW = new Date('2026-07-03T12:00:00Z').getTime()
const hoursAgo = h => new Date(NOW - h * 3600_000).toISOString()

describe('countStalePending', () => {
  it('يعدّ المعلّق الأقدم من 24 ساعة فقط', () => {
    const res = countStalePending({
      workDays: [
        { status: 'pending', created_at: hoursAgo(30) },   // قديم ✓
        { status: 'pending', created_at: hoursAgo(2) },    // جديد ✗
        { status: 'approved', created_at: hoursAgo(50) },  // مش معلق ✗
      ],
      expenses: [{ status: 'pending', created_at: hoursAgo(25) }],
      payments: [{ status: 'pending', created_at: null }], // بلا تاريخ ✗
    }, NOW)
    expect(res.days).toBe(1)
    expect(res.exp).toBe(1)
    expect(res.pay).toBe(0)
    expect(res.total).toBe(2)
  })

  it('بلا معلّقات → صفر', () => {
    expect(countStalePending({}, NOW).total).toBe(0)
  })
})
