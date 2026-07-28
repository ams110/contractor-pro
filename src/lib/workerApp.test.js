import { describe, it, expect } from 'vitest'
import {
  WORKER_PATH, isWorkerPath, hasLegacyPortalQuery, isWorkerEntry,
  legacyPortalRedirect, workerPath, workerPortalUrl,
} from './workerApp.js'

describe('isWorkerPath', () => {
  it('يطابق مسار البوّابة بكل صوره', () => {
    for (const p of ['/worker', '/worker/', '/worker/salary', '/worker.html'])
      expect(isWorkerPath(p)).toBe(true)
  })
  it('يطابق مع بادئة base (مرآة GitHub Pages)', () => {
    expect(isWorkerPath('/contractor-pro/worker')).toBe(true)
    expect(isWorkerPath('/contractor-pro/worker.html')).toBe(true)
  })
  it('لا يطابق مسارات المالك أو التسويق', () => {
    for (const p of ['/', '/app', '/login', '/workers', '/pricing', '/admin'])
      expect(isWorkerPath(p)).toBe(false)
  })
})

describe('hasLegacyPortalQuery', () => {
  it('يكشف الروابط القديمة', () => {
    expect(hasLegacyPortalQuery('?portal')).toBe(true)
    expect(hasLegacyPortalQuery('?worker')).toBe(true)
    expect(hasLegacyPortalQuery('?lang=he&portal')).toBe(true)
  })
  it('يتجاهل ما عداها', () => {
    expect(hasLegacyPortalQuery('')).toBe(false)
    expect(hasLegacyPortalQuery('?demo')).toBe(false)
  })
})

describe('isWorkerEntry', () => {
  it('يغطّي المسار الجديد والرابط القديم', () => {
    expect(isWorkerEntry({ pathname: '/worker' })).toBe(true)
    expect(isWorkerEntry({ pathname: '/', search: '?portal' })).toBe(true)
    expect(isWorkerEntry({ pathname: '/app', search: '' })).toBe(false)
  })
})

describe('legacyPortalRedirect', () => {
  it('يحوّل ?portal إلى /worker', () => {
    expect(legacyPortalRedirect({ pathname: '/', search: '?portal' })).toBe('/worker')
    expect(legacyPortalRedirect({ pathname: '/app', search: '?worker' })).toBe('/worker')
  })
  it('يحافظ على باقي الـquery والـhash', () => {
    expect(legacyPortalRedirect({ pathname: '/', search: '?portal&lang=he', hash: '#x' }))
      .toBe('/worker?lang=he#x')
  })
  it('يحترم الـbase', () => {
    expect(legacyPortalRedirect({ pathname: '/', search: '?portal', base: '/contractor-pro/' }))
      .toBe('/contractor-pro/worker')
  })
  it('لا يحوّل إذا كنّا أصلاً على البوّابة أو بلا رابط قديم', () => {
    expect(legacyPortalRedirect({ pathname: '/worker', search: '?portal' })).toBeNull()
    expect(legacyPortalRedirect({ pathname: '/', search: '' })).toBeNull()
  })
})

describe('workerPath / workerPortalUrl', () => {
  it('يبني المسار والرابط الكامل', () => {
    expect(WORKER_PATH).toBe('/worker')
    expect(workerPath('/')).toBe('/worker')
    expect(workerPath('/contractor-pro/')).toBe('/contractor-pro/worker')
    expect(workerPortalUrl('https://app.kabblan.com')).toBe('https://app.kabblan.com/worker')
    expect(workerPortalUrl('https://app.kabblan.com/', '/')).toBe('https://app.kabblan.com/worker')
    expect(workerPortalUrl('https://ams110.github.io', '/contractor-pro/'))
      .toBe('https://ams110.github.io/contractor-pro/worker')
  })
})
