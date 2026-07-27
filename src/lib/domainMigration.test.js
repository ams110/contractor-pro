import { describe, it, expect } from 'vitest'
import {
  NEW_ORIGIN, LEGACY_HOSTS, shouldMigrate,
  collectMigratableKeys, buildMigrationUrl,
} from './domainMigration.js'

describe('domainMigration — shouldMigrate', () => {
  it('يرصد النطاق القديم', () => {
    expect(shouldMigrate('app.linko.services')).toBe(true)
    expect(shouldMigrate('www.kabblan.com')).toBe(true)
  })
  it('لا يحوّل من النطاق الجديد ولا من التطوير المحلي', () => {
    expect(shouldMigrate('kabblan.com')).toBe(false)
    expect(shouldMigrate('localhost')).toBe(false)
    expect(shouldMigrate('contractor-pro.vercel.app')).toBe(false)
  })
  it('النطاق الجديد ليس ضمن قائمة النطاقات القديمة', () => {
    expect(LEGACY_HOSTS).not.toContain('kabblan.com')
    expect(NEW_ORIGIN).toBe('https://kabblan.com')
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
  it('يحافظ على المسار والـquery (روابط بوّابة العامل القديمة)', () => {
    const url = buildMigrationUrl({ pathname: '/', search: '?portal', payload: null })
    expect(url).toBe('https://kabblan.com/?portal')
  })

  it('يحافظ على مسارات الحاسبة المفهرسة بجوجل', () => {
    const url = buildMigrationUrl({ pathname: '/calculator/haifa', search: '', payload: {} })
    expect(url).toBe('https://kabblan.com/calculator/haifa')
  })

  it('يضيف الحمولة في الـhash (لا تُرسَل للخادم)', () => {
    const url = buildMigrationUrl({ pathname: '/', search: '', payload: { cp_lang: 'ar' } })
    expect(url).toContain('#__kblmig=')
    const raw = decodeURIComponent(url.split('#__kblmig=')[1])
    expect(JSON.parse(raw)).toEqual({ cp_lang: 'ar' })
  })

  it('يسقط الحمولة الضخمة ويكمّل التحويل بدلاً من كسره', () => {
    const url = buildMigrationUrl({
      pathname: '/', search: '',
      payload: { tracker_big: 'x'.repeat(400 * 1024) },
    })
    expect(url).toBe('https://kabblan.com/')
  })
})
