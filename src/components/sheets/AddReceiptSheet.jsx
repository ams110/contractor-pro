import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Image, Banknote, Smartphone, CreditCard, Building,
  FolderOpen, AlertCircle, Lock,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { todayStr } from '../../lib/helpers.js'
import { uploadReceipt } from '../../lib/storage.js'

const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]

const inp = (focus, key, error) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${error ? C.accent : focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

/**
 * فورم موحّد لتسجيل قبضة عميل.
 *
 * props:
 *   open              — مفتوح/مغلق
 *   onClose           — للإغلاق
 *   onSave(payload)   — async; payload يشمل user_id, business_id, project_id, amount, date, ...
 *   userId            — المستخدم الحالي
 *   businessId        — معرف المصلحة النشطة
 *   projects          — مصفوفة المشاريع المربوطة بالمصلحة النشطة [{ id, name, ref_number }]
 *   defaultProjectId  — اختياري؛ إذا معبأ يقفل اختيار المشروع
 *   onGoToProjects    — اختياري؛ يُستدعى لما ما في مشاريع ويضغط المستخدم زر الإنشاء
 */
export default function AddReceiptSheet({
  open, onClose, onSave,
  userId, businessId,
  projects = [],
  defaultProjectId = null,
  onGoToProjects,
}) {
  const [form, setForm] = useState(() => ({
    amount: '', date: todayStr(),
    payment_method: 'cash', payer_name: '',
    project_id: defaultProjectId || '',
    notes: '', external_ref: '',
  }))
  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focus,  setFocus]  = useState('')
  const [err,    setErr]    = useState({})
  const fileRef = useRef()

  const lockedProject = !!defaultProjectId
  const noProjects    = projects.length === 0

  // إعادة تعيين عند فتح/إغلاق
  useEffect(() => {
    if (open) {
      setForm({
        amount: '', date: todayStr(),
        payment_method: 'cash', payer_name: '',
        project_id: defaultProjectId || '',
        notes: '', external_ref: '',
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
    if (!form.project_id) next.project_id = 'اختر المشروع'
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'أدخل المبلغ'
    setErr(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      let receipt_url = null
      if (proofFile && userId) receipt_url = await uploadReceipt(userId, proofFile)
      await onSave({
        user_id:        userId,
        business_id:    businessId,
        project_id:     form.project_id,
        amount:         Number(form.amount),
        date:           form.date,
        payment_method: form.payment_method,
        payer_name:     form.payer_name.trim() || null,
        notes:          form.notes.trim() || null,
        ref_number:     form.external_ref.trim() || null, // مرجع خارجي اختياري
        receipt_url,
      })
      onClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const canSave = !!form.project_id && !!form.amount && Number(form.amount) > 0 && !saving

  return (
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
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل قبضة</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {noProjects ? (
              // ─── حالة "لا توجد مشاريع" ─────────────────────────────────────
              <div style={{ flex: 1, padding: '40px 24px', textAlign: 'center' }}>
                <FolderOpen size={40} color={C.warning} style={{ marginBottom: 14, opacity: 0.7 }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  ما في مشاريع في هذه المصلحة
                </div>
                <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 18 }}>
                  لازم تنشئ مشروع أولاً قبل تسجيل أي قبضة.
                  كل القبضات لازم تُربط بمشروع.
                </div>
                <button onClick={() => { onClose(); onGoToProjects?.() }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 18px', background: GRAD.primary, border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + إنشاء مشروع جديد
                </button>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>

                {/* المشروع — أول حقل + إجباري */}
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
                      <option value="">— اختر مشروع —</option>
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
                </div>

                {/* المبلغ */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                    المبلغ (₪) <span style={{ color: C.accent }}>*</span>
                  </div>
                  <input type="number" inputMode="decimal" value={form.amount}
                    onChange={e => set('amount', e.target.value)} placeholder="0.00"
                    onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'amount', err.amount), fontSize: 20, fontWeight: 900, direction: 'ltr', textAlign: 'right', color: C.success }} />
                  {err.amount && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, color: C.accent }}>
                      <AlertCircle size={10} /> {err.amount}
                    </div>
                  )}
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
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: active ? `${C.success}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? C.success : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                          <m.Icon size={14} color={active ? C.success : C.textDim} />
                          <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? C.success : C.textDim }}>{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* اسم الدافع */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم الدافع (اختياري)</div>
                  <input value={form.payer_name} onChange={e => set('payer_name', e.target.value)}
                    placeholder="اسم العميل / الجهة الدافعة"
                    onFocus={() => setFocus('payer')} onBlur={() => setFocus('')} style={inp(focus, 'payer')} />
                </div>

                {/* رقم خارجي / شيك */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                    رقم خارجي / شيك (اختياري)
                  </div>
                  <input value={form.external_ref} onChange={e => set('external_ref', e.target.value)}
                    placeholder="رقم الشيك أو مرجع خارجي"
                    onFocus={() => setFocus('extref')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'extref'), direction: 'ltr' }} />
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, opacity: 0.75 }}>
                    التطبيق بيعطي رقم تسلسلي تلقائي (RCP-XXXX) — هذا الحقل لرقم خارجي فقط.
                  </div>
                </div>

                {/* ملاحظة */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                  <input value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="أي تفاصيل إضافية..."
                    onFocus={() => setFocus('notes')} onBlur={() => setFocus('')} style={inp(focus, 'notes')} />
                </div>

                {/* صورة الإيصال */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>صورة الإيصال (اختياري)</div>
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
            )}

            {/* Footer */}
            {!noProjects && (
              <div style={{ padding: '12px 18px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <button onClick={handleSave} disabled={!canSave}
                  style={{ width: '100%', padding: '13px', background: canSave ? GRAD.success : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {saving ? 'جاري الحفظ...' : '+ تسجيل القبضة'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
