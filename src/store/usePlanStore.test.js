import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanStore, setPlanInfo, planHasFeature } from './usePlanStore.js'

// إعادة الحالة لقيمها الأولية قبل كل اختبار
beforeEach(() => {
  usePlanStore.setState({ plan: 'free', trialActive: false, paddleEnabled: false })
})

describe('planHasFeature', () => {
  it('الدفع غير مُفعّل → كل الميزات مفتوحة', () => {
    setPlanInfo({ plan: 'free', trialActive: false, paddleEnabled: false })
    expect(planHasFeature('business')).toBe(true)
    expect(planHasFeature('pro')).toBe(true)
  })

  it('خلال التجربة المجانية → وصول كامل حتى لو الخطة free', () => {
    setPlanInfo({ plan: 'free', trialActive: true, paddleEnabled: true })
    expect(planHasFeature('business')).toBe(true)
    expect(planHasFeature('pro')).toBe(true)
  })

  it('خطة Starter مدفوعة (بلا تجربة) → تفتح starter فقط', () => {
    setPlanInfo({ plan: 'starter', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('starter')).toBe(true)
    expect(planHasFeature('pro')).toBe(false)
    expect(planHasFeature('business')).toBe(false)
  })

  it('خطة Pro → تفتح pro وما دونها، وتقفل business', () => {
    setPlanInfo({ plan: 'pro', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('starter')).toBe(true)
    expect(planHasFeature('pro')).toBe(true)
    expect(planHasFeature('business')).toBe(false)
  })

  it('خطة Business → كل الميزات مفتوحة', () => {
    setPlanInfo({ plan: 'business', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('starter')).toBe(true)
    expect(planHasFeature('pro')).toBe(true)
    expect(planHasFeature('business')).toBe(true)
  })

  it('خطة free مدفوعة الدفع مُفعّل وبلا تجربة → كل شي مقفل', () => {
    setPlanInfo({ plan: 'free', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('starter')).toBe(false)
    expect(planHasFeature('pro')).toBe(false)
  })
})
