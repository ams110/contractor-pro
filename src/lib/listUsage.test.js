import { describe, it, expect } from 'vitest'
import { computeListUsage } from './listUsage.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات استخدام القوائم — ربط العناصر ببياناتها الحقيقية وترتيبها.
// ════════════════════════════════════════════════════════════════════════════

describe('computeListUsage', () => {
  it('يعدّ استخدام كل عنصر ويرتّب تنازلياً', () => {
    const r = computeListUsage(
      ['بناء', 'كهرباء', 'سباكة'],
      [{ specialty: 'بناء' }, { specialty: 'بناء' }, { specialty: 'كهرباء' }],
      { countKey: 'specialty' }
    )
    expect(r.rows[0]).toMatchObject({ label: 'بناء', count: 2 })
    expect(r.rows[1].label).toBe('كهرباء')
    expect(r.used).toBe(2)           // سباكة غير مستخدمة
    expect(r.total).toBe(3)
    expect(r.maxCount).toBe(2)
  })

  it('يجمع المبالغ عند تمرير amountKey', () => {
    const r = computeListUsage(
      ['وقود', 'مواد'],
      [{ category: 'وقود', amount: 300 }, { category: 'وقود', amount: 200 }, { category: 'مواد', amount: 1000 }],
      { countKey: 'category', amountKey: 'amount' }
    )
    const fuel = r.rows.find(x => x.label === 'وقود')
    expect(fuel.amount).toBe(500)
    expect(r.totalAmount).toBe(1500)
    // الترتيب حسب العدد أولاً: وقود (2) قبل مواد (1)
    expect(r.rows[0].label).toBe('وقود')
  })

  it('عنصر غير مستخدم = صفر، ويتعامل مع قوائم فارغة', () => {
    const r = computeListUsage(['كاش', 'شيك'], [], { countKey: 'method' })
    expect(r.used).toBe(0)
    expect(r.maxCount).toBe(1)        // لا قسمة على صفر
    expect(r.totalCount).toBe(0)
    expect(computeListUsage().rows).toEqual([])
  })

  it('يتجاهل السجلات بقيم خارج القائمة', () => {
    const r = computeListUsage(['بناء'], [{ specialty: 'نجارة' }, { specialty: 'بناء' }], { countKey: 'specialty' })
    expect(r.rows[0].count).toBe(1)
  })
})
