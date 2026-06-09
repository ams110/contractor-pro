import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Sparkles, ChevronLeft, HardHat, Users, Wallet } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import BusinessSetup from '../finance/BusinessSetup.jsx'

const LANG = {
  ar: {
    welcome:      'مرحباً بك في Contractor Pro',
    subtitle:     'قبل البدء، أنشئ المصلحة التجارية الخاصة بك حتى تتمكن من إدارة مشاريعك ومالياتك',
    auto_title:   'ابدأ بمصلحة عامة',
    auto_desc:    'سيتم إنشاء مصلحة باسم "عامة" تقدر تعدّلها لاحقاً من الإعدادات',
    manual_title: 'أضف مصلحتك يدوياً',
    manual_desc:  'أدخل اسم مصلحتك ونوعها (عوסق פטור / מורשה / חברה) الآن',
    creating:     'جاري الإنشاء...',
    back:         'رجوع',
    default_name: 'عامة',
    features:     ['المشاريع', 'العمّال', 'المالية الذكية'],
  },
  he: {
    welcome:      'ברוך הבא ל-Contractor Pro',
    subtitle:     'לפני שמתחילים, צור עסק כדי שתוכל לנהל פרויקטים ופיננסים',
    auto_title:   'התחל עם עסק כללי',
    auto_desc:    'ייווצר עסק בשם "כללי" — תוכל לערוך אותו מאוחר יותר',
    manual_title: 'הגדר עסק ידנית',
    manual_desc:  'הכנס שם עסק וסוג (עוסק פטור / מורשה / חברה) עכשיו',
    creating:     '...יוצר',
    back:         'חזרה',
    default_name: 'כללי',
    features:     ['פרויקטים', 'עובדים', 'כספים חכמים'],
  },
  en: {
    welcome:      'Welcome to Contractor Pro',
    subtitle:     'Before you start, create your business so you can manage projects and finances',
    auto_title:   'Start with a General Business',
    auto_desc:    'A business called "General" will be created — you can edit it later in settings',
    manual_title: 'Set Up Manually',
    manual_desc:  'Enter your business name and type (Exempt / Licensed / Company) now',
    creating:     'Creating...',
    back:         'Back',
    default_name: 'General',
    features:     ['Projects', 'Workers', 'Smart finance'],
  },
}

const FEATURE_ICONS = [Building2, Users, Wallet]

export default function FirstTimeSetup({ language = 'ar' }) {
  const t = LANG[language] ?? LANG.ar
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const { create, load } = useBusinessStore()
  const [mode,     setMode]     = useState(null)  // null | 'manual'
  const [creating, setCreating] = useState(false)
  const [err,      setErr]      = useState('')

  async function handleAutoCreate() {
    setCreating(true)
    setErr('')
    try {
      await create({ name: t.default_name, business_type: 'osek_patur' })
      await load()
    } catch (e) {
      console.error(e)
      setErr('حدث خطأ — حاول مجدداً')
      setCreating(false)
    }
  }

  // بعد ما BusinessSetup ينتهي → load() → businesses.length > 0 → هذا المكون يختفي
  if (mode === 'manual') {
    return (
      <div dir={dir} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: C.bg, overflowY: 'auto' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
          {/* Back button */}
          <button
            onClick={() => setMode(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '16px 16px 0', background: 'none', border: 'none', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' }}
          >
            <ChevronLeft size={16} />
            {t.back}
          </button>
          <BusinessSetup onDone={() => load()} />
        </div>
      </div>
    )
  }

  return (
    <div dir={dir} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', overflowY: 'auto' }}>

      {/* Aurora */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(245,158,11,0.1) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.06) 0%, transparent 60%)' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: 22, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 48px rgba(245,158,11,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset', marginBottom: 20 }}
          >
            <HardHat size={36} color="#000" strokeWidth={1.8} />
          </motion.div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 10 }}>
            {t.welcome}
          </div>
          <div style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 1.7, maxWidth: 340 }}>
            {t.subtitle}
          </div>

          {/* شريط الميزات — يبرز قيمة التطبيق بنظرة واحدة */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            {t.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <motion.div key={f}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${C.primary}10`, border: `1px solid ${C.primary}26` }}>
                  <Icon size={13} color={C.primary} strokeWidth={2.2} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: C.text }}>{f}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* خيار 1: مصلحة عامة تلقائية */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          onClick={handleAutoCreate}
          disabled={creating}
          style={{
            width: '100%', marginBottom: 12,
            padding: '18px 20px',
            background: creating ? 'rgba(245,158,11,0.08)' : `${C.primary}12`,
            border: `1.5px solid ${C.primary}${creating ? '30' : '50'}`,
            borderRadius: 20, cursor: creating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', textAlign: 'start',
            transition: 'all .2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 20px rgba(245,158,11,0.35)' }}>
              {creating
                ? <div style={{ width: 18, height: 18, border: '2.5px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : <Sparkles size={20} color="#000" strokeWidth={2} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                {creating ? t.creating : t.auto_title}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
                {t.auto_desc}
              </div>
            </div>
          </div>
        </motion.button>

        {/* خيار 2: إعداد يدوي */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.53 }}
          onClick={() => setMode('manual')}
          disabled={creating}
          style={{
            width: '100%',
            padding: '18px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${C.border}`,
            borderRadius: 20, cursor: creating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', textAlign: 'start',
            transition: 'all .2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={20} color={C.textDim} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                {t.manual_title}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
                {t.manual_desc}
              </div>
            </div>
          </div>
        </motion.button>

        {err && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, fontSize: 12, color: '#EF4444', textAlign: 'center' }}>
            {err}
          </div>
        )}

      </div>
    </div>
  )
}
