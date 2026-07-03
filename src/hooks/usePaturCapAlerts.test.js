import { describe, it, expect } from 'vitest'
import { paturCapStatus } from './usePaturCapAlerts.js'

const BIZ = { id: 'b1', name: 'مصلحة الاختبار', business_type: 'osek_patur' }
const NOW = new Date('2026-07-03')
const r = (amount, date = '2026-05-01', business_id = 'b1') => ({ amount, date, business_id })

describe('paturCapStatus', () => {
  it('مصلحة غير פטור → null', () => {
    expect(paturCapStatus([r(999999)], { ...BIZ, business_type: 'osek_moreh' }, { now: NOW })).toBe(null)
    expect(paturCapStatus([r(1)], null, { now: NOW })).toBe(null)
  })

  it('تحت 70% → بلا عتبة', () => {
    const s = paturCapStatus([r(50000)], BIZ, { threshold: 122833, now: NOW })
    expect(s.level).toBe(null)
    expect(s.totalYear).toBe(50000)
    expect(s.remaining).toBe(72833)
  })

  it('بين 70% و90% → عتبة 70', () => {
    const s = paturCapStatus([r(90000)], BIZ, { threshold: 122833, now: NOW })
    expect(s.level).toBe(70)
    expect(Math.round(s.pct)).toBe(73)
  })

  it('فوق 90% → عتبة 90 (الأعلى تتقدّم)', () => {
    const s = paturCapStatus([r(120000)], BIZ, { threshold: 122833, now: NOW })
    expect(s.level).toBe(90)
  })

  it('يحسب السنة الحالية فقط', () => {
    const s = paturCapStatus([r(100000, '2025-12-30'), r(10000, '2026-02-01')], BIZ, { threshold: 122833, now: NOW })
    expect(s.totalYear).toBe(10000)
    expect(s.level).toBe(null)
  })

  it('يفلتر حسب المصلحة، ويشمل بلا business_id فقط عند singleBusiness', () => {
    const receipts = [r(60000), r(60000, '2026-05-02', 'b2'), r(30000, '2026-05-03', null)]
    const multi = paturCapStatus(receipts, BIZ, { threshold: 122833, now: NOW })
    expect(multi.totalYear).toBe(60000)
    const single = paturCapStatus(receipts, BIZ, { threshold: 122833, now: NOW, singleBusiness: true })
    expect(single.totalYear).toBe(90000)
  })
})
