import { describe, it, expect } from 'vitest'
import {
  WORKER_PATH, WORKER_HOST, WORKER_ORIGIN,
  isProdDomain, isWorkerHost, isWorkerPath, hasLegacyPortalQuery, isWorkerEntry,
  workerRedirect, workerPath, workerPortalUrl,
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

describe('isWorkerHost / isProdDomain', () => {
  it('يعرف نطاق البوّابة', () => {
    expect(isWorkerHost('worker.kabblan.com')).toBe(true)
    expect(isWorkerHost('WORKER.KABBLAN.COM')).toBe(true)
    expect(isWorkerHost('app.kabblan.com')).toBe(false)
    expect(isWorkerHost('localhost')).toBe(false)
  })
  it('يميّز نطاق الإنتاج عن التطوير والمعاينة', () => {
    for (const h of ['kabblan.com', 'www.kabblan.com', 'app.kabblan.com', 'worker.kabblan.com'])
      expect(isProdDomain(h)).toBe(true)
    for (const h of ['localhost', '127.0.0.1', 'contractor-pro-git-x.vercel.app', 'ams110.github.io'])
      expect(isProdDomain(h)).toBe(false)
  })
  it('لا يخلط نطاقاً يشبه الاسم', () => {
    expect(isProdDomain('kabblan.com.evil.net')).toBe(false)
    expect(isProdDomain('notkabblan.com')).toBe(false)
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
  it('يغطّي النطاق والمسار والرابط القديم', () => {
    expect(isWorkerEntry({ hostname: WORKER_HOST, pathname: '/worker' })).toBe(true)
    expect(isWorkerEntry({ hostname: WORKER_HOST, pathname: '/' })).toBe(true)
    expect(isWorkerEntry({ pathname: '/worker' })).toBe(true)
    expect(isWorkerEntry({ pathname: '/', search: '?portal' })).toBe(true)
    expect(isWorkerEntry({ hostname: 'app.kabblan.com', pathname: '/app' })).toBe(false)
  })
})

describe('workerRedirect — الإنتاج (نطاق فرعي)', () => {
  it('يحوّل /worker من نطاق التطبيق إلى نطاق البوّابة', () => {
    expect(workerRedirect({ hostname: 'app.kabblan.com', pathname: '/worker' }))
      .toBe('https://worker.kabblan.com/worker')
  })
  it('يحوّل الروابط القديمة من نطاق التطبيق أو التسويق مباشرة (بلا قفزة وسطى)', () => {
    expect(workerRedirect({ hostname: 'app.kabblan.com', pathname: '/', search: '?portal' }))
      .toBe('https://worker.kabblan.com/worker')
    expect(workerRedirect({ hostname: 'kabblan.com', pathname: '/', search: '?worker' }))
      .toBe('https://worker.kabblan.com/worker')
    expect(workerRedirect({ hostname: 'www.kabblan.com', pathname: '/app', search: '?portal' }))
      .toBe('https://worker.kabblan.com/worker')
  })
  it('يحافظ على باقي الـquery والـhash', () => {
    expect(workerRedirect({ hostname: 'app.kabblan.com', pathname: '/', search: '?portal&lang=he', hash: '#x' }))
      .toBe('https://worker.kabblan.com/worker?lang=he#x')
  })
  it('لا يحوّل أبداً وإحنا على نطاق البوّابة (بلا حلقة تحويل)', () => {
    expect(workerRedirect({ hostname: WORKER_HOST, pathname: '/worker' })).toBeNull()
    expect(workerRedirect({ hostname: WORKER_HOST, pathname: '/worker', search: '?portal' })).toBeNull()
    expect(workerRedirect({ hostname: WORKER_HOST, pathname: '/' })).toBeNull()
  })
})

describe('workerRedirect — التطوير/المعاينة (نفس الأصل)', () => {
  it('يحوّل الروابط القديمة للمسار', () => {
    expect(workerRedirect({ hostname: 'localhost', pathname: '/', search: '?portal' })).toBe('/worker')
    expect(workerRedirect({ hostname: 'localhost', pathname: '/', search: '?portal&lang=he' }))
      .toBe('/worker?lang=he')
  })
  it('لا يحوّل إذا أصلاً على المسار (بلا حلقة)', () => {
    expect(workerRedirect({ hostname: 'localhost', pathname: '/worker' })).toBeNull()
    expect(workerRedirect({ hostname: 'localhost', pathname: '/worker.html' })).toBeNull()
  })
  it('يحترم الـbase على مرآة Pages', () => {
    expect(workerRedirect({ hostname: 'ams110.github.io', pathname: '/contractor-pro/', search: '?portal', base: '/contractor-pro/' }))
      .toBe('/contractor-pro/worker')
  })
  it('لا يحوّل ما لا علاقة له بالبوّابة', () => {
    expect(workerRedirect({ hostname: 'localhost', pathname: '/', search: '' })).toBeNull()
    expect(workerRedirect({ hostname: 'app.kabblan.com', pathname: '/pricing' })).toBeNull()
  })
})

describe('workerPath / workerPortalUrl', () => {
  it('ثوابت المسار والنطاق', () => {
    expect(WORKER_PATH).toBe('/worker')
    expect(WORKER_HOST).toBe('worker.kabblan.com')
    expect(WORKER_ORIGIN).toBe('https://worker.kabblan.com')
  })
  it('يبني المسار مع الـbase', () => {
    expect(workerPath('/')).toBe('/worker')
    expect(workerPath('/contractor-pro/')).toBe('/contractor-pro/worker')
  })
  it('الرابط المُشارَك على الإنتاج = نطاق البوّابة المستقل', () => {
    for (const h of ['app.kabblan.com', 'kabblan.com', 'www.kabblan.com', WORKER_HOST])
      expect(workerPortalUrl({ hostname: h, origin: `https://${h}` }))
        .toBe('https://worker.kabblan.com/worker')
  })
  it('وبالتطوير/المعاينة = نفس الأصل', () => {
    expect(workerPortalUrl({ hostname: 'localhost', origin: 'http://localhost:3000' }))
      .toBe('http://localhost:3000/worker')
    expect(workerPortalUrl({ hostname: 'ams110.github.io', origin: 'https://ams110.github.io', base: '/contractor-pro/' }))
      .toBe('https://ams110.github.io/contractor-pro/worker')
  })
})
