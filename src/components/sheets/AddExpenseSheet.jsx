import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Image, Banknote, Smartphone, CreditCard, Building,
  FolderOpen, AlertCircle, Lock, Globe,
} from 'lucide-react'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT, VAT } from '../../constants/index.js'
import { todayStr } from '../../lib/helpers.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'

const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]

const CAT_COLORS = ['#F59E0B','#22C55E','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F97316','#EF4444','#84CC16','#94A3B8']
function catColor(cat) {
  const i = EXP_CATS.indexOf(cat)
  return CAT_COLORS[i % CAT_COLORS.length] ?? '#94A3B8'
}
function vatDeductRate(cat) { return EXP_CAT_VAT?.[cat] ?? 1.0 }

const inp = (focus, key, error) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${error ? C.accent : focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

const GENERAL_VALUE = '__general__'

/**
 * فورم موحّد لتسجيل مصروف.
 *
 * props:
 *   open, onClose, onSave(payload)
 *   userId, businessId
 *   projects                  — مشاريع المصلحة [{ id, name, ref_number }]
 *   defaultProjectId          — اختياري؛ يقفل اختيار المشروع
 *   businessType              — 'osek_patur' | 'osek_moreh' | 'hevra' (لإظهار VAT)
 *   onGoToProjects            — اختياري؛ لما يطلب إنشاء مشروع
 */
export default function AddExpenseSheet({
  open, onClose, onSave,
  userId, businessId,
  projects = [],
  defaultProjectId = null,
  businessType = 'osek_patur',
  onGoToProjects,
}) {
  const showVat = businessType === 'osek_moreh' || businessType === 'hevra'

  const [form, setForm] = useState(() => ({
    amount: '', date: todayStr(),
    category: EXP_CATS[0] ?? 'مواد بناء / خامات',
    vendor: '', payment_method: 'cash',
    project_id: defaultProjectId || '',
    note: '',
  }))
  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focus,  setFocus]  = useState('')
  const [err,    setErr]    = useState({})
  const fileRef = useRef()
  const { confirm: bioConfirm, hasAnyMethod } = useBiometricConfirm()

  const lockedProject = !!defaultProjectId
  const noProjects    = projects.length === 0 && !lockedProject

  useEffect(() => {
    if (open) {
      setForm({
        amount: '', date: todayStr(),
        category: EXP_CATS[0] ?? 'مواد بناء / خامات',
        vendor: '', payment_method: 'cash',
        project_id: defaultProjectId || '',
        note: '',
      })
      setProofFile(null); setProofPreview(null)
      setSaving(false); setErr({})
    }
  }, [open, defaultProjectId])

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (err[k]) setErr(e => ({ ...e, [k]: null }))
  }

  function pickFile(e) {
    const f = e.target.files?.[0]; if (!f) return
    setProofFile(f); setProofPreview(URL.createObjectURL(f))
  }

  function validate() {
    const next = {}
    if (!form.project_id) next.project_id = 'اختر المشروع أو "مصروف عام"'
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'أدخل المبلغ'
    setErr(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    if (hasAnyMethod()) {
      const sig = await bioConfirm(`تسجيل مصروف: ₪${form.amount} — ${form.category}`, 'expenses')
      if (!sig) return
    }
    setSaving(true)
    try {
      let receipt_url = null
      if (proofFile && userId) receipt_url = await uploadReceipt(userId, proofFile)

      const isGeneral = form.project_id === GENERAL_VALUE
      const amount    = Number(form.amount)
      const vatAmount = showVat ? +(amount - amount / (1 + VAT)).toFixed(2) : 0

      await onSave({
        user_id:        userId,
        business_id:    businessId,
        project_id:     isGeneral ? null : form.project_id,
        is_general:     isGeneral,
        amount,
        vat_amount:     vatAmount,
        date:           form.date,
        category:       form.category,
        vendor:         form.vendor.trim() || null,
        payment_method: form.payment_method,
        note:           form.note.trim() || null,
        receipt_url,
        status:         'approved',
      })
      onClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const canSave = !!form.project_id && !!form.amount && Number(form.amount) > 0 && !saving
  const isGeneralSelected = form.project_id === GENERAL_VALUE
  const showFormBody = !noProjects || isGeneralSelected
  const rate = vatDeductRate(form.category)
  const vatLabel =
    rate >= 1.0 ? `${'מע"מ'} قابل للخصم 100%` :
    rate >= 0.6 ? `${'מע"מ'} قابل للخصم 67%`  :
                  `${'מע"מ'} غير قابل للخصم`
  const vatColor = rate >= 1.0 ? '#22C55E' : rate >= 0.6 ? '#F59E0B' : '#EF4444'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: C.card, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>

            {/* Header */}
            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل مصروف</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>

              {noProjects ? (
                // ─── لا مشاريع — السماح بمصروف عام فقط ─────────────────────
                <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                  <FolderOpen size={36} color={C.warning} style={{ marginBottom: 12, opacity: 0.7 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                    ما في مشاريع في هذه المصلحة
                  </div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 16 }}>
                    تقدر تسجل مصروف عام على المصلحة، أو تنشئ مشروع لربطه فيه.
                  </div>
                  <button onClick={() => set('project_id', GENERAL_VALUE)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 18px', background: form.project_id === GENERAL_VALUE ? `${C.warning}25` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${form.project_id === GENERAL_VALUE ? C.warning : C.border}`, borderRadius: 12, color: form.project_id === GENERAL_VALUE ? C.warning : C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
                    <Globe size={14} /> مصروف عام على المصلحة
                  </button>
                  <div>
                    <button onClick={() => { onClose(); onGoToProjects?.() }}
                      style={{ background: 'none', border: 'none', color: C.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                      أو إنشاء مشروع جديد →
                    </button>
                  </div>
                </div>
              ) : (
                // ─── حقل اختيار المشروع ─────────────────────────────────────
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FolderOpen size={11} />
                    المشروع <span style={{ color: C.accent }}>*</span>
                    {lockedProject && <Lock size={9} style={{ marginRight: 'auto' }} />}
                  </div>
                  {lockedProject ? (
                    <div style={{ ...inp(focus, 'proj', err.project_id), background: `${C.primary}10`, borderColor: `${C.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: C.primary, fontWeight: 700 }}>
                        {projects.find(p => p.id === form.project_id)?.name || '—'}
                      </span>
                      {projects.find(p => p.id === form.project_id)?.ref_number && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, fontFamily: 'monospace', background: `${C.primary}20`, padding: '2px 7px', borderRadius: 6 }}>
                          {projects.find(p => p.id === form.project_id)?.ref_number}
                        </span>
                      )}
                    </div>
                  ) : (
                    <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                      onFocus={() => setFocus('proj')} onBlur={() => setFocus('')}
                      style={{ ...inp(focus, 'proj', err.project_id), cursor: 'pointer' }}>
                      <option value="">— اختر —</option>
                      <option value={GENERAL_VALUE}>مصروف عام على المصلحة (بدون مشروع)</option>
                      <option disabled>──────────</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.ref_number ? `${p.ref_number} · ` : ''}{p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {err.project_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, color: C.accent }}>
                      <AlertCircle size={10} /> {err.project_id}
                    </div>
                  )}
                  {isGeneralSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '6px 10px', background: `${C.warning}12`, border: `1px solid ${C.warning}30`, borderRadius: 8, fontSize: 10, color: C.warning, fontWeight: 600 }}>
                      <Globe size={10} /> مصروف عام على المصلحة، مش مربوط بمشروع محدد.
                    </div>
                  )}
                </div>
              )}

              {/* باقي الفورم */}
              {showFormBody && (
                <>
                  {/* المبلغ */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                      المبلغ (₪) <span style={{ color: C.accent }}>*</span>
                    </div>
                    <input type="number" inputMode="decimal" value={form.amount}
                      onChange={e => set('amount', e.target.value)} placeholder="0.00"
                      onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                      style={{ ...inp(focus, 'amount', err.amount), fontSize: 20, fontWeight: 900, direction: 'ltr', textAlign: 'right', color: C.accent }} />
                    {err.amount && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, color: C.accent }}>
                        <AlertCircle size={10} /> {err.amount}
                      </div>
                    )}
                  </div>

                  {/* الفئة */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>الفئة</span>
                      {showVat && (
                        <span style={{ fontSize: 9, color: vatColor, fontWeight: 700, background: `${vatColor}15`, border: `1px solid ${vatColor}30`, padding: '2px 7px', borderRadius: 8 }}>
                          {vatLabel}
                        </span>
                      )}
                    </div>
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

                  {/* اسم المورد */}
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
                </>
              )}
            </div>

            {/* Footer */}
            {showFormBody && (
              <div style={{ padding: '12px 18px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <button onClick={handleSave} disabled={!canSave}
                  style={{ width: '100%', padding: '13px', background: canSave ? GRAD.danger : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {saving ? 'جاري الحفظ...' : '+ تسجيل المصروف'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
