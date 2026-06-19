import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, TrendingUp, TrendingDown, Banknote,
  Plus, Trash2, FolderOpen, X,
} from 'lucide-react'
import { C, GRAD, EXP_CATS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr, isPaymentOverdue } from '../../lib/helpers.js'
import { calcProjectStats as _calcStats } from '../../lib/calculations.js'
import { supabase } from '../../lib/supabase.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { BlueprintEmpty } from '../../ui/Blueprint.jsx'

const STATUS_COLOR = {
  'نشط':        C.success,
  'مكتمل':      '#3B82F6',
  'عرض سعر':   '#F59E0B',
  'موافق عليه': '#06B6D4',
  'ملغي':       C.accent,
}

const PMETHODS = [
  { id: 'cash',     label: 'كاش'     },
  { id: 'transfer', label: 'تحويل'   },
  { id: 'check',    label: 'شيك'     },
  { id: 'app',      label: 'אפליקציה'},
]

// ─── helpers ─────────────────────────────────────────────────────────────────
const sheetInp = (focus, key) => ({
  width: '100%', padding: '10px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

// ─── EmptyState ─── (طابع «دفتر المخططات» الخفيف عبر BlueprintEmpty)
function EmptyState({ icon: Icon, msg }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <BlueprintEmpty icon={<Icon size={28} color={C.cyan} strokeWidth={1.9} />} text={msg} />
    </div>
  )
}

// ─── SimpleRow ────────────────────────────────────────────────────────────────
function SimpleRow({ amount, date, refNum, label, sub, color, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>₪{fmt(amount)}</span>
            {refNum && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}15`, padding: '1px 6px', borderRadius: 6, fontFamily: 'monospace' }}>
                {refNum}
              </span>
            )}
          </div>
          {label && <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{label}</div>}
          {sub   && <div style={{ fontSize: 9,  color: C.textDim, opacity: 0.7, marginTop: 1 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>{fmtDate(date)}</div>
        {onDelete && (
          !delConfirm
            ? <button onClick={() => setDelConfirm(true)}
                style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            : <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={() => setDelConfirm(false)}
                  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, color: C.textDim, cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}>لا</button>
                <button onClick={() => { onDelete(); setDelConfirm(false) }}
                  style={{ background: C.accent, border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>احذف</button>
              </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── AddReceiptSheet ──────────────────────────────────────────────────────────
function AddReceiptSheet({ open, onClose, onSave, projectId, userId }) {
  const [form, setF] = useState({ amount: '', date: todayStr(), payment_method: 'cash', payer_name: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState('')
  function set(k, v) { setF(f => ({ ...f, [k]: v })) }
  function reset() { setF({ amount: '', date: todayStr(), payment_method: 'cash', payer_name: '', notes: '' }); setSaving(false) }
  function handleClose() { reset(); onClose() }
  const canSave = form.amount && Number(form.amount) > 0 && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ user_id: userId, project_id: projectId, amount: Number(form.amount), date: form.date, payment_method: form.payment_method, payer_name: form.payer_name.trim() || null, notes: form.notes.trim() || null })
      handleClose()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: C.card, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل قبضة</div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>المبلغ (₪) <span style={{ color: C.accent }}>*</span></div>
                <input type="number" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)}
                  onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                  style={{ ...sheetInp(focus, 'amount'), fontSize: 22, fontWeight: 900, direction: 'ltr', color: C.success }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>التاريخ</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ ...sheetInp(focus, 'date'), direction: 'ltr' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PMETHODS.map(m => (
                    <button key={m.id} onClick={() => set('payment_method', m.id)}
                      style={{ flex: 1, padding: '8px 4px', background: form.payment_method === m.id ? `${C.success}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${form.payment_method === m.id ? C.success : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9, fontWeight: form.payment_method === m.id ? 700 : 500, color: form.payment_method === m.id ? C.success : C.textDim }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم الدافع (اختياري)</div>
                <input value={form.payer_name} onChange={e => set('payer_name', e.target.value)}
                  placeholder="اسم العميل أو الجهة"
                  onFocus={() => setFocus('payer')} onBlur={() => setFocus('')} style={sheetInp(focus, 'payer')} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input value={form.notes} onChange={e => set('notes', e.target.value)}
                  onFocus={() => setFocus('notes')} onBlur={() => setFocus('')} style={sheetInp(focus, 'notes')} />
              </div>
            </div>
            <div style={{ padding: '12px 18px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={save} disabled={!canSave}
                style={{ width: '100%', padding: '13px', background: canSave ? GRAD.success : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ تسجيل القبضة'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── AddExpenseSheet ──────────────────────────────────────────────────────────
function AddExpenseSheet({ open, onClose, onSave, projectId, userId }) {
  const [form, setF] = useState({ amount: '', date: todayStr(), category: EXP_CATS[0] ?? '', vendor: '', payment_method: 'cash', note: '' })
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState('')
  function set(k, v) { setF(f => ({ ...f, [k]: v })) }
  function reset() { setF({ amount: '', date: todayStr(), category: EXP_CATS[0] ?? '', vendor: '', payment_method: 'cash', note: '' }); setSaving(false) }
  function handleClose() { reset(); onClose() }
  const canSave = form.amount && Number(form.amount) > 0 && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ user_id: userId, project_id: projectId, amount: Number(form.amount), date: form.date, category: form.category, vendor: form.vendor.trim() || null, payment_method: form.payment_method, note: form.note.trim() || null, status: 'approved' })
      handleClose()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: C.card, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل مصروف</div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>المبلغ (₪) <span style={{ color: C.accent }}>*</span></div>
                <input type="number" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)}
                  onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                  style={{ ...sheetInp(focus, 'amount'), fontSize: 22, fontWeight: 900, direction: 'ltr', color: C.accent }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>الفئة</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {EXP_CATS.map(cat => (
                    <button key={cat} onClick={() => set('category', cat)}
                      style={{ padding: '5px 9px', background: form.category === cat ? `${C.accent}20` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${form.category === cat ? C.accent : C.border}`, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: form.category === cat ? 700 : 500, color: form.category === cat ? C.accent : C.textDim }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>التاريخ</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ ...sheetInp(focus, 'date'), direction: 'ltr' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PMETHODS.map(m => (
                    <button key={m.id} onClick={() => set('payment_method', m.id)}
                      style={{ flex: 1, padding: '8px 4px', background: form.payment_method === m.id ? `${C.accent}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${form.payment_method === m.id ? C.accent : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9, fontWeight: form.payment_method === m.id ? 700 : 500, color: form.payment_method === m.id ? C.accent : C.textDim }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم المورد (اختياري)</div>
                <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
                  onFocus={() => setFocus('vendor')} onBlur={() => setFocus('')} style={sheetInp(focus, 'vendor')} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input value={form.note} onChange={e => set('note', e.target.value)}
                  onFocus={() => setFocus('note')} onBlur={() => setFocus('')} style={sheetInp(focus, 'note')} />
              </div>
            </div>
            <div style={{ padding: '12px 18px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={save} disabled={!canSave}
                style={{ width: '100%', padding: '13px', background: canSave ? GRAD.danger : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ تسجيل المصروف'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ProjectFinanceTab({ userId }) {
  const { showToast } = useAppStore()

  // ── مصلحة نشطة (نفس نمط IncomeTab) ──────────────────────────────────────
  const businesses    = useBusinessStore(s => s.businesses)
  const activeBizId   = useBusinessStore(s => s.activeBusinessId)
  const activeBusiness = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )
  const bizId = activeBusiness?.id

  const [projects,  setProjects]  = useState([])
  const [receipts,  setReceipts]  = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [payments,  setPayments]  = useState([])
  const [workDays,  setWorkDays]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)   // project id
  const [subTab,    setSubTab]    = useState('income')
  const [addOpen,   setAddOpen]   = useState(false)

  // ── جلب بيانات المصلحة النشطة فقط ─────────────────────────────────────
  async function load() {
    if (!userId || !bizId) { setLoading(false); return }
    setLoading(true)
    try {
      // ملاحظة: payments و work_days لا تحملان business_id في المخطط،
      // فنفلترها بـ user_id ثم بالـ project_id (المشاريع نفسها مفلترة بالمصلحة).
      const [pr, rc, ex, py, wd] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).eq('business_id', bizId).order('created_at', { ascending: false }),
        supabase.from('client_receipts').select('*').eq('user_id', userId).eq('business_id', bizId),
        supabase.from('expenses').select('*').eq('user_id', userId).eq('business_id', bizId),
        supabase.from('payments').select('*').eq('user_id', userId),
        supabase.from('work_days').select('*').eq('user_id', userId),
      ])
      setProjects(pr.data ?? [])
      setReceipts(rc.data ?? [])
      setExpenses(ex.data ?? [])
      setPayments(py.data ?? [])
      setWorkDays(wd.data ?? [])
      setSelected(null)   // إعادة تعيين عند تغيير المصلحة
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId, bizId]) // eslint-disable-line

  // ── ملخص مالي لكل مشروع ────────────────────────────────────────────────
  const summaries = useMemo(() => {
    return projects.map(p => {
      const pRcp = receipts.filter(r => r.project_id === p.id)
      const pExp = expenses.filter(e => e.project_id === p.id)
      const pPay = payments.filter(py => py.project_id === p.id)
      // الربح/التكلفة من المصدر الموحّد (calculations.js) — نفس منطق شاشة المشاريع:
      // ربح = إيرادات − (أيام عمل + مصاريف المشروع + مصاريف العمال) — بلا ازدواج.
      const stats = _calcStats(p.id, workDays, expenses, receipts)
      // إجماليات خام للتصفّح فقط (badges)
      const expenseRaw = pExp.reduce((s, e) => s + Number(e.amount), 0)
      const payTotal   = pPay.reduce((s, py) => s + Number(py.amount), 0)
      // تحصيل العقد: قيمة العقد المتفق عليها (price) مقابل المقبوض فعلياً
      const contractPrice = parseFloat(p.price) || 0
      const remaining     = contractPrice > 0 ? Math.max(0, contractPrice - stats.revenue) : 0
      const collectedPct  = contractPrice > 0 ? Math.min(100, Math.round((stats.revenue / contractPrice) * 100)) : 0
      const overdue       = contractPrice > 0 ? isPaymentOverdue(p, receipts) : false
      return {
        ...p,
        income:   stats.revenue,
        expense:  expenseRaw,   // كل المصاريف (للتصفّح) — قد تشمل غير المعتمدة
        payTotal,
        cost:     stats.cost,
        profit:   stats.profit,
        margin:   stats.margin,
        rcpCount: pRcp.length,
        expCount: pExp.length,
        payCount: pPay.length,
        contractPrice,
        remaining,
        collectedPct,
        overdue,
      }
    })
  }, [projects, receipts, expenses, payments, workDays])

  // ── بيانات المشروع المختار ──────────────────────────────────────────────
  const selProject  = useMemo(() => summaries.find(p => p.id === selected), [summaries, selected])
  const selReceipts = useMemo(() => receipts.filter(r => r.project_id === selected).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')), [receipts, selected])
  const selExpenses = useMemo(() => expenses.filter(e => e.project_id === selected).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')), [expenses, selected])
  const selPayments = useMemo(() => payments.filter(p => p.project_id === selected).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')), [payments, selected])

  // ── إجماليات كلية ──────────────────────────────────────────────────────
  const grandIncome  = useMemo(() => summaries.reduce((s, p) => s + p.income, 0), [summaries])
  const grandExpense = useMemo(() => summaries.reduce((s, p) => s + p.cost, 0), [summaries])
  const grandProfit  = useMemo(() => summaries.reduce((s, p) => s + p.profit, 0), [summaries])

  // ── actions ─────────────────────────────────────────────────────────────
  async function addReceipt(fields) {
    const { data, error } = await supabase.from('client_receipts').insert(fields).select().single()
    if (error) throw error
    setReceipts(prev => [data, ...prev])
    showToast('تم تسجيل القبضة')
  }

  async function addExpense(fields) {
    const { data, error } = await supabase.from('expenses').insert(fields).select().single()
    if (error) throw error
    setExpenses(prev => [data, ...prev])
    showToast('تم تسجيل المصروف')
  }

  async function deleteReceipt(id) {
    await supabase.from('client_receipts').delete().eq('id', id)
    setReceipts(prev => prev.filter(r => r.id !== id))
    showToast('تم الحذف')
  }

  async function deleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
  )

  // ════════════════════════════════════════════════════════════════════════
  // ── عرض تفاصيل مشروع مختار ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  if (selected && selProject) {
    const sc = STATUS_COLOR[selProject.status] ?? C.textDim

    const SUBS = [
      { id: 'income',  label: 'قبضات',  icon: TrendingUp,   color: C.success, total: selProject.income,   count: selProject.rcpCount },
      { id: 'expense', label: 'مصاريف', icon: TrendingDown, color: C.accent,  total: selProject.expense,  count: selProject.expCount },
      { id: 'payment', label: 'رواتب',  icon: Banknote,     color: '#8B5CF6', total: selProject.payTotal, count: selProject.payCount },
    ]

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => { setSelected(null); setAddOpen(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex', padding: 4 }}>
            <ChevronRight size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {selProject.name}
            </div>
            {selProject.ref_number && (
              <div style={{ fontSize: 10, color: C.primary, fontFamily: 'monospace', fontWeight: 700 }}>{selProject.ref_number}</div>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: `${sc}18`, padding: '3px 10px', borderRadius: 10, flexShrink: 0 }}>
            {selProject.status}
          </span>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[
            { label: 'إجمالي القبضات', val: selProject.income, color: C.success },
            { label: 'إجمالي التكاليف', val: selProject.cost,  color: C.accent  },
            { label: 'صافي الربح',      val: selProject.profit, color: selProject.profit >= 0 ? C.success : C.accent, sign: true },
          ].map(({ label, val, color, sign }) => (
            <div key={label} style={{ flex: 1, background: `${color}0E`, border: `1px solid ${color}22`, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>
                {sign && val > 0 ? '+' : ''}₪{fmt(val)}
              </div>
              <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* تحصيل العقد — قيمة العقد · مقبوض · باقي للقبض */}
        {selProject.contractPrice > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${selProject.overdue ? C.accent + '40' : C.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>تحصيل العقد</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>قيمة العقد ₪{fmt(selProject.contractPrice)}</span>
            </div>
            {/* شريط التحصيل */}
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${selProject.collectedPct}%`, borderRadius: 4, background: selProject.collectedPct >= 100 ? C.success : GRAD.warm, transition: 'width .4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>₪{fmt(selProject.income)}</div>
                <div style={{ fontSize: 8, color: C.textDim }}>مقبوض ({selProject.collectedPct}%)</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: selProject.remaining > 0 ? C.primary : C.textDim, fontFamily: 'monospace' }}>₪{fmt(selProject.remaining)}</div>
                <div style={{ fontSize: 8, color: C.textDim }}>باقي للقبض</div>
              </div>
            </div>
            {selProject.overdue && (
              <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
                متأخّر {selProject.overdue.daysSince} يوم بدون قبضة جديدة
              </div>
            )}
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {SUBS.map(s => (
            <button key={s.id} onClick={() => { setSubTab(s.id); setAddOpen(false) }}
              style={{ flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: subTab === s.id ? `${s.color}18` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${subTab === s.id ? s.color : C.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              <s.icon size={13} color={subTab === s.id ? s.color : C.textDim} />
              <span style={{ fontSize: 9, fontWeight: 800, color: subTab === s.id ? s.color : C.textDim }}>{s.label}</span>
              <span style={{ fontSize: 10, fontWeight: 900, color: subTab === s.id ? s.color : C.textDim, fontFamily: 'monospace' }}>₪{fmt(s.total)}</span>
              <span style={{ fontSize: 8, color: C.textDim }}>({s.count})</span>
            </button>
          ))}
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <div key={subTab}>
            {subTab === 'income' && (
              <>
                {selReceipts.length === 0
                  ? <EmptyState icon={TrendingUp} msg="لا توجد قبضات لهذا المشروع" />
                  : selReceipts.map(r => (
                      <SimpleRow key={r.id} amount={r.amount} date={r.date} refNum={r.ref_number}
                        label={r.payer_name} sub={r.notes} color={C.success}
                        onDelete={() => deleteReceipt(r.id)} />
                    ))
                }
              </>
            )}

            {subTab === 'expense' && (
              <>
                {selExpenses.length === 0
                  ? <EmptyState icon={TrendingDown} msg="لا توجد مصاريف لهذا المشروع" />
                  : selExpenses.map(e => (
                      <SimpleRow key={e.id} amount={e.amount} date={e.date} refNum={e.ref_number}
                        label={e.category} sub={e.vendor || e.note} color={C.accent}
                        onDelete={() => deleteExpense(e.id)} />
                    ))
                }
              </>
            )}

            {subTab === 'payment' && (
              <>
                {selPayments.length === 0
                  ? <EmptyState icon={Banknote} msg="لا توجد رواتب مرتبطة بهذا المشروع" />
                  : selPayments.map(p => (
                      <SimpleRow key={p.id} amount={p.amount} date={p.date} refNum={p.ref_number}
                        label={p.method} sub={null} color="#8B5CF6"
                        onDelete={null} />
                    ))
                }
              </>
            )}
          </div>
        </AnimatePresence>

        {/* FAB للقبضات والمصاريف فقط */}
        {(subTab === 'income' || subTab === 'expense') && (
          <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom,0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setAddOpen(true)}
              style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: subTab === 'income' ? GRAD.success : GRAD.danger, border: 'none', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${subTab === 'income' ? C.success : C.accent}44` }}>
              <Plus size={16} strokeWidth={2.5} />
              {subTab === 'income' ? 'تسجيل قبضة' : 'تسجيل مصروف'}
            </motion.button>
          </div>
        )}

        {subTab === 'income' && (
          <AddReceiptSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={addReceipt} projectId={selected} userId={userId} />
        )}
        {subTab === 'expense' && (
          <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={addExpense} projectId={selected} userId={userId} />
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── قائمة المشاريع ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* إجماليات كلية */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'إجمالي الدخل',    val: grandIncome,  color: C.success },
          { label: 'إجمالي التكاليف', val: grandExpense, color: C.accent  },
          { label: 'صافي الكل',       val: grandProfit,  color: grandProfit >= 0 ? C.success : C.accent, sign: true },
        ].map(({ label, val, color, sign }) => (
          <div key={label} style={{ flex: 1, background: `${color}0E`, border: `1px solid ${color}22`, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace' }}>
              {sign && val > 0 ? '+' : ''}₪{fmt(val)}
            </div>
            <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* بطاقة لكل مشروع */}
      {summaries.length === 0
        ? <EmptyState icon={FolderOpen} msg="لا توجد مشاريع" />
        : summaries.map(p => {
            const sc  = STATUS_COLOR[p.status] ?? C.textDim
            const pct = Math.max(0, Math.min(100, p.margin ?? 0))
            return (
              <motion.button key={p.id} whileTap={{ scale: 0.98 }}
                onClick={() => { setSelected(p.id); setSubTab('income'); setAddOpen(false) }}
                style={{ width: '100%', display: 'block', background: C.surface, border: `1px solid ${p.profit < 0 ? C.accent + '33' : C.border}`, borderRadius: 16, padding: '14px', marginBottom: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>

                {/* الاسم + الحالة */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.ref_number && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}18`, padding: '2px 7px', borderRadius: 8, fontFamily: 'monospace' }}>
                        {p.ref_number}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 7px', borderRadius: 8 }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{p.name}</div>
                </div>

                {/* الأرقام */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>₪{fmt(p.income)}</div>
                    <div style={{ fontSize: 8, color: C.textDim }}>قبضات ({p.rcpCount})</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, fontFamily: 'monospace' }}>₪{fmt(p.cost)}</div>
                    <div style={{ fontSize: 8, color: C.textDim }}>تكاليف ({p.expCount + p.payCount})</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: p.profit >= 0 ? C.success : C.accent, fontFamily: 'monospace' }}>
                      {p.profit >= 0 ? '+' : ''}₪{fmt(p.profit)}
                    </div>
                    <div style={{ fontSize: 8, color: C.textDim }}>صافي</div>
                  </div>
                </div>

                {/* شريط التقدم */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: p.profit >= 0 ? C.success : C.accent, transition: 'width .4s ease' }} />
                </div>

                {/* باقي للقبض من العقد (إن وُجد سعر) */}
                {p.contractPrice > 0 && p.remaining > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 9, color: C.textDim }}>
                      باقي للقبض من العقد
                      {p.overdue && <span style={{ color: C.accent, fontWeight: 700 }}> · متأخّر {p.overdue.daysSince}ي</span>}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>₪{fmt(p.remaining)}</span>
                  </div>
                )}
              </motion.button>
            )
          })
      }
    </div>
  )
}
