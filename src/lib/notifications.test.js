import { describe, it, expect } from 'vitest'
import {
  PRIORITY, NOTIF_GROUPS, NOTIF_TYPES,
  notifMeta, priorityRank, notifTag,
  isQuietHours, shouldPush, DEFAULT_QUIET,
  groupNotifications, unreadStats, sortSmart,
} from './notifications.js'

const at = (h, d = 1) => new Date(2026, 0, d, h, 0, 0)
const row = (over = {}) => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  type: 'info', read: false, title: 't', body: 'b',
  created_at: new Date(2026, 0, 1, 12).toISOString(),
  ...over,
})

describe('notifMeta', () => {
  it('يرجّع بيانات النوع المعروف', () => {
    expect(notifMeta('pending_day').nav).toBe('workdays')
    expect(notifMeta('salary_overdue').priority).toBe('critical')
  })

  it('يرجّع fallback آمن لنوع غير معروف بدل undefined', () => {
    const m = notifMeta('some_future_type')
    expect(m).toBe(NOTIF_TYPES.info)
    expect(m.group).toBe('insights')
  })

  it('كل نوع مسجّل له مجموعة صالحة وأولوية معروفة', () => {
    for (const [type, meta] of Object.entries(NOTIF_TYPES)) {
      expect(NOTIF_GROUPS, `group of ${type}`).toContain(meta.group)
      expect(Object.keys(PRIORITY), `priority of ${type}`).toContain(meta.priority)
      expect(typeof meta.icon).toBe('string')
    }
  })

  // حارس انحدار: هالأنواع تكتبها triggers على auth.users/subscriptions وتصل
  // لمالك المنصّة. وقعت مرّة على مجموعة 'insights' فانقطع عنها الـpush بصمت.
  it('تنبيهات المنصّة (admin_*/bot_*) مسجّلة وبرّا مجموعة insights', () => {
    for (const type of ['admin_signup', 'admin_subscription',
                        'bot_signup', 'bot_login', 'bot_deleted']) {
      expect(NOTIF_TYPES, `${type} مسجّل`).toHaveProperty(type)
      expect(notifMeta(type).group, `group of ${type}`).not.toBe('insights')
      expect(notifMeta(type).push, `push of ${type}`).toBe(true)
    }
  })
})

describe('priorityRank / notifTag', () => {
  it('يرتّب الحرِج فوق العادي فوق المنخفض', () => {
    expect(priorityRank('salary_overdue')).toBeGreaterThan(priorityRank('pending_day'))
    expect(priorityRank('pending_day')).toBeGreaterThan(priorityRank('daily_digest'))
  })
  it('الوسم = النوع نفسه (حتى يطابق وسم الـSW فلا يتكرّر الإشعار)', () => {
    expect(notifTag('pending_day')).toBe('pending_day')
    expect(notifTag(undefined)).toBe('general')
  })
})

describe('isQuietHours', () => {
  it('يتعامل مع المدى العابر لمنتصف الليل (22→7)', () => {
    expect(isQuietHours(at(23))).toBe(true)
    expect(isQuietHours(at(2))).toBe(true)
    expect(isQuietHours(at(6))).toBe(true)
    expect(isQuietHours(at(7))).toBe(false)   // نهاية المدى غير شاملة
    expect(isQuietHours(at(13))).toBe(false)
    expect(isQuietHours(at(22))).toBe(true)   // بداية المدى شاملة
  })

  it('يتعامل مع مدى نهاري عادي (13→15)', () => {
    const q = { enabled: true, start: 13, end: 15 }
    expect(isQuietHours(at(14), q)).toBe(true)
    expect(isQuietHours(at(16), q)).toBe(false)
    expect(isQuietHours(at(9),  q)).toBe(false)
  })

  it('معطّل أو مدى صفري = بلا هدوء', () => {
    expect(isQuietHours(at(23), { enabled: false, start: 22, end: 7 })).toBe(false)
    expect(isQuietHours(at(23), { enabled: true, start: 5, end: 5 })).toBe(false)
    expect(isQuietHours(at(23), null)).toBe(false)
  })
})

describe('shouldPush', () => {
  const day = at(13), night = at(2)

  it('يبعت الطلبات العادية نهاراً', () => {
    expect(shouldPush('pending_day', {}, day)).toBe(true)
  })

  it('لا يبعت الملخّصات إطلاقاً (تُقرأ داخل التطبيق)', () => {
    expect(shouldPush('daily_digest', {}, day)).toBe(false)
    expect(shouldPush('info', {}, day)).toBe(false)
  })

  it('يحترم كتم المجموعة', () => {
    expect(shouldPush('pending_day', { muted: ['requests'] }, day)).toBe(false)
    expect(shouldPush('salary_overdue', { muted: ['requests'] }, day)).toBe(true)
  })

  it('يسكت ليلاً — إلا الحرِج فيخترق الهدوء', () => {
    expect(shouldPush('pending_day', {}, night)).toBe(false)
    expect(shouldPush('salary_overdue', {}, night)).toBe(true)
    expect(shouldPush('patur_cap_90', {}, night)).toBe(true)
    expect(shouldPush('patur_cap_70', {}, night)).toBe(false)
  })

  it('الكتم يغلب اختراقَ الحرِج للهدوء', () => {
    expect(shouldPush('salary_overdue', { muted: ['money'] }, night)).toBe(false)
  })

  it('تعطيل ساعات الهدوء يسمح بالإرسال ليلاً', () => {
    const prefs = { quiet: { ...DEFAULT_QUIET, enabled: false } }
    expect(shouldPush('pending_day', prefs, night)).toBe(true)
  })
})

describe('groupNotifications', () => {
  const iso = (h) => new Date(2026, 0, 1, h).toISOString()

  it('يضمّ المتتاليات من نفس النوع داخل النافذة', () => {
    const rows = [
      row({ id: 'a', type: 'pending_day', created_at: iso(12) }),
      row({ id: 'b', type: 'pending_day', created_at: iso(11) }),
      row({ id: 'c', type: 'pending_day', created_at: iso(10) }),
    ]
    const g = groupNotifications(rows)
    expect(g).toHaveLength(1)
    expect(g[0].count).toBe(3)
    expect(g[0].unread).toBe(3)
    expect(g[0].latest.id).toBe('a')
  })

  it('لا يضمّ أنواعاً مختلفة', () => {
    const g = groupNotifications([
      row({ type: 'pending_day', created_at: iso(12) }),
      row({ type: 'pending_expense', created_at: iso(11) }),
    ])
    expect(g).toHaveLength(2)
  })

  it('لا يضمّ خارج النافذة الزمنية', () => {
    const g = groupNotifications([
      row({ type: 'pending_day', created_at: new Date(2026, 0, 2, 12).toISOString() }),
      row({ type: 'pending_day', created_at: new Date(2026, 0, 1, 12).toISOString() }),
    ])
    expect(g).toHaveLength(2)
  })

  it('يعدّ غير المقروء داخل المجموعة فقط', () => {
    const g = groupNotifications([
      row({ type: 'pending_day', read: false, created_at: iso(12) }),
      row({ type: 'pending_day', read: true,  created_at: iso(11) }),
    ])
    expect(g[0].count).toBe(2)
    expect(g[0].unread).toBe(1)
  })

  it('قائمة فارغة → مجموعات فارغة', () => {
    expect(groupNotifications([])).toEqual([])
    expect(groupNotifications()).toEqual([])
  })
})

describe('unreadStats', () => {
  it('يفصل الحرِج والمهم ويوزّع على المجموعات', () => {
    const s = unreadStats([
      row({ type: 'salary_overdue' }),
      row({ type: 'pending_day' }),
      row({ type: 'pending_day', read: true }),
      row({ type: 'daily_digest' }),
    ])
    expect(s.total).toBe(3)
    expect(s.critical).toBe(1)
    expect(s.high).toBe(1)
    expect(s.byGroup.money).toBe(1)
    expect(s.byGroup.requests).toBe(1)
    expect(s.byGroup.insights).toBe(1)
  })

  it('الكل مقروء → أصفار', () => {
    expect(unreadStats([row({ read: true })]).total).toBe(0)
  })
})

describe('sortSmart', () => {
  it('غير المقروء أولاً، ثم الأولوية، ثم الأحدث', () => {
    const iso = h => new Date(2026, 0, 1, h).toISOString()
    const sorted = sortSmart([
      row({ id: 'read-crit', type: 'salary_overdue', read: true,  created_at: iso(15) }),
      row({ id: 'low',       type: 'daily_digest',   read: false, created_at: iso(14) }),
      row({ id: 'crit',      type: 'salary_overdue', read: false, created_at: iso(9) }),
      row({ id: 'high-new',  type: 'pending_day',    read: false, created_at: iso(13) }),
    ]).map(n => n.id)
    expect(sorted).toEqual(['crit', 'high-new', 'low', 'read-crit'])
  })

  it('لا يعدّل المصفوفة الأصلية', () => {
    const rows = [row({ id: 'x', read: true }), row({ id: 'y', read: false })]
    sortSmart(rows)
    expect(rows[0].id).toBe('x')
  })
})
