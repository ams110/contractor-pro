import React, { useState, useEffect } from 'react'
import { Package } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'
import { supabase } from '../lib/supabase.js'

// ─── hook لجلب السجلات ────────────────────────────────────────────────────────
function useMaterialLogsList(ownerId) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  async function load() {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('material_logs')
        .select(`
          id, date, item_name, quantity, unit, notes, created_at,
          employees ( name ),
          projects  ( name )
        `)
        .eq('owner_id', ownerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (err) throw new Error(err.message)
      setLogs(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [ownerId])

  return { logs, loading, error, reload: load }
}

// ─── الشاشة الرئيسية ──────────────────────────────────────────────────────────
export default function MaterialsScreen({ userId, employees = [], projects = [] }) {
  const { logs, loading, error, reload } = useMaterialLogsList(userId)

  const [filterEmp,     setFilterEmp]     = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [search,        setSearch]        = useState('')

  // تصفية
  const filtered = logs.filter(l => {
    if (filterEmp     && l.employees?.name !== filterEmp)     return false
    if (filterProject && l.projects?.name  !== filterProject) return false
    if (search && !l.item_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // قائمة الأسماء الفريدة
  const empNames  = [...new Set(logs.map(l => l.employees?.name).filter(Boolean))]
  const projNames = [...new Set(logs.map(l => l.projects?.name).filter(Boolean))]

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl' }}>

      {/* عنوان */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
          سجلات البضاعة
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>المستلزمات المسجّلة من بوابة العمال</div>
      </div>

      {/* بحث */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 ابحث عن مادة..."
        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 10 }}
      />

      {/* فلاتر */}
      {(empNames.length > 1 || projNames.length > 1) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {empNames.length > 1 && (
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 10, border: `1px solid ${filterEmp ? C.primary : C.border}`, background: C.surface, color: filterEmp ? C.primary : C.textDim, fontSize: 12, outline: 'none' }}>
              <option value="">كل العمال</option>
              {empNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          {projNames.length > 1 && (
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 10, border: `1px solid ${filterProject ? C.primary : C.border}`, background: C.surface, color: filterProject ? C.primary : C.textDim, fontSize: 12, outline: 'none' }}>
              <option value="">كل المشاريع</option>
              {projNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          {(filterEmp || filterProject || search) && (
            <button onClick={() => { setFilterEmp(''); setFilterProject(''); setSearch('') }}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              ✕ مسح
            </button>
          )}
        </div>
      )}

      {/* حالة التحميل */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', background: `${C.accent}15`, borderRadius: 12, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 13, marginBottom: 12 }}>
          ⚠ {error}
          <button onClick={reload} style={{ marginRight: 12, background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <Package size={38} style={{ color: C.textDim, margin: '0 auto 8px', display:'block' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{logs.length === 0 ? 'لا توجد سجلات بعد' : 'لا نتائج للفلتر الحالي'}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>العمال يسجّلون البضاعة من بوابتهم</div>
        </div>
      )}

      {/* السجلات */}
      {!loading && filtered.map(log => (
        <div key={log.id} style={{ background: C.card, borderRadius: 13, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{log.item_name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 10, color: C.textDim, background: C.surface, padding: '2px 8px', borderRadius: 6 }}>
                  📅 {fmtDate(log.date)}
                </span>
                {log.employees?.name && (
                  <span style={{ fontSize: 10, color: C.primary, background: `${C.primary}15`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.primary}22` }}>
                    👷 {log.employees.name}
                  </span>
                )}
                {log.projects?.name && (
                  <span style={{ fontSize: 10, color: C.secondary, background: `${C.secondary}15`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.secondary}22` }}>
                    🏗️ {log.projects.name}
                  </span>
                )}
              </div>
              {log.notes && (
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 5, fontStyle: 'italic' }}>{log.notes}</div>
              )}
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0, paddingRight: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: C.warning, fontFamily: 'monospace' }}>{log.quantity}</div>
              <div style={{ fontSize: 10, color: C.textDim, textAlign: 'center' }}>{log.unit}</div>
            </div>
          </div>
        </div>
      ))}

      {/* إجمالي الظاهر */}
      {!loading && filtered.length > 1 && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: `${C.primary}12`, borderRadius: 12, border: `1px solid ${C.primary}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{filtered.length} سجل</span>
          <button onClick={reload} style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>🔄 تحديث</button>
        </div>
      )}
    </div>
  )
}
