import { describe, it, expect } from 'vitest'
import { tl, tEnum, ENUM_LABELS } from './labels.js'
import { navLabel } from '../constants/index.js'
import {
  PROJECT_STATUS, PROJECT_TYPES, DAY_TYPES, PAY_METHODS, SPECS, EXP_CATS,
} from '../constants/index.js'

// نطاقات يونيكود: عبري U+0590–U+05FF · عربي U+0600–U+06FF
const HE = /[֐-׿]/
const AR = /[؀-ۿ]/
// كلمة تخلط النطاقين = انتهاك §19.4
const MIXED = /[֐-׿][؀-ۿ]|[؀-ۿ][֐-׿]/

describe('tl — اختيار النصّ حسب اللغة', () => {
  it('يرجع العربي افتراضياً وللعربية', () => {
    expect(tl('ar', 'عربي', 'עברית', 'English')).toBe('عربي')
    expect(tl(undefined, 'عربي', 'עברית', 'English')).toBe('عربي')
  })
  it('يرجع العبري والإنجليزي', () => {
    expect(tl('he', 'عربي', 'עברית', 'English')).toBe('עברית')
    expect(tl('en', 'عربي', 'עברית', 'English')).toBe('English')
  })
  it('يقع الإنجليزي على العربي إن غاب', () => {
    expect(tl('en', 'عربي', 'עברית')).toBe('عربي')
  })
})

describe('tEnum — ترجمة القيم المخزّنة للعرض', () => {
  it('يبقي العربي للعربية', () => {
    expect(tEnum('نشط', 'ar')).toBe('نشط')
  })
  it('يترجم للعبري والإنجليزي', () => {
    expect(tEnum('نشط', 'he')).toBe('פעיל')
    expect(tEnum('نشط', 'en')).toBe('Active')
  })
  it('يرجع القيمة المخصّصة (غير المعروفة) كما هي', () => {
    expect(tEnum('تخصص مخصّص', 'he')).toBe('تخصص مخصّص')
    expect(tEnum('', 'he')).toBe('')
    expect(tEnum(undefined, 'he')).toBe(undefined)
  })
})

describe('تغطية: كل قيم enum في الدستور لها ترجمة', () => {
  const all = [
    ...PROJECT_STATUS, ...PROJECT_TYPES, ...DAY_TYPES, ...PAY_METHODS, ...SPECS, ...EXP_CATS,
  ]
  it('كل قيمة موجودة في ENUM_LABELS', () => {
    const missing = all.filter(v => !ENUM_LABELS[v])
    expect(missing).toEqual([])
  })
})

describe('§19.4 — لا خلط حروف عربية/عبرية داخل أي ترجمة عبرية', () => {
  it('كل قيم he نقيّة (لا حرف عربي)', () => {
    const violations = Object.entries(ENUM_LABELS)
      .filter(([, v]) => AR.test(v.he))
      .map(([k]) => k)
    expect(violations).toEqual([])
  })
  it('كل قيم he تحتوي حروفاً عبرية فعلاً', () => {
    for (const [, v] of Object.entries(ENUM_LABELS)) expect(HE.test(v.he)).toBe(true)
  })
  it('لا كلمة مختلطة النطاقين', () => {
    for (const [, v] of Object.entries(ENUM_LABELS)) expect(MIXED.test(v.he)).toBe(false)
  })
})

describe('navLabel', () => {
  it('يختار حسب اللغة مع وقوع على العربي', () => {
    const item = { label: 'مشاريع', label_he: 'פרויקטים', label_en: 'Projects' }
    expect(navLabel(item, 'ar')).toBe('مشاريع')
    expect(navLabel(item, 'he')).toBe('פרויקטים')
    expect(navLabel(item, 'en')).toBe('Projects')
    expect(navLabel({ label: 'x' }, 'he')).toBe('x')
    expect(navLabel(null, 'he')).toBe('')
  })
})
