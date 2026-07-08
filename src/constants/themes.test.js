import { describe, it, expect, afterEach } from 'vitest'
import { C, GRAD, PALETTES, THEME_META, applyTheme } from './index.js'

afterEach(() => applyTheme('dark'))

describe('نظام الثيمات', () => {
  it('يضم الثيمات الخمسة (داكن + ورشة + 3 شخصيات)', () => {
    expect(Object.keys(PALETTES).sort()).toEqual(['dark', 'emerald', 'royal', 'site', 'steel'])
  })

  it('THEME_META يعرض الثيمات الداكنة فقط (وضع الورشة مفتاح مستقل)', () => {
    expect(THEME_META.map(t => t.id)).toEqual(['dark', 'steel', 'emerald', 'royal'])
    THEME_META.forEach(t => {
      expect(t.ar).toBeTruthy()
      expect(t.swatch).toHaveLength(2)
      expect(PALETTES[t.id]).toBeTruthy()
    })
  })

  it('applyTheme يبدّل ألوان C بالمكان', () => {
    applyTheme('steel')
    expect(C.primary).toBe('#3B82F6')
    expect(C.bg).toBe('#070A12')
    applyTheme('emerald')
    expect(C.primary).toBe('#14B8A6')
    applyTheme('royal')
    expect(C.primary).toBe('#A855F7')
  })

  it('applyTheme يبدّل تدرّجات الهوية (primary/brand/dark) ويحافظ على الوظيفية', () => {
    const successBefore = GRAD.success
    applyTheme('steel')
    expect(GRAD.primary).toContain('#3B82F6')
    expect(GRAD.brand).toBe(GRAD.primary)
    expect(GRAD.dark).toContain('#0C1220')
    expect(GRAD.success).toBe(successBefore)
  })

  it('العودة للداكن ترجع كل القيم الأصلية', () => {
    applyTheme('royal')
    applyTheme('dark')
    expect(C.primary).toBe('#F97316')
    expect(C.bg).toBe('#07080F')
    expect(GRAD.primary).toContain('#F97316')
    expect(GRAD.dark).toContain('#0D0F1C')
  })

  it('ثيم غير معروف يسقط للداكن بأمان', () => {
    applyTheme('nonsense')
    expect(C.primary).toBe('#F97316')
    expect(GRAD.primary).toContain('#F97316')
  })

  it('الدلالات الوظيفية ثابتة بكل الثيمات الداكنة', () => {
    for (const id of ['steel', 'emerald', 'royal']) {
      const p = PALETTES[id]
      expect(p.success).toBe('#22C55E')
      expect(p.accent).toBe('#EF4444')
      expect(p.warning).toBe('#EAB308')
      expect(p.text).toBe('#F8FAFC')
    }
  })

  it('حدود كل ثيم مشتقة من primary الخاص به', () => {
    for (const id of ['steel', 'emerald', 'royal']) {
      const p = PALETTES[id]
      const [r, g, b] = p.primary.slice(1).match(/../g).map(h => parseInt(h, 16))
      expect(p.border).toBe(`rgba(${r},${g},${b},0.08)`)
      expect(p.borderMid).toBe(`rgba(${r},${g},${b},0.18)`)
    }
  })
})
