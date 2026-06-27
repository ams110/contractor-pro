import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, ChevronLeft, Check } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { useBusinessStore, BUSINESS_TYPES, bizTypeDesc } from '../../store/useBusinessStore.js'
import { supabase } from '../../lib/supabase.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'

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
  const language = useAppStore(s => s.language)

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
    if (!form.name.trim()) { setError(tl(language, 'اسم المصلحة مطلوب', 'שם העסק נדרש', 'Business name is required')); return }
    setSaving(true)
    setError('')
    try {
      const biz = await createBusiness({
        name:          form.name.trim(),
        business_type: form.business_type,
        reg_number:    form.reg_number.trim() || null,
        phone:         form.phone.trim() || null,
      })

      // ── ربط البيانات القديمة (business_id = NULL) بالمصلحة الجديدة ──────
      if (biz?.id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await Promise.all([
            supabase.from('projects')
              .update({ business_id: biz.id })
              .eq('user_id', user.id)
              .is('business_id', null),
            supabase.from('client_receipts')
              .update({ business_id: biz.id })
              .eq('user_id', user.id)
              .is('business_id', null),
            supabase.from('expenses')
              .update({ business_id: biz.id })
              .eq('user_id', user.id)
              .is('business_id', null),
          ])
        }
      }

      onDone?.()
    } catch (e) {
      setError(tl(language, 'حدث خطأ، حاول مرة أخرى', 'אירעה שגיאה, נסה שוב', 'An error occurred, try again'))
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
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
            {tl(language, 'مرحباً بك في المالية', 'ברוך הבא לפיננסים', 'Welcome to Finance')}
          </div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>
            {tl(language, 'ابدأ بإضافة مصلحتك الأولى لتتبع مدخولاتك ومصاريفك وأرشفة فواتيرك', 'התחל בהוספת העסק הראשון שלך כדי לעקוב אחר ההכנסות, ההוצאות וארכיון החשבוניות', 'Start by adding your first business to track income, expenses and archive invoices')}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: '24px 20px' }}>

          {/* اسم المصلحة */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
              {tl(language, 'اسم المصلحة / الشركة', 'שם העסק / החברה', 'Business / Company name')} <span style={{ color: C.accent }}>*</span>
            </div>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={() => setFocus('name')}
              onBlur={() => setFocus('')}
              placeholder={tl(language, 'مثال: מקבלנות הצפון', 'דוגמה: קבלנות הצפון', 'e.g. North Contracting')}
              style={{ ...inp, borderColor: focus === 'name' ? C.primary : C.border }}
            />
          </div>

          {/* نوع المصلحة */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 8 }}>
              {tl(language, 'نوع المصلحة', 'סוג העסק', 'Business type')} <span style={{ color: C.accent }}>*</span>
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
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{bizTypeDesc(bt, language)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* رقم ע.מ */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
              {form.business_type === 'hevra'
                ? tl(language, 'رقم ח.פ', 'מספר ח.פ', 'Company no. (ח.פ)')
                : tl(language, 'رقم ע.מ', 'מספר ע.מ', 'Business no. (ע.מ)')}
              <span style={{ color: C.textDim, fontWeight: 400, marginRight: 4 }}>{tl(language, '(اختياري)', '(אופציונלי)', '(optional)')}</span>
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
              {tl(language, 'رقم الهاتف', 'מספר טלפון', 'Phone number')}
              <span style={{ color: C.textDim, fontWeight: 400, marginRight: 4 }}>{tl(language, '(اختياري)', '(אופציונלי)', '(optional)')}</span>
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
            {saving ? tl(language, 'جاري الحفظ...', 'שומר...', 'Saving...') : (
              <>
                {tl(language, 'حفظ والمتابعة', 'שמור והמשך', 'Save & continue')}
                <ChevronLeft size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: C.textDim }}>
          {tl(language, 'يمكنك إضافة مصالح أخرى لاحقاً في أي وقت', 'תוכל להוסיף עסקים נוספים בכל עת', 'You can add more businesses anytime')}
        </div>
      </motion.div>
    </div>
  )
}
