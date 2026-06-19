import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  trackCtaClick, trackViewPricing, trackBeginCheckout,
  trackSignUp, trackLogin, trackPurchase, trackDemoView, identifyUser, CURRENCY,
} from './track.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات الطبقة الموحّدة — تتحقّق أنّ كل دالة قمع تطلق على القناتين:
//   • Google Analytics 4 — عبر window.dataLayer (gtag يدفع arguments)
//   • TikTok Pixel        — عبر window.ttq.track
// نستخدم globalThis.window shim (لا jsdom) على نمط tiktok.test.js.
// ════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis
  globalThis.window.dataLayer = []
  globalThis.window.ttq = { track: vi.fn(), identify: vi.fn(), page: vi.fn() }
})

afterEach(() => {
  delete globalThis.window?.ttq
  delete globalThis.window?.dataLayer
})

/** أحداث GA4 المدفوعة (gtag('event', name, params)) كمصفوفات. */
function gaEvents() {
  return (globalThis.window.dataLayer || [])
    .map(a => Array.from(a))
    .filter(a => a[0] === 'event')
}
function gaEventNames() {
  return gaEvents().map(a => a[1])
}
const ttCalls = () => globalThis.window.ttq.track.mock.calls

describe('CURRENCY', () => {
  it('العملة شيكل (ILS) — لازم لحساب ROAS', () => {
    expect(CURRENCY).toBe('ILS')
  })
})

describe('trackCtaClick — القناتان', () => {
  it('يطلق GA cta_click + TikTok ClickButton', () => {
    trackCtaClick('landing_hero')
    expect(gaEventNames()).toContain('cta_click')
    expect(ttCalls()).toContainEqual(['ClickButton', expect.objectContaining({ content_name: 'landing_hero' })])
  })
})

describe('trackViewPricing — القناتان', () => {
  it('يطلق GA view_item_list + TikTok ViewContent', () => {
    trackViewPricing('year')
    expect(gaEventNames()).toContain('view_item_list')
    expect(ttCalls()).toContainEqual(['ViewContent', expect.objectContaining({ content_name: 'pricing_page' })])
  })
})

describe('trackDemoView — القناتان', () => {
  it('يطلق GA demo_view + TikTok ViewContent(demo)', () => {
    trackDemoView()
    expect(gaEventNames()).toContain('demo_view')
    expect(ttCalls()).toContainEqual(['ViewContent', expect.objectContaining({ content_category: 'demo' })])
  })
})

describe('trackBeginCheckout — القناتان مع value', () => {
  it('يطلق GA begin_checkout + TikTok InitiateCheckout بنفس القيمة والعملة', () => {
    trackBeginCheckout({ plan: 'pro', cycle: 'month', value: 249 })
    const ga = gaEvents().find(a => a[1] === 'begin_checkout')
    expect(ga[2]).toMatchObject({ currency: 'ILS', value: 249 })
    expect(ttCalls()).toContainEqual(['InitiateCheckout', expect.objectContaining({
      content_name: 'pro', content_type: 'month', currency: 'ILS', value: 249,
    })])
  })
})

describe('trackSignUp — تسجيل (القناتان + بيانات هوية)', () => {
  it('يطلق GA sign_up + generate_lead وTikTok CompleteRegistration + Lead', () => {
    trackSignUp({ email: 'a@b.com', userId: 'u1' })
    const names = gaEventNames()
    expect(names).toContain('sign_up')
    expect(names).toContain('generate_lead')
    const ttEvents = ttCalls().map(c => c[0])
    expect(ttEvents).toContain('CompleteRegistration')
    expect(ttEvents).toContain('Lead')
  })

  it('يطلق تحويل Google Ads conversion_event_signup', () => {
    trackSignUp({ email: 'a@b.com', userId: 'u1' })
    expect(gaEventNames()).toContain('conversion_event_signup')
  })
})

describe('trackLogin — GA فقط (ليس حدث تحويل إعلاني)', () => {
  it('يطلق GA login ولا يطلق أي حدث على TikTok', () => {
    trackLogin('password')
    const ga = gaEvents().find(a => a[1] === 'login')
    expect(ga[2]).toMatchObject({ method: 'password' })
    expect(ttCalls()).toHaveLength(0)
  })
})

describe('trackPurchase — شراء (القناتان مع value)', () => {
  it('يطلق GA purchase + TikTok CompletePayment', () => {
    trackPurchase({ plan: 'business', cycle: 'year', value: 4990, email: 'a@b.com', userId: 'u1' })
    const ga = gaEvents().find(a => a[1] === 'purchase')
    expect(ga[2]).toMatchObject({ currency: 'ILS', value: 4990 })
    expect(ttCalls().map(c => c[0])).toContain('CompletePayment')
  })
})

describe('identifyUser — آمن مع/بدون مستخدم', () => {
  it('لا يرمي مع مستخدم', () => {
    expect(() => identifyUser({ id: 'u1', email: 'a@b.com' })).not.toThrow()
    expect(globalThis.window.ttq.identify).toHaveBeenCalled()
  })
  it('لا يرمي مع null (تسجيل خروج)', () => {
    expect(() => identifyUser(null)).not.toThrow()
  })
})
