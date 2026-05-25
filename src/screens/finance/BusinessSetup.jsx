import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, ChevronLeft, Check } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { useBusinessStore, BUSINESS_TYPES } from '../../store/useBusinessStore.js'

const inp = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  color: C.text,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .2s',
}

export default function BusinessSetup({ onDone }) {
  const createBusiness = useBusinessStore(s => s.create)

  const [form, setForm] = useState({
    name:          '',
    business_type: 'osek_patur',
    reg_number:    '',
    phone:         '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [focus,  setFocus]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { setError('اسم المصلحة مطلوب'); return }
    setSaving(true)
    setError('')
    try {
      await createBusiness({
        name:          form.name.trim(),
        business_type: form.business_type,
        reg_number:    form.reg_number.trim() || null,
        phone:         form.phone.trim() || null,
      })
      onDone?.()
    } catch (e) {
      setError('حدث خطأ، حاول مرة أخرى')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: GRAD.warm,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 32px ${C.primary}44`,
          }}>
            <Building2 size={32} color="#fff" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>
            مرحباً بك في المالية
          </div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>
            ابدأ بإضافة مصلحتك الأولى لتتبع مدخولاتك ومصاريفك وأرشفة فواتيرك
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: '24px 20px' }}>

          {/* اسم المصلحة */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
              اسم المصلحة / الشركة <span style={{ color: C.accent }}>*</span>
            </div>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={() => setFocus('name')}
              onBlur={() => setFocus('')}
              placeholder="مثال: מקבלנות הצפון"
              style={{ ...inp, borderColor: focus === 'name' ? C.primary : C.border }}
            />
          </div>

          {/* نوع المصلحة */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 8 }}>
              نوع المصلحة <span style={{ color: C.accent }}>*</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BUSINESS_TYPES.map(bt => {
                const active = form.business_type === bt.id
                return (
                  <button
                    key={bt.id}
                    onClick={() => set('business_type', bt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: active ? `${C.primary}12` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${active ? C.primary : C.border}`,
                      borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'right', transition: 'all .2s',
                    }}
                  >
                    {/* Radio circle */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${active ? C.primary : C.textDim}`,
                      background: active ? C.primary : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .2s',
                    }}>
                      {active && <Check size={10} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: active ? C.primary : C.text, direction: 'rtl' }}>
                        {bt.label}
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{bt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* رقم ע.מ */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
              {form.business_type === 'hevra' ? 'رقم ח.פ' : 'رقم ע.מ'}
              <span style={{ color: C.textDim, fontWeight: 400, marginRight: 4 }}>(اختياري)</span>
            </div>
            <input
              value={form.reg_number}
              onChange={e => set('reg_number', e.target.value)}
              onFocus={() => setFocus('reg')}
              onBlur={() => setFocus('')}
              placeholder="000000000"
              inputMode="numeric"
              style={{ ...inp, borderColor: focus === 'reg' ? C.primary : C.border, direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          {/* الهاتف */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
              رقم الهاتف
              <span style={{ color: C.textDim, fontWeight: 400, marginRight: 4 }}>(اختياري)</span>
            </div>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              onFocus={() => setFocus('phone')}
              onBlur={() => setFocus('')}
              placeholder="05X-XXXXXXX"
              inputMode="tel"
              style={{ ...inp, borderColor: focus === 'phone' ? C.primary : C.border, direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 12, color: C.accent, marginBottom: 12, textAlign: 'center' }}>{error}</div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              width: '100%', padding: '14px',
              background: saving || !form.name.trim() ? 'rgba(255,255,255,0.06)' : GRAD.warm,
              border: 'none', borderRadius: 14,
              color: saving || !form.name.trim() ? C.textDim : '#fff',
              fontSize: 14, fontWeight: 800,
              cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .2s',
            }}
          >
            {saving ? 'جاري الحفظ...' : (
              <>
                حفظ والمتابعة
                <ChevronLeft size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: C.textDim }}>
          يمكنك إضافة مصالح أخرى لاحقاً في أي وقت
        </div>
      </motion.div>
    </div>
  )
}
