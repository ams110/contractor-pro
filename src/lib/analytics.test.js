import { describe, it, expect } from 'vitest'
import { isGranted, GA_ID } from './analytics.js'

describe('analytics consent', () => {
  it('grants only for the exact "granted" value', () => {
    expect(isGranted('granted')).toBe(true)
  })

  it('does not grant for denied, empty, or legacy timestamp values', () => {
    expect(isGranted('denied')).toBe(false)
    expect(isGranted(null)).toBe(false)
    expect(isGranted(undefined)).toBe(false)
    expect(isGranted('')).toBe(false)
    // قيمة قديمة من المفتاح السابق (ISO timestamp) لا تُعدّ موافقة على التحليلات
    expect(isGranted('2026-06-15T03:00:00.000Z')).toBe(false)
  })

  it('exposes a configured GA4 measurement id', () => {
    expect(GA_ID).toMatch(/^G-[A-Z0-9]+$/)
  })
})
