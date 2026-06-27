import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Search, Calendar, HardHat, Building2, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmtDate } from '../lib/helpers.js'
import { supabase } from '../lib/supabase.js'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

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

// ─── شريحة وسم (worker / project) ─────────────────────────────────────────────
function MetaTag({ icon: Icon, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color, background: `${color}15`, padding: '3px 8px', borderRadius: 7, border: `1px solid ${color}28` }}>
      <Icon size={11} color={color} strokeWidth={2.3} />
      {label}
    </span>
  )
}

// ─── الشاشة الرئيسية ──────────────────────────────────────────────────────────
export default function MaterialsScreen({ userId, employees = [], projects = [] }) {
  const language = useAppStore(s => s.language)
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

  const selectStyle = (active) => ({ flex: 1, minWidth: 120, padding: '9px 12px', borderRadius: 11, border: `1px solid ${active ? `${C.primary}55` : C.borderMid}`, background: active ? `${C.primary}12` : C.surface, color: active ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' })

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>

      {/* عنوان */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        <IconChip icon={Package} tone="brand" size={40} radius={12} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{tl(language, 'سجلات البضاعة', 'יומני חומרים', 'Material logs')}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{tl(language, 'المستلزمات المسجّلة من بوابة العمال', 'חומרים שתועדו מפורטל העובדים', 'Materials logged from the worker portal')}</div>
        </div>
      </motion.div>

      {/* بحث */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={16} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tl(language, 'ابحث عن مادة...', 'חיפוש חומר...', 'Search material...')}
          style={{ width: '100%', padding: '11px 14px', paddingInlineStart: 40, borderRadius: 13, border: `1px solid ${C.borderMid}`, background: C.surface, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {/* فلاتر */}
      {(empNames.length > 1 || projNames.length > 1) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {empNames.length > 1 && (
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={selectStyle(!!filterEmp)}>
              <option value="">{tl(language, 'كل العمال', 'כל העובדים', 'All workers')}</option>
              {empNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          {projNames.length > 1 && (
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={selectStyle(!!filterProject)}>
              <option value="">{tl(language, 'كل المشاريع', 'כל הפרויקטים', 'All projects')}</option>
              {projNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          {(filterEmp || filterProject || search) && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setFilterEmp(''); setFilterProject(''); setSearch('') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 11, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={13} strokeWidth={2.5} /> {tl(language, 'مسح', 'נקה', 'Clear')}
            </motion.button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: `${C.accent}15`, borderRadius: 13, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 13, marginBottom: 12 }}>
          <AlertTriangle size={15} strokeWidth={2.3} /> {error}
          <button onClick={reload} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>{tl(language, 'إعادة المحاولة', 'נסה שוב', 'Retry')}</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '44px 0', color: C.textDim }}>
          <IconChip icon={Package} tone="brand" size={52} radius={16} iconSize={26} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{logs.length === 0 ? tl(language, 'لا توجد سجلات بعد', 'אין יומנים עדיין', 'No logs yet') : tl(language, 'لا نتائج للفلتر الحالي', 'אין תוצאות לסינון הנוכחי', 'No results for the current filter')}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>{tl(language, 'العمال يسجّلون البضاعة من بوابتهم', 'העובדים מתעדים חומרים מהפורטל שלהם', 'Workers log materials from their portal')}</div>
        </div>
      )}

      {/* السجلات */}
      {!loading && filtered.map((log, i) => (
        <PremiumCard key={log.id} tone="brand" glow={false} radius={14} padding="12px 14px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconChip icon={Package} tone="brand" size={38} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 5 }}>{log.item_name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <MetaTag icon={Calendar} label={fmtDate(log.date)} color="#94A3B8" />
                {log.employees?.name && <MetaTag icon={HardHat}   label={log.employees.name} color={C.primary} />}
                {log.projects?.name  && <MetaTag icon={Building2} label={log.projects.name}  color={C.secondary} />}
              </div>
              {log.notes && (
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, fontStyle: 'italic' }}>{log.notes}</div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 46 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.gold, fontFamily: 'monospace', lineHeight: 1 }}>{log.quantity}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{log.unit}</div>
            </div>
          </div>
        </PremiumCard>
      ))}

      {/* إجمالي الظاهر */}
      {!loading && filtered.length > 1 && (
        <div style={{ marginTop: 8, padding: '11px 14px', background: `${C.primary}12`, borderRadius: 13, border: `1px solid ${C.primary}28`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{filtered.length} {tl(language, 'سجل', 'רשומות', 'records')}</span>
          <button onClick={reload} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
            <RefreshCw size={13} strokeWidth={2.3} /> {tl(language, 'تحديث', 'רענון', 'Refresh')}
          </button>
        </div>
      )}
    </div>
  )
}
