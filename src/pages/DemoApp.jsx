import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Building2, Users, Wallet, Settings,
  Sparkles, ArrowLeft, Rocket,
  Receipt, Percent, FileText, ShieldCheck,
} from 'lucide-react'
import { C, GRAD, NAV, navLabel } from '../constants/index.js'
import { buildDemo, makeDemoBag, seedDemoStores } from '../lib/demoData.js'
import { tl } from '../lib/labels.js'
import { trackEvent } from '../lib/analytics.js'
import { trackCtaClick, trackDemoView } from '../lib/track.js'
import { useAppStore } from '../store/useAppStore.js'
import { navigate } from '../Router.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

// مرجع نظيف لدالة تأكيد البصمة الأصلية (قبل أي تجاوز) — لاستعادتها عند مغادرة الديمو
const ORIGINAL_BIO = useAppStore.getState().requestBioConfirm

import DashboardScreen from '../screens/dashboard/DashboardScreen.jsx'
import WorkersScreen   from '../screens/workers/WorkersScreen.jsx'
import WorkDaysScreen  from '../screens/WorkDaysScreen.jsx'
import ProjectsScreen  from '../screens/projects/ProjectsScreen.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  DEMO APP — التطبيق الحقيقي ببيانات وهمية، بلا تسجيل، بوضع قراءة.
//  المسار: /demo (أو ?demo). شريط علوي + CTA دائم «سجّل مجاناً».
//  أي محاولة تعديل (حفظ/إضافة) تفتح بطاقة «سجّل مجاناً لتبدأ بمصلحتك».
//  مصدر البيانات الموحّد: src/lib/demoData.js (يشاركه /demoshot).
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ICONS = { dashboard: LayoutDashboard, projects: Building2, workers: Users, finance: Wallet, settings: Settings }

function goRegister(from) {
  trackCtaClick('demo_register', { from })
  navigate('/register')
}

// لوحة محجوبة في الديمو = معاينة ميزات + دعوة تسجيل (ثنائية اللغة — ar/he/en).
// تُستعمل للمالية (تحتاج بياناتك الحقيقية لتحسب على أرقامك) وللإعدادات (حسّاسة).
function getLockedTab(kind, language) {
  const tabs = {
    finance: {
      icon: Wallet,
      title: tl(language, 'المحاسبة والضرائب — على أرقامك أنت', 'הנהלת חשבונות ומסים — על המספרים שלך', 'Accounting & taxes — on your own numbers'),
      desc: tl(language,
        'وحدة المالية بتحسب لك الضرائب الإسرائيلية تلقائياً من مدخولاتك ومصاريفك الحقيقية. سجّل مجاناً وشغّلها على مصلحتك.',
        'מודול הכספים מחשב לך את המסים בישראל אוטומטית מההכנסות וההוצאות האמיתיות שלך. הירשם בחינם והפעל אותו על העסק שלך.',
        'The finance module computes Israeli taxes automatically from your real income and expenses. Sign up free and run it on your business.'),
      feats: [
        { icon: Percent,     label: tl(language, 'מע"מ تلقائي 18% — داخل وخارج، حسب فئة كل مصروف', 'מע"מ אוטומטי 18% — תשומות ועסקאות, לפי קטגוריית כל הוצאה', 'Automatic VAT 18% — input & output, per expense category') },
        { icon: FileText,    label: tl(language, 'ضريبة دخل + ביטוח לאומי محسوبة بالشرائح', 'מס הכנסה + ביטוח לאומי מחושבים לפי מדרגות', 'Income tax + National Insurance by brackets') },
        { icon: Receipt,     label: tl(language, 'أرشيف فواتير وإيصالات + تقرير فترة قابل للتصدير', 'ארכיון חשבוניות וקבלות + דוח תקופה לייצוא', 'Invoice & receipt archive + exportable period report') },
        { icon: ShieldCheck, label: tl(language, 'P&L لكل مشروع: إيراد − مصاريف − عمالة = ربح وهامش', 'רווח והפסד לכל פרויקט: הכנסה − הוצאות − עבודה = רווח ואחוז', 'P&L per project: revenue − expenses − labor = profit & margin') },
      ],
      from: 'demo_finance',
    },
    settings: {
      icon: Rocket,
      title: tl(language, 'جاهز تبدأ بمصلحتك؟', 'מוכן להתחיל עם העסק שלך?', 'Ready to start with your business?'),
      desc: tl(language,
        'هاي البيانات تجريبية. سجّل مجاناً بثوانٍ وابدأ تضيف مشاريعك وعمّالك الحقيقيين — 14 يوماً تجربة، بدون بطاقة ائتمان.',
        'הנתונים האלה הם לדוגמה. הירשם בחינם תוך שניות והתחל להוסיף את הפרויקטים והעובדים האמיתיים שלך — 14 ימי ניסיון, בלי כרטיס אשראי.',
        'This is sample data. Sign up free in seconds and start adding your real projects and workers — 14-day trial, no credit card.'),
      feats: [
        { icon: Building2,   label: tl(language, 'مشاريعك وعمّالك الحقيقيين — تُحفظ وتتزامن', 'הפרויקטים והעובדים האמיתיים שלך — נשמרים ומסתנכרנים', 'Your real projects & workers — saved and synced') },
        { icon: ShieldCheck, label: tl(language, 'فريق متعدّد الصلاحيات + بوّابة عامل ذاتية', 'צוות עם הרשאות + פורטל עובד עצמאי', 'Permission-based team + self-service worker portal') },
        { icon: Sparkles,    label: tl(language, 'كل التحليلات الذكية تشتغل على بياناتك', 'כל הניתוחים החכמים עובדים על הנתונים שלך', 'All smart analytics run on your data') },
      ],
      from: 'demo_settings',
    },
  }
  return tabs[kind]
}

function DemoLockedTab({ kind, language }) {
  const cfg = getLockedTab(kind, language)
  const Icon = cfg.icon
  return (
    <div style={{ padding: '34px 18px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ width: 76, height: 76, borderRadius: 24, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={34} color={C.primary} strokeWidth={1.6} />
        </motion.div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: '-0.02em' }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.7 }}>{cfg.desc}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {cfg.feats.map((f, i) => {
          const FIcon = f.icon
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.card, border: `1px solid ${C.primary}1f`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.primary}16`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FIcon size={16} color={C.primary} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>{f.label}</span>
            </motion.div>
          )
        })}
      </div>

      <button onClick={() => goRegister(cfg.from)}
        style={{ width: '100%', padding: '14px', borderRadius: 16, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(249,115,22,0.4)' }}>
        {tl(language, 'سجّل مجاناً وابدأ', 'הירשם בחינם והתחל', 'Sign up free & start')} <ArrowLeft size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function DemoApp() {
  const language = useAppStore(s => s.language)   // ar | he | en (من cp_lang) — يحدّد لغة الديمو
  const [screen, setScreen] = useState('dashboard')

  // بيانات الديمو بلغة الزائر: الأسماء الحرّة (عمّال/مشاريع/مصلحة) تُعرَّب للعبري.
  const demo = useMemo(() => buildDemo(language === 'he' || language === 'en' ? language : 'ar'), [language])

  // أي محاولة تعديل/حفظ في الديمو = نيّة قويّة → نوجّه فوراً للتسجيل (لحظة التحويل).
  const onAction = useCallback(() => {
    trackEvent('demo_action_blocked')
    goRegister('demo_action')
  }, [])

  // بذر المخازن المشتركة عند تغيّر البيانات/اللغة (اسم المصلحة يُعرَّب من demo._lang)
  useEffect(() => {
    seedDemoStores(demo)
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl'
  }, [demo, language])

  useEffect(() => {
    trackDemoView()   // GA4 demo_view + TikTok ViewContent (إشارة اهتمام قويّة)
    // بعض شاشات الإنشاء/الحذف تنتظر تأكيد بصمة (مودالها في App لا الديمو) فتعلق.
    // نتجاوزها في الديمو: أي طلب تأكيد = تحويل للتسجيل. نستعيد الأصل عند المغادرة.
    useAppStore.setState({
      requestBioConfirm: () => { onAction(); return new Promise(() => {}) },
    })
    return () => useAppStore.setState({ requestBioConfirm: ORIGINAL_BIO })
  }, [onAction])

  // نمرّر language صريحاً للشاشات لتُرندَر بلغة الزائر حتمياً (مطابقة لبيانات الأسماء)
  const props = makeDemoBag(demo, { onAction, extra: { onNav: setScreen, language } })

  function renderScreen() {
    switch (screen) {
      case 'projects':  return <ProjectsScreen  {...props} />
      case 'workers':   return <WorkersScreen   {...props} />
      case 'workdays':  return <WorkDaysScreen  {...props} />
      // المالية والإعدادات مرتبطتان بالباكند/حسّاستان — نعرض معاينة + دعوة تسجيل بدل شاشة فارغة
      case 'finance':   return <DemoLockedTab kind="finance" language={language} />
      case 'settings':  return <DemoLockedTab kind="settings" language={language} />
      case 'dashboard':
      default:          return <DashboardScreen {...props} />
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, direction: 'rtl', position: 'relative' }}>
      {/* خلفية أورورا خفيفة */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 40% at 15% 0%, rgba(249,115,22,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 100%, rgba(124,58,237,0.04) 0%, transparent 60%)' }} />

      {/* ─── شريط الديمو العلوي (CTA دائم) ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 199, background: 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(124,58,237,0.10))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(249,115,22,0.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${C.primary}22`, border: `1px solid ${C.primary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={14} color={C.primary} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tl(language, 'نسخة تجريبية · سجّل مجاناً لتبدأ بمصلحتك', 'גרסת דמו · הירשם בחינם והתחל עם העסק שלך', 'Demo · Sign up free to start your business')}
          </span>
        </div>
        <button onClick={() => goRegister('demo_topbar')}
          style={{ padding: '7px 16px', borderRadius: 10, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0, boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>
          {tl(language, 'سجّل مجاناً', 'הירשם בחינם', 'Sign up free')}
        </button>
      </div>

      {/* ─── محتوى الشاشة ─── */}
      <div key={screen} style={{ paddingBottom: 'max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))', position: 'relative', zIndex: 1 }}>
        <ErrorBoundary key={screen}>
          {renderScreen()}
        </ErrorBoundary>
      </div>

      {/* ─── Bottom Nav ─── */}
      <div style={{ position: 'fixed', bottom: 'max(14px, calc(8px + env(safe-area-inset-bottom, 0px)))', left: 0, right: 0, margin: '0 auto', width: 'calc(100% - 24px)', maxWidth: 410, background: 'rgba(7,8,12,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderRadius: 28, border: '1px solid rgba(245,158,11,0.1)', padding: '7px 4px 9px', display: 'flex', justifyContent: 'space-around', zIndex: 50, boxShadow: '0 16px 50px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05) inset' }}>
        {NAV.map(n => {
          const active = screen === n.id || (n.id === 'workers' && screen === 'workdays')
          const Icon = NAV_ICONS[n.id]
          return (
            <motion.button key={n.id} onClick={() => setScreen(n.id)} whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', flex: 1, position: 'relative', minWidth: 0, fontFamily: 'inherit' }}>
              {active && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', top: 1, left: 0, right: 0, marginInline: 'auto', width: 46, height: 35, borderRadius: 16, background: 'linear-gradient(160deg, rgba(249,115,22,0.2), rgba(220,38,38,0.12))', border: '1px solid rgba(249,115,22,0.28)', pointerEvents: 'none' }} />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {Icon && <Icon size={active ? 21 : 18} color={active ? C.primary : 'rgba(255,255,255,0.28)'} strokeWidth={active ? 2.3 : 1.8} style={{ filter: active ? `drop-shadow(0 0 6px ${C.primary}88)` : 'none', display: 'block' }} />}
              </div>
              <span style={{ fontSize: 8.5, fontWeight: active ? 800 : 500, color: active ? C.primary : 'rgba(255,255,255,0.25)', position: 'relative', zIndex: 1, letterSpacing: '0.01em', lineHeight: 1 }}>
                {navLabel(n, language)}
              </span>
              {active && <div style={{ width: 18, height: 2, borderRadius: 2, background: GRAD.primary, marginTop: 1, boxShadow: '0 0 8px rgba(249,115,22,0.7)' }} />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
