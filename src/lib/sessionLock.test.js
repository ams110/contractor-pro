import { describe, it, expect } from 'vitest'
import {
  hasUnlockMethod,
  idleTimeoutMs,
  lockOnBackgroundEnabled,
  LOCK_ON_BG_KEY,
  PASSKEY_KEY,
} from './sessionLock.js'

describe('hasUnlockMethod — حارس القفل التلقائي', () => {
  it('بصمة فقط → مسموح', () => {
    expect(hasUnlockMethod({ hasPasskey: true, hasPinSet: false })).toBe(true)
  })
  it('PIN فقط → مسموح', () => {
    expect(hasUnlockMethod({ hasPasskey: false, hasPinSet: true })).toBe(true)
  })
  it('الاثنان معاً → مسموح', () => {
    expect(hasUnlockMethod({ hasPasskey: true, hasPinSet: true })).toBe(true)
  })
  it('لا بصمة ولا PIN → ممنوع (حتى لا يعلق المستخدم)', () => {
    expect(hasUnlockMethod({ hasPasskey: false, hasPinSet: false })).toBe(false)
  })
  it('قيم falsy/غائبة → ممنوع', () => {
    expect(hasUnlockMethod({})).toBe(false)
    expect(hasUnlockMethod()).toBe(false)
    expect(hasUnlockMethod({ hasPasskey: '', hasPinSet: 0 })).toBe(false)
  })
})

describe('idleTimeoutMs — مهلة الخمول', () => {
  it('قيمة صالحة → بالمللي ثانية', () => {
    expect(idleTimeoutMs(5)).toBe(5 * 60 * 1000)
    expect(idleTimeoutMs(30)).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs('15')).toBe(15 * 60 * 1000)
  })
  it('غائبة/صفر/سالبة/غير رقمية → افتراضي 30 دقيقة', () => {
    expect(idleTimeoutMs(undefined)).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs(null)).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs(0)).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs(-5)).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs('abc')).toBe(30 * 60 * 1000)
    expect(idleTimeoutMs(NaN)).toBe(30 * 60 * 1000)
  })
})

describe('lockOnBackgroundEnabled — قفل عند الخروج', () => {
  it('مفعّل افتراضياً (غير مضبوط)', () => {
    expect(lockOnBackgroundEnabled(null)).toBe(true)
    expect(lockOnBackgroundEnabled(undefined)).toBe(true)
  })
  it("مفعّل عند '1' أو أي قيمة غير '0'", () => {
    expect(lockOnBackgroundEnabled('1')).toBe(true)
    expect(lockOnBackgroundEnabled('true')).toBe(true)
  })
  it("معطّل فقط عند '0'", () => {
    expect(lockOnBackgroundEnabled('0')).toBe(false)
  })
})

describe('ثوابت المفاتيح', () => {
  it('متطابقة مع المفاتيح المستعملة بالكود', () => {
    expect(LOCK_ON_BG_KEY).toBe('cpro_lock_on_bg')
    expect(PASSKEY_KEY).toBe('cpro_passkey_cred')
  })
})
