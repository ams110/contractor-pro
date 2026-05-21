import React, { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  CreditCard, Banknote, Calculator,
  Plus, Search, X, Trash2, Check, CheckCircle2,
  XCircle, Paperclip, ChevronDown, Receipt, AlertTriangle,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT, PAY_METHODS, VAT } from '../../constants/index.js'
import { fmt, fmtDate, todayStr, validateExpense, validatePayment } from '../../lib/helpers.js'
import { calcMustahaq, calcPaid, calcAdvances, calcMutabqi } from '../../lib/calculations.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useAppStore } from '../../store/useAppStore.js'
import AccountingScreen from '../AccountingScreen.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lbl(ar, he, en, lang) { return lang === 'he' ? he : lang === 'en' ? en : ar }

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ active, label, icon: Icon, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '10px 6px', background: active ? `${C.gold}18` : 'transparent',
      border: `1px solid ${active ? C.gold + '40' : 'transparent'}`,
      borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
    }}>
      <Icon size={16} color={active ? C.gold : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9.5, fontWeight: active ? 800 : 600, color: active ? C.gold : C.textDim }}>{label}</span>
      {badge > 0 && (
        <div style={{ position: 'absolute', top: 4, insetInlineEnd: 8, minWidth: 14, height: 14, borderRadius: 7, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff', padding: '0 3px' }}>{badge}</div>
      )}
    </button>
  )
}

// ─── Shared: Field ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
const inp = { width: '100%', padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }
const sel = { ...inp, cursor: 'pointer' }

// ─── Shared: BottomSheet ───────────────────────────────────────────────────────
function Sheet({ open, onClose, title, children, action }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))', left: 0, right: 0, maxWidth: 480, margin: '0 auto',
              background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 24,
              maxHeight: 'calc(92dvh - 80px)', display: 'flex', flexDirection: 'column',
            }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{title}</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>{children}</div>
            {action && (
              <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
                {action}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Shared: Confirm ───────────────────────────────────────────────────────────
function Confirm({ open, msg, onConfirm, onCancel, lang }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: 24, maxWidth: 320, width: '100%' }}>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>{msg}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lbl('إلغاء', 'ביטול', 'Cancel', lang)}
              </button>
              <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: C.accent, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lbl('حذف', 'מחק', 'Delete', lang)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── EXPENSES TAB ─────────────────────────────────────────────────────────────
function ExpensesTab({ expenses = [], projects = [], employees = [], expCats = [], clientReceipts = [], addExpense, deleteExpense, approveExpense, rejectExpense, userId, permissions, businessType, language }) {
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const cats = expCats.length ? expCats : EXP_CATS

  const [showForm, setShowForm]   = useState(false)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview, setPreview]     = useState('')
  const [expandedExp, setExpandedExp] = useState(null)
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), amount: '', category: '', project_id: '', vendor: '', payment_method: '', client_receipt_id: '', employee_id: '' }
  const [form, setForm] = useState(emptyForm)
  const f = k => v => setForm(p => ({ ...p, [k]: v }))

  // قبضات المشروع المحدد مع الميزانية المتبقية (مصاريف)
  const projectReceipts = useMemo(() => {
    if (!form.project_id) return []
    return clientReceipts
      .filter(r => r.project_id === form.project_id)
      .map(r => {
        const usedPay = expenses.filter(e => e.client_receipt_id === r.id).reduce((s, e) => s + (e.amount || 0), 0)
        return { ...r, usedPay, remaining: (r.amount || 0) - usedPay }
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [form.project_id, clientReceipts, expenses])

  const selectedReceipt = form.client_receipt_id
    ? projectReceipts.find(r => r.id === form.client_receipt_id)
    : null

  const pending  = expenses.filter(e => e.status === 'pending')
  const approved = expenses.filter(e => e.status !== 'pending')

  const filtered = useMemo(() => {
    let list = approved
    if (catFilter !== 'all') list = list.filter(e => e.category === catFilter)
    if (search) list = list.filter(e => `${e.category}${e.vendor}${e.description}`.toLowerCase().includes(search.toLowerCase()))
    return list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [approved, catFilter, search])

  const total = approved.reduce((s, e) => s + (e.amount || 0), 0)
  const totalVAT = Math.round(approved.reduce((s, e) => {
    const rate   = (e.date || '') >= '2025-01-01' ? 0.18 : 0.17
    const deduct = EXP_CAT_VAT[e.category] ?? 1.0
    return s + (e.amount || 0) * deduct * (rate / (1 + rate))
  }, 0))

  function pickFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setFormErr('حجم الملف أكثر من 10MB'); return }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setReceiptFile(file)
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))
    else setPreview('')
  }

  async function save() {
    const err = validateExpense(form)
    if (err) return setFormErr(err)
    if (form.client_receipt_id && selectedReceipt) {
      if (parseFloat(form.amount) > selectedReceipt.remaining) {
        return setFormErr(`المبلغ يتجاوز المتبقي من القبضة ${selectedReceipt.ref_number || ''} — المتبقي: ₪${fmt(selectedReceipt.remaining)}`)
      }
    }
    setSaving(true); setFormErr('')
    try {
      let receipt_url = ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      await addExpense({ ...form, amount: parseFloat(form.amount), receipt_url, client_receipt_id: form.client_receipt_id || null, employee_id: form.employee_id || null })
      setForm(emptyForm); setReceiptFile(null); setPreview(''); setShowForm(false)
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const catChips = ['all', ...new Set(approved.map(e => e.category).filter(Boolean))].slice(0, 7)

  return (
    <div dir={dir}>
      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 16, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{lbl('إجمالي المصاريف', 'סה"כ הוצאות', 'Total Expenses', language)}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>₪{fmt(total)}</div>
        </div>
        {businessType !== 'osek_patur' && (
          <div style={{ background: `${C.cyan}0A`, border: `1px solid ${C.cyan}25`, borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{lbl('مع"מ قابل للخصم', 'מע"מ לניכוי', 'VAT Deductible', language)}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.cyan }}>₪{fmt(totalVAT)}</div>
          </div>
        )}
      </div>

      {/* Pending approval */}
      {pending.length > 0 && (
        <div style={{ background: `${C.warning}0A`, border: `1px solid ${C.warning}25`, borderRadius: 16, padding: '12px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.warning, marginBottom: 8 }}>
            {lbl(`${pending.length} مصروف بانتظار الموافقة`, `${pending.length} הוצאות ממתינות`, `${pending.length} Pending`, language)}
          </div>
          {pending.map(exp => {
            const proj = projects.find(p => p.id === exp.project_id)
            return (
              <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{exp.category || exp.vendor || '—'}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(exp.date)} {proj ? `· ${proj.name}` : ''}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.accent, flexShrink: 0 }}>₪{fmt(exp.amount || 0)}</span>
                {permissions?.isOwner && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => approveExpense?.(exp.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.success }}>
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => rejectExpense?.(exp.id, '')} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.accent }}>
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add + search row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={lbl('ابحث...', 'חפש...', 'Search...', language)}
            style={{ ...inp, paddingInlineStart: 32 }} />
        </div>
        {permissions?.addExpenses !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => { setForm(emptyForm); setFormErr(''); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 12, background: GRAD.danger, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <Plus size={14} strokeWidth={2.5} />
            {lbl('إضافة', 'הוסף', 'Add', language)}
          </motion.button>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {catChips.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding: '4px 11px', borderRadius: 9, whiteSpace: 'nowrap', background: catFilter === c ? GRAD.danger : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === c ? 'transparent' : C.border}`, color: catFilter === c ? '#fff' : C.textDim, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {c === 'all' ? lbl('الكل', 'הכל', 'All', language) : c}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', color: C.textDim, fontSize: 13 }}>
          {lbl('لا توجد مصاريف', 'אין הוצאות', 'No expenses', language)}
        </div>
      ) : filtered.map(exp => {
        const proj    = projects.find(p => p.id === exp.project_id)
        const emp     = employees.find(e => e.id === exp.employee_id)
        const rcpt    = clientReceipts.find(r => r.id === exp.client_receipt_id)
        const isOpen  = expandedExp === exp.id
        return (
          <div key={exp.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
            {/* صف رئيسي */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={14} color={C.accent} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{exp.category || exp.vendor || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, color: C.textDim }}>{fmtDate(exp.date)}</span>
                  {exp.ref_number && (
                    <button onClick={() => setExpandedExp(isOpen ? null : exp.id)}
                      style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 5, padding: '1px 6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
                      {exp.ref_number}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>-₪{fmt(exp.amount || 0)}</span>
                {exp.receipt_url && (
                  <a href={exp.receipt_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, color: C.primary, flexShrink: 0, textDecoration: 'none' }}>
                    <Paperclip size={12} strokeWidth={2} />
                  </a>
                )}
                {permissions?.isOwner && (
                  <button onClick={() => setConfirmDel(exp.id)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
            {/* تفاصيل موسّعة عند الضغط على الرقم */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proj && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.textDim, width: 52 }}>المشروع</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{proj.name}</span>
                    {proj.ref_number && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}15`, borderRadius: 5, padding: '1px 6px' }}>{proj.ref_number}</span>}
                  </div>
                )}
                {rcpt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.textDim, width: 52 }}>القبضة</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>{rcpt.ref_number}</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>₪{fmt(rcpt.amount)}</span>
                  </div>
                )}
                {emp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.textDim, width: 52 }}>العامل</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.secondary }}>{emp.name}</span>
                  </div>
                )}
                {exp.vendor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.textDim, width: 52 }}>المورّد</span>
                    <span style={{ fontSize: 11, color: C.text }}>{exp.vendor}</span>
                  </div>
                )}
                {!proj && !rcpt && !emp && (
                  <span style={{ fontSize: 11, color: C.textDim }}>لا توجد ارتباطات مسجّلة</span>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Expense Sheet */}
      <Sheet open={showForm} onClose={() => setShowForm(false)} title={lbl('مصروف جديد', 'הוצאה חדשה', 'New Expense', language)}
        action={
          <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
            style={{ width: '100%', padding: '13px', borderRadius: 14, background: saving ? C.card : GRAD.danger, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? lbl('جاري الحفظ...', 'שומר...', 'Saving...', language) : lbl('حفظ المصروف', 'שמור הוצאה', 'Save Expense', language)}
          </motion.button>
        }>
        <Field label={lbl('التاريخ', 'תאריך', 'Date', language)}>
          <input type="date" value={form.date} onChange={e => f('date')(e.target.value)} style={inp} />
        </Field>
        <Field label={lbl('المبلغ (₪)', 'סכום (₪)', 'Amount (₪)', language)}>
          <input type="number" value={form.amount} onChange={e => f('amount')(e.target.value)} placeholder="0" style={inp} />
        </Field>
        <Field label={lbl('الفئة', 'קטגוריה', 'Category', language)}>
          <select value={form.category} onChange={e => f('category')(e.target.value)} style={sel}>
            <option value="">{lbl('اختر فئة...', 'בחר קטגוריה...', 'Select category...', language)}</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={lbl('المشروع', 'פרויקט', 'Project', language)}>
          <select value={form.project_id} onChange={e => { f('project_id')(e.target.value); f('client_receipt_id')('') }} style={sel}>
            <option value="">{lbl('بدون مشروع', 'ללא פרויקט', 'No project', language)}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.ref_number ? ` · ${p.ref_number}` : ''}</option>)}
          </select>
        </Field>

        {form.project_id && (
          <Field label={lbl('القبضة (اختياري)', 'קבלה מלקוח', 'Client Receipt', language)}>
            {projectReceipts.length === 0
              ? <div style={{ fontSize: 11, color: C.textDim, padding: '8px 12px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>{lbl('لا توجد قبضات لهذا المشروع', 'אין קבלות', 'No receipts', language)}</div>
              : <>
                  <select value={form.client_receipt_id} onChange={e => f('client_receipt_id')(e.target.value)} style={sel}>
                    <option value="">{lbl('بدون ربط بقبضة', 'ללא קישור', 'No receipt link', language)}</option>
                    {projectReceipts.map(r => (
                      <option key={r.id} value={r.id} disabled={r.remaining <= 0}>
                        {r.ref_number || '—'} · ₪{fmt(r.amount)} · {lbl('متبقي', 'נותר', 'Left', language)}: ₪{fmt(r.remaining)}{r.remaining <= 0 ? ' ✗' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedReceipt && (
                    <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 10, background: selectedReceipt.remaining <= 0 ? `${C.accent}12` : `${C.success}12`, border: `1px solid ${selectedReceipt.remaining <= 0 ? C.accent : C.success}30`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedReceipt.remaining <= 0
                        ? <AlertTriangle size={12} color={C.accent} strokeWidth={2} />
                        : <Receipt size={12} color={C.success} strokeWidth={2} />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: selectedReceipt.remaining <= 0 ? C.accent : C.success }}>
                        {selectedReceipt.remaining <= 0 ? lbl('القبضة مستنفدة', 'מנוצל', 'Depleted', language) : `${lbl('متبقي', 'נותר', 'Remaining', language)}: ₪${fmt(selectedReceipt.remaining)}`}
                      </span>
                    </div>
                  )}
                </>
            }
          </Field>
        )}

        <Field label={lbl('العامل (اختياري)', 'עובד', 'Worker (optional)', language)}>
          <select value={form.employee_id} onChange={e => f('employee_id')(e.target.value)} style={sel}>
            <option value="">{lbl('بدون عامل', 'ללא עובד', 'No worker', language)}</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>

        <Field label={lbl('المورّد / الوصف', 'ספק / תיאור', 'Vendor / Description', language)}>
          <input value={form.vendor} onChange={e => f('vendor')(e.target.value)} style={inp} />
        </Field>
        <Field label={lbl('طريقة الدفع', 'אמצעי תשלום', 'Payment Method', language)}>
          <select value={form.payment_method} onChange={e => f('payment_method')(e.target.value)} style={sel}>
            <option value="">{lbl('اختر...', 'בחר...', 'Select...', language)}</option>
            {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>

        {/* Receipt upload */}
        <Field label={lbl('إيصال (اختياري)', 'קבלה (אופציונלי)', 'Receipt (optional)', language)}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={pickFile} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '9px', borderRadius: 12, background: C.card, border: `1px dashed ${C.borderMid}`, color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
            <Paperclip size={13} />
            {receiptFile ? receiptFile.name : lbl('رفع إيصال', 'העלה קבלה', 'Upload receipt', language)}
          </button>
          {preview && <img src={preview} style={{ width: '100%', borderRadius: 10, marginTop: 8, maxHeight: 120, objectFit: 'cover' }} />}
        </Field>

        {formErr && <div style={{ fontSize: 12, color: C.accent, marginBottom: 4, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 10 }}>{formErr}</div>}
      </Sheet>

      <Confirm open={!!confirmDel} lang={language}
        msg={lbl('هل تريد حذف هذا المصروف؟', 'למחוק הוצאה זו?', 'Delete this expense?', language)}
        onConfirm={() => { deleteExpense?.(confirmDel); setConfirmDel(null) }}
        onCancel={() => setConfirmDel(null)} />
    </div>
  )
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab({ payments = [], employees = [], workDays = [], expenses = [], advances = [], projects = [], clientReceipts = [], addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest, userId, permissions, payMethods = [], language }) {
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const methods = payMethods.length ? payMethods : PAY_METHODS

  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview, setPreview]     = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [approveProj, setApproveProj] = useState('')
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), employee_id: '', amount: '', method: '', project_id: '', client_receipt_id: '' }
  const [form, setForm] = useState(emptyForm)
  const f = k => v => setForm(p => ({ ...p, [k]: v }))

  // قبضات المشروع المحدد مع الميزانية المتبقية
  const projectReceipts = useMemo(() => {
    if (!form.project_id) return []
    return clientReceipts
      .filter(r => r.project_id === form.project_id)
      .map(r => {
        const used = payments
          .filter(p => p.client_receipt_id === r.id && p.id !== editingId)
          .reduce((s, p) => s + (p.amount || 0), 0)
        return { ...r, used, remaining: (r.amount || 0) - used }
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [form.project_id, clientReceipts, payments, editingId])

  const selectedReceipt = form.client_receipt_id
    ? projectReceipts.find(r => r.id === form.client_receipt_id)
    : null

  function calcOwed(empId) {
    return Math.max(0, calcMutabqi(
      workDays.filter(w => w.employee_id === empId && w.status === 'approved'),
      expenses.filter(e => e.employee_id === empId && e.status === 'approved'),
      payments.filter(p => p.employee_id === empId),
      advances.filter(a => a.employee_id === empId),
    ))
  }

  function openAdd() {
    setEditingId(null); setForm(emptyForm); setFormErr('')
    setReceiptFile(null); setPreview(''); setShowForm(true)
  }
  function openEdit(pay) {
    setEditingId(pay.id)
    setForm({ date: pay.date, employee_id: pay.employee_id, amount: String(pay.amount), method: pay.method || '', project_id: pay.project_id || '', client_receipt_id: pay.client_receipt_id || '' })
    setFormErr(''); setReceiptFile(null); setPreview(pay.receipt_url || ''); setShowForm(true)
  }

  function pickFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setFormErr('حجم الملف أكثر من 10MB'); return }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setReceiptFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function save() {
    const err = validatePayment(form)
    if (err) return setFormErr(err)
    // تحقق من ميزانية القبضة
    if (form.client_receipt_id && selectedReceipt) {
      const newAmt = parseFloat(form.amount)
      if (newAmt > selectedReceipt.remaining) {
        return setFormErr(`المبلغ يتجاوز المتبقي من القبضة ${selectedReceipt.ref_number || ''} — المتبقي: ₪${fmt(selectedReceipt.remaining)}`)
      }
    }
    setSaving(true); setFormErr('')
    try {
      let receipt_url = preview && !receiptFile ? preview : ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      const payload = { ...form, amount: parseFloat(form.amount), receipt_url, project_id: form.project_id || null, client_receipt_id: form.client_receipt_id || null }
      if (editingId) {
        await updatePayment(editingId, { date: payload.date, amount: payload.amount, method: payload.method, project_id: payload.project_id, receipt_url: payload.receipt_url, client_receipt_id: payload.client_receipt_id })
      } else {
        await addPayment(payload)
      }
      setForm(emptyForm); setReceiptFile(null); setPreview(''); setShowForm(false); setEditingId(null)
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const pending  = payments.filter(p => p.status === 'pending')
  const approved = payments.filter(p => p.status !== 'pending')
  const sorted   = useMemo(() => approved.filter(p => !search || employees.find(e => e.id === p.employee_id)?.name?.toLowerCase().includes(search.toLowerCase())).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), [approved, employees, search])

  const totalPaid = approved.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOwed = employees.reduce((s, e) => s + calcOwed(e.id), 0)
  const showAmounts = permissions?.viewAmounts !== false

  return (
    <div dir={dir}>
      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: `${C.secondary}0A`, border: `1px solid ${C.secondary}25`, borderRadius: 16, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{lbl('إجمالي الرواتب', 'סה"כ שכר', 'Total Paid', language)}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.secondary }}>₪{showAmounts ? fmt(totalPaid) : '---'}</div>
        </div>
        <div style={{ background: `${C.warning}0A`, border: `1px solid ${C.warning}25`, borderRadius: 16, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{lbl('المستحقات', 'חוב לעובדים', 'Owed', language)}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.warning }}>₪{showAmounts ? fmt(totalOwed) : '---'}</div>
        </div>
      </div>

      {/* Pending approval */}
      {pending.length > 0 && permissions?.isOwner && (
        <div style={{ background: `${C.warning}0A`, border: `1px solid ${C.warning}25`, borderRadius: 16, padding: '12px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.warning, marginBottom: 8 }}>
            {lbl(`${pending.length} طلب دفع بانتظار الموافقة`, `${pending.length} בקשות תשלום`, `${pending.length} Pending`, language)}
          </div>
          {pending.map(pay => {
            const emp = employees.find(e => e.id === pay.employee_id)
            return (
              <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{emp?.name || '—'}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.secondary, flexShrink: 0 }}>₪{fmt(pay.amount || 0)}</span>
                {approvingId === pay.id ? (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <select value={approveProj} onChange={e => setApproveProj(e.target.value)}
                      style={{ padding: '4px 8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 10, fontFamily: 'inherit' }}>
                      <option value="">{lbl('مشروع', 'פרויקט', 'Project', language)}</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={async () => { await approvePaymentRequest?.(pay.id, approveProj || null); setApprovingId(null); setApproveProj('') }}
                      style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: C.success, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {lbl('موافقة', 'אשר', 'Approve', language)}
                    </button>
                    <button onClick={() => setApprovingId(null)}
                      style={{ padding: '4px 8px', borderRadius: 8, background: 'none', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => setApprovingId(pay.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.success }}>
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => rejectPaymentRequest?.(pay.id, '')} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.accent }}>
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={lbl('ابحث عن عامل...', 'חפש עובד...', 'Search worker...', language)}
          style={{ ...inp, paddingInlineStart: 32 }} />
      </div>

      {/* Worker Cards */}
      {employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px', color: C.textDim, fontSize: 13 }}>
          {lbl('لا يوجد عمال', 'אין עובדים', 'No workers', language)}
        </div>
      ) : employees.filter(emp => !search || emp.name?.toLowerCase().includes(search.toLowerCase())).map(emp => {
        const wds    = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
        const wExp   = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
        const pays   = payments.filter(p => p.employee_id === emp.id)
        const advs   = advances.filter(a => a.employee_id === emp.id)
        const earned = calcMustahaq(wds, wExp)
        const paid   = calcPaid(pays)
        const owed   = Math.max(0, calcMutabqi(wds, wExp, pays, advs))
        const pct    = earned > 0 ? Math.min(100, Math.round(((paid + calcAdvances(advs)) / earned) * 100)) : 0
        const recent = pays.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 2)
        if (emp.status === 'ملغي' || emp.status === 'محذوف') return null

        return (
          <div key={emp.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', marginBottom: 12 }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: `${C.secondary}20`, border: `1px solid ${C.secondary}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: C.secondary, flexShrink: 0 }}>
                {emp.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{emp.name}</div>
                {emp.specialty && <div style={{ fontSize: 10, color: C.textDim }}>{emp.specialty}</div>}
              </div>
              {permissions?.addPayments !== false && (
                <motion.button whileTap={{ scale: 0.93 }}
                  onClick={() => {
                    setEditingId(null)
                    const o = calcOwed(emp.id)
                    setForm({ date: todayStr(), employee_id: emp.id, amount: o > 0 ? String(o) : '', method: '', project_id: '' })
                    setFormErr(''); setReceiptFile(null); setPreview(''); setShowForm(true)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, background: `linear-gradient(135deg, ${C.secondary}, #2563EB)`, border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  <Plus size={12} strokeWidth={2.5} />
                  {lbl('دفعة', 'תשלום', 'Pay', language)}
                </motion.button>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { label: lbl('مكتسب', 'הרוויח', 'Earned', language),  value: earned,        color: C.success   },
                { label: lbl('مدفوع', 'שולם',   'Paid',   language),  value: paid,          color: C.secondary },
                { label: lbl('مستحق', 'חוב',    'Owed',   language),  value: owed,          color: owed > 0 ? C.warning : C.textDim },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, borderRadius: 12, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: showAmounts ? color : C.textDim }}>
                    {showAmounts ? `₪${fmt(value)}` : '---'}
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: `${C.secondary}18`, borderRadius: 2, marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: pct >= 100 ? `linear-gradient(90deg,${C.success},${C.cyan})` : `linear-gradient(90deg,${C.secondary},#2563EB)`, transition: 'width .4s ease' }} />
            </div>

            {/* Recent payments */}
            {recent.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {recent.map(pay => {
                  const proj = projects.find(p => p.id === pay.project_id)
                  return (
                    <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)}{pay.method ? ` · ${pay.method}` : ''}{proj ? ` · ${proj.name}` : ''}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                          {pay.ref_number && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, letterSpacing: '0.04em' }}>{pay.ref_number}</span>}
                          {pay.client_receipt_id && (() => {
                            const rcpt = clientReceipts.find(r => r.id === pay.client_receipt_id)
                            return rcpt ? <span style={{ fontSize: 9, fontWeight: 600, color: C.cyan, display: 'flex', alignItems: 'center', gap: 2 }}><Receipt size={8} strokeWidth={2} />{rcpt.ref_number}</span> : null
                          })()}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.secondary, flexShrink: 0 }}>₪{fmt(pay.amount || 0)}</span>
                      {pay.receipt_url && (
                        <a href={pay.receipt_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: `${C.secondary}18`, border: `1px solid ${C.secondary}33`, color: C.secondary, flexShrink: 0, textDecoration: 'none' }}>
                          <Paperclip size={10} strokeWidth={2} />
                        </a>
                      )}
                      {permissions?.isOwner && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button onClick={() => openEdit(pay)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => setConfirmDel(pay.id)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}>
                            <Trash2 size={11} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Add / Edit Sheet */}
      <Sheet open={showForm} onClose={() => setShowForm(false)} title={editingId ? lbl('تعديل الدفعة', 'ערוך תשלום', 'Edit Payment', language) : lbl('دفعة جديدة', 'תשלום חדש', 'New Payment', language)}
        action={
          <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
            style={{ width: '100%', padding: '13px', borderRadius: 14, background: saving ? C.card : `linear-gradient(135deg, ${C.secondary}, #2563EB)`, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? lbl('جاري الحفظ...', 'שומר...', 'Saving...', language) : editingId ? lbl('حفظ التعديل', 'שמור שינויים', 'Save Changes', language) : lbl('حفظ الدفعة', 'שמור תשלום', 'Save Payment', language)}
          </motion.button>
        }>
        <Field label={lbl('العامل', 'עובד', 'Worker', language)}>
          <select value={form.employee_id} onChange={e => {
            const id = e.target.value
            const owed = calcOwed(id)
            setForm(p => ({ ...p, employee_id: id, amount: owed > 0 ? String(owed) : p.amount }))
          }} style={sel}>
            <option value="">{lbl('اختر عامل...', 'בחר עובד...', 'Select worker...', language)}</option>
            {employees.map(e => {
              const owed = calcOwed(e.id)
              return <option key={e.id} value={e.id}>{e.name}{owed > 0 ? ` (${lbl('مستحق', 'חוב', 'owed', language)}: ₪${fmt(owed)})` : ''}</option>
            })}
          </select>
        </Field>
        <Field label={lbl('المبلغ (₪)', 'סכום (₪)', 'Amount (₪)', language)}>
          <input type="number" value={form.amount} onChange={e => f('amount')(e.target.value)} placeholder="0" style={inp} />
        </Field>
        <Field label={lbl('التاريخ', 'תאריך', 'Date', language)}>
          <input type="date" value={form.date} onChange={e => f('date')(e.target.value)} style={inp} />
        </Field>
        <Field label={lbl('طريقة الدفع', 'אמצעי תשלום', 'Method', language)}>
          <select value={form.method} onChange={e => f('method')(e.target.value)} style={sel}>
            <option value="">{lbl('اختر...', 'בחר...', 'Select...', language)}</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={lbl('المشروع *', 'פרויקט *', 'Project *', language)}>
          <select value={form.project_id} onChange={e => { f('project_id')(e.target.value); f('client_receipt_id')('') }} style={{ ...sel, borderColor: !form.project_id ? C.accent + '88' : undefined }}>
            <option value="">{lbl('اختر المشروع...', 'בחר פרויקט...', 'Select project...', language)}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        {/* ربط القبضة */}
        {form.project_id && (
          <Field label={lbl('القبضة (اختياري)', 'קבלה מלקוח', 'Client Receipt', language)}>
            {projectReceipts.length === 0 ? (
              <div style={{ fontSize: 11, color: C.textDim, padding: '8px 12px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
                {lbl('لا توجد قبضات لهذا المشروع', 'אין קבלות לפרויקט', 'No receipts for this project', language)}
              </div>
            ) : (
              <>
                <select value={form.client_receipt_id} onChange={e => f('client_receipt_id')(e.target.value)} style={sel}>
                  <option value="">{lbl('بدون ربط بقبضة', 'ללא קישור', 'No receipt link', language)}</option>
                  {projectReceipts.map(r => (
                    <option key={r.id} value={r.id} disabled={r.remaining <= 0}>
                      {r.ref_number || '—'} · ₪{fmt(r.amount)} · {lbl('متبقي', 'נותר', 'Left', language)}: ₪{fmt(r.remaining)}{r.remaining <= 0 ? ' ✗' : ''}
                    </option>
                  ))}
                </select>
                {selectedReceipt && (
                  <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 10, background: selectedReceipt.remaining <= 0 ? `${C.accent}12` : `${C.success}12`, border: `1px solid ${selectedReceipt.remaining <= 0 ? C.accent : C.success}30`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedReceipt.remaining <= 0
                      ? <AlertTriangle size={12} color={C.accent} strokeWidth={2} />
                      : <Receipt size={12} color={C.success} strokeWidth={2} />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: selectedReceipt.remaining <= 0 ? C.accent : C.success }}>
                      {selectedReceipt.remaining <= 0
                        ? lbl('القبضة مستنفدة بالكامل', 'קבלה מנוצלת', 'Receipt depleted', language)
                        : `${lbl('متبقي', 'נותר', 'Remaining', language)}: ₪${fmt(selectedReceipt.remaining)}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </Field>
        )}

        <Field label={lbl('إيصال (اختياري)', 'קבלה (אופציונלי)', 'Receipt (optional)', language)}>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '9px', borderRadius: 12, background: C.card, border: `1px dashed ${C.borderMid}`, color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
            <Paperclip size={13} />
            {receiptFile ? receiptFile.name : lbl('رفع إيصال', 'העלה קבלה', 'Upload receipt', language)}
          </button>
          {preview && <img src={preview} style={{ width: '100%', borderRadius: 10, marginTop: 8, maxHeight: 120, objectFit: 'cover' }} />}
        </Field>

        {formErr && <div style={{ fontSize: 12, color: C.accent, marginBottom: 4, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 10 }}>{formErr}</div>}
      </Sheet>

      <Confirm open={!!confirmDel} lang={language}
        msg={lbl('هل تريد حذف هذه الدفعة؟', 'למחוק תשלום זה?', 'Delete this payment?', language)}
        onConfirm={() => { deletePayment?.(confirmDel); setConfirmDel(null) }}
        onCancel={() => setConfirmDel(null)} />
    </div>
  )
}

// ─── ACCOUNTING TAB ───────────────────────────────────────────────────────────
function AccountingTab({ expenses = [], payments = [], clientReceipts = [], employees = [], projects = [], taxAdvances = [], pensionMonthly, businessType, language }) {
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const totalRevenue  = clientReceipts.reduce((s, r) => s + (r.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses - totalPayments

  const now    = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const rev = clientReceipts.filter(r => r.date?.startsWith(key)).reduce((s, r) => s + (r.amount || 0), 0)
    const exp = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
    const pay = payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + (p.amount || 0), 0)
    return { month: key.slice(5), rev, exp: exp + pay, profit: rev - exp - pay }
  })

  const SummaryRow = ({ label, value, color, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: bold ? C.text : C.textDim, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 900 : 600, color: color || C.text }}>{value}</span>
    </div>
  )

  return (
    <div dir={dir}>
      <div style={{ background: netProfit >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${netProfit >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 18, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>{lbl('صافي الربح', 'רווח נקי', 'Net Profit', language)}</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: netProfit >= 0 ? C.success : C.accent, letterSpacing: '-0.03em' }}>
          {netProfit >= 0 ? '+' : ''}₪{fmt(netProfit)}
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', marginBottom: 16 }}>
        <SummaryRow label={lbl('إجمالي الإيرادات', 'סה"כ הכנסות', 'Total Revenue', language)}  value={`₪${fmt(totalRevenue)}`}  color={C.success} />
        <SummaryRow label={lbl('إجمالي المصاريف', 'סה"כ הוצאות', 'Total Expenses', language)} value={`-₪${fmt(totalExpenses)}`} color={C.accent} />
        <SummaryRow label={lbl('إجمالي الرواتب', 'סה"כ שכר', 'Total Salaries', language)}   value={`-₪${fmt(totalPayments)}`} color={C.secondary} />
        <SummaryRow label={lbl('صافي الربح', 'רווח נקי', 'Net Profit', language)} value={`₪${fmt(netProfit)}`} color={netProfit >= 0 ? C.success : C.accent} bold />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>
          {lbl('الأداء الشهري', 'ביצועים חודשיים', 'Monthly Performance', language)}
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }} formatter={v => [`₪${fmt(v)}`, '']} />
            <Bar dataKey="rev" fill={`${C.success}60`} radius={[4, 4, 0, 0]} />
            <Bar dataKey="exp" fill={`${C.accent}60`}  radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function FinanceScreen({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], clientReceipts = [], advances = [],
  expCats = [], addExpense, deleteExpense, approveExpense, rejectExpense,
  addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest,
  taxAdvances = [], addTaxAdvance, deleteTaxAdvance,
  pensionMonthly, setPensionMonthly, businessType, setBusinessType,
  userId, permissions, payMethods = [],
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const [tab, setTab] = useState('accounting')

  const pendingExpenses = expenses.filter(e => e.status === 'pending').length
  const pendingPayments = payments.filter(p => p.status === 'pending').length

  const TABS = [
    { id: 'accounting', icon: Calculator, label: lbl('محاسبة',  'חשבונות', 'Accounting', language) },
    { id: 'expenses',   icon: CreditCard, label: lbl('مصاريف',  'הוצאות',  'Expenses',   language), badge: pendingExpenses },
    { id: 'payments',   icon: Banknote,   label: lbl('رواتب',   'שכר',     'Salaries',   language), badge: pendingPayments },
  ]

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('finance.title')}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
          {lbl('إدارة مالية متكاملة', 'ניהול פיננסי מלא', 'Complete financial management', language)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 6 }}>
        {TABS.map(tb => (
          <Tab key={tb.id} active={tab === tb.id} label={tb.label} icon={tb.icon} badge={tb.badge} onClick={() => setTab(tb.id)} />
        ))}
      </div>

      {tab === 'accounting' && (
        <AccountingScreen expenses={expenses} payments={payments} clientReceipts={clientReceipts}
          employees={employees} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance}
          deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly}
          setPensionMonthly={setPensionMonthly} businessType={businessType}
          setBusinessType={setBusinessType} />
      )}
      {tab === 'expenses' && (
        <ExpensesTab expenses={expenses} projects={projects} employees={employees}
          expCats={expCats} clientReceipts={clientReceipts} addExpense={addExpense} deleteExpense={deleteExpense}
          approveExpense={approveExpense} rejectExpense={rejectExpense}
          userId={userId} permissions={permissions} businessType={businessType} language={language} />
      )}
      {tab === 'payments' && (
        <PaymentsTab payments={payments} employees={employees} workDays={workDays}
          expenses={expenses} advances={advances} projects={projects} clientReceipts={clientReceipts}
          addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment}
          approvePaymentRequest={approvePaymentRequest} rejectPaymentRequest={rejectPaymentRequest}
          userId={userId} permissions={permissions} payMethods={payMethods} language={language} />
      )}
    </div>
  )
}
