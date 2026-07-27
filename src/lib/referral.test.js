import { describe, it, expect } from 'vitest'
import { normalizeRefCode, referralShareUrl } from './referral.js'

describe('normalizeRefCode', () => {
  it('يقبل كوداً صالحاً ويحوّله uppercase', () => {
    expect(normalizeRefCode('ab3xk9')).toBe('AB3XK9')
    expect(normalizeRefCode(' XK42MN ')).toBe('XK42MN')
  })
  it('يرفض الفاضي والمشبوه', () => {
    expect(normalizeRefCode('')).toBe(null)
    expect(normalizeRefCode(null)).toBe(null)
    expect(normalizeRefCode('ab')).toBe(null)                    // قصير
    expect(normalizeRefCode('x'.repeat(20))).toBe(null)          // طويل
    expect(normalizeRefCode('<script>')).toBe(null)              // محارف غريبة
    expect(normalizeRefCode('AB 3XK9')).toBe(null)               // فراغ داخلي
  })
})

describe('referralShareUrl', () => {
  it('يبني الرابط بالكود', () => {
    expect(referralShareUrl('AB3XK9', 'https://kabblan.com')).toBe('https://kabblan.com/?ref=AB3XK9')
  })
})
