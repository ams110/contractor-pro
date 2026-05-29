import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Trash2 } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { useBusinessStore, BUSINESS_TYPES } from '../../store/useBusinessStore.js'

const inp = {
  width: '100%',
  padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  color: C.text,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .2s',
}

export default function BusinessEditSheet({ business, onClose }) {
  const { update, remove } = useBusinessStore()

  const [form, setForm] = useState({
    name:          business.name,
    business_type: business.business_type,
    reg_number:    business.reg_number ?? '',
    phone:         business.phone ?? '',
    address:       business.address ?? '',
    bank_name:     business.bank_name ?? '',
    bank_account:  business.bank_account ?? '',
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const [focus,    setFocus]    = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await update(business.id, {
        name:          form.name.trim(),
        business_type: form.business_type,
        reg_number:    form.reg_number.trim() || null,
        phone:         form.phone.trim() || null,
        address:       form.address.trim() || null,
        bank_name:     form.bank_name.trim() || null,
        bank_account:  form.bank_account.trim() || null,
      })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await remove(business.id)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxWidth: 480, margin: '0 auto',
            background: C.surface,
            border: `1px solid ${C.borderMid}`,
            borderRadius: '24px 24px 0 0',
            maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تعديل المصلحة</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

            {/* الاسم */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم المصلحة *</div>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
                style={{ ...inp, borderColor: focus === 'name' ? C.primary : C.border }} />
            </div>

            {/* النوع */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>نوع المصلحة *</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {BUSINESS_TYPES.map(bt => {
                  const active = form.business_type === bt.id
                  return (
                    <button key={bt.id} onClick={() => set('business_type', bt.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: active ? `${C.primary}12` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', transition: 'all .2s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? C.primary : C.textDim}`, background: active ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                        {active && <Check size={9} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: active ? C.primary : C.text, direction: 'rtl' }}>{bt.label}</div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{bt.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* رقم ע.מ / ח.פ */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                {form.business_type === 'hevra' ? 'رقم ח.פ' : 'رقم ע.מ'}
              </div>
              <input value={form.reg_number} onChange={e => set('reg_number', e.target.value)}
                onFocus={() => setFocus('reg')} onBlur={() => setFocus('')}
                inputMode="numeric" placeholder="000000000"
                style={{ ...inp, direction: 'ltr', textAlign: 'left', borderColor: focus === 'reg' ? C.primary : C.border }} />
            </div>

            {/* الهاتف */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>رقم الهاتف</div>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                onFocus={() => setFocus('phone')} onBlur={() => setFocus('')}
                inputMode="tel"
                style={{ ...inp, direction: 'ltr', textAlign: 'left', borderColor: focus === 'phone' ? C.primary : C.border }} />
            </div>

            {/* العنوان */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>العنوان</div>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                onFocus={() => setFocus('address')} onBlur={() => setFocus('')}
                style={{ ...inp, borderColor: focus === 'address' ? C.primary : C.border }} />
            </div>

            {/* البنك */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم البنك</div>
              <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                onFocus={() => setFocus('bank')} onBlur={() => setFocus('')}
                style={{ ...inp, borderColor: focus === 'bank' ? C.primary : C.border }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>رقم الحساب</div>
              <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)}
                onFocus={() => setFocus('acc')} onBlur={() => setFocus('')}
                inputMode="numeric"
                style={{ ...inp, direction: 'ltr', textAlign: 'left', borderColor: focus === 'acc' ? C.primary : C.border }} />
            </div>

            {/* حذف */}
            {!confirm ? (
              <button onClick={() => setConfirm(true)}
                style={{ width: '100%', padding: '10px', background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 12, color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                <Trash2 size={13} /> حذف هذه المصلحة
              </button>
            ) : (
              <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}30`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
                  هل أنت متأكد من حذف "{business.name}"؟
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: 9, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: 9, background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {deleting ? 'جاري الحذف...' : 'نعم، احذف'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 18px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}` }}>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              style={{ width: '100%', padding: '13px', background: saving || !form.name.trim() ? 'rgba(255,255,255,0.06)' : GRAD.warm, border: 'none', borderRadius: 14, color: saving || !form.name.trim() ? C.textDim : '#fff', fontSize: 14, fontWeight: 800, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
