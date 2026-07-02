import { describe, it, expect, beforeEach, vi } from 'vitest'
import { enqueue, flush, queueCount, failedCount, isNetworkError, newRowId, MAX_QUEUE } from './offlineQueue.js'

// mock للـ store حتى لا نجرّ Zustand/i18n كاملة
vi.mock('../store/useAppStore.js', () => ({
  useAppStore: { getState: () => ({ setQueueCount: () => {} }) },
}))

const UID = 'user-a'

// بيئة vitest هنا node — نوفّر localStorage/navigator بسيطين
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
}
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = {}

function mockSupabase(responder) {
  return { from: (table) => ({ insert: (rows) => Promise.resolve(responder(table, rows)) }) }
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('newRowId', () => {
  it('يولّد uuid صالح', () => {
    expect(newRowId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})

describe('isNetworkError', () => {
  it('يلتقط أخطاء fetch الشبكية', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('Load failed'))).toBe(true)
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource'))).toBe(true)
  })
  it('لا يلتقط أخطاء التحقق/RLS', () => {
    expect(isNetworkError(new Error('duplicate key value violates unique constraint'))).toBe(false)
    expect(isNetworkError({ message: 'new row violates row-level security policy' })).toBe(false)
  })
  it('navigator.onLine=false يعني شبكي دائماً', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    expect(isNetworkError(new Error('anything'))).toBe(true)
  })
})

describe('enqueue / queueCount', () => {
  it('FIFO لكل مستخدم على حدة', () => {
    enqueue(UID, 'work_days', [{ id: '1' }])
    enqueue(UID, 'expenses', [{ id: '2' }])
    enqueue('user-b', 'work_days', [{ id: '3' }])
    expect(queueCount(UID)).toBe(2)
    expect(queueCount('user-b')).toBe(1)
    expect(queueCount(undefined)).toBe(0)
  })
  it('يرمي عند الامتلاء', () => {
    for (let i = 0; i < MAX_QUEUE; i++) enqueue(UID, 'work_days', [{ id: String(i) }])
    expect(() => enqueue(UID, 'work_days', [{ id: 'overflow' }])).toThrow()
  })
})

describe('flush', () => {
  it('يصرّف الكل عند النجاح ويعدّ الصفوف', async () => {
    enqueue(UID, 'work_days', [{ id: 'a' }, { id: 'b' }])
    enqueue(UID, 'expenses', [{ id: 'c' }])
    const res = await flush(mockSupabase(() => ({ error: null })), UID)
    expect(res).toEqual({ synced: 3, failed: 0, remaining: 0 })
    expect(queueCount(UID)).toBe(0)
  })

  it('23505 (سبق ووصل) يُعامل كنجاح — dedupe', async () => {
    enqueue(UID, 'work_days', [{ id: 'dup' }])
    const res = await flush(mockSupabase(() => ({ error: { code: '23505', message: 'duplicate key' } })), UID)
    expect(res.synced).toBe(1)
    expect(queueCount(UID)).toBe(0)
  })

  it('خطأ شبكي يوقف ويحتفظ بالباقي بالترتيب', async () => {
    enqueue(UID, 'work_days', [{ id: 'first' }])
    enqueue(UID, 'work_days', [{ id: 'second' }])
    let call = 0
    const res = await flush(mockSupabase(() => {
      call++
      return call === 1 ? { error: null } : { error: new TypeError('Failed to fetch') }
    }), UID)
    expect(res.synced).toBe(1)
    expect(res.remaining).toBe(1)
    expect(queueCount(UID)).toBe(1)
  })

  it('خطأ دائم → للقائمة الفاشلة ويُكمل الباقي', async () => {
    enqueue(UID, 'work_days', [{ id: 'bad' }])
    enqueue(UID, 'work_days', [{ id: 'good' }])
    let call = 0
    const res = await flush(mockSupabase(() => {
      call++
      return call === 1 ? { error: { message: 'violates row-level security' } } : { error: null }
    }), UID)
    expect(res.failed).toBe(1)
    expect(res.synced).toBe(1)
    expect(queueCount(UID)).toBe(0)
    expect(failedCount(UID)).toBe(1)
  })

  it('بلا مستخدم = لا شيء', async () => {
    const res = await flush(mockSupabase(() => ({ error: null })), undefined)
    expect(res.synced).toBe(0)
  })
})
