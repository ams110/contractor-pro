import { describe, it, expect } from 'vitest'
import { normalizePhone, waUrl, waMessages } from './whatsapp.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات مشاركة WhatsApp — تطبيع الأرقام وبناء الروابط والقوالب.
// ════════════════════════════════════════════════════════════════════════════

describe('normalizePhone', () => {
  it('يحوّل الرقم المحلي 05x إلى الصيغة الدولية 9725x', () => {
    expect(normalizePhone('0501234567')).toBe('972501234567')
  })
  it('يتجاهل المسافات والشرطات والرموز', () => {
    expect(normalizePhone('050-123 4567')).toBe('972501234567')
    expect(normalizePhone('(050) 123-4567')).toBe('972501234567')
  })
  it('يبقي الرقم الدولي 972 كما هو', () => {
    expect(normalizePhone('972501234567')).toBe('972501234567')
  })
  it('يدعم البادئة + الدولية', () => {
    expect(normalizePhone('+972501234567')).toBe('972501234567')
    expect(normalizePhone('+1 202 555 0143')).toBe('12025550143')
  })
  it('يدعم البادئة 00 الدولية', () => {
    expect(normalizePhone('00972501234567')).toBe('972501234567')
  })
  it('يضيف 972 لرقم محلي بدون صفر بادئ (9 خانات يبدأ بـ 5)', () => {
    expect(normalizePhone('501234567')).toBe('972501234567')
  })
  it('يرجّع null للفارغ أو غير الصالح', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
  })
})

describe('waUrl', () => {
  it('يبني رابط wa.me مع الرقم والنص المُرمّز', () => {
    const url = waUrl('0501234567', 'مرحبا')
    expect(url).toContain('https://wa.me/972501234567')
    expect(url).toContain('?text=')
    expect(url).toContain(encodeURIComponent('مرحبا'))
  })
  it('بدون رقم يفتح واتساب لاختيار المستلم', () => {
    expect(waUrl('', 'hi')).toBe('https://wa.me/?text=hi')
  })
  it('بدون نص لا يضيف بارامتر text', () => {
    expect(waUrl('0501234567')).toBe('https://wa.me/972501234567')
  })
})

describe('waMessages', () => {
  it('portalInvite يتضمّن الاسم والرابط', () => {
    const msg = waMessages.portalInvite({ workerName: 'أحمد', url: 'https://x.com/?portal' })
    expect(msg).toContain('أحمد')
    expect(msg).toContain('https://x.com/?portal')
  })
  it('portalInvite يضيف بيانات الدخول عند توفّرها فقط', () => {
    expect(waMessages.portalInvite({ url: 'u', username: 'ahmad' })).toContain('اسم المستخدم: ahmad')
    expect(waMessages.portalInvite({ url: 'u' })).not.toContain('اسم المستخدم')
  })
  it('workerStatement يميّز بين متبقٍ ودفع زائد', () => {
    expect(waMessages.workerStatement({ balance: 500 })).toContain('المتبقي لك')
    expect(waMessages.workerStatement({ balance: -200 })).toContain('دفعت زيادة')
  })
  it('paymentReminder يتضمّن المشروع والمبلغ', () => {
    const msg = waMessages.paymentReminder({ clientName: 'سامي', projectName: 'فيلا', amount: 12000 })
    expect(msg).toContain('سامي')
    expect(msg).toContain('فيلا')
    expect(msg).toContain('12,000')
  })
})
