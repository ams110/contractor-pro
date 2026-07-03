import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanStore, setPlanInfo, planHasFeature, workerLimitFor } from './usePlanStore.js'

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

  it('باقة معلّم → فوق free وتحت starter', () => {
    setPlanInfo({ plan: 'maalem', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('maalem')).toBe(true)
    expect(planHasFeature('free')).toBe(true)
    expect(planHasFeature('starter')).toBe(false)
    expect(planHasFeature('pro')).toBe(false)
  })

  it('خطة مجهولة → تسقط لـ free (كل شي مقفل)', () => {
    setPlanInfo({ plan: 'weird_plan', trialActive: false, paddleEnabled: true })
    expect(planHasFeature('maalem')).toBe(false)
    expect(planHasFeature('starter')).toBe(false)
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

describe('workerLimitFor', () => {
  it('خلال التجربة المجانية → عامل واحد', () => {
    expect(workerLimitFor({ plan: 'free', trialActive: true })).toBe(1)
  })

  it('خطة Starter → 10 عمّال', () => {
    expect(workerLimitFor({ plan: 'starter', trialActive: false })).toBe(10)
  })

  it('باقة معلّم → صفر عمّال (باقة فردية بلا ميزات عمال)', () => {
    expect(workerLimitFor({ plan: 'maalem', trialActive: false })).toBe(0)
    // حتى خلال التجربة: مين اختار خطة معلّم اختار بلا عمال
    expect(workerLimitFor({ plan: 'maalem', trialActive: true })).toBe(0)
  })

  it('خطة Pro → غير محدود', () => {
    expect(workerLimitFor({ plan: 'pro', trialActive: false })).toBe(Infinity)
  })

  it('خطة Business → غير محدود', () => {
    expect(workerLimitFor({ plan: 'business', trialActive: false })).toBe(Infinity)
  })
})
