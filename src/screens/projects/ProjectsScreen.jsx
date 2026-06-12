import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Building2, TrendingUp, TrendingDown, Clock,
  ChevronRight, X, Calendar, CreditCard, ReceiptText, Package,
  ClipboardList, Check, Trash2, Edit3, ArrowLeft, Filter,
  DollarSign, Banknote, BarChart3, FileText, AlertTriangle,
  ChevronDown, CheckCircle2, CircleDot, Paperclip, MapPin, Users, MessageCircle,
  Wallet, Percent, FolderKanban, Archive, RotateCcw,
} from 'lucide-react'
import { Modal, Input, Btn } from '../../components/index.jsx'
import { PremiumCard, IconChip, PremiumStat } from '../../ui/Premium.jsx'
import { uploadReceipt, openSignedUrl } from '../../lib/storage.js'
import { C, GRAD, PROJECT_STATUS, PROJECT_TYPES, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr, isPaymentOverdue } from '../../lib/helpers.js'
import { openWhatsApp, waMessages } from '../../lib/whatsapp.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { calcProjectStats as _calcStats, calcOwnerCash } from '../../lib/calculations.js'
import { computeProjectHealth } from '../../lib/insights.js'
import ProjectHealth from '../../components/ProjectHealth.jsx'
import ProjectCard from '../../components/ProjectCard.jsx'
import WorkDayTicket from '../../components/WorkDayTicket.jsx'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useDataStore } from '../../store/useDataStore.js'
// useProjectBusinessLinks removed — projects now use direct business_id FK

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(s) {
  const m = { 'نشط': C.success, 'مكتمل': C.secondary, 'ملغي': C.accent, 'عرض سعر': C.warning, 'موافق عليه': C.cyan }
  return m[s] || C.textDim
}

const calcProjectStats = (project, workDays, expenses, clientReceipts) =>
  _calcStats(project.id, workDays, expenses, clientReceipts)

// ─── UI components ───────────────────────────────────────────────────────────
function TabBtn({ active, label, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 6px',
      background: active ? `${C.primary}15` : 'transparent', border: `1px solid ${active ? C.primary+'40' : 'transparent'}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', minWidth: 52, flex: 1,
    }}>
      <Icon size={16} color={active ? C.primary : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.primary : C.textDim, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

function SectionLabel({ children, color = C.textDim }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, marginTop: 2 }}>{children}</div>
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || C.text }}>{value}</span>
    </div>
  )
}

// ─── Add/Edit Project Modal ───────────────────────────────────────────────────
function ProjectFormModal({ open, onClose, onSave, language, initialData = null,
  businesses = [], defaultBusinessId = '' }) {
  const empty = { name: '', type: PROJECT_TYPES[0], status: 'نشط', price: '', notes: '', locations: [], business_id: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locInput, setLocInput] = useState('')
  const isEdit = !!initialData
  const { confirm: bioConfirm } = useBiometricConfirm()

  useEffect(() => {
    if (open) {
      setForm(initialData
        ? { ...empty, ...initialData, price: String(initialData.price || ''), locations: initialData.locations || [], business_id: initialData.business_id || '' }
        : { ...empty, business_id: defaultBusinessId })
      setError('')
      setLocInput('')
    }
  }, [open, initialData?.id, defaultBusinessId])

  function addLocation() {
    const v = locInput.trim()
    if (!v) return
    if ((form.locations || []).includes(v)) return
    setForm(p => ({ ...p, locations: [...(p.locations || []), v] }))
    setLocInput('')
  }

  function removeLocation(loc) {
    setForm(p => ({ ...p, locations: (p.locations || []).filter(l => l !== loc) }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('اسم المشروع مطلوب')
    if (businesses.length > 0 && !form.business_id) return setError('يجب اختيار المصلحة التجارية')
    if (!isEdit) {
      const sig = await bioConfirm(`إضافة مشروع: ${form.name}`, 'projects')
      if (!sig) return
    }
    setSaving(true)
    setError('')
    try {
      // فقط الحقول القابلة للتعديل — بدون id/user_id/created_at التي تأتي من initialData
      const payload = {
        name:           form.name.trim(),
        type:           form.type,
        status:         form.status,
        price:          Number(form.price) || 0,
        notes:          form.notes || null,
        locations:      form.locations || [],
        business_id:    form.business_id || null,
        client_name:    form.client_name  || null,
        client_phone:   form.client_phone || null,
        start_date:     form.start_date   || null,
        end_date:       form.end_date     || null,
        specialization: form.specialization || null,
        ref_number:     form.ref_number   || null,
      }
      await onSave(payload)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit ? 'تعديل المشروع' : 'مشروع جديد'
  const saveLabel = saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'أضف المشروع'

  return (
    <Modal open={open} onClose={onClose} title={title}
      action={<Btn onClick={handleSave} full disabled={saving}>{saveLabel}</Btn>}>
      <Input label="اسم المشروع" value={form.name}
        onChange={v => setForm(p => ({ ...p, name: v }))} required />
      <Input label="السعر (₪)" value={form.price} type="number" min="0"
        onChange={v => setForm(p => ({ ...p, price: v }))} />
      <Input label="النوع" value={form.type}
        onChange={v => setForm(p => ({ ...p, type: v, locations: [] }))} options={PROJECT_TYPES} />
      <Input label="الحالة" value={form.status}
        onChange={v => setForm(p => ({ ...p, status: v }))} options={PROJECT_STATUS} />
      <Input label="ملاحظات" value={form.notes}
        onChange={v => setForm(p => ({ ...p, notes: v }))} />

      {form.type === 'يومي' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <MapPin size={11} strokeWidth={2} /> أماكن العمل
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={locInput}
              onChange={e => setLocInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
              placeholder="اسم المكان..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }}
            />
            <button onClick={addLocation} style={{ padding: '10px 14px', borderRadius: 12, background: `${C.primary}22`, border: `1.5px solid ${C.primary}55`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
          {(form.locations || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(form.locations || []).map(loc => (
                <div key={loc} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: `${C.primary}18`, border: `1.5px solid ${C.primary}44`, color: C.primary, fontSize: 12, fontWeight: 700 }}>
                  <MapPin size={10} strokeWidth={2} />
                  {loc}
                  <button onClick={() => removeLocation(loc)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.primary, display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ربط بمصلحة (إجباري) ── */}
      {businesses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Building2 size={11} strokeWidth={2} /> المصلحة التجارية <span style={{ color: C.accent }}>*</span>
          </label>
          <select
            value={form.business_id || ''}
            onChange={e => setForm(p => ({ ...p, business_id: e.target.value }))}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${!form.business_id ? C.accent + '80' : C.border}`, borderRadius: 12, color: form.business_id ? C.text : C.textDim, fontSize: 13, fontFamily: 'inherit', outline: 'none', direction: 'rtl', cursor: 'pointer' }}
          >
            <option value="" disabled>— اختر المصلحة —</option>
            {businesses.map(biz => (
              <option key={biz.id} value={biz.id}>
                {biz.name} ({biz.business_type === 'osek_patur' ? 'פטור' : biz.business_type === 'osek_moreh' ? 'מורשה' : 'חברה'})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
          <AlertTriangle size={13} strokeWidth={2.3} /> {error}
        </div>
      )}
    </Modal>
  )
}

// ─── Quick-action button (project detail header) ──────────────────────────────
function QuickActionBtn({ icon: Icon, color, label, onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 12px', borderRadius: 12,
        background: `${color}14`, border: `1px solid ${color}35`,
        color, fontSize: 12, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
      <Icon size={14} strokeWidth={2.2} />
      {label}
    </motion.button>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ project, onClose, onUpdate, onDelete, onArchive, onRestore, onDeleteAll, addReceipt, updateReceipt, deleteReceipt, addExpense, deleteExpense, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, expCats, payMethods, permissions, holidays, language, userId,
  businesses = [] }) {
  // البيانات المشتركة من المخزن مباشرة — لا تمرير يدوي من الشاشة الأم
  const { workDays, expenses, clientReceipts, employees, payments, advances } = useDataStore()
  const setPendingAction = useAppStore(s => s.setPendingAction)
  const setScreen        = useAppStore(s => s.setScreen)

  function goToFinanceAdd(type) {
    setPendingAction({
      type,                                  // 'add_receipt' | 'add_expense'
      payload: { projectId: project.id, businessId: project.business_id || null },
    })
    setScreen('finance')
  }
  const [tab, setTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [editingReceiptId, setEditingReceiptId] = useState(null)
  const [receiptForm, setReceiptForm] = useState({ amount: '', date: todayStr(), payment_method: 'كاش', payer_name: '', notes: '' })
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [confirmDelReceipt, setConfirmDelReceipt] = useState(null)
  const [expandedReceipt, setExpandedReceipt] = useState(null)
  const receiptFileRef = useRef()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const pid = project.id
  const pWorkDays = workDays.filter(w => w.project_id === pid)
  const pExpenses = expenses.filter(e => e.project_id === pid)
  const pReceipts = clientReceipts.filter(r => r.project_id === pid).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const pPayments = (payments || []).filter(p => p.project_id === pid)
  const paidToWorkers = pPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const pAdvances = (advances || []).filter(a => a.project_id === pid)
  const advancesPaid = pAdvances.reduce((s, a) => s + (a.amount || 0), 0)
  const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)
  const { confirm: bioConfirm } = useBiometricConfirm()

  // صحّة المشروع — مؤشّر ذكي + إنذار مبكّر بالهامش النهائي
  const health = useMemo(() => computeProjectHealth({
    name:      project.name,
    price:     parseFloat(project.price) || 0,
    revenue:   stats.revenue,
    cost:      stats.cost,
    ownerCash: calcOwnerCash(stats.revenue, stats.projExpTotal, paidToWorkers, advancesPaid),
    profit:    stats.profit,
    margin:    stats.margin,
    overdue:   isPaymentOverdue(project, clientReceipts),
  }), [project, stats.revenue, stats.cost, stats.profit, stats.margin, stats.projExpTotal, paidToWorkers, advancesPaid, clientReceipts])

  const TABS = [
    { id: 'overview',  icon: BarChart3,    label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'نظرة عامة' },
    { id: 'workdays',  icon: Calendar,     label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'workers',   icon: Users,        label: language === 'he' ? 'עובדים' : language === 'en' ? 'Workers' : 'عمال' },
    { id: 'expenses',  icon: CreditCard,   label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف' },
    { id: 'receipts',  icon: ReceiptText,  label: language === 'he' ? 'קבלות' : language === 'en' ? 'Receipts' : 'قبضات' },
  ]

  // ── خيارات إدارة المشروع (أرشفة / حذف فقط / حذف مع البيانات) — كلها بتوقيع ──
  async function handleArchive() {
    const sig = await bioConfirm(`أرشفة المشروع: ${project.name}`, 'projects'); if (!sig) return
    setDeleting(true)
    try { await onArchive?.(project.id); onClose() } catch { setDeleting(false) }
  }
  async function handleDeleteOnly() {
    const sig = await bioConfirm(`حذف المشروع (مع إبقاء البيانات المالية): ${project.name}`, 'projects'); if (!sig) return
    setDeleting(true)
    try { await onDelete(project.id); onClose() } catch { setDeleting(false) }
  }
  async function handleDeleteAll() {
    const sig = await bioConfirm(`حذف المشروع وكل بياناته نهائياً: ${project.name}`, 'projects'); if (!sig) return
    setDeleting(true)
    try { await onDeleteAll?.(project.id); onClose() } catch { setDeleting(false) }
  }
  async function handleRestore() {
    try { await onRestore?.(project.id); onClose() } catch { /* ignore */ }
  }

  function closeReceiptForm() {
    setShowReceiptForm(false)
    setEditingReceiptId(null)
    setReceiptError('')
    setReceiptFile(null)
    setReceiptPreview('')
    setReceiptForm({ amount: '', date: todayStr(), payment_method: 'كاش', payer_name: '', notes: '' })
  }

  function openEditReceipt(r) {
    setEditingReceiptId(r.id)
    setReceiptForm({ amount: String(r.amount || ''), date: r.date || todayStr(), payment_method: r.payment_method || 'كاش', payer_name: r.payer_name || '', notes: r.notes || '' })
    setReceiptFile(null)
    setReceiptPreview('')
    setReceiptError('')
    setShowReceiptForm(true)
  }

  async function handleAddReceipt() {
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0)
      return setReceiptError('أدخل المبلغ المقبوض')
    setReceiptSaving(true)
    setReceiptError('')
    try {
      let receipt_url = editingReceiptId ? undefined : ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      const payload = { ...receiptForm, amount: parseFloat(receiptForm.amount), project_id: project.id, business_id: project.business_id || null }
      if (receipt_url !== undefined) payload.receipt_url = receipt_url
      if (editingReceiptId) {
        await updateReceipt(editingReceiptId, payload)
      } else {
        await addReceipt({ ...payload, receipt_url: receipt_url || '' })
      }
      closeReceiptForm()
    } catch (e) {
      setReceiptError(e.message)
    } finally {
      setReceiptSaving(false)
    }
  }

  async function handleDeleteReceipt(id) {
    const receipt = pReceipts.find(r => r.id === id)
    const sig = await bioConfirm(`حذف القبضة: ₪${fmt(receipt?.amount || 0)} — ${receipt?.payer_name || ''}`, 'receipts')
    if (!sig) return
    try { await deleteReceipt(id) } catch {}
  }

  async function handleDeleteReceiptConfirmed(id) {
    try { await deleteReceipt(id) } catch {}
    setConfirmDelReceipt(null)
  }

  return (
    <div dir={dir} style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}`, background: C.surface, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} color={C.textDim} style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </button>
        <IconChip icon={Building2} color={statusColor(project.status)} size={36} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <span style={{ fontSize: 10, color: statusColor(project.status), fontWeight: 700 }}>{project.status}</span>
            {project.ref_number && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, letterSpacing: '0.04em' }}>{project.ref_number}</span>}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: stats.profit >= 0 ? C.success : C.accent, marginInlineEnd: 4 }}>
          {stats.profit >= 0 ? '+' : ''}₪{fmt(stats.profit)}
        </div>
        {permissions?.editProjects !== false && (
          <button onClick={() => setShowEdit(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Edit3 size={14} color={C.primary} strokeWidth={2} />
          </button>
        )}
        {project.archived_at && (
          <button onClick={handleRestore} title="استعادة"
            style={{ width: 34, height: 34, borderRadius: 10, background: `${C.success}18`, border: `1px solid ${C.success}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <RotateCcw size={14} color={C.success} strokeWidth={2} />
          </button>
        )}
        {permissions?.canDelete !== false && (
          <button onClick={() => setConfirmDel(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Trash2 size={14} color='#EF4444' strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Edit Modal */}
      <ProjectFormModal open={showEdit} onClose={() => setShowEdit(false)}
        onSave={form => onUpdate(project.id, form)}
        language={language} initialData={project}
        businesses={businesses}
      />

      {/* Manage / Delete options sheet */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setConfirmDel(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 460, background: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid ${C.borderMid}`, padding: '20px 18px 26px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 3 }}>إدارة المشروع</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>{project.name}</div>

              {/* عدّ البيانات المرتبطة */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {[
                  { n: pWorkDays.length, l: 'أيام عمل' },
                  { n: pExpenses.length, l: 'مصاريف' },
                  { n: pReceipts.length, l: 'قبضات' },
                  { n: pPayments.length, l: 'دفعات' },
                ].filter(x => x.n > 0).map(x => (
                  <span key={x.l} style={{ fontSize: 10.5, fontWeight: 700, color: C.textDim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 9px' }}>
                    {x.n} {x.l}
                  </span>
                ))}
              </div>

              {/* خيار 1: أرشفة (موصى به) */}
              <button onClick={handleArchive} disabled={deleting}
                style={{ width: '100%', textAlign: 'start', padding: '13px 14px', borderRadius: 14, marginBottom: 9, background: `${C.secondary}14`, border: `1.5px solid ${C.secondary}44`, color: C.text, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 11 }}>
                <Archive size={18} color={C.secondary} strokeWidth={2.2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>أرشفة <span style={{ fontSize: 10, color: C.secondary }}>✦ موصى به</span></div>
                  <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>يخفي المشروع دون فقدان أي بيانات — قابل للاستعادة</div>
                </div>
              </button>

              {/* خيار 2: حذف المشروع فقط */}
              <button onClick={handleDeleteOnly} disabled={deleting}
                style={{ width: '100%', textAlign: 'start', padding: '13px 14px', borderRadius: 14, marginBottom: 9, background: `${C.warning}12`, border: `1.5px solid ${C.warning}38`, color: C.text, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 11 }}>
                <Trash2 size={18} color={C.warning} strokeWidth={2.2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>حذف المشروع فقط</div>
                  <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>تبقى المقبوضات والمصاريف وأيام العمل (تصبح بلا مشروع)</div>
                </div>
              </button>

              {/* خيار 3: حذف مع كل البيانات */}
              <button onClick={handleDeleteAll} disabled={deleting}
                style={{ width: '100%', textAlign: 'start', padding: '13px 14px', borderRadius: 14, marginBottom: 14, background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)', color: C.text, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 11 }}>
                <AlertTriangle size={18} color={C.accent} strokeWidth={2.2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: C.accent }}>حذف مع كل البيانات</div>
                  <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>يمحو المشروع وكل مقبوضاته/مصاريفه/أيامه نهائياً — لا تراجع</div>
                </div>
              </button>

              <button onClick={() => setConfirmDel(false)} disabled={deleting}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions — تسجيل قبضة / مصروف على هذا المشروع */}
      {permissions?.editProjects !== false && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <QuickActionBtn icon={TrendingUp}   color={C.success} label="تسجيل قبضة"  onClick={() => goToFinanceAdd('add_receipt')} />
          <QuickActionBtn icon={TrendingDown} color={C.accent}  label="تسجيل مصروف" onClick={() => goToFinanceAdd('add_expense')} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            {/* صحّة المشروع — تحليل ذكي */}
            <ProjectHealth health={health} />

            {/* ── المصلحة المرتبطة ── */}
            {(() => {
              const biz = businesses.find(b => b.id === project.business_id)
              if (!biz) return null
              return (
                <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: 14, padding: '10px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconChip icon={Building2} tone="brand" size={26} radius={8} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>{biz.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 20, padding: '2px 7px' }}>
                    {biz.business_type === 'osek_patur' ? 'פטור' : biz.business_type === 'osek_moreh' ? 'מורשה' : 'חברה'}
                  </span>
                </div>
              )
            })()}

            {project.type === 'مقاولة مغلقة' && project.price > 0 && (() => {
              const remaining = project.price - stats.revenue
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}28` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconChip icon={Banknote} tone="brand" size={28} radius={9} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>قيمة الصفقة</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>₪{fmt(project.price)}</span>
                  </div>
                  {remaining > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 14, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconChip icon={Clock} tone="fair" size={28} radius={9} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.warning }}>متبقي للتحصيل</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: C.warning, fontFamily: 'monospace' }}>₪{fmt(remaining)}</span>
                        <button
                          onClick={() => openWhatsApp(project.client_phone, waMessages.paymentReminder({ clientName: project.client_name, projectName: project.name, amount: remaining }))}
                          title="تذكير العميل عبر واتساب"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 10, background: `${C.success}18`, border: `1.5px solid ${C.success}44`, color: C.success, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          <MessageCircle size={12} strokeWidth={2} />
                          تذكير
                        </button>
                      </div>
                    </div>
                  )}
                  {remaining <= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 14, background: `${C.success}10`, border: `1px solid ${C.success}28` }}>
                      <IconChip icon={CheckCircle2} tone="excellent" size={28} radius={9} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>تم تحصيل كامل الصفقة</span>
                    </div>
                  )}
                </div>
              )
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'الإيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success, icon: TrendingUp },
                { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'المصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent, icon: TrendingDown },
                { label: language === 'he' ? 'שכר' : language === 'en' ? 'Labor' : 'أجور العمال', value: `₪${fmt(stats.wdCost)}`, color: C.secondary, icon: Users },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: stats.wdCount, color: C.primary, icon: Calendar },
              ].map(({ label, value, color, icon }, i) => (
                <PremiumStat key={label} label={label} value={value} color={color} icon={icon} delay={i * 0.04} />
              ))}
            </div>
            {/* Locations — daily projects */}
            {project.type === 'يومي' && (project.locations || []).length > 0 && (
              <PremiumCard tone="brand" glow={false} radius={14} padding="12px 14px" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={10} strokeWidth={2} /> أماكن العمل
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(project.locations || []).map(loc => (
                    <span key={loc} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: `${C.primary}15`, border: `1px solid ${C.primary}35`, color: C.primary, fontSize: 12, fontWeight: 700 }}>
                      <MapPin size={9} strokeWidth={2} /> {loc}
                    </span>
                  ))}
                </div>
              </PremiumCard>
            )}

            {/* Worker payment breakdown */}
            {(stats.wdCost > 0 || stats.workerExpTotal > 0 || paidToWorkers > 0 || advancesPaid > 0) && (() => {
              // مستحق للعامل = أيام العمل + مصاريف العامل ، واصل = مدفوعات + سلف
              const owedTotal     = stats.wdCost + stats.workerExpTotal
              const receivedTotal = paidToWorkers + advancesPaid
              const owedToWorkers = owedTotal - receivedTotal
              return (
                <PremiumCard tone="premium" glow={false} radius={14} padding="14px" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={10} strokeWidth={2} /> توزيع الأجور
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>مستحق للعمال (أجور + مصاريفهم)</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.secondary, fontFamily: 'monospace' }}>₪{fmt(owedTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>واصل لهم (مدفوعات + سلف)</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>-₪{fmt(receivedTotal)}</span>
                    </div>
                    <div style={{ height: 1, background: C.border }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: owedToWorkers > 0 ? C.warning : C.success }}>
                        {owedToWorkers > 0 ? 'باقي على العمال' : 'عمال مكتفون'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: owedToWorkers > 0 ? C.warning : C.success, fontFamily: 'monospace' }}>
                        ₪{fmt(Math.abs(owedToWorkers))}
                      </span>
                    </div>
                  </div>
                </PremiumCard>
              )
            })()}

            {/* Owner's remaining cash */}
            {stats.revenue > 0 && (() => {
              // نقد حقيقي: إيرادات − مصاريف المشروع − مدفوعات وسلف العمال
              // (مصاريف العمال لا تُطرح هنا — تُسوّى ضمن المدفوعات/السلف)
              const ownerCash = calcOwnerCash(stats.revenue, stats.projExpTotal, paidToWorkers, advancesPaid)
              return (
                <PremiumCard tone={ownerCash >= 0 ? 'excellent' : 'critical'} radius={14} padding="14px 16px" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconChip icon={Wallet} color={ownerCash >= 0 ? C.success : C.accent} size={34} radius={11} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 3 }}>متبقي بيد المالك</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>إيرادات − مصاريف المشروع − مدفوعات وسلف العمال</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 900, color: ownerCash >= 0 ? C.success : C.accent, fontFamily: 'monospace' }}>
                    {ownerCash >= 0 ? '' : '-'}₪{fmt(Math.abs(ownerCash))}
                  </span>
                </PremiumCard>
              )
            })()}

            {stats.margin && (
              <PremiumCard tone={stats.profit >= 0 ? 'excellent' : 'critical'} radius={14} padding="12px 14px" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconChip icon={Percent} color={stats.profit >= 0 ? C.success : C.accent} size={32} radius={10} />
                  <span style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'מרג\'ין' : language === 'en' ? 'Profit Margin' : 'هامش الربح'}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 900, color: stats.profit >= 0 ? C.success : C.accent }}>{stats.margin}%</span>
              </PremiumCard>
            )}
          </div>
        )}

        {tab === 'workdays' && (
          <div>
            {pWorkDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days yet' : 'لا توجد أيام عمل'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pWorkDays.map((wd, i) => {
                  const emp = employees.find(e => e.id === wd.employee_id)
                  const actions = (wd.status === 'pending' && permissions?.isOwner) ? (
                    <button onClick={() => approveWorkDay(wd.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: C.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} strokeWidth={2.5} />
                    </button>
                  ) : null
                  return (
                    <WorkDayTicket key={wd.id} wd={wd} name={emp?.name || '—'}
                      lang={language} notchColor={C.bg} actions={actions}
                      delay={Math.min(i * 0.03, 0.3)} />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'workers' && (() => {
          // جمع معرّفات العمال المرتبطين بهذا المشروع
          const workerIds = [...new Set([
            ...pWorkDays.map(w => w.employee_id),
            ...pPayments.map(p => p.employee_id),
            ...pExpenses.filter(e => e.employee_id).map(e => e.employee_id),
          ])].filter(Boolean)

          if (workerIds.length === 0) return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
              لا يوجد عمال مرتبطون بهذا المشروع بعد
            </div>
          )

          return (
            <div>
              {workerIds.map(wid => {
                const emp       = employees.find(e => e.id === wid)
                if (!emp) return null
                const wds       = pWorkDays.filter(w => w.employee_id === wid)
                const wdsApp    = wds.filter(w => w.status === 'approved')
                const earned    = wdsApp.reduce((s, w) => s + (w.amount || 0), 0)
                const paid      = pPayments.filter(p => p.employee_id === wid).reduce((s, p) => s + (p.amount || 0), 0)
                const expAmt    = pExpenses.filter(e => e.employee_id === wid && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
                const balance   = earned + expAmt - paid
                const payRefs   = pPayments.filter(p => p.employee_id === wid)
                return (
                  <PremiumCard key={wid} tone="premium" glow={false} radius={16} padding="0" style={{ marginBottom: 10, overflow: 'hidden' }}>
                    {/* رأس العامل */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${C.secondary}20`, border: `1px solid ${C.secondary}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: C.secondary, flexShrink: 0 }}>
                        {emp.name?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{emp.name}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{emp.specialization || emp.specialty || ''}</div>
                      </div>
                      <div style={{ textAlign: 'end' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: balance > 0 ? C.warning : C.success }}>
                          {balance > 0 ? 'مستحق' : 'مكتفي'}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: balance > 0 ? C.warning : C.success, fontFamily: 'monospace' }}>
                          ₪{fmt(Math.abs(balance))}
                        </div>
                      </div>
                    </div>

                    {/* إحصائيات */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, borderTop: `1px solid ${C.border}` }}>
                      {[
                        { label: 'أيام العمل', value: wds.length, color: C.primary },
                        { label: 'الأجور', value: `₪${fmt(earned)}`, color: C.secondary },
                        { label: 'المدفوع', value: `₪${fmt(paid)}`, color: C.success },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* أرقام الرواتب المرتبطة */}
                    {payRefs.length > 0 && (
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>رواتب:</span>
                        {payRefs.map(p => (
                          <span key={p.id} style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}25`, borderRadius: 5, padding: '2px 7px' }}>
                            {p.ref_number || '—'} · ₪{fmt(p.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </PremiumCard>
                )
              })}
            </div>
          )
        })()}

        {tab === 'expenses' && (
          <div>
            {pExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין הוצאות' : language === 'en' ? 'No expenses yet' : 'لا توجد مصاريف'}
              </div>
            ) : pExpenses.map(exp => (
              <PremiumCard key={exp.id} tone="critical" glow={false} radius={14} padding="10px 12px" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <IconChip icon={CreditCard} color={C.accent} size={32} radius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{exp.category || exp.description || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: C.textDim }}>{fmtDate(exp.date)}</span>
                    {exp.ref_number && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, borderRadius: 5, padding: '1px 6px', letterSpacing: '0.04em' }}>
                        {exp.ref_number}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>₪{fmt(exp.amount || 0)}</div>
              </PremiumCard>
            ))}
          </div>
        )}

        {tab === 'receipts' && (
          <div>
            {/* Header row — تسجيل قبضة جديدة من زر "تسجيل قبضة" بأعلى الشاشة (يوديك للمحاسبة) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>إجمالي المقبوضات</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>₪{fmt(stats.revenue)}</div>
            </div>

            {/* Receipt form modal */}
            <Modal open={showReceiptForm} onClose={closeReceiptForm}
              title={editingReceiptId ? 'تعديل قبضة' : 'تسجيل قبضة'}
              action={<Btn onClick={handleAddReceipt} full disabled={receiptSaving}>{receiptSaving ? 'جاري الحفظ...' : editingReceiptId ? 'حفظ التعديلات' : 'حفظ القبضة'}</Btn>}>
              <Input label="المبلغ المقبوض (₪)" value={receiptForm.amount} type="number" min="0"
                onChange={v => setReceiptForm(p => ({ ...p, amount: v }))} required />
              <Input label="التاريخ" value={receiptForm.date} type="date"
                onChange={v => setReceiptForm(p => ({ ...p, date: v }))} />
              <Input label="طريقة الدفع" value={receiptForm.payment_method}
                onChange={v => setReceiptForm(p => ({ ...p, payment_method: v }))}
                options={payMethods?.length ? payMethods : ['كاش', 'حوالة', 'شيك', 'بطاقة']} />
              <Input label="اسم الدافع" value={receiptForm.payer_name} placeholder="مثال: أبو محمد"
                onChange={v => setReceiptForm(p => ({ ...p, payer_name: v }))} />
              <Input label="ملاحظات" value={receiptForm.notes}
                onChange={v => setReceiptForm(p => ({ ...p, notes: v }))} />

              {/* File upload */}
              <input ref={receiptFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setReceiptFile(f)
                  if (f.type.startsWith('image/')) setReceiptPreview(URL.createObjectURL(f))
                  else setReceiptPreview('pdf')
                  e.target.value = ''
                }} />
              {receiptPreview && receiptPreview !== 'pdf' ? (
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <img src={receiptPreview} alt="إيصال" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14, border: `1px solid ${C.success}55` }} />
                  <button onClick={() => { setReceiptFile(null); setReceiptPreview('') }}
                    style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ) : receiptPreview === 'pdf' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: `${C.primary}10`, border: `1px solid ${C.primary}33`, marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}><FileText size={13} strokeWidth={2} style={{ marginLeft: 6, verticalAlign: 'middle' }} />{receiptFile?.name}</span>
                  <button onClick={() => { setReceiptFile(null); setReceiptPreview('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim }}><X size={14} strokeWidth={2.5} /></button>
                </div>
              ) : (
                <button onClick={() => receiptFileRef.current?.click()}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: `2px dashed ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textDim, fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14, fontFamily: 'inherit' }}>
                  <Paperclip size={20} strokeWidth={1.5} style={{ color: C.textDim }} />
                  <span>إرفاق صورة الإيصال أو PDF (اختياري)</span>
                </button>
              )}

              {receiptError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                  <AlertTriangle size={13} strokeWidth={2.3} /> {receiptError}
                </div>
              )}
            </Modal>

            {/* Confirm delete receipt */}
            <AnimatePresence>
              {confirmDelReceipt && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    style={{ width: '100%', maxWidth: 300, background: C.surface, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '24px 20px' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8, textAlign: 'center' }}>حذف القبضة؟</div>
                    <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 20 }}>لا يمكن التراجع عن هذا الإجراء.</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setConfirmDelReceipt(null)}
                        style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        إلغاء
                      </button>
                      <button onClick={() => handleDeleteReceiptConfirmed(confirmDelReceipt)}
                        style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        حذف
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            {pReceipts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: `1px dashed ${C.border}` }}>
                لم يُقبض شيء بعد
              </div>
            ) : pReceipts.map(r => {
              const linkedPays = payments.filter(p => p.client_receipt_id === r.id)
              const usedAmt    = linkedPays.reduce((s, p) => s + (p.amount || 0), 0)
              const remaining  = (r.amount || 0) - usedAmt
              const pct        = r.amount > 0 ? Math.min(100, Math.round((usedAmt / r.amount) * 100)) : 0
              const isExpanded = expandedReceipt === r.id
              return (
                <PremiumCard key={r.id} tone="excellent" glow={false} radius={14} padding="0" style={{ marginBottom: 8, overflow: 'hidden' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                    <IconChip icon={ReceiptText} tone="excellent" size={34} radius={11} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>+₪{fmt(r.amount || 0)}</div>
                        {r.ref_number && <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 6, padding: '1px 7px', letterSpacing: '0.04em' }}>{r.ref_number}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                        {fmtDate(r.date)}{r.payment_method ? ` · ${r.payment_method}` : ''}{r.payer_name ? ` · ${r.payer_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}
                      </div>
                    </div>
                    {/* زر توسيع */}
                    {linkedPays.length > 0 && (
                      <button onClick={() => setExpandedReceipt(isExpanded ? null : r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, color: C.primary, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        <Banknote size={11} strokeWidth={2} />
                        {linkedPays.length}
                        <ChevronDown size={10} strokeWidth={2.5} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>
                    )}
                    {r.receipt_url && (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" onClick={e => { e.preventDefault(); openSignedUrl(r.receipt_url) }}
                        style={{ width: 30, height: 30, borderRadius: 9, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, textDecoration: 'none', flexShrink: 0 }}>
                        <Paperclip size={13} strokeWidth={2} />
                      </a>
                    )}
                    {permissions?.editProjects !== false && (
                      <button onClick={() => openEditReceipt(r)}
                        style={{ width: 30, height: 30, borderRadius: 9, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <Edit3 size={13} color={C.primary} strokeWidth={2} />
                      </button>
                    )}
                    {permissions?.canDelete !== false && (
                      <button onClick={() => setConfirmDelReceipt(r.id)}
                        style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={13} color='#EF4444' strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* شريط الاستخدام */}
                  {linkedPays.length > 0 && (
                    <div style={{ padding: '0 14px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginBottom: 4, fontWeight: 600 }}>
                        <span>مُصرَّف على رواتب: <span style={{ color: C.secondary }}>₪{fmt(usedAmt)}</span></span>
                        <span>متبقي: <span style={{ color: remaining >= 0 ? C.success : C.accent }}>₪{fmt(Math.abs(remaining))}{remaining < 0 ? ' ↑زيادة' : ''}</span></span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: `${C.border}` }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? C.accent : `linear-gradient(90deg,${C.secondary},${C.primary})`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )}

                  {/* قائمة الرواتب المرتبطة */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {linkedPays.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => {
                        const emp = employees.find(e => e.id === p.employee_id)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${C.border}` }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${C.secondary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: C.secondary, flexShrink: 0 }}>
                              {emp?.name?.[0] || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{emp?.name || '—'}</div>
                              <div style={{ fontSize: 9, color: C.textDim }}>{fmtDate(p.date)}{p.method ? ` · ${p.method}` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'end' }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: C.secondary }}>₪{fmt(p.amount || 0)}</div>
                              {p.ref_number && <div style={{ fontSize: 9, color: C.primary, fontWeight: 700 }}>{p.ref_number}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </PremiumCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProjectsScreen({
  addProject, updateProject, deleteProject, archiveProject, restoreProject, deleteProjectWithAll,
  addReceipt, updateReceipt, deleteReceipt,
  addWorkDay, bulkAddWorkDays, updateWorkDay, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addExpense, deleteExpense, expCats = [],
  userId, permissions, payMethods = [], holidays = [],
}) {
  // البيانات المشتركة تُقرأ من المخزن مباشرة (بدل prop drilling)
  const { projects, workDays, expenses, clientReceipts, employees, payments, advances } = useDataStore()
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  // ── المصالح — تأكد من تحميلها حتى لو لم يزر المستخدم شاشة المالية بعد ──
  const { businesses, activeBusiness, load: loadBusinesses } = useBusinessStore()
  useEffect(() => { loadBusinesses() }, []) // eslint-disable-line

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const archivedCount = useMemo(() => projects.filter(p => p.archived_at).length, [projects])

  const statusFilters = ['all', 'نشط', 'مكتمل', 'عرض سعر', 'ملغي']
  const statusLabel = s => ({ all: language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل', 'نشط': language === 'he' ? 'פעיל' : language === 'en' ? 'Active' : 'نشط', 'مكتمل': language === 'he' ? 'הושלם' : language === 'en' ? 'Done' : 'مكتمل', 'عرض سعر': language === 'he' ? 'הצעת מחיר' : language === 'en' ? 'Quote' : 'عرض سعر', 'ملغي': language === 'he' ? 'בוטל' : language === 'en' ? 'Cancelled' : 'ملغي' })[s] || s

  const filtered = useMemo(() => {
    // افتراضياً نُخفي المؤرشفة؛ وضع الأرشيف يعرض المؤرشفة فقط
    let list = projects.filter(p => showArchived ? p.archived_at : !p.archived_at)
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    return list
  }, [projects, search, statusFilter, showArchived])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateProject} onDelete={deleteProject}
        onArchive={archiveProject} onRestore={restoreProject} onDeleteAll={deleteProjectWithAll}
        addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt}
        addExpense={addExpense} deleteExpense={deleteExpense}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        expCats={expCats} payMethods={payMethods} permissions={permissions}
        holidays={holidays} language={language} userId={userId}
        businesses={businesses}
      />
    )
  }

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <IconChip icon={FolderKanban} tone="brand" size={40} radius={12} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('projects.title')}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{projects.length} {language === 'he' ? 'פרויקטים' : language === 'en' ? 'projects' : 'مشروع'}</div>
          </div>
        </motion.div>
        {permissions?.addProjects !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(249,115,22,0.35)' }}>
            <Plus size={15} strokeWidth={2.5} />
            {language === 'he' ? 'חדש' : language === 'en' ? 'New' : 'جديد'}
          </motion.button>
        )}
      </div>

      {/* مبدّل الأرشيف */}
      {(archivedCount > 0 || showArchived) && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowArchived(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: showArchived ? `${C.secondary}1e` : C.card, border: `1px solid ${showArchived ? C.secondary + '55' : C.border}`, color: showArchived ? C.secondary : C.textDim }}>
            <Archive size={13} strokeWidth={2.2} />
            {showArchived
              ? (language === 'en' ? 'Show active' : 'إظهار النشطة')
              : `${language === 'en' ? 'Archive' : 'الأرشيف'} (${archivedCount})`}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש פרויקט...' : language === 'en' ? 'Search projects...' : 'ابحث عن مشروع...'}
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '5px 12px', borderRadius: 10, background: statusFilter === s ? GRAD.primary : 'rgba(255,255,255,0.05)', border: `1px solid ${statusFilter === s ? 'transparent' : C.border}`, color: statusFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: language === 'he' ? 'פעילים' : language === 'en' ? 'Active' : 'نشطة', value: projects.filter(p => p.status === 'نشط').length, color: C.success, icon: CheckCircle2 },
            { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(clientReceipts.reduce((s, r) => s + (r.amount || 0), 0))}`, color: C.primary, icon: TrendingUp },
            { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'تكاليف', value: `₪${fmt(workDays.reduce((s, w) => s + (w.amount || 0), 0) + expenses.reduce((s, e) => s + (e.amount || 0), 0))}`, color: C.accent, icon: TrendingDown },
          ].map(({ label, value, color, icon }, i) => (
            <PremiumStat key={label} label={label} value={value} color={color} icon={icon} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Project list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <IconChip icon={Building2} tone="brand" size={56} radius={18} iconSize={26} strokeWidth={1.5} style={{ margin: '0 auto 14px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('projects.empty')}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'הוסף את הפרויקט הראשון שלך' : language === 'en' ? 'Add your first project' : 'أضف مشروعك الأول'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((project, i) => {
            const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)
            return (
              <ProjectCard key={project.id}
                project={project}
                stats={stats}
                businessName={businesses.find(b => b.id === project.business_id)?.name}
                lang={language}
                onOpen={setSelected}
                delay={Math.min(i * 0.04, 0.3)}
              />
            )
          })}
        </div>
      )}

      <ProjectFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addProject}
        language={language}
        businesses={businesses}
        defaultBusinessId={activeBusiness?.id || ''}
      />
    </div>
  )
}
