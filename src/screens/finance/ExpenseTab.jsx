import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, TrendingDown, AlertTriangle, Trash2,
  Image, Calendar, ChevronDown, Info, Receipt,
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

// ألوان الفئات
const CAT_COLORS = [
  '#F59E0B','#22C55E','#3B82F6','#8B5CF6','#EC4899',
  '#06B6D4','#F97316','#EF4444','#84CC16','#94A3B8',
]
function catColor(cat) {
  const i = EXP_CATS.indexOf(cat)
  return CAT_COLORS[i % CAT_COLORS.length] ?? '#94A3B8'
}

// نسبة خصم מע"מ
function vatDeductRate(cat) { return EXP_CAT_VAT[cat] ?? 1.0 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (rate === 1.0) return (
    <span style={{ fontSize: 9, background: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      מע"מ قابل للخصم 100%
    </span>
  )
  if (rate === 0.667) return (
    <span style={{ fontSize: 9, background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      מע"מ قابل للخصم 67%
    </span>
  )
  return (
    <span style={{ fontSize: 9, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444430', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      مع"מ غير قابل للخصم
    </span>
  )
}

// ─── Entry Row ────────────────────────────────────────────────────────────────
function EntryRow({ entry, showVat, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const color = catColor(entry.category)
  const deductible = Number(entry.vat_amount) * vatDeductRate(entry.category)

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
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
              ₪{fmt(entry.amount)}
              {showVat && entry.vat_amount > 0 && (
                <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600, marginRight: 6 }}>
                  + ₪{fmt(entry.vat_amount)} מע"מ
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: entry.note || entry.vendor_name ? 5 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20 }}>
              {entry.category}
            </span>
            <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
              {METHODS.find(m => m.id === entry.method)?.label ?? entry.method}
            </span>
            {showVat && deductible > 0 && (
              <span style={{ fontSize: 9, color: '#22C55E', background: '#22C55E10', padding: '2px 7px', borderRadius: 20 }}>
                ₪{fmt(deductible)} مخصوم
              </span>
            )}
          </div>

          {entry.vendor_name && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{entry.vendor_name}</div>
          )}
          {entry.note && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, fontStyle: 'italic' }}>{entry.note}</div>
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
function AddExpenseSheet({ open, onClose, onSave, businessType, businessId, projects, userId }) {
  const showVat = businessType === 'osek_moreh' || businessType === 'hevra'

  const [form, setForm] = useState({
    amount: '', vat_amount: '', date: todayStr(),
    category: EXP_CATS[0], vendor_name: '', method: 'cash',
    project_id: '', note: '',
  })
  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [focus,   setFocus]   = useState('')
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // حساب مع"מ تلقائي لما يدخل المبلغ
  function handleAmountChange(v) {
    set('amount', v)
    if (showVat && v && !isNaN(Number(v))) {
      const vatAmt = (Number(v) * VAT).toFixed(2)
      set('vat_amount', vatAmt)
    }
  }

  function reset() {
    setForm({ amount: '', vat_amount: '', date: todayStr(), category: EXP_CATS[0], vendor_name: '', method: 'cash', project_id: '', note: '' })
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
        business_id:  businessId,
        user_id:      userId,
        amount:       Number(form.amount),
        vat_amount:   Number(form.vat_amount) || 0,
        date:         form.date,
        category:     form.category,
        vendor_name:  form.vendor_name.trim() || null,
        method:       form.method,
        project_id:   form.project_id || null,
        note:         form.note.trim() || null,
        receipt_url,
      })
      handleClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const canSave = form.amount && Number(form.amount) > 0 && !saving
  const deductibleVat = showVat && form.vat_amount
    ? (Number(form.vat_amount) * vatDeductRate(form.category)).toFixed(2)
    : 0

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
              position: 'absolute',
              bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom,0px)))',
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
                  {showVat && <span style={{ fontWeight: 400, marginRight: 6 }}>بدون מע"מ</span>}
                </div>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={form.amount} onChange={e => handleAmountChange(e.target.value)}
                  onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                  style={{ ...inp(focus, 'amount'), fontSize: 20, fontWeight: 900, direction: 'ltr', textAlign: 'left', color: C.accent }}
                />
              </div>

              {/* מע"מ — فقط لعוסק מורשה وחברה */}
              {showVat && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>
                      מע"מ (₪) <span style={{ fontWeight: 400 }}>18%</span>
                    </div>
                    <VatHint category={form.category} />
                  </div>
                  <input
                    type="number" inputMode="decimal" placeholder="0.00"
                    value={form.vat_amount} onChange={e => set('vat_amount', e.target.value)}
                    onFocus={() => setFocus('vat')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'vat'), direction: 'ltr', textAlign: 'left', color: '#22C55E' }}
                  />
                  {deductibleVat > 0 && (
                    <div style={{ fontSize: 10, color: '#22C55E', marginTop: 4 }}>
                      ✓ ₪{fmt(deductibleVat)} قابل للخصم من مصلحة الضرائب
                    </div>
                  )}
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
                      <button key={cat} onClick={() => {
                        set('category', cat)
                        // أعد حساب خصم مع"מ عند تغيير الفئة
                        if (showVat && form.vat_amount) {
                          // keep vat_amount as-is, deductible will recalculate
                        }
                      }}
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

              {/* اسم المورّد */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم المورّد / الجهة (اختياري)</div>
                <input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)}
                  placeholder="مثال: חומרי בניין X"
                  onFocus={() => setFocus('vendor')} onBlur={() => setFocus('')}
                  style={inp(focus, 'vendor')} />
              </div>

              {/* المشروع */}
              {projects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ربط بمشروع (اختياري)</div>
                  <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">— بدون مشروع —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

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
export default function ExpenseTab({ projects = [], userId }) {
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()

  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCat,   setFilterCat]   = useState('')

  const bizId       = activeBusiness?.id
  const bizType     = activeBusiness?.business_type ?? 'osek_patur'
  const showVat     = bizType === 'osek_moreh' || bizType === 'hevra'

  // ─── Load ──────────────────────────────────────────────────────────────
  async function load() {
    if (!bizId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expense_entries')
        .select('*')
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bizId])

  // ─── Calculations ──────────────────────────────────────────────────────
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisYear     = now.getFullYear()

  const totalMonth = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey))
           .reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisMonthKey])

  const totalYear = useMemo(() =>
    entries.filter(e => e.date?.startsWith(String(thisYear)))
           .reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisYear])

  const totalVatDeductible = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey))
           .reduce((s, e) => s + Number(e.vat_amount) * vatDeductRate(e.category), 0)
  , [entries, thisMonthKey])

  // رسم بياني بالفئات (الشهر الحالي)
  const catChartData = useMemo(() => {
    const map = {}
    entries.filter(e => e.date?.startsWith(thisMonthKey)).forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount)
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.split('/')[0].trim(), value, full: name }))
  }, [entries, thisMonthKey])

  // ─── Filtered entries ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterCat)   res = res.filter(e => e.category === filterCat)
    return res
  }, [entries, filterMonth, filterCat])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  const usedCats = useMemo(() => {
    const seen = new Set(entries.map(e => e.category))
    return EXP_CATS.filter(c => seen.has(c))
  }, [entries])

  // ─── Actions ───────────────────────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase
      .from('expense_entries').insert(fields).select().single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    showToast('✅ تم تسجيل المصروف')
  }

  async function handleDelete(id) {
    await supabase.from('expense_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  if (!activeBusiness) return null

  return (
    <div>
      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.accent} icon={TrendingDown} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#8B5CF6" />
        {showVat && (
          <StatCard label={'מע"מ مخصوم'} value={totalVatDeductible} color="#22C55E" sub="هذا الشهر" />
        )}
      </div>

      {/* ─── Chart ─────────────────────────────────────────────────────── */}
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

      {/* ─── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الفترات</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterCat ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الفئات</option>
          {usedCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {(filterMonth || filterCat) && (
            <span style={{ marginRight: 6, color: C.accent }}>
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
          <TrendingDown size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterMonth || filterCat ? 'لا توجد مصاريف لهذا الفلتر' : 'لا توجد مصاريف بعد'}
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow key={entry.id} entry={entry} showVat={showVat} onDelete={handleDelete} />
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

      {/* ─── Add Sheet ─────────────────────────────────────────────────── */}
      <AddExpenseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        businessType={bizType}
        businessId={bizId}
        projects={projects}
        userId={userId}
      />
    </div>
  )
}
