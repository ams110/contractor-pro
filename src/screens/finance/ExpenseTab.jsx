import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, TrendingDown, AlertTriangle, Trash2,
  Image, Calendar, FolderOpen, Receipt,
  Banknote, Smartphone, CreditCard, Building,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT, VAT } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]
function methodLabel(m) { return METHODS.find(x => x.id === m)?.label ?? m }

const CAT_COLORS = [
  '#F59E0B','#22C55E','#3B82F6','#8B5CF6','#EC4899',
  '#06B6D4','#F97316','#EF4444','#84CC16','#94A3B8',
]
function catColor(cat) {
  const i = EXP_CATS.indexOf(cat)
  return CAT_COLORS[i % CAT_COLORS.length] ?? '#94A3B8'
}
function vatDeductRate(cat) { return EXP_CAT_VAT?.[cat] ?? 1.0 }

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
      {sub != null && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ─── VAT Hint Badge ───────────────────────────────────────────────────────────
function VatHint({ category }) {
  const rate = vatDeductRate(category)
  if (rate >= 1.0) return (
    <span style={{ fontSize: 9, background: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} قابل للخصم 100%
    </span>
  )
  if (rate >= 0.6) return (
    <span style={{ fontSize: 9, background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} قابل للخصم 67%
    </span>
  )
  return (
    <span style={{ fontSize: 9, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444430', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} غير قابل للخصم
    </span>
  )
}

// ─── Entry Row ────────────────────────────────────────────────────────────────
function EntryRow({ entry, showVat, projectName, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const color = catColor(entry.category)
  const deductible = Number(entry.vat_amount ?? 0) * vatDeductRate(entry.category)

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>₪{fmt(entry.amount)}</div>
              {entry.ref_number && (
                <span style={{ fontSize: 9, fontWeight: 800, color: C.accent, background: `${C.accent}15`, border: `1px solid ${C.accent}25`, padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {entry.ref_number}
                </span>
              )}
              {showVat && deductible > 0 && (
                <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>
                  خصم {'מע"מ'} ₪{fmt(deductible)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: (entry.note || entry.notes || entry.vendor) ? 5 : 0 }}>
            {entry.category && (
              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20 }}>
                {entry.category}
              </span>
            )}
            {(entry.payment_method || entry.method) && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
                {methodLabel(entry.payment_method || entry.method)}
              </span>
            )}
            {projectName && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}15`, padding: '2px 7px', borderRadius: 20 }}>
                {projectName}
              </span>
            )}
            {showVat && (
              <VatHint category={entry.category} />
            )}
          </div>

          {(entry.vendor) && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{entry.vendor}</div>
          )}
          {(entry.note || entry.notes) && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, fontStyle: 'italic' }}>{entry.note || entry.notes}</div>
          )}
          {entry.receipt_url && (
            <a href={entry.receipt_url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: C.primary, textDecoration: 'none' }}>
              <Receipt size={10} /> عرض الإيصال
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
function AddExpenseSheet({ open, onClose, onSave, businessType, allProjects, userId }) {
  const [form, setForm] = useState({
    amount: '', date: todayStr(),
    category: EXP_CATS[0] ?? 'مواد بناء', vendor: '', payment_method: 'cash',
    project_id: '', note: '',
  })
  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [focus,   setFocus]   = useState('')
  const fileRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function reset() {
    setForm({ amount: '', date: todayStr(), category: EXP_CATS[0] ?? 'مواد بناء', vendor: '', payment_method: 'cash', project_id: '', note: '' })
    setProofFile(null); setProofPreview(null); setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setProofFile(f)
    setProofPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return
    setSaving(true)
    try {
      let receipt_url = null
      if (proofFile && userId) receipt_url = await uploadReceipt(userId, proofFile)
      await onSave({
        user_id:        userId,
        amount:         Number(form.amount),
        date:           form.date,
        category:       form.category,
        vendor:         form.vendor.trim() || null,
        payment_method: form.payment_method,
        project_id:     form.project_id || null,
        note:           form.note.trim() || null,
        receipt_url,
        status:         'approved',
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
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxWidth: 480, margin: '0 auto',
              background: C.card, borderRadius: '20px 20px 0 0',
              border: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', maxHeight: '92dvh',
            }}>

            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل مصروف جديد</div>
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
                  style={{ ...inp(focus, 'amount'), fontSize: 20, fontWeight: 900, direction: 'ltr', textAlign: 'left', color: C.accent }}
                />
              </div>

              {/* المشروع — اختياري */}
              {allProjects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                    المشروع (اختياري)
                  </div>
                  <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">— بدون مشروع —</option>
                    {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* الفئة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>الفئة</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EXP_CATS.map(cat => {
                    const active = form.category === cat
                    const color = catColor(cat)
                    return (
                      <button key={cat} onClick={() => set('category', cat)}
                        style={{ padding: '6px 10px', background: active ? `${color}20` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${active ? color : C.border}`, borderRadius: 10, color: active ? color : C.textDim, fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* التاريخ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>التاريخ</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  style={{ ...inp(focus, 'date'), direction: 'ltr' }} />
              </div>

              {/* طريقة الدفع */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {METHODS.map(m => {
                    const active = form.payment_method === m.id
                    return (
                      <button key={m.id} onClick={() => set('payment_method', m.id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: active ? `${C.accent}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? C.accent : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <m.Icon size={14} color={active ? C.accent : C.textDim} />
                        <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? C.accent : C.textDim }}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* اسم المورّد */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم المورّد / الجهة (اختياري)</div>
                <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
                  placeholder="مثال: חומרי בניין X"
                  onFocus={() => setFocus('vendor')} onBlur={() => setFocus('')}
                  style={inp(focus, 'vendor')} />
              </div>

              {/* ملاحظة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="أي تفاصيل إضافية..."
                  onFocus={() => setFocus('note')} onBlur={() => setFocus('')}
                  style={inp(focus, 'note')} />
              </div>

              {/* صورة الإيصال */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>صورة الإيصال / الفاتورة (اختياري)</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
                {proofPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={proofPreview} alt="receipt" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                    <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                      style={{ position: 'absolute', top: -6, insetInlineEnd: -6, background: C.accent, border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.textDim, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Image size={14} /> رفع صورة إيصال
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={handleSave} disabled={!canSave}
                style={{ width: '100%', padding: '13px', background: canSave ? GRAD.danger : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ تسجيل المصروف'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── MAIN: ExpenseTab ─────────────────────────────────────────────────────────
// linkedProjects: المشاريع المربوطة بالمصلحة النشطة (من FinanceScreen)
export default function ExpenseTab({ userId, linkedProjects = [] }) {
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()

  const [entries,     setEntries]     = useState([])
  const [allProjects, setAllProjects] = useState([])   // مشاريع المستخدم — مجلوبة مباشرة
  const [loading,     setLoading]     = useState(true)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCat,   setFilterCat]   = useState('')
  const [filterProj,  setFilterProj]  = useState('')

  const bizId   = activeBusiness?.id
  const bizType = activeBusiness?.business_type ?? 'osek_patur'
  const showVat = bizType === 'osek_moreh' || bizType === 'hevra'

  // قائمة المشاريع المعروضة في النموذج:
  // إذا في مشاريع مربوطة بالمصلحة → استخدمها، وإلا اعرض كل المشاريع
  const formProjects = linkedProjects.length > 0 ? linkedProjects : allProjects

  const projectMap = useMemo(() => {
    const m = {}
    allProjects.forEach(p => { m[p.id] = p.name })
    return m
  }, [allProjects])

  // ─── جلب expenses الخاصة بالمصلحة النشطة + مشاريع المستخدم ─────────────
  async function load() {
    if (!userId || !bizId) { setLoading(false); return }
    setLoading(true)
    try {
      const [expRes, projRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .eq('business_id', bizId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ])
      if (expRes.error) throw expRes.error
      if (projRes.error) throw projRes.error
      setEntries(expRes.data ?? [])
      setAllProjects(projRes.data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId, bizId]) // eslint-disable-line

  // ─── Stats ────────────────────────────────────────────────────────────────
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisYear = now.getFullYear()

  const totalMonth = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey)).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisMonthKey])

  const totalYear = useMemo(() =>
    entries.filter(e => e.date?.startsWith(String(thisYear))).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisYear])

  const totalVatDeductible = useMemo(() =>
    entries
      .filter(e => e.date?.startsWith(thisMonthKey))
      .reduce((s, e) => s + Number(e.vat_amount ?? 0) * vatDeductRate(e.category), 0)
  , [entries, thisMonthKey])

  // رسم بياني بالفئات (الشهر الحالي)
  const catChartData = useMemo(() => {
    const map = {}
    entries.filter(e => e.date?.startsWith(thisMonthKey)).forEach(e => {
      if (e.category) map[e.category] = (map[e.category] ?? 0) + Number(e.amount)
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.split('/')[0].trim(), value, full: name }))
  }, [entries, thisMonthKey])

  // ─── Filtered ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterCat)   res = res.filter(e => e.category === filterCat)
    if (filterProj)  res = res.filter(e => e.project_id === filterProj)
    return res
  }, [entries, filterMonth, filterCat, filterProj])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  const usedCats = useMemo(() => {
    const seen = new Set(entries.map(e => e.category).filter(Boolean))
    return EXP_CATS.filter(c => seen.has(c))
  }, [entries])

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function handleSave(fields) {
    // حساب مع"מ المضمّن في المصروف (المبلغ شامل مع"מ)
    const vat_amount = showVat
      ? Number(fields.amount) * VAT / (1 + VAT)
      : 0
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...fields, business_id: bizId, vat_amount })
      .select().single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    showToast('✅ تم تسجيل المصروف')
  }

  async function handleDelete(id) {
    await supabase.from('expenses').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  const anyFilter = filterMonth || filterCat || filterProj

  return (
    <div>
      {/* ─── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.accent} icon={TrendingDown} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#8B5CF6" />
        {showVat && (
          <StatCard label={'מע"מ مخصوم'} value={totalVatDeductible} color="#22C55E" sub="هذا الشهر" />
        )}
      </div>

      {/* ─── Chart ──────────────────────────────────────────────────────────── */}
      {catChartData.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 8px 4px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 8, paddingRight: 8 }}>
            توزيع المصاريف — {thisMonthKey}
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={catChartData} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: C.textDim }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11 }}
                formatter={(v, n, props) => [`₪${fmt(v)}`, props.payload.full]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {catChartData.map((entry, i) => (
                  <Cell key={i} fill={catColor(entry.full)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} color={C.textDim} />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">كل الفترات</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterCat ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الفئات</option>
          {usedCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {allProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderOpen size={11} color={C.textDim} />
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterProj ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 140 }}>
              <option value="">كل المشاريع</option>
              {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {anyFilter && (
            <span style={{ marginRight: 6, color: C.accent }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* ─── List ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingDown size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {anyFilter ? 'لا توجد مصاريف لهذا الفلتر' : 'لا توجد مصاريف بعد'}
          </div>
          {!anyFilter && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>اضغط + لتسجيل أول مصروف</div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              showVat={showVat}
              projectName={projectMap[entry.project_id]}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      )}

      {/* ─── FAB ────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom,0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAddOpen(true)}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', background: GRAD.danger,
            border: 'none', borderRadius: 50,
            color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${C.accent}44`,
          }}>
          <Plus size={16} strokeWidth={2.5} />
          تسجيل مصروف
        </motion.button>
      </div>

      {/* ─── Add Sheet ──────────────────────────────────────────────────────── */}
      <AddExpenseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        businessType={bizType}
        allProjects={formProjects}
        userId={userId}
      />
    </div>
  )
}
