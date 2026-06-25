import { describe, it, expect } from 'vitest'
import { parseAttribution, referrerSource, attributionForSignup } from './attribution.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات إسناد التسويق — استخراج المصدر من UTM/معرّفات النقر/المُحيل.
// (الدوال النقيّة فقط؛ captureAttribution/getAttribution تعتمدان localStorage.)
// ════════════════════════════════════════════════════════════════════════════

describe('parseAttribution — UTM صريح', () => {
  it('يقرأ كل حقول UTM الخمسة', () => {
    const a = parseAttribution('?utm_source=tiktok&utm_medium=cpc&utm_campaign=haj&utm_content=v2&utm_term=mistool')
    expect(a.source).toBe('tiktok')
    expect(a.medium).toBe('cpc')
    expect(a.campaign).toBe('haj')
    expect(a.content).toBe('v2')
    expect(a.term).toBe('mistool')
  })

  it('UTM يغلب على معرّف النقر عند وجود الاثنين', () => {
    const a = parseAttribution('?utm_source=newsletter&ttclid=ABC123')
    expect(a.source).toBe('newsletter')
    expect(a.clickId).toBe('ABC123')
    expect(a.clickType).toBe('ttclid')
  })
})

describe('parseAttribution — معرّفات النقر بلا UTM', () => {
  it('ttclid → tiktok', () => {
    const a = parseAttribution('?ttclid=XYZ')
    expect(a.source).toBe('tiktok')
    expect(a.clickType).toBe('ttclid')
  })
  it('gclid → google', () => {
    const a = parseAttribution('?gclid=G-1')
    expect(a.source).toBe('google')
    expect(a.clickType).toBe('gclid')
  })
  it('fbclid → facebook', () => {
    const a = parseAttribution('?fbclid=F-1')
    expect(a.source).toBe('facebook')
    expect(a.clickType).toBe('fbclid')
  })
})

describe('parseAttribution — تحليل المُحيل (عضوي)', () => {
  it('بلا UTM وبلا نقر → يصنّف من المُحيل', () => {
    expect(parseAttribution('', 'https://www.tiktok.com/@x').source).toBe('tiktok')
  })
  it('بلا أي إشارة → direct', () => {
    const a = parseAttribution('', '')
    expect(a.source).toBe('direct')
    expect(a.clickId).toBeNull()
  })
})

describe('referrerSource', () => {
  it('يكشف المنصّات المعروفة', () => {
    expect(referrerSource('https://www.tiktok.com/foo')).toBe('tiktok')
    expect(referrerSource('https://www.google.com/search')).toBe('google')
    expect(referrerSource('https://m.facebook.com/')).toBe('facebook')
    expect(referrerSource('https://wa.me/123')).toBe('whatsapp')
  })
  it('فارغ → direct', () => {
    expect(referrerSource('')).toBe('direct')
    expect(referrerSource()).toBe('direct')
  })
})

describe('attributionForSignup', () => {
  it('يرجّع {} بأمان لمّا ما في إسناد مخزّن (بيئة بلا localStorage)', () => {
    // في Vitest الافتراضي ما في localStorage → آمن، يرجّع كائن فاضي قابل للـspread.
    expect(attributionForSignup()).toEqual({})
  })
})
