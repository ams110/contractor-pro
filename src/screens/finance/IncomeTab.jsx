import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TrendingUp, AlertTriangle,
  Banknote, Smartphone, CreditCard, Building,
  Trash2, Image, Calendar, FolderOpen,
} from 'lucide-react'
import { C, GRAD, OSEK_PATUR_THRESHOLD } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'
import { AddReceiptSheet } from '../../components/sheets/index.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { computeCollectionAging } from '../../lib/insights.js'
import CollectionAging from '../../components/CollectionAging.jsx'

const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]
function methodLabel(m) { return METHODS.find(x => x.id === m)?.label ?? m }

function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `${color}0F`, border: `1px solid ${color}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(value)}</div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function EntryRow({ entry, projectName, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>₪{fmt(entry.amount)}</div>
              {entry.ref_number && (
                <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {entry.ref_number}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
            {projectName && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}15`, padding: '2px 7px', borderRadius: 20 }}>{projectName}</span>
            )}
            {entry.payment_method && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>{methodLabel(entry.payment_method)}</span>
            )}
            {entry.payer_name && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>{entry.payer_name}</span>
            )}
          </div>
          {entry.notes && <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic' }}>{entry.notes}</div>}
          {entry.receipt_url && (
            <a href={entry.receipt_url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: C.primary, textDecoration: 'none' }}>
              <Image size={10} /> عرض الإيصال
            </a>
          )}
        </div>
        <div>
          {!delConfirm
            ? <button onClick={() => setDelConfirm(true)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}><Trash2 size={13} /></button>
            : <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setDelConfirm(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '3px 7px', fontSize: 10 }}>لا</button>
                <button onClick={() => onDelete(entry.id)} style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>احذف</button>
              </div>
          }
        </div>
      </div>
    </motion.div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// linkedProjects: المشاريع المربوطة بالمصلحة النشطة (من FinanceScreen)
// onGoToProjects: callback لفتح صفحة المشاريع (يُمرَّر من FinanceScreen أو App)
// autoOpen:       لما يكون true تُفتح الـ sheet تلقائياً (من pendingAction)
// defaultProjectId: لقفل اختيار المشروع على مشروع محدد (لما نجي من ProjectDetail)
// onSheetClose:   إشعار للأب أن الـ sheet أُغلقت (لإفراغ حالة pendingAction)
export default function IncomeTab({
  userId, linkedProjects = [], onGoToProjects,
  autoOpen = false, defaultProjectId = null, onSheetClose,
  onMutate,
}) {
  const businesses    = useBusinessStore(s => s.businesses)
  const activeBizId   = useBusinessStore(s => s.activeBusinessId)
  const activeBusiness = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )
  const { showToast } = useAppStore()
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterProj,  setFilterProj]  = useState('')

  const projectMap = useMemo(() => {
    const m = {}
    linkedProjects.forEach(p => { m[p.id] = p.name })
    return m
  }, [linkedProjects])

  const bizId = activeBusiness?.id

  async function load() {
    if (!userId || !bizId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('client_receipts')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) {
      console.error('IncomeTab load error:', e)
      setEntries([])
    }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId, bizId]) // eslint-disable-line

  // فتح تلقائي للـ sheet لما يجي pendingAction من شاشة أخرى
  useEffect(() => {
    if (autoOpen) setAddOpen(true)
  }, [autoOpen])

  function handleSheetClose() {
    setAddOpen(false)
    onSheetClose?.()
  }

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisYear = now.getFullYear()

  const totalMonth = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey)).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisMonthKey])

  const totalYear = useMemo(() =>
    entries.filter(e => e.date?.startsWith(String(thisYear))).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisYear])

  const isOsekPatur = activeBusiness?.business_type === 'osek_patur'
  const paturPct    = isOsekPatur ? (totalYear / OSEK_PATUR_THRESHOLD) * 100 : 0
  const showPaturWarning = isOsekPatur && paturPct >= 70

  // رادار التحصيل — أعمار ذمم العملاء + أولوية الاتصال
  const aging = useMemo(() =>
    computeCollectionAging({ projects: linkedProjects, receipts: entries })
  , [linkedProjects, entries])

  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterProj)  res = res.filter(e => e.project_id === filterProj)
    return res
  }, [entries, filterMonth, filterProj])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  async function handleSave(payload) {
    const { error, data } = await supabase
      .from('client_receipts')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    onMutate?.()
    showToast('✅ تم تسجيل القبضة')
  }

  async function handleDelete(id) {
    const entry = entries.find(e => e.id === id)
    const sig = await bioConfirm(`حذف قبضة: ₪${Number(entry?.amount || 0).toLocaleString()}`, 'client_receipts')
    if (!sig) return
    await supabase.from('client_receipts').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    onMutate?.()
    showToast('تم الحذف')
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.success} icon={TrendingUp} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#3B82F6" />
        {isOsekPatur && (
          <StatCard label="متبقي من السقف" value={OSEK_PATUR_THRESHOLD - totalYear}
            color={paturPct >= 90 ? C.accent : paturPct >= 70 ? '#F59E0B' : C.textDim} sub={`${paturPct.toFixed(0)}%`} />
        )}
      </div>

      {/* تحذير עוסק פטור */}
      <AnimatePresence>
        {showPaturWarning && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: paturPct >= 90 ? `${C.accent}12` : `${C.warning}12`, border: `1px solid ${paturPct >= 90 ? C.accent : C.warning}30`, borderRadius: 14, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={14} color={paturPct >= 90 ? C.accent : C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: paturPct >= 90 ? C.accent : C.warning }}>
                {paturPct >= 90 ? 'تجاوزت 90% من سقف עוסק פטור' : 'تنبيه: وصلت 70% من سقف עוסק פטור'}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                ₪{fmt(totalYear)} من أصل ₪{fmt(OSEK_PATUR_THRESHOLD)} — تبقّى ₪{fmt(OSEK_PATUR_THRESHOLD - totalYear)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── رادار التحصيل — أعمار الذمم + أولوية الاتصال ─────────────────────── */}
      <CollectionAging aging={aging} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} color={C.textDim} />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">كل الفترات</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {linkedProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderOpen size={11} color={C.textDim} />
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterProj ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 140 }}>
              <option value="">كل المشاريع</option>
              {linkedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {(filterMonth || filterProj) && (
            <span style={{ marginRight: 6, color: C.success }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingUp size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterMonth || filterProj ? 'لا توجد قبضات لهذا الفلتر' : 'لا توجد قبضات بعد'}
          </div>
          {!filterMonth && !filterProj && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>اضغط + لتسجيل أول قبضة</div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow key={entry.id} entry={entry} projectName={projectMap[entry.project_id]} onDelete={handleDelete} />
          ))}
        </AnimatePresence>
      )}

      {/* FAB */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom,0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setAddOpen(true)}
          style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: GRAD.success, border: 'none', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${C.success}44` }}>
          <Plus size={16} strokeWidth={2.5} />
          تسجيل قبضة
        </motion.button>
      </div>

      <AddReceiptSheet
        open={addOpen}
        onClose={handleSheetClose}
        onSave={handleSave}
        userId={userId}
        businessId={bizId}
        projects={linkedProjects}
        defaultProjectId={defaultProjectId}
        onGoToProjects={onGoToProjects}
      />
    </div>
  )
}
