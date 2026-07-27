import { describe, it, expect } from 'vitest'
import {
  NEW_ORIGIN, LEGACY_HOSTS, shouldMigrate, isAuthCallbackHash,
  collectMigratableKeys, buildMigrationUrl,
} from './domainMigration.js'

describe('domainMigration — shouldMigrate', () => {
  it('يرصد النطاق القديم', () => {
    expect(shouldMigrate('app.linko.services')).toBe(true)
  })
  it('لا يحوّل من النطاقات الجديدة ولا من التطوير المحلي', () => {
    expect(shouldMigrate('kabblan.com')).toBe(false)
    expect(shouldMigrate('app.kabblan.com')).toBe(false)
    expect(shouldMigrate('localhost')).toBe(false)
    expect(shouldMigrate('contractor-pro.vercel.app')).toBe(false)
  })
  it('النطاق القديم كان يخدم التطبيق → الوجهة الافتراضية نطاق التطبيق', () => {
    expect(LEGACY_HOSTS).not.toContain('kabblan.com')
    expect(LEGACY_HOSTS).not.toContain('app.kabblan.com')
    expect(NEW_ORIGIN).toBe('https://app.kabblan.com')
  })
})

describe('domainMigration — collectMigratableKeys', () => {
  it('يرحّل بيانات متتبّع الوحدات والتفضيلات', () => {
    const out = collectMigratableKeys({
      'tracker_p1':    '{"a":1}',
      'extras_p1':     '[]',
      'blueprints_p1': '[]',
      'settings_u9':   '{"specs":[]}',
      'contractor-pro-businesses': '{"state":{}}',
      'cp_lang':       'ar',
      'cp_theme':      'dark',
      'kbl_ref_code':  'AB3XK9',
    })
    expect(Object.keys(out).sort()).toEqual([
      'blueprints_p1', 'contractor-pro-businesses', 'cp_lang', 'cp_theme',
      'extras_p1', 'kbl_ref_code', 'settings_u9', 'tracker_p1',
    ])
  })

  it('لا يرحّل أي سرّ (PIN/passkey/توكن/مفتاح تشفير/جلسة Supabase)', () => {
    const out = collectMigratableKeys({
      'cpro_pin_creds':   'x',
      'cpro_pin_hash':    'x',
      'cpro_passkey_enc': 'x',
      'cp_enc_key_v3':    'x',
      'worker_session':   'x',
      'sb-abc-auth-token': 'x',
    })
    expect(out).toEqual({})
  })

  it('يتجاهل المفاتيح غير المعروفة والقيم غير النصّية', () => {
    const out = collectMigratableKeys({ random_key: 'v', cp_lang: 123 })
    expect(out).toEqual({})
  })
})

describe('domainMigration — buildMigrationUrl', () => {
  it('🔴 روابط بوّابة العامل القديمة تروح لنطاق التطبيق', () => {
    const url = buildMigrationUrl({ pathname: '/', search: '?portal', payload: null })
    expect(url).toBe('https://app.kabblan.com/?portal')
  })

  it('🔴 مسارات الحاسبة المفهرسة تروح لنطاق التسويق (لا التطبيق)', () => {
    const url = buildMigrationUrl({ pathname: '/calculator/haifa', search: '', payload: {} })
    expect(url).toBe('https://kabblan.com/calculator/haifa')
  })

  it('يضيف الحمولة في الـhash (لا تُرسَل للخادم)', () => {
    const url = buildMigrationUrl({ pathname: '/app', search: '', payload: { cp_lang: 'ar' } })
    expect(url).toContain('#__kblmig=')
    const raw = decodeURIComponent(url.split('#__kblmig=')[1])
    expect(JSON.parse(raw)).toEqual({ cp_lang: 'ar' })
  })

  it('🔴 الحمولة ما بتنكتب على نطاق التسويق — بيانات التطبيق تخصّ نطاقه', () => {
    const url = buildMigrationUrl({
      pathname: '/calculator/haifa', search: '', payload: { tracker_p1: '{}' },
    })
    expect(url).toBe('https://kabblan.com/calculator/haifa')
    expect(url).not.toContain('__kblmig')
  })

  it('يسقط الحمولة الضخمة ويكمّل التحويل بدلاً من كسره', () => {
    const url = buildMigrationUrl({
      pathname: '/app', search: '',
      payload: { tracker_big: 'x'.repeat(400 * 1024) },
    })
    expect(url).toBe('https://app.kabblan.com/app')
  })

  it('🔴 يحافظ على توكن المصادقة في الـhash (تأكيد إيميل/استعادة كلمة سر)', () => {
    const authHash = '#access_token=abc123&refresh_token=def456&type=recovery'
    const url = buildMigrationUrl({
      pathname: '/login', search: '', hash: authHash, payload: { cp_lang: 'ar' },
    })
    expect(url).toContain('access_token=abc123')
    expect(url).toContain('refresh_token=def456')
    expect(url).toContain('type=recovery')
    expect(url).toContain(`${'__kblmig'}=`)
    // التوكن أوّلاً ومقطع الترحيل بعده — بلا ما يدوس عليه
    expect(url.indexOf('access_token')).toBeLessThan(url.indexOf('__kblmig'))
  })

  it('يمرّر الـhash الأصلي حتى بلا حمولة', () => {
    const url = buildMigrationUrl({
      pathname: '/', search: '?portal', hash: '#access_token=t', payload: null,
    })
    expect(url).toBe('https://app.kabblan.com/?portal#access_token=t')
  })

  it('الحمولة المُرمَّزة ما بتحوي & أو = فالفصل آمن', () => {
    const url = buildMigrationUrl({
      pathname: '/app', search: '', hash: '#access_token=t',
      payload: { 'settings_u1': '{"a":"x&y=z"}' },
    })
    const segs = url.split('#')[1].split('&')
    expect(segs).toHaveLength(2)
    expect(segs[0]).toBe('access_token=t')
    expect(segs[1].startsWith('__kblmig=')).toBe(true)
  })
})

describe('domainMigration — isAuthCallbackHash', () => {
  it('يرصد روابط المصادقة بكل أنواعها', () => {
    for (const h of [
      '#access_token=x&refresh_token=y',
      '#type=recovery',
      '#type=signup',
      '#type=magiclink',
      '#type=invite',
      '#type=email_change',
      '#error_description=Something%20failed',
    ]) expect(isAuthCallbackHash(h)).toBe(true)
  })
  it('ما بيرصد الـhash العادي', () => {
    expect(isAuthCallbackHash('')).toBe(false)
    expect(isAuthCallbackHash('#section-2')).toBe(false)
    expect(isAuthCallbackHash('#__kblmig=%7B%7D')).toBe(false)
  })
})
