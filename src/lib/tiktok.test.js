import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ttPage, ttTrack, ttIdentify, ttEventId, ttTrackBoth } from './tiktok.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات TikTok Pixel helper — السلوك الصامت بلا ttq + دمج client/server.
// نستخدم globalThis للـwindow (لا نعتمد على jsdom — التطبيق ما عنده deps DOM
// للاختبارات حسب نمط `helpers.test.js`/`whatsapp.test.js`).
// ════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  // shim window على globalThis للاختبار (لا jsdom)
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis
  delete globalThis.window.ttq
})

afterEach(() => {
  delete globalThis.window?.ttq
})

describe('ttq guard (silent when pixel script missing)', () => {
  it('ttPage يصمت إن لم يكن ttq موجوداً', () => {
    expect(() => ttPage()).not.toThrow()
  })
  it('ttTrack يصمت إن لم يكن ttq موجوداً', () => {
    expect(() => ttTrack('Lead', { content_name: 'x' })).not.toThrow()
  })
  it('ttIdentify يصمت إن لم يكن ttq موجوداً', () => {
    expect(() => ttIdentify({ email: 'a@b.com' })).not.toThrow()
  })
})

describe('ttq calls (when pixel script loaded)', () => {
  beforeEach(() => {
    globalThis.window.ttq = { page: vi.fn(), track: vi.fn(), identify: vi.fn() }
  })

  it('ttPage يستدعي ttq.page()', () => {
    ttPage()
    expect(globalThis.window.ttq.page).toHaveBeenCalledOnce()
  })
  it('ttTrack يمرّر اسم الحدث والـparams', () => {
    ttTrack('Lead', { content_name: 'signup', currency: 'ILS' })
    expect(globalThis.window.ttq.track).toHaveBeenCalledWith('Lead', { content_name: 'signup', currency: 'ILS' })
  })
  it('ttTrack يمرّر كائن فارغ افتراضياً', () => {
    ttTrack('PageView')
    expect(globalThis.window.ttq.track).toHaveBeenCalledWith('PageView', {})
  })
  it('ttIdentify يمرّر بيانات المستخدم', () => {
    ttIdentify({ email: 'a@b.com' })
    expect(globalThis.window.ttq.identify).toHaveBeenCalledWith({ email: 'a@b.com' })
  })
  it('ttTrack يبتلع الأخطاء بدل ما يكسر التطبيق', () => {
    globalThis.window.ttq.track = vi.fn(() => { throw new Error('boom') })
    expect(() => ttTrack('Lead')).not.toThrow()
  })
})

describe('ttEventId', () => {
  it('يولّد معرّفاً غير فارغ في كل استدعاء', () => {
    const a = ttEventId()
    const b = ttEventId()
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
  })
})

describe('ttTrackBoth deduplication', () => {
  beforeEach(() => {
    globalThis.window.ttq = { track: vi.fn() }
  })

  it('يحترم event_id ممرّر مسبقاً (deduplication)', () => {
    const customId = 'my-fixed-event-id-123'
    const returnedId = ttTrackBoth('Lead', { event_id: customId, properties: { content_name: 'x' } })
    expect(returnedId).toBe(customId)
    expect(globalThis.window.ttq.track).toHaveBeenCalledWith('Lead', expect.objectContaining({
      event_id: customId,
      content_name: 'x',
    }))
  })

  it('يطلق client بـevent_id ويعيد نفس الـid (السيرفر يحصل عليه بالخلفية)', () => {
    const id = ttTrackBoth('CompleteRegistration', { properties: { content_name: 'signup' } })
    expect(id).toBeTruthy()
    expect(globalThis.window.ttq.track).toHaveBeenCalledWith('CompleteRegistration', expect.objectContaining({
      content_name: 'signup',
      event_id: id,
    }))
  })

  it('يولّد event_id جديد عند كل استدعاء بدون id ممرّر', () => {
    const a = ttTrackBoth('Lead')
    const b = ttTrackBoth('Lead')
    expect(a).not.toBe(b)
  })
})
