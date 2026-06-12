import { describe, it, expect, beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'

// polyfills للبيئة node (vitest): localStorage بسيط + WebCrypto
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto
const store = {}
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
}

const { savePinPayload, readPinPayload, verifyPin, hasPin, clearPin } = await import('./pinCrypto.js')

describe('pinCrypto', () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k] })

  it('round-trips الحمولة بنفس الـ PIN', async () => {
    await savePinPayload('1234', { refresh_token: 'rt', access_token: 'at' })
    expect(hasPin()).toBe(true)
    const out = await readPinPayload('1234')
    expect(out).toEqual({ refresh_token: 'rt', access_token: 'at' })
  })

  it('لا يخزّن البريد بنصّ صريح ولا hash منفصل', async () => {
    await savePinPayload('1234', { refresh_token: 'rt', email: 'should-not-leak@x.co' })
    expect(localStorage.getItem('cpro_pin_hash')).toBeNull()
    expect(localStorage.getItem('cpro_pin_email')).toBeNull()
    // البيانات المخزّنة مشفّرة — لا تحتوي النصّ الصريح
    expect(localStorage.getItem('cpro_pin_creds')).not.toContain('should-not-leak')
  })

  it('يرفع WRONG_PIN عند رقم خاطئ', async () => {
    await savePinPayload('1234', { refresh_token: 'rt' })
    await expect(readPinPayload('9999')).rejects.toThrow('WRONG_PIN')
  })

  it('يقفل ويمسح البيانات بعد 5 محاولات خاطئة', async () => {
    await savePinPayload('1234', { refresh_token: 'rt' })
    for (let i = 0; i < 4; i++) {
      await expect(readPinPayload('0000')).rejects.toThrow('WRONG_PIN')
    }
    // المحاولة الخامسة → قفل + مسح
    await expect(readPinPayload('0000')).rejects.toThrow('PIN_LOCKED')
    expect(hasPin()).toBe(false)
  })

  it('عدّاد الفشل يُصفَّر عند نجاح', async () => {
    await savePinPayload('1234', { refresh_token: 'rt' })
    await expect(readPinPayload('0000')).rejects.toThrow('WRONG_PIN')
    await expect(readPinPayload('0000')).rejects.toThrow('WRONG_PIN')
    await verifyPin('1234') // نجاح يُصفّر
    // نقدر نفشل 4 مرّات إضافية بلا قفل
    for (let i = 0; i < 4; i++) {
      await expect(readPinPayload('0000')).rejects.toThrow('WRONG_PIN')
    }
    expect(hasPin()).toBe(true)
  })

  it('clearPin يمسح كل المفاتيح', async () => {
    await savePinPayload('1234', { refresh_token: 'rt' })
    clearPin()
    expect(hasPin()).toBe(false)
    expect(localStorage.getItem('cpro_pin_creds')).toBeNull()
  })
})
