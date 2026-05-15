import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Building2, TrendingUp, TrendingDown, Clock,
  ChevronRight, X, Calendar, CreditCard, ReceiptText, Package,
  ClipboardList, Check, Trash2, Edit3, ArrowLeft, Filter,
  DollarSign, Banknote, BarChart3, FileText, AlertTriangle,
  ChevronDown, CheckCircle2, CircleDot, Paperclip,
} from 'lucide-react'
import { Modal, Input, Btn } from '../../components/index.jsx'
import { uploadReceipt } from '../../lib/storage.js'
import { C, GRAD, PROJECT_STATUS, PROJECT_TYPES, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'
import { calcProjectStats as _calcStats } from '../../lib/calculations.js'

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
function ProjectFormModal({ open, onClose, onSave, language, initialData = null }) {
  const empty = { name: '', type: PROJECT_TYPES[0], status: 'نشط', price: '', notes: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...empty, ...initialData, price: String(initialData.price || '') } : empty)
      setError('')
    }
  }, [open, initialData])

  async function handleSave() {
    if (!form.name.trim()) return setError('اسم المشروع مطلوب')
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, price: Number(form.price) || 0 })
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
        onChange={v => setForm(p => ({ ...p, type: v }))} options={PROJECT_TYPES} />
      <Input label="الحالة" value={form.status}
        onChange={v => setForm(p => ({ ...p, status: v }))} options={PROJECT_STATUS} />
      <Input label="ملاحظات" value={form.notes}
        onChange={v => setForm(p => ({ ...p, notes: v }))} />
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
          ⚠ {error}
        </div>
      )}
    </Modal>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ project, workDays, expenses, clientReceipts, employees, payments, onClose, onUpdate, onDelete, addReceipt, updateReceipt, deleteReceipt, addExpense, deleteExpense, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, expCats, payMethods, permissions, holidays, language, userId }) {
  const [tab, setTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [receiptForm, setReceiptForm] = useState({ amount: '', date: todayStr(), payment_method: 'كاش', payer_name: '', notes: '' })
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const receiptFileRef = useRef()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const pid = project.id
  const pWorkDays = workDays.filter(w => w.project_id === pid)
  const pExpenses = expenses.filter(e => e.project_id === pid)
  const pReceipts = clientReceipts.filter(r => r.project_id === pid)
  const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)

  const TABS = [
    { id: 'overview',  icon: BarChart3,    label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'نظرة عامة' },
    { id: 'workdays',  icon: Calendar,     label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'expenses',  icon: CreditCard,   label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف' },
    { id: 'receipts',  icon: ReceiptText,  label: language === 'he' ? 'קבלות' : language === 'en' ? 'Receipts' : 'قبضات' },
  ]

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete(project.id); onClose() }
    catch { setDeleting(false); setConfirmDel(false) }
  }

  function closeReceiptForm() {
    setShowReceiptForm(false)
    setReceiptError('')
    setReceiptFile(null)
    setReceiptPreview('')
    setReceiptForm({ amount: '', date: todayStr(), payment_method: 'كاش', payer_name: '', notes: '' })
  }

  async function handleAddReceipt() {
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0)
      return setReceiptError('أدخل المبلغ المقبوض')
    setReceiptSaving(true)
    setReceiptError('')
    try {
      let receipt_url = ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      await addReceipt({ ...receiptForm, amount: parseFloat(receiptForm.amount), project_id: project.id, receipt_url })
      closeReceiptForm()
    } catch (e) {
      setReceiptError(e.message)
    } finally {
      setReceiptSaving(false)
    }
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
          <div style={{ fontSize: 10, color: statusColor(project.status), marginTop: 1, fontWeight: 700 }}>{project.status}</div>
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
          <button onClick={() => setConfirmDel(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Trash2 size={14} color='#EF4444' strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Edit Modal */}
      <ProjectFormModal open={showEdit} onClose={() => setShowEdit(false)}
        onSave={form => onUpdate(project.id, form)} language={language} initialData={project} />

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ width: '100%', maxWidth: 300, background: C.surface, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '24px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8, textAlign: 'center' }}>
                {language === 'en' ? 'Delete Project?' : 'حذف المشروع؟'}
              </div>
              <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 20 }}>
                {language === 'en' ? 'This cannot be undone.' : 'لا يمكن التراجع عن هذا الإجراء.'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? '...' : (language === 'en' ? 'Delete' : 'حذف')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'الإيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success },
                { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'المصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent },
                { label: language === 'he' ? 'שכר' : language === 'en' ? 'Labor' : 'أجور', value: `₪${fmt(stats.wdCost)}`, color: C.secondary },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: stats.wdCount, color: C.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
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
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(exp.date)}</div>
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
              title="تسجيل قبضة"
              action={<Btn onClick={handleAddReceipt} full disabled={receiptSaving}>{receiptSaving ? 'جاري الحفظ...' : 'حفظ القبضة'}</Btn>}>
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

            {/* List */}
            {pReceipts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: `1px dashed ${C.border}` }}>
                لم يُقبض شيء بعد
              </div>
            ) : pReceipts.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: `${C.success}06`, border: `1px solid ${C.success}20`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: `${C.success}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ReceiptText size={15} color={C.success} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>+₪{fmt(r.amount || 0)}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                    {fmtDate(r.date)}{r.payment_method ? ` · ${r.payment_method}` : ''}{r.payer_name ? ` · ${r.payer_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}
                  </div>
                </div>
                {r.receipt_url && (
                  <a href={r.receipt_url} target="_blank" rel="noreferrer"
                    style={{ width: 32, height: 32, borderRadius: 10, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, textDecoration: 'none', flexShrink: 0 }}
                    title="عرض الإيصال">
                    <Paperclip size={14} strokeWidth={2} />
                  </a>
                )}
              </div>
            ))}
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
  addProject, updateProject, deleteProject,
  addReceipt, updateReceipt, deleteReceipt,
  addWorkDay, bulkAddWorkDays, updateWorkDay, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addExpense, deleteExpense, expCats = [],
  userId, permissions, payMethods = [], holidays = [],
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const statusFilters = ['all', 'نشط', 'مكتمل', 'عرض سعر', 'ملغي']
  const statusLabel = s => ({ all: language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل', 'نشط': language === 'he' ? 'פעיל' : language === 'en' ? 'Active' : 'نشط', 'مكتمل': language === 'he' ? 'הושלם' : language === 'en' ? 'Done' : 'مكتمل', 'عرض سعر': language === 'he' ? 'הצעת מחיר' : language === 'en' ? 'Quote' : 'عرض سعر', 'ملغي': language === 'he' ? 'בוטל' : language === 'en' ? 'Cancelled' : 'ملغي' })[s] || s

  const filtered = useMemo(() => {
    let list = projects
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    return list
  }, [projects, search, statusFilter])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        workDays={workDays} expenses={expenses} clientReceipts={clientReceipts}
        employees={employees} payments={payments}
        onClose={() => setSelected(null)}
        onUpdate={updateProject} onDelete={deleteProject}
        addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt}
        addExpense={addExpense} deleteExpense={deleteExpense}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        expCats={expCats} payMethods={payMethods} permissions={permissions}
        holidays={holidays} language={language} userId={userId}
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
            { label: language === 'he' ? 'פעילים' : language === 'en' ? 'Active' : 'نشطة', value: projects.filter(p => p.status === 'نشط').length, color: C.success },
            { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(clientReceipts.reduce((s, r) => s + (r.amount || 0), 0))}`, color: C.primary, small: true },
            { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف', value: `₪${fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}`, color: C.accent, small: true },
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
                      { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent },
                      { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: stats.wdCount, color: C.primary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: C.card, borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {stats.pending > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                      <AlertTriangle size={11} color={C.warning} strokeWidth={2} />
                      <span style={{ fontSize: 10, color: C.warning, fontWeight: 700 }}>{stats.pending} {language === 'he' ? 'ממתינים' : language === 'en' ? 'pending' : 'بانتظار الموافقة'}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <ProjectFormModal open={showAdd} onClose={() => setShowAdd(false)} onSave={addProject} language={language} />
    </div>
  )
}
