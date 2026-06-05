import React, { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  ClipboardList, RefreshCw, Download, X, AlertTriangle, Clock,
  PlusCircle, PencilLine, Trash2, Eye, User, Calendar,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmtDate } from '../lib/helpers.js'
import { GlassCard, Btn } from '../components/index.jsx'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'

const ACTION_MAP = {
  insert: 'أضاف',
  update: 'عدّل',
  delete: 'حذف',
  view:   'فتح',
}

const TABLE_MAP = {
  projects:   'مشروع',
  employees:  'عامل',
  expenses:   'مصروف',
  payments:   'دفعة',
  work_days:  'يوم عمل',
  client_receipts: 'إيصال',
  dashboard:  'الرئيسية',
  workers:    'العمال',
  workdays:   'أيام العمل',
  settings:   'الإعدادات',
  activity:   'النشاط',
}

const ACTION_COLOR = {
  insert: C.success,
  update: C.warning,
  delete: C.accent,
  view:   C.blue,
}

const ACTION_ICON = {
  insert: PlusCircle,
  update: PencilLine,
  delete: Trash2,
  view:   Eye,
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

function translateEntry(entry) {
  const action = ACTION_MAP[entry.action] || entry.action
  const table  = TABLE_MAP[entry.tbl]    || entry.tbl
  return `${action} ${table}`
}

function ActionBadge({ action }) {
  const color = ACTION_COLOR[action] || C.textDim
  const label = ACTION_MAP[action] || action
  const Icon  = ACTION_ICON[action]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700,
      color, background: `${color}18`,
      border: `1px solid ${color}33`,
      padding: '2px 7px', borderRadius: 6,
      flexShrink: 0,
    }}>{Icon && <Icon size={11} color={color} strokeWidth={2.5} />}{label}</span>
  )
}

// ─── شريحة وسم صغيرة (وقت / تاريخ) ─────────────────────────────────────────────
function MetaTag({ icon: Icon, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color, background: `${color}15`, padding: '3px 8px', borderRadius: 7, border: `1px solid ${color}28` }}>
      <Icon size={11} color={color} strokeWidth={2.3} />
      {label}
    </span>
  )
}

export default function ActivityScreen({ getAllActivity, getActivity, teamMembers, permissions }) {
  const [entries,      setEntries]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterMember, setFilterMember] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterDate,   setFilterDate]   = useState('')
  const [error,        setError]        = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAllActivity()
      setEntries(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getAllActivity])

  useEffect(() => { load() }, [load])

  const members = teamMembers || []

  const filtered = entries.filter(e => {
    if (filterMember !== 'all' && e.actor_email !== filterMember) return false
    if (filterAction !== 'all' && e.action !== filterAction)      return false
    if (filterDate && !String(e.created_at).startsWith(filterDate)) return false
    return true
  })

  function exportToExcel() {
    const rows = filtered.map(e => ({
      'الوقت':     new Date(e.created_at).toLocaleString('ar-IL'),
      'العضو':     e.actor_name || e.actor_email || '',
      'الإجراء':   ACTION_MAP[e.action]  || e.action,
      'الجدول':    TABLE_MAP[e.tbl]      || e.tbl,
      'المعرّف':   e.record_id || '',
    }))
    const wb  = XLSX.utils.book_new()
    const ws  = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'سجل النشاط')
    XLSX.writeFile(wb, `activity_log_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const hasFilter = filterMember !== 'all' || filterAction !== 'all' || filterDate

  return (
    <div className="fade-in" style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <IconChip icon={ClipboardList} tone="premium" size={40} radius={12} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>سجل النشاط</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{filtered.length} إجراء</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={load}
            style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.textDim, cursor: 'pointer', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
            <RefreshCw size={13} strokeWidth={2} />
          </button>
          {filtered.length > 0 && (
            <Btn onClick={exportToExcel} variant="outline"><Download size={13} strokeWidth={2} style={{ display:'inline', marginLeft:4 }} /> Excel</Btn>
          )}
        </div>
      </div>

      {/* Filters */}
      <GlassCard style={{ marginBottom: 16, borderRadius: 16 }}>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Member filter */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>العضو</label>
              <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, outline: 'none' }}>
                <option value="all">الكل</option>
                {members.map(m => (
                  <option key={m.id} value={m.auth_email}>{m.display_name || m.username}</option>
                ))}
              </select>
            </div>
            {/* Action filter */}
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>الإجراء</label>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, outline: 'none' }}>
                <option value="all">الكل</option>
                <option value="insert">أضاف</option>
                <option value="update">عدّل</option>
                <option value="delete">حذف</option>
                <option value="view">فتح</option>
              </select>
            </div>
            {/* Date filter */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>التاريخ</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>
          {hasFilter && (
            <button onClick={() => { setFilterMember('all'); setFilterAction('all'); setFilterDate('') }}
              style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.accent}44`, background: `${C.accent}12`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={12} strokeWidth={2.5} /> مسح الفلاتر
            </button>
          )}
        </div>
      </GlassCard>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: `${C.accent}15`, borderRadius: 12, marginBottom: 14, fontSize: 13, color: C.accent, border: `1px solid ${C.accent}33` }}>
          <AlertTriangle size={15} strokeWidth={2.3} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 0', color: C.textDim }}>
          <IconChip icon={ClipboardList} tone="premium" size={52} radius={16} iconSize={26} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>لا يوجد نشاط مسجّل بعد</div>
        </div>
      ) : (
        <div>
          {filtered.map((entry, i) => {
            const color = ACTION_COLOR[entry.action] || C.textDim
            const Icon  = ACTION_ICON[entry.action] || ClipboardList
            const desc  = translateEntry(entry)
            const name  = entry.actor_name || entry.actor_email || 'مجهول'
            return (
              <PremiumCard key={i} color={color} glow={false} radius={12} padding="12px 14px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* أيقونة الإجراء */}
                  <IconChip icon={Icon} color={color} size={38} radius={11} />
                  {/* المحتوى */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800, color: C.text }}>
                        <User size={12} color={C.textDim} strokeWidth={2.3} />{name}
                      </span>
                      <ActionBadge action={entry.action} />
                      <span style={{ fontSize: 12, color: C.textDim }}>
                        {TABLE_MAP[entry.tbl] || entry.tbl}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <MetaTag icon={Calendar} label={fmtDate(entry.created_at)} color="#94A3B8" />
                      <MetaTag icon={Clock} label={timeAgo(entry.created_at)} color={C.cyan} />
                    </div>
                  </div>
                </div>
              </PremiumCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
