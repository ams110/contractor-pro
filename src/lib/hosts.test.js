import { describe, it, expect } from 'vitest'
import {
  MARKETING_ORIGIN, APP_ORIGIN, isSplitHost, isAppHost,
  isAppPath, isMarketingPath, isSharedPath, originForPath, crossHostRedirect,
} from './hosts.js'

describe('hosts — تصنيف المسارات', () => {
  it('مسارات التطبيق', () => {
    for (const p of ['/app', '/login', '/register', '/welcome', '/thankyou', '/admin'])
      expect(isAppPath(p)).toBe(true)
  })
  it('بوّابة العامل مسار تطبيق عبر الـquery', () => {
    expect(isAppPath('/', '?portal')).toBe(true)
    expect(isAppPath('/', '?worker')).toBe(true)
    expect(isAppPath('/', '')).toBe(false)
  })
  it('مسارات التسويق المفهرسة', () => {
    for (const p of ['/', '/calculator', '/vat-calculator', '/blog', '/calculator/haifa', '/calculator/haifa/balat'])
      expect(isMarketingPath(p)).toBe(true)
  })
  it('المسارات المشتركة تُعرَض على النطاقين', () => {
    for (const p of ['/pricing', '/terms', '/privacy', '/refund', '/contact', '/delete-account'])
      expect(isSharedPath(p)).toBe(true)
    expect(originForPath('/pricing')).toBeNull()
  })
  it('أي مسار غير معروف يسقط على التطبيق', () => {
    expect(originForPath('/projects')).toBe(APP_ORIGIN)
    expect(originForPath('/calculator/haifa')).toBe(MARKETING_ORIGIN)
  })
})

describe('hosts — التحويل عبر النطاقات', () => {
  const mk = (hostname, pathname, search = '', hash = '') =>
    crossHostRedirect({ hostname, pathname, search, hash })

  it('مسار تطبيق وصل نطاق التسويق → يتحوّل', () => {
    expect(mk('kabblan.com', '/app')).toBe('https://app.kabblan.com/app')
    expect(mk('kabblan.com', '/login')).toBe('https://app.kabblan.com/login')
  })

  it('مسار تسويق وصل نطاق التطبيق → يتحوّل', () => {
    expect(mk('app.kabblan.com', '/calculator/haifa'))
      .toBe('https://kabblan.com/calculator/haifa')
    expect(mk('app.kabblan.com', '/blog')).toBe('https://kabblan.com/blog')
  })

  it('🔴 الجذر `/` ما بيتحوّل أبداً — كل نطاق بيعرض نسخته', () => {
    expect(mk('kabblan.com', '/')).toBeNull()       // صفحة الهبوط
    expect(mk('app.kabblan.com', '/')).toBeNull()   // التطبيق مباشرة
  })

  it('بوّابة العامل من نطاق التسويق تروح للتطبيق مع الحفاظ على الـquery', () => {
    expect(mk('kabblan.com', '/', '?portal'))
      .toBe('https://app.kabblan.com/?portal')
  })

  it('المسارات المشتركة ما بتتحوّل من أي نطاق', () => {
    expect(mk('kabblan.com', '/pricing')).toBeNull()
    expect(mk('app.kabblan.com', '/pricing')).toBeNull()
    expect(mk('app.kabblan.com', '/terms')).toBeNull()
  })

  it('يحافظ على الـquery والـhash عند التحويل', () => {
    expect(mk('kabblan.com', '/login', '?next=x', '#access_token=t'))
      .toBe('https://app.kabblan.com/login?next=x#access_token=t')
  })

  it('🔴 بلا تقسيم على التطوير المحلي ومعاينات Vercel', () => {
    expect(isSplitHost('localhost')).toBe(false)
    expect(isSplitHost('contractor-pro-khaki.vercel.app')).toBe(false)
    for (const h of ['localhost', '127.0.0.1', 'contractor-pro-git-abc.vercel.app']) {
      expect(mk(h, '/app')).toBeNull()
      expect(mk(h, '/calculator/haifa')).toBeNull()
      expect(mk(h, '/')).toBeNull()
    }
  })

  it('يرصد نطاق التطبيق', () => {
    expect(isAppHost('app.kabblan.com')).toBe(true)
    expect(isAppHost('kabblan.com')).toBe(false)
  })
})

describe('hosts — شبكة أمان الـwww', () => {
  const mk = (hostname, pathname, search = '') =>
    crossHostRedirect({ hostname, pathname, search })

  it('www بتتحوّل دايماً على الجذر — حتى على `/`', () => {
    expect(mk('www.kabblan.com', '/')).toBe('https://kabblan.com/')
    expect(mk('www.kabblan.com', '/pricing')).toBe('https://kabblan.com/pricing')
    expect(mk('www.kabblan.com', '/blog')).toBe('https://kabblan.com/blog')
  })
  it('www + مسار تطبيق → نطاق التطبيق مباشرة (بلا قفزتين)', () => {
    expect(mk('www.kabblan.com', '/app')).toBe('https://app.kabblan.com/app')
    expect(mk('www.kabblan.com', '/', '?portal')).toBe('https://app.kabblan.com/?portal')
  })
})
