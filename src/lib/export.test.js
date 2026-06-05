import { describe, it, expect } from 'vitest'
import { buildBackupPayload } from './export.js'

// ════════════════════════════════════════════════════════════════════════════
// اختبارات النسخة الاحتياطية — بناء الحمولة الكاملة (دالة نقيّة).
// ════════════════════════════════════════════════════════════════════════════

describe('buildBackupPayload', () => {
  it('يضمّ كل الجداول الثمانية حتى لو ناقصة', () => {
    const p = buildBackupPayload({ projects: [{ id: 1 }], employees: [{ id: 9 }, { id: 10 }] })
    const keys = ['projects', 'employees', 'workDays', 'expenses', 'payments', 'clientReceipts', 'advances', 'holidays']
    keys.forEach(k => expect(p.data[k]).toBeInstanceOf(Array))
    expect(p.counts.projects).toBe(1)
    expect(p.counts.employees).toBe(2)
    expect(p.counts.workDays).toBe(0)   // غير ممرّر → فارغ
  })

  it('يحفظ الصفوف كما هي ويضيف ختم الوقت والتطبيق', () => {
    const rows = [{ id: 'a', name: 'فيلا' }]
    const p = buildBackupPayload({ projects: rows })
    expect(p.app).toBe('contractor-pro')
    expect(p.data.projects).toEqual(rows)
    expect(typeof p.exportedAt).toBe('string')
    expect(p.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('يتعامل مع مدخل فارغ بأمان', () => {
    const p = buildBackupPayload()
    expect(Object.values(p.counts).every(c => c === 0)).toBe(true)
  })
})
