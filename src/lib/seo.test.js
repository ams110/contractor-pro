import { describe, it, expect } from 'vitest'
import { faqLd } from './seo.js'

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
