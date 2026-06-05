import { describe, it, expect } from 'vitest'
import { computeAccountReadiness, readinessGrade, clamp } from './accountReadiness.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات جاهزية الحساب — المؤشّر، البنود الناقصة، والترتيب حسب الأهمية.
// ════════════════════════════════════════════════════════════════════════════

describe('readinessGrade', () => {
  it('يطابق النبرة عند الحدود', () => {
    expect(readinessGrade(90).tone).toBe('excellent')
    expect(readinessGrade(60).tone).toBe('good')
    expect(readinessGrade(35).tone).toBe('fair')
    expect(readinessGrade(10).tone).toBe('weak')
  })
})

describe('computeAccountReadiness', () => {
  it('حساب فارغ تماماً = صفر وكل البنود ناقصة', () => {
    const r = computeAccountReadiness({})
    expect(r.score).toBe(0)
    expect(r.doneCount).toBe(0)
    expect(r.missing).toHaveLength(r.total)
    expect(r.tone).toBe('weak')
  })

  it('حساب مكتمل = 100 وبلا نواقص', () => {
    const r = computeAccountReadiness({
      displayName: 'شركة الإعمار', hasAvatar: true, contractorNumber: '512345678',
      pensionMonthly: 1500, hasPasskey: true, notifGranted: true, dailySpendLimit: 5000,
    })
    expect(r.score).toBe(100)
    expect(r.missing).toHaveLength(0)
    expect(r.tone).toBe('excellent')
    expect(r.label).toBe('جاهز')
  })

  it('يجمع الأوزان بشكل صحيح (اسم 15 + بصمة 25 = 40)', () => {
    const r = computeAccountReadiness({ displayName: 'أحمد', hasPasskey: true })
    expect(r.score).toBe(40)
    expect(r.doneCount).toBe(2)
  })

  it('البنود الحرجة (بصمة/حد صرف) تتصدّر قائمة النواقص', () => {
    const r = computeAccountReadiness({ displayName: 'أحمد', hasAvatar: true })
    // الناقص يشمل passkey و spendLimit (حرجة) — لازم يكونوا بالأوائل
    expect(r.missing[0].critical).toBe(true)
    const criticalKeys = r.missing.filter(m => m.critical).map(m => m.key)
    expect(criticalKeys).toContain('passkey')
    expect(criticalKeys).toContain('spendLimit')
  })

  it('پنسيه = صفر تُعتبر ناقصة، وموجبة تُعتبر مكتملة', () => {
    expect(computeAccountReadiness({ pensionMonthly: 0 }).items.find(i => i.key === 'pension').done).toBe(false)
    expect(computeAccountReadiness({ pensionMonthly: 800 }).items.find(i => i.key === 'pension').done).toBe(true)
  })

  it('clamp يحصر النتيجة', () => {
    expect(clamp(120)).toBe(100)
    expect(clamp(-5)).toBe(0)
  })
})
