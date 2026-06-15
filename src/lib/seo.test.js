import { describe, it, expect } from 'vitest'
import { faqLd, breadcrumbLd, ORIGIN } from './seo.js'

describe('faqLd', () => {
  it('builds a valid FAQPage from items', () => {
    const ld = faqLd([
      { q: 'سؤال؟', a: 'جواب.' },
      { q: 'سؤال ثاني؟', a: 'جواب ثانٍ.' },
    ])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld.mainEntity).toHaveLength(2)
    expect(ld.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'سؤال؟',
      acceptedAnswer: { '@type': 'Answer', text: 'جواب.' },
    })
  })

  it('returns null for empty or invalid input', () => {
    expect(faqLd([])).toBeNull()
    expect(faqLd(undefined)).toBeNull()
    expect(faqLd(null)).toBeNull()
  })
})

describe('breadcrumbLd', () => {
  it('builds a BreadcrumbList with absolute URLs and 1-based positions', () => {
    const ld = breadcrumbLd([
      { name: 'الرئيسية', path: '/' },
      { name: 'الأسعار', path: '/pricing' },
    ])
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toHaveLength(2)
    expect(ld.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'الرئيسية',
      item: `${ORIGIN}/`,
    })
    expect(ld.itemListElement[1].position).toBe(2)
    expect(ld.itemListElement[1].item).toBe(`${ORIGIN}/pricing`)
  })

  it('defaults a missing path to root', () => {
    const ld = breadcrumbLd([{ name: 'الرئيسية' }])
    expect(ld.itemListElement[0].item).toBe(`${ORIGIN}/`)
  })

  it('returns null for empty or invalid input', () => {
    expect(breadcrumbLd([])).toBeNull()
    expect(breadcrumbLd(undefined)).toBeNull()
  })
})
