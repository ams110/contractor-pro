import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, TrendingUp, TrendingDown, AlertTriangle,
  Banknote, Smartphone, CreditCard, Building,
  ChevronDown, Trash2, Image, Check, Calendar,
} from 'lucide-react'
import { C, GRAD, OSEK_PATUR_THRESHOLD } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const SOURCES = [
  { id: 'client_payment',  label: 'دفعة من عميل',     color: '#22C55E' },
  { id: 'project_payment', label: 'دفعة على مشروع',   color: '#3B82F6' },
  { id: 'advance',         label: 'دفعة مقدمة',        color: '#F59E0B' },
  { id: 'other',           label: 'أخرى',              color: '#94A3B8' },
]

const METHODS = [
  { id: 'cash',     label: 'كاش',          Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',   Icon: Building   },
  { id: 'check',    label: 'شيك',           Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]

function srcColor(src) { return SOURCES.find(s => s.id === src)?.color ?? C.textDim }
function srcLabel(src) { return SOURCES.find(s => s.id === src)?.label ?? src }
function methodLabel(m) { return METHODS.find(x => x.id === m)?.label ?? m }

// ─── Shared input style ───────────────────────────────────────────────────────
const inp = (focus, key) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `${color}0F`, border: `1px solid ${color}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
        ₪{fmt(value)}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ─── Entry row ────────────────────────────────────────────────────────────────
// رمز التوقيع الرقمي للمشروع
function projSig(projectId) {
  if (!projectId) return null
  return projectId.replace(/-/g, '').substring(0, 8).toUpperCase()
}

function EntryRow({ entry, onDelete, projects = [] }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const color = srcColor(entry.source)
  const linkedProject = entry.project_id ? projects.find(p => p.id === entry.project_id) : null
  const sig = projSig(entry.project_id)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Color dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>₪{fmt(entry.amount)}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: entry.note ? 5 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20 }}>
              {srcLabel(entry.source)}
            </span>
            <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
              {methodLabel(entry.method)}
            </span>
            {entry.client_name && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
                {entry.client_name}
              </span>
            )}
            {/* اسم المشروع + توقيع الربط */}
            {linkedProject && (
              <span style={{ fontSize: 9, color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                🏗 {linkedProject.name}
              </span>
            )}
            {sig && (
              <span style={{ fontSize: 8, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', padding: '1px 6px', borderRadius: 20, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                ✓ {sig}
              </span>
            )}
          </div>
          {entry.note && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{entry.note}</div>
          )}
          {entry.proof_url && (
            <a href={entry.proof_url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: C.primary, textDecoration: 'none' }}>
              <Image size={10} /> عرض الإثبات
            </a>
          )}
        </div>

        {/* Delete */}
        <div>
          {!delConfirm ? (
            <button onClick={() => setDelConfirm(true)}
              style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <Trash2 size={13} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setDelConfirm(false)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '3px 7px', fontSize: 10 }}>
                لا
              </button>
              <button onClick={() => onDelete(entry.id)}
                style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                احذف
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────
function AddIncomeSheet({ open, onClose, onSave, businessId, projects, userId }) {
  const now = new Date()
  const [form, setForm] = useState({
    amount: '', date: todayStr(), source: 'client_payment',
    method: 'cash', client_name: '', project_id: '', note: '',
  })
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focus,  setFocus]  = useState('')
  const fileRef = useRef()

  function reset() {
    setForm({ amount: '', date: todayStr(), source: 'client_payment', method: 'cash', client_name: '', project_id: '', note: '' })
    setProofFile(null); setProofPreview(null); setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setProofFile(f)
    setProofPreview(URL.createObjectURL(f))
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return
    setSaving(true)
    try {
      let proof_url = null
      if (proofFile && userId) {
        proof_url = await uploadReceipt(userId, proofFile)
      }
      await onSave({
        business_id:  businessId,
        user_id:      userId,
        amount:       Number(form.amount),
        date:         form.date,
        source:       form.source,
        method:       form.method,
        client_name:  form.client_name.trim() || null,
        project_id:   form.project_id || null,
        note:         form.note.trim() || null,
        proof_url,
      })
      handleClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const canSave = form.amount && Number(form.amount) > 0 && !saving

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom,0px)))',
              left: 0, right: 0, maxWidth: 480, margin: '0 auto',
              background: C.surface, border: `1px solid ${C.borderMid}`,
              borderRadius: 24, maxHeight: 'calc(90dvh - 80px)',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل مدخول جديد</div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

              {/* المبلغ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                  المبلغ (₪) <span style={{ color: C.accent }}>*</span>
                </div>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={form.amount} onChange={e => set('amount', e.target.value)}
                  onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                  style={{ ...inp(focus, 'amount'), fontSize: 20, fontWeight: 900, direction: 'ltr', textAlign: 'left', color: C.success }}
                />
              </div>

              {/* التاريخ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>التاريخ</div>
                <input
                  type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  style={{ ...inp(focus, 'date'), direction: 'ltr' }}
                />
              </div>

              {/* المصدر */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>نوع المدخول</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SOURCES.map(s => {
                    const active = form.source === s.id
                    return (
                      <button key={s.id} onClick={() => set('source', s.id)}
                        style={{ padding: '7px 12px', background: active ? `${s.color}20` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${active ? s.color : C.border}`, borderRadius: 10, color: active ? s.color : C.textDim, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* طريقة الدفع */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {METHODS.map(m => {
                    const active = form.method === m.id
                    return (
                      <button key={m.id} onClick={() => set('method', m.id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: active ? `${C.primary}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <m.Icon size={14} color={active ? C.primary : C.textDim} />
                        <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? C.primary : C.textDim }}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* اسم العميل */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم العميل (اختياري)</div>
                <input
                  value={form.client_name} onChange={e => set('client_name', e.target.value)}
                  placeholder="اسم العميل أو الجهة"
                  onFocus={() => setFocus('client')} onBlur={() => setFocus('')}
                  style={inp(focus, 'client')}
                />
              </div>

              {/* المشروع */}
              {projects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ربط بمشروع (اختياري)</div>
                  <select
                    value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">— بدون مشروع —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ملاحظة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input
                  value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="أي تفاصيل إضافية..."
                  onFocus={() => setFocus('note')} onBlur={() => setFocus('')}
                  style={inp(focus, 'note')}
                />
              </div>

              {/* صورة إثبات */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>صورة إثبات الدفع (اختياري)</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
                {proofPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={proofPreview} alt="proof" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                    <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                      style={{ position: 'absolute', top: -6, insetInlineEnd: -6, background: C.accent, border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.textDim, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Image size={14} /> رفع صورة
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={handleSave} disabled={!canSave}
                style={{ width: '100%', padding: '13px', background: canSave ? GRAD.success : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ تسجيل المدخول'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── MAIN: IncomeTab ──────────────────────────────────────────────────────────
export default function IncomeTab({ projects = [], userId }) {
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()

  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [addOpen,   setAddOpen]   = useState(false)
  const [filterMonth, setFilterMonth] = useState('')  // '' = all

  const bizId = activeBusiness?.id

  // ─── Load ──────────────────────────────────────────────────────────────
  async function load() {
    if (!bizId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('income_entries')
        .select('*')
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [bizId])

  // ─── Calculations ──────────────────────────────────────────────────────
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisYear = now.getFullYear()

  const totalMonth = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey))
           .reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisMonthKey])

  const totalYear = useMemo(() =>
    entries.filter(e => e.date?.startsWith(String(thisYear)))
           .reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisYear])

  // تحذير עוסק פטור
  const isOsekPatur = activeBusiness?.business_type === 'osek_patur'
  const paturPct = isOsekPatur ? (totalYear / OSEK_PATUR_THRESHOLD) * 100 : 0
  const showPaturWarning = isOsekPatur && paturPct >= 70

  // ─── Filtered entries ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!filterMonth) return entries
    return entries.filter(e => e.date?.startsWith(filterMonth))
  }, [entries, filterMonth])

  // قائمة الأشهر للفلترة
  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => {
      if (e.date) seen.add(e.date.slice(0, 7))
    })
    return Array.from(seen).sort().reverse()
  }, [entries])

  // ─── Actions ───────────────────────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase
      .from('income_entries')
      .insert(fields)
      .select()
      .single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    showToast('✅ تم تسجيل المدخول')
  }

  async function handleDelete(id) {
    await supabase.from('income_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  // ─── Render ────────────────────────────────────────────────────────────
  if (!activeBusiness) return null

  return (
    <div>
      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.success} icon={TrendingUp} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#3B82F6" />
        {isOsekPatur && (
          <StatCard
            label="من السقف"
            value={OSEK_PATUR_THRESHOLD - totalYear}
            color={paturPct >= 90 ? C.accent : paturPct >= 70 ? '#F59E0B' : C.textDim}
            sub="متبقي"
          />
        )}
      </div>

      {/* ─── تحذير عوסק פטור ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPaturWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: paturPct >= 90 ? `${C.accent}12` : `${C.warning}12`, border: `1px solid ${paturPct >= 90 ? C.accent : C.warning}30`, borderRadius: 14, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={14} color={paturPct >= 90 ? C.accent : C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: paturPct >= 90 ? C.accent : C.warning }}>
                {paturPct >= 90 ? '⚠️ تجاوزت 90% من سقف עוסק פטור' : 'تنبيه: وصلت 70% من سقف עוסק פטור'}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                ₪{fmt(totalYear)} من أصل ₪{fmt(OSEK_PATUR_THRESHOLD)} ({paturPct.toFixed(0)}%) — تبقّى ₪{fmt(OSEK_PATUR_THRESHOLD - totalYear)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Filter bar ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={12} color={C.textDim} />
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, fontWeight: 600, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="">كل الفترات</option>
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {filterMonth && (
            <span style={{ marginRight: 6, color: C.success }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* ─── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingUp size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterMonth ? 'لا توجد مدخولات في هذه الفترة' : 'لا توجد مدخولات بعد'}
          </div>
          {!filterMonth && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>
              اضغط + لتسجيل أول مدخول
            </div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow key={entry.id} entry={entry} onDelete={handleDelete} projects={projects} />
          ))}
        </AnimatePresence>
      )}

      {/* ─── FAB ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAddOpen(true)}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px',
            background: GRAD.success,
            border: 'none', borderRadius: 50,
            color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${C.success}44`,
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          تسجيل مدخول
        </motion.button>
      </div>

      {/* ─── Add Sheet ─────────────────────────────────────────────────── */}
      <AddIncomeSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        businessId={bizId}
        projects={projects}
        userId={userId}
      />
    </div>
  )
}
