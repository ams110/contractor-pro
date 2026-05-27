import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Building2, TrendingUp, TrendingDown, Clock,
  ChevronRight, X, Calendar, CreditCard, ReceiptText, Package,
  ClipboardList, Check, Trash2, Edit3, ArrowLeft, Filter,
  DollarSign, Banknote, BarChart3, FileText, AlertTriangle,
  ChevronDown, CheckCircle2, CircleDot, Paperclip, MapPin, Users, Archive,
} from 'lucide-react'
import { Modal, Input, Btn } from '../../components/index.jsx'
import { uploadReceipt } from '../../lib/storage.js'
import { C, GRAD, PROJECT_STATUS, PROJECT_TYPES, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { calcProjectStats as _calcStats } from '../../lib/calculations.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useProjectBusinessLinks } from '../../hooks/useProjectBusinessLinks.js'
import DeleteProjectModal from './DeleteProjectModal.jsx'

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
  businesses = [], currentBizIds = [], onBizLinksChange }) {
  const empty = { name: '', type: PROJECT_TYPES[0], status: 'نشط', price: '', notes: '', locations: [] }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locInput, setLocInput] = useState('')
  const [selectedBizIds, setSelectedBizIds] = useState([])
  const isEdit = !!initialData
  const { confirm: bioConfirm } = useBiometricConfirm()

  useEffect(() => {
    if (open) {
      setForm(initialData
        ? { ...empty, ...initialData, price: String(initialData.price || ''), locations: initialData.locations || [] }
        : empty)
      setError('')
      setLocInput('')
      setSelectedBizIds(currentBizIds)
    }
  }, [open, initialData, JSON.stringify(currentBizIds)])

  function toggleBiz(bizId) {
    setSelectedBizIds(prev =>
      prev.includes(bizId) ? prev.filter(id => id !== bizId) : [...prev, bizId]
    )
  }

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
    if (!isEdit) {
      const sig = await bioConfirm(`إضافة مشروع: ${form.name}`, 'projects')
      if (!sig) return
    }
    setSaving(true)
    setError('')
    try {
      const result = await onSave({ ...form, price: Number(form.price) || 0 })
      // ربط المصالح — للمشروع الجديد نحتاج الـ ID من result، للتعديل من initialData
      const projectId = initialData?.id ?? result?.id
      if (projectId && onBizLinksChange) {
        await onBizLinksChange(projectId, selectedBizIds)
      }
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

      {/* ── ربط بمصالح ── */}
      {businesses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Building2 size={11} strokeWidth={2} /> ربط بمصلحة / مصالح
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {businesses.map(biz => {
              const active = selectedBizIds.includes(biz.id)
              return (
                <button key={biz.id} onClick={() => toggleBiz(biz.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, background: active ? `${C.primary}12` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${active ? C.primary : C.border}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', transition: 'all .15s' }}>
                  {/* Checkbox */}
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: active ? C.primary : 'transparent', border: `2px solid ${active ? C.primary : C.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {active && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? C.text : C.textDim }}>{biz.name}</div>
                    {biz.tax_id && <div style={{ fontSize: 10, color: C.textDim }}>{biz.tax_id}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? C.primary : C.textDim, background: active ? `${C.primary}18` : 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
                    {biz.business_type === 'osek_patur' ? 'פטור' : biz.business_type === 'osek_moreh' ? 'מורשה' : 'חברה'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
          ⚠ {error}
        </div>
      )}
    </Modal>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ project, workDays, expenses, clientReceipts, employees, payments, onClose, onUpdate, onDelete, onArchive, onDeleteAll, addReceipt, updateReceipt, deleteReceipt, addExpense, deleteExpense, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, expCats, payMethods, permissions, holidays, language, userId,
  businesses = [], linkedBizIds = [], onUpdateBizLinks }) {
  const [tab, setTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
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
  const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)

  const TABS = [
    { id: 'overview',  icon: BarChart3,    label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'نظرة عامة' },
    { id: 'workdays',  icon: Calendar,     label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'workers',   icon: Users,        label: language === 'he' ? 'עובדים' : language === 'en' ? 'Workers' : 'عمال' },
    { id: 'expenses',  icon: CreditCard,   label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف' },
    { id: 'receipts',  icon: ReceiptText,  label: language === 'he' ? 'קבלות' : language === 'en' ? 'Receipts' : 'قبضات' },
  ]

  async function handleArchiveDone(id) {
    try { await onArchive(id); onClose() } catch {}
  }

  async function handleDeleteDone(id) {
    setDeleting(true)
    try { await onDelete(id); onClose() }
    catch { setDeleting(false) }
  }

  async function handleDeleteAllDone(id) {
    setDeleting(true)
    try { await onDeleteAll(id); onClose() }
    catch { setDeleting(false) }
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
      const payload = { ...receiptForm, amount: parseFloat(receiptForm.amount), project_id: project.id }
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
        {permissions?.canDelete !== false && (
          <button onClick={() => setShowDeleteModal(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Trash2 size={14} color='#EF4444' strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Edit Modal — مع دعم ربط المصالح */}
      <ProjectFormModal open={showEdit} onClose={() => setShowEdit(false)}
        onSave={form => onUpdate(project.id, form)}
        language={language} initialData={project}
        businesses={businesses}
        currentBizIds={linkedBizIds}
        onBizLinksChange={onUpdateBizLinks}
      />

      {/* Delete / Archive Modal */}
      {showDeleteModal && (
        <DeleteProjectModal
          project={project}
          userId={userId}
          onArchive={handleArchiveDone}
          onDelete={handleDeleteDone}
          onDeleteAll={handleDeleteAllDone}
          onClose={() => setShowDeleteModal(false)}
          language={language}
        />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            {/* ── المصالح المرتبطة ── */}
            {businesses.length > 0 && (() => {
              const linked = businesses.filter(b => linkedBizIds.includes(b.id))
              return (
                <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: 14, padding: '10px 13px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.primary, letterSpacing: '0.05em', marginBottom: linked.length ? 8 : 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Building2 size={10} strokeWidth={2} /> المصالح المرتبطة
                  </div>
                  {linked.length === 0 ? (
                    <div style={{ fontSize: 10, color: C.textDim }}>لم يُربط بأي مصلحة بعد — عدّل المشروع لإضافة الربط</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linked.map(b => (
                        <span key={b.id} style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 20, padding: '3px 10px' }}>
                          {b.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {project.type === 'مقاولة مغلقة' && project.price > 0 && (() => {
              const remaining = project.price - stats.revenue
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}28` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Banknote size={14} color={C.primary} strokeWidth={2} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>قيمة الصفقة</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>₪{fmt(project.price)}</span>
                  </div>
                  {remaining > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 14, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} color={C.warning} strokeWidth={2} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.warning }}>متبقي للتحصيل</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.warning, fontFamily: 'monospace' }}>₪{fmt(remaining)}</span>
                    </div>
                  )}
                  {remaining <= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 14, background: `${C.success}10`, border: `1px solid ${C.success}28` }}>
                      <CheckCircle2 size={14} color={C.success} strokeWidth={2} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>تم تحصيل كامل الصفقة</span>
                    </div>
                  )}
                </div>
              )
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'الإيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success },
                { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'المصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent },
                { label: language === 'he' ? 'שכר' : language === 'en' ? 'Labor' : 'أجور العمال', value: `₪${fmt(stats.wdCost)}`, color: C.secondary },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: stats.wdCount, color: C.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Locations — daily projects */}
            {project.type === 'يومي' && (project.locations || []).length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
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
              </div>
            )}

            {/* Worker payment breakdown */}
            {(stats.wdCost > 0 || paidToWorkers > 0) && (() => {
              const owedToWorkers = stats.wdCost - paidToWorkers
              const ownerCash = stats.revenue - paidToWorkers - stats.expTotal
              return (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', marginBottom: 10 }}>توزيع الأجور</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>أجور مستحقة للعمال</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.secondary, fontFamily: 'monospace' }}>₪{fmt(stats.wdCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>دُفع للعمال</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>-₪{fmt(paidToWorkers)}</span>
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
                </div>
              )
            })()}

            {/* Owner's remaining cash */}
            {stats.revenue > 0 && (() => {
              const ownerCash = stats.revenue - paidToWorkers - stats.expTotal
              return (
                <div style={{ background: ownerCash >= 0 ? `${C.success}10` : `${C.accent}10`, border: `1px solid ${ownerCash >= 0 ? C.success : C.accent}28`, borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 3 }}>متبقي بيد المالك</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>إيرادات − ما دُفع للعمال − المصاريف</div>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 900, color: ownerCash >= 0 ? C.success : C.accent, fontFamily: 'monospace' }}>
                    {ownerCash >= 0 ? '' : '-'}₪{fmt(Math.abs(ownerCash))}
                  </span>
                </div>
              )
            })()}

            {stats.margin && (
              <div style={{ background: `${stats.profit >= 0 ? C.success : C.accent}12`, border: `1px solid ${stats.profit >= 0 ? C.success : C.accent}28`, borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'מרג\'ין' : language === 'en' ? 'Profit Margin' : 'هامش الربح'}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: stats.profit >= 0 ? C.success : C.accent }}>{stats.margin}%</span>
              </div>
            )}
          </div>
        )}

        {tab === 'workdays' && (
          <div>
            {pWorkDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days yet' : 'لا توجد أيام عمل'}
              </div>
            ) : pWorkDays.map(wd => {
              const emp = employees.find(e => e.id === wd.employee_id)
              return (
                <div key={wd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={14} color={C.primary} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{emp?.name || '—'}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(wd.date)}{wd.day_type ? ` · ${wd.day_type}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>₪{fmt(wd.amount || 0)}</div>
                    {wd.status === 'pending' && <div style={{ fontSize: 9, color: C.warning, fontWeight: 700 }}>بانتظار الموافقة</div>}
                    {wd.status === 'approved' && <div style={{ fontSize: 9, color: C.success, fontWeight: 700 }}>معتمد</div>}
                  </div>
                  {wd.status === 'pending' && permissions?.isOwner && (
                    <button onClick={() => approveWorkDay(wd.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: C.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )
            })}
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
                  <div key={wid} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
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
                  </div>
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
              <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={14} color={C.accent} strokeWidth={2} />
                </div>
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
              </div>
            ))}
          </div>
        )}

        {tab === 'receipts' && (
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>إجمالي المقبوضات</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>₪{fmt(stats.revenue)}</div>
              </div>
              {permissions?.editProjects !== false && (
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowReceiptForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 14, background: `${C.success}18`, border: `1px solid ${C.success}44`, color: C.success, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={14} strokeWidth={2.5} /> قبض جديد
                </motion.button>
              )}
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
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                  ⚠ {receiptError}
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
                <div key={r.id} style={{ background: `${C.success}06`, border: `1px solid ${C.success}20`, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: `${C.success}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ReceiptText size={15} color={C.success} strokeWidth={2} />
                    </div>
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
                      <a href={r.receipt_url} target="_blank" rel="noreferrer"
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
                </div>
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
  projects = [], workDays = [], expenses = [], clientReceipts = [],
  employees = [], payments = [], advances = [],
  addProject, updateProject, deleteProject, archiveProject, deleteProjectWithAll,
  addReceipt, updateReceipt, deleteReceipt,
  addWorkDay, bulkAddWorkDays, updateWorkDay, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addExpense, deleteExpense, expCats = [],
  userId, permissions, payMethods = [], holidays = [],
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  // ── ربط المصالح بالمشاريع ───────────────────────────────────────────────
  const { businesses } = useBusinessStore()
  const { getBusinessesForProject, setProjectLinks } = useProjectBusinessLinks(userId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const statusFilters = ['all', 'نشط', 'مكتمل', 'عرض سعر', 'ملغي']
  const statusLabel = s => ({ all: language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل', 'نشط': language === 'he' ? 'פעיל' : language === 'en' ? 'Active' : 'نشط', 'مكتمل': language === 'he' ? 'הושלם' : language === 'en' ? 'Done' : 'مكتمل', 'عرض سعر': language === 'he' ? 'הצעת מחיר' : language === 'en' ? 'Quote' : 'عرض سعر', 'ملغي': language === 'he' ? 'בוטל' : language === 'en' ? 'Cancelled' : 'ملغي' })[s] || s

  const archivedCount = useMemo(() => projects.filter(p => !!p.archived_at).length, [projects])

  const filtered = useMemo(() => {
    let list = showArchived
      ? projects.filter(p => !!p.archived_at)
      : projects.filter(p => !p.archived_at)
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    if (!showArchived && statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    return list
  }, [projects, search, statusFilter, showArchived])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        workDays={workDays} expenses={expenses} clientReceipts={clientReceipts}
        employees={employees} payments={payments}
        onClose={() => setSelected(null)}
        onUpdate={updateProject} onDelete={deleteProject} onArchive={archiveProject} onDeleteAll={deleteProjectWithAll}
        addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt}
        addExpense={addExpense} deleteExpense={deleteExpense}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        expCats={expCats} payMethods={payMethods} permissions={permissions}
        holidays={holidays} language={language} userId={userId}
        businesses={businesses}
        linkedBizIds={getBusinessesForProject(selected.id)}
        onUpdateBizLinks={setProjectLinks}
      />
    )
  }

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('projects.title')}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{projects.length} {language === 'he' ? 'פרויקטים' : language === 'en' ? 'projects' : 'مشروع'}</div>
        </div>
        {permissions?.addProjects !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(249,115,22,0.35)' }}>
            <Plus size={15} strokeWidth={2.5} />
            {language === 'he' ? 'חדש' : language === 'en' ? 'New' : 'جديد'}
          </motion.button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש פרויקט...' : language === 'en' ? 'Search projects...' : 'ابحث عن مشروع...'}
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {/* Status filter + Archive toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {!showArchived && statusFilters.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '5px 12px', borderRadius: 10, background: statusFilter === s ? GRAD.primary : 'rgba(255,255,255,0.05)', border: `1px solid ${statusFilter === s ? 'transparent' : C.border}`, color: statusFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {statusLabel(s)}
          </button>
        ))}
        {archivedCount > 0 && (
          <button onClick={() => setShowArchived(v => !v)}
            style={{ padding: '5px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 5,
              background: showArchived ? `${C.primary}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showArchived ? C.primary + '50' : C.border}`,
              color: showArchived ? C.primary : C.textDim,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            <Archive size={11} strokeWidth={2} />
            {language === 'he' ? `ארכיון (${archivedCount})` : language === 'en' ? `Archive (${archivedCount})` : `المؤرشفة (${archivedCount})`}
          </button>
        )}
      </div>

      {/* Summary bar */}
      {projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: language === 'he' ? 'פעילים' : language === 'en' ? 'Active' : 'نشطة', value: projects.filter(p => p.status === 'نشط').length, color: C.success },
            { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(clientReceipts.reduce((s, r) => s + (r.amount || 0), 0))}`, color: C.primary, small: true },
            { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'تكاليف', value: `₪${fmt(workDays.reduce((s, w) => s + (w.amount || 0), 0) + expenses.reduce((s, e) => s + (e.amount || 0), 0))}`, color: C.accent, small: true },
          ].map(({ label, value, color, small }) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: small ? 12 : 18, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Project list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.primary}18`, border: `1px solid ${C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Building2 size={26} color={C.primary} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('projects.empty')}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'הוסף את הפרויקט הראשון שלך' : language === 'en' ? 'Add your first project' : 'أضف مشروعك الأول'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((project, i) => {
            const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)
            const isProfit = stats.profit >= 0
            return (
              <motion.div key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(project)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>

                {/* Status indicator */}
                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: 3, height: '100%', background: statusColor(project.status), borderRadius: '0 3px 3px 0' }} />

                <div style={{ paddingInlineStart: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(project.status), background: `${statusColor(project.status)}18`, padding: '2px 7px', borderRadius: 6 }}>{project.status || 'نشط'}</span>
                        {project.type && <span style={{ fontSize: 10, color: C.textDim }}>{project.type}</span>}
                        {project.ref_number && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, letterSpacing: '0.04em' }}>{project.ref_number}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0, marginInlineStart: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: isProfit ? C.success : C.accent }}>
                        {isProfit ? '+' : ''}₪{fmt(stats.profit)}
                      </div>
                      {stats.margin && <div style={{ fontSize: 9, color: C.textDim }}>{stats.margin}%</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success },
                      { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'التكاليف', value: `₪${fmt(stats.cost)}`, color: C.accent },
                      { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: stats.wdCount, color: C.primary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: C.card, borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {project.type === 'مقاولة مغلقة' && project.price > 0 && (() => {
                    const remaining = project.price - stats.revenue
                    return (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: `${C.primary}10`, border: `1px solid ${C.primary}28`, borderRadius: 8 }}>
                          <Banknote size={10} color={C.primary} strokeWidth={2} />
                          <span style={{ fontSize: 9, color: C.primary, fontWeight: 700 }}>الصفقة: ₪{fmt(project.price)}</span>
                        </div>
                        {remaining > 0 ? (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 8 }}>
                            <Clock size={10} color={C.warning} strokeWidth={2} />
                            <span style={{ fontSize: 9, color: C.warning, fontWeight: 700 }}>متبقي: ₪{fmt(remaining)}</span>
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: `${C.success}10`, border: `1px solid ${C.success}28`, borderRadius: 8 }}>
                            <CheckCircle2 size={10} color={C.success} strokeWidth={2} />
                            <span style={{ fontSize: 9, color: C.success, fontWeight: 700 }}>مكتمل التحصيل</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {stats.pending > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                      <AlertTriangle size={11} color={C.warning} strokeWidth={2} />
                      <span style={{ fontSize: 10, color: C.warning, fontWeight: 700 }}>{stats.pending} {language === 'he' ? 'ממתינים' : language === 'en' ? 'pending' : 'بانتظار الموافقة'}</span>
                    </div>
                  )}

                  {/* شارات المصالح */}
                  {(() => {
                    const bids  = getBusinessesForProject(project.id)
                    const bizList = businesses.filter(b => bids.includes(b.id))
                    if (!bizList.length) return null
                    return (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {bizList.map(b => (
                          <span key={b.id} style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Building2 size={8} strokeWidth={2} /> {b.name}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </motion.div>
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
        currentBizIds={[]}
        onBizLinksChange={setProjectLinks}
      />
    </div>
  )
}
