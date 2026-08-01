import { describe, it, expect } from 'vitest'
import { alreadyRanToday, dedupSince } from './notifyOnce.js'

describe('alreadyRanToday', () => {
  it('يطابق تاريخ اليوم فقط', () => {
    expect(alreadyRanToday('2026-08-01', '2026-08-01')).toBe(true)
    expect(alreadyRanToday('2026-07-31', '2026-08-01')).toBe(false)
    expect(alreadyRanToday(null, '2026-08-01')).toBe(false)
    expect(alreadyRanToday(undefined, '2026-08-01')).toBe(false)
  })
})

describe('dedupSince', () => {
  const now = new Date(2026, 7, 1, 15, 30) // 1 آب 2026

  it('نطاق اليوم = بداية اليوم', () => {
    expect(dedupSince('day', now)).toBe(`${now.toISOString().slice(0, 10)}T00:00:00`)
  })

  it('نطاق السنة = أول السنة (لتنبيه واحد/عتبة/سنة)', () => {
    expect(dedupSince('year', now)).toBe('2026-01-01T00:00:00')
  })

  it('الافتراضي = يوم', () => {
    expect(dedupSince(undefined, now)).toBe(dedupSince('day', now))
  })
})
