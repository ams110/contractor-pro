import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import {
  Settings, User, Users, Users2, Globe, Shield, Bell, BellOff, BellRing, Database,
  ChevronRight, ChevronDown, Check, LogOut, HardHat, Palette, CalendarDays,
  CreditCard, Banknote, ClipboardList, Package, Calculator,
  Activity, Plus, Trash2, Save, Camera, Tag, RefreshCw, Download,
  Fingerprint, ShieldCheck, Clock, Lock, Eye, EyeOff, Smartphone, KeyRound,
  ToggleLeft, ToggleRight, Timer, CalendarOff, UserCheck, UserX, Wallet, SlidersHorizontal,
  RotateCw, QrCode, Copy, ArrowRight, MessageCircle, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { C, GRAD, MORE_SCREENS } from '../../constants/index.js'
import { HolographicSheen } from '../../ui/Premium.jsx'
import { useAppStore } from '../../store/useAppStore.js'
import { navigate } from '../../Router.jsx'
import { usePushNotifications } from '../../hooks/usePushNotifications.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useBusinessStore, BUSINESS_TYPES } from '../../store/useBusinessStore.js'
import { computeAccountReadiness } from '../../lib/accountReadiness.js'
import AccountReadiness from '../../components/AccountReadiness.jsx'
import { computeListUsage } from '../../lib/listUsage.js'
import SmartList from '../../components/SmartList.jsx'
import { fmtDate } from '../../lib/helpers.js'
import { openWhatsApp, waMessages } from '../../lib/whatsapp.js'
import { useSubscription } from '../../hooks/useSubscription.js'
import { usePlanStore, useHasFeature } from '../../store/usePlanStore.js'
import { openCustomerPortal } from '../../lib/paddle.js'
import PortalUpsell from '../../components/PortalUpsell.jsx'

const PLAN_META_UI = {
  free:     { label: 'مجانية', color: C.textDim },
  starter:  { label: 'Starter', color: C.primary },
  pro:      { label: 'Pro',      color: C.secondary },
  business: { label: 'Business', color: C.gold },
}

const LANGS = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'עברית',   dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
]

const NAV_ICONS_MAP = {
  team:       Users2,
  workdays:   CalendarDays,
  expenses:   CreditCard,
  payments:   Banknote,
  tracker:    ClipboardList,
  materials:  Package,
  accounting: Calculator,
  activity:   Activity,
}

// ── فئات الإعدادات (تبويبات أفقية) — كل فئة لها أيقونة ولون ولابل ثلاثي اللغة ──
const CATEGORIES = [
  { id: 'account',       icon: User,              color: C.primary,   ar: 'حسابي',  he: 'חשבון',  en: 'Account',  hint: { ar: 'الملف والخروج', he: 'פרופיל ויציאה', en: 'Profile & sign out' } },
  { id: 'customization', icon: SlidersHorizontal, color: C.secondary, ar: 'تخصيص',  he: 'התאמה',  en: 'Custom',   hint: { ar: 'اللغة · تخصّصات · فئات', he: 'שפה · קטגוריות', en: 'Language · lists' } },
  { id: 'finance',       icon: Wallet,            color: C.gold,      ar: 'مالية',  he: 'כספים',  en: 'Finance',  hint: { ar: 'ضرائب · إشعارات · اشتراك', he: 'מסים · התראות', en: 'Tax · alerts · plan' } },
  { id: 'data',          icon: Database,          color: C.cyan,      ar: 'بيانات', he: 'נתונים', en: 'Data',    ownerOnly: true, hint: { ar: 'نسخ احتياطي · إجازات', he: 'גיבוי · חגים', en: 'Backup · holidays' } },
  { id: 'appTools',      icon: Settings,          color: C.success,   ar: 'أدوات',  he: 'כלים',   en: 'Tools',    hint: { ar: 'تحديث · أدوات إضافية', he: 'עדכון · כלים', en: 'Update · more tools' } },
  { id: 'security',      icon: Shield,            color: C.accent,    ar: 'أمان',   he: 'אבטחה',  en: 'Security', ownerOnly: true, hint: { ar: 'بصمة · قفل · سجلّ', he: 'ביומטרי · נעילה', en: 'Biometric · locks' } },
]

// شريط تبويبات أفقي لاصق — حبّات (pills) أيقونة+نص، النشطة بتدرّج وتوهّج
function CategoryNav({ categories, active, onChange, lang }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, margin: '0 -16px 18px', padding: '8px 16px 12px',
      background: `linear-gradient(180deg, ${C.bg} 62%, ${C.bg}00)`, backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {categories.map(cat => {
          const on = active === cat.id
          const Icon = cat.icon
          const label = cat[lang] || cat.ar
          return (
            <motion.button key={cat.id} whileTap={{ scale: 0.94 }} onClick={() => onChange(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 13,
                flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
                background: on ? `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` : C.card,
                border: `1px solid ${on ? 'transparent' : C.border}`,
                boxShadow: on ? `0 4px 16px ${cat.color}55` : 'none',
                transition: 'background .2s, box-shadow .2s',
              }}>
              <Icon size={15} color={on ? '#fff' : cat.color} strokeWidth={2.4} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: on ? '#fff' : C.textDim, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function Section({ title, children, id, icon: Icon, accent = C.primary }) {
  return (
    <div id={id} style={{ marginBottom: 16, scrollMarginTop: 76 }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, paddingInlineStart: 4 }}>
          {Icon && (
            <div style={{ width: 22, height: 22, borderRadius: 7, background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={12} color={accent} strokeWidth={2.4} />
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</div>
        </div>
      )}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value, color = C.primary, onClick, danger, last }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'none', border: 'none', borderBottom: last ? 'none' : `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'inherit' }}>
      {Icon && (
        <div style={{ width: 34, height: 34, borderRadius: 10, background: danger ? 'rgba(239,68,68,0.12)' : `${color}18`, border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : color+'28'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={danger ? C.accent : color} strokeWidth={2} />
        </div>
      )}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: danger ? C.accent : C.text, textAlign: 'start' }}>{label}</span>
      {value && <span style={{ fontSize: 12, color: C.textDim }}>{value}</span>}
      {onClick && <ChevronRight size={14} color={C.textDim} style={{ transform: 'scaleX(-1)' }} />}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════
//  خلفية Aurora حيّة — بقع برتقالي/بنفسجي/سماوي تنجرف ببطء خلف الزجاج
// ════════════════════════════════════════════════════════════════════════
function AuroraBackground() {
  const blobs = [
    { color: C.primary,   size: 340, top: '-6%',  left: '-12%', dur: 22, x: 40,  y: 30 },
    { color: C.secondary, size: 300, top: '18%',  left: '60%',  dur: 27, x: -50, y: 40 },
    { color: C.cyan,      size: 260, top: '52%',  left: '-8%',  dur: 31, x: 60,  y: -30 },
    { color: C.gold,      size: 220, top: '78%',  left: '55%',  dur: 25, x: -40, y: -40 },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      {blobs.map((b, i) => (
        <motion.div key={i}
          initial={{ x: 0, y: 0 }}
          animate={{ x: [0, b.x, 0], y: [0, b.y, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: b.top, left: b.left,
            width: b.size, height: b.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${b.color}38 0%, ${b.color}00 70%)`,
            filter: 'blur(38px)',
          }}
        />
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//  بطاقة هوية المقاول — Wallet-style، لمعة holographic، تنقلب 3D لـ QR
// ════════════════════════════════════════════════════════════════════════
function ContractorCard({ profile, business, lang }) {
  const [flipped, setFlipped] = useState(false)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const portalEnabled = useHasFeature('pro')   // بوّابة العامل ميزة خطة Pro
  const portalUrl = `${window.location.origin}${window.location.pathname}?portal`
  const typeLabel = BUSINESS_TYPES.find(t => t.id === business?.type)?.label || ''
  const name = profile?.display_name || (lang === 'en' ? 'Your Name' : lang === 'he' ? 'השם שלך' : 'اسمك هنا')
  const num = profile?.contractor_number

  useEffect(() => {
    QRCode.toDataURL(portalUrl, { margin: 1, width: 320, color: { dark: '#0D0F1C', light: '#ffffff' } })
      .then(setQr).catch(() => {})
  }, [portalUrl])

  function copyLink(e) {
    e.stopPropagation()
    navigator.clipboard?.writeText(portalUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }
  function shareWa(e) {
    e.stopPropagation()
    openWhatsApp('', waMessages.portalInvite({ workerName: '', url: portalUrl }))
  }

  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)

  return (
    <div style={{ perspective: 1400, marginBottom: 18 }}>
      <motion.div
        onClick={() => setFlipped(f => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        whileHover={{ scale: 1.012 }}
        style={{ position: 'relative', width: '100%', aspectRatio: '1.62 / 1', transformStyle: 'preserve-3d', cursor: 'pointer' }}
      >
        {/* ── الوجه الأمامي ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.gold} 48%, ${C.secondary} 105%)`,
          boxShadow: '0 14px 40px rgba(249,115,22,0.42), inset 0 1px 0 rgba(255,255,255,0.25)',
          padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* لمعة holographic تكتسح البطاقة (مصلَّحة: skew على غلاف ثابت) */}
          <HolographicSheen />
          {/* نقش دائري خافت */}
          <div style={{ position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.18)' }} />
          <div style={{ position: 'absolute', top: -40, right: -20, width: 150, height: 150, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backdropFilter: 'blur(4px)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <HardHat size={24} color="#fff" strokeWidth={1.6} />}
              </div>
              {typeLabel && (
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.28)' }}>
                  {typeLabel}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.92 }}>
              <RotateCw size={13} color="#fff" strokeWidth={2.5} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{L('اقلب', 'הפוך', 'Flip')}</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>CONTRACTOR&nbsp;PRO</div>
            <div style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>{name}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', fontFamily: 'monospace', letterSpacing: '0.12em', marginTop: 6, direction: 'ltr', textAlign: 'start' }}>
              {num ? `№ ${num}` : '№ • • • •'}
            </div>
          </div>
        </div>

        {/* ── الوجه الخلفي (QR بوّابة العامل) ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
          background: `linear-gradient(140deg, ${C.surface}, ${C.card})`, border: `1px solid ${C.borderMid}`,
          boxShadow: '0 14px 40px rgba(0,0,0,0.5)', padding: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {portalEnabled ? (<>
          <div style={{ width: 112, height: 112, borderRadius: 16, background: '#fff', padding: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
            {qr ? <img src={qr} style={{ width: '100%', height: '100%' }} /> : <QrCode size={48} color={C.surface} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <QrCode size={15} color={C.primary} strokeWidth={2.4} />
              <span style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{L('بوّابة العامل', 'פורטל העובד', 'Worker Portal')}</span>
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, lineHeight: 1.5, marginBottom: 10 }}>
              {L('امسح الكود أو شارك الرابط ليدخل العامل بوّابته', 'סרוק או שתף את הקישור', 'Scan or share the link with your worker')}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={shareWa} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: `${C.success}1c`, border: `1px solid ${C.success}40`, color: C.success, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                <MessageCircle size={13} strokeWidth={2.4} /> {L('واتساب', 'וואטסאפ', 'WhatsApp')}
              </button>
              <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: copied ? `${C.success}1c` : `${C.primary}1c`, border: `1px solid ${copied ? C.success : C.primary}40`, color: copied ? C.success : C.primary, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />} {copied ? L('تم', 'הועתק', 'Copied') : L('نسخ', 'העתק', 'Copy')}
              </button>
            </div>
          </div>
          </>) : (
            <PortalUpsell lang={lang} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//  Bento Grid — بلاطات فئات بأحجام مختلفة، تتمدّد (morph) للوحة كاملة
// ════════════════════════════════════════════════════════════════════════
function BentoTile({ cat, onSelect, lang, span }) {
  const Icon = cat.icon
  const label = cat[lang] || cat.ar
  return (
    <motion.button
      layoutId={`cat-${cat.id}`}
      onClick={() => onSelect(cat.id)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      style={{
        gridColumn: span === 2 ? 'span 2' : 'span 1',
        position: 'relative', overflow: 'hidden', textAlign: 'start',
        minHeight: span === 2 ? 96 : 110, padding: 15, borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
        background: `linear-gradient(150deg, ${C.surface}, ${C.card})`,
        border: `1px solid ${cat.color}2a`,
        boxShadow: `0 4px 18px rgba(0,0,0,0.22)`,
        display: 'flex', flexDirection: span === 2 ? 'row' : 'column',
        alignItems: span === 2 ? 'center' : 'flex-start',
        justifyContent: span === 2 ? 'flex-start' : 'space-between',
        gap: span === 2 ? 13 : 0,
      }}
    >
      {/* توهّج زاوية بلون الفئة */}
      <div style={{ position: 'absolute', top: -30, insetInlineEnd: -30, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${cat.color}33, transparent 70%)`, filter: 'blur(6px)' }} />
      <div style={{ width: 42, height: 42, borderRadius: 13, background: `${cat.color}1f`, border: `1px solid ${cat.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <Icon size={20} color={cat.color} strokeWidth={2.2} />
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.text, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{cat.hint?.[lang] || cat.hint?.ar || ''}</div>
      </div>
    </motion.button>
  )
}

export default function SettingsScreen({
  projects = [], employees = [], workDays = [], expenses = [], payments = [], clientReceipts = [], advances = [],
  userId, profile, profSaving, uploading, saveName, uploadAvatar, saveContractorNumber,
  specs = [], expCats = [], payMethods = [],
  addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod,
  pensionMonthly, setPensionMonthly, taxEnabled,
  setTaxEnabled, taxModules, setTaxModule,
  salaryAlerts = true, setSalaryAlerts, dailyDigest = true, setDailyDigest,
  holidays = [], addHoliday, deleteHoliday,
  permissions, teamMembers = [],
  addMember, updateMember, removeMember, blockMember, resetMemberPassword, getActivity, reloadTeam,
  onNav, appCfg,
  pushSubStatus, forceResubscribePush,
}) {
  const { t } = useTranslation()
  const { language, setLanguage } = useAppStore()
  const activeBusiness = useBusinessStore(s => s.activeBusiness)
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const plan = usePlanStore(s => s.plan)
  const trialActive = usePlanStore(s => s.trialActive)
  const { subscription, isActive: subIsActive, isCanceling, daysUntilPeriodEnd } = useSubscription(userId)

  const { registerPasskey, isPasskeySupported, hasPasskeyRegistered, removePasskey, deleteAccount } = useAuth()
  const { supported: pushSupported, permission, requestPermission } = usePushNotifications(userId)
  const [notifLoading, setNotifLoading] = useState(false)
  const [testNotifLoading, setTestNotifLoading] = useState(false)

  async function sendTestNotification() {
    if (!userId) return
    setTestNotifLoading(true)
    try {
      await supabase.functions.invoke('send-push', {
        body: { user_ids: [userId], title: 'اختبار الإشعارات', body: 'وصل الإشعار بنجاح حتى بعد إغلاق التطبيق' }
      })
    } catch {}
    setTestNotifLoading(false)
  }
  const [sigLog, setSigLog] = useState([])
  const [sigLogLoading, setSigLogLoading] = useState(false)

  useEffect(() => {
    if (!userId || !permissions?.isOwner) return
    setSigLogLoading(true)
    supabase.rpc('get_signature_log', { p_limit: 20 })
      .then(({ data }) => { setSigLog(data || []); setSigLogLoading(false) })
  }, [userId, permissions?.isOwner])

  const [hasPasskey, setHasPasskey] = useState(() => hasPasskeyRegistered())
  const [showRegisterBio, setShowRegisterBio] = useState(false)
  const [bioLoading, setBioLoading]           = useState(false)
  const [bioError, setBioError]               = useState('')

  async function handleRegisterBiometric() {
    setBioLoading(true)
    setBioError('')
    try {
      await registerPasskey()
      setHasPasskey(true)
      setShowRegisterBio(false)
    } catch (e) {
      setBioError(e.message || 'فشل تسجيل البصمة')
    } finally {
      setBioLoading(false)
    }
  }

  const [loginLog, setLoginLog] = useState([])
  const [loginLogOpen, setLoginLogOpen] = useState(false)
  const [limitInput, setLimitInput] = useState('')
  const [timeoutInput, setTimeoutInput] = useState('')
  const [bioThrInput, setBioThrInput] = useState('')
  const [memberExpiryEditing, setMemberExpiryEditing] = useState(null)
  const [memberExpiryValue, setMemberExpiryValue] = useState('')

  useEffect(() => {
    if (!limitInput && appCfg?.config) setLimitInput(String(appCfg.config.daily_spend_limit || ''))
  }, [appCfg?.config?.daily_spend_limit])

  useEffect(() => {
    if (!timeoutInput && appCfg?.config) setTimeoutInput(String(appCfg.config.session_timeout || '30'))
  }, [appCfg?.config?.session_timeout])

  useEffect(() => {
    if (!bioThrInput && appCfg?.config?.payment_bio_threshold) setBioThrInput(String(appCfg.config.payment_bio_threshold))
  }, [appCfg?.config?.payment_bio_threshold])

  async function loadLoginLog() {
    if (!appCfg) return
    const data = await appCfg.getLoginLog(30)
    setLoginLog(data)
    setLoginLogOpen(true)
  }

  async function saveMemberExpiry(memberId) {
    try {
      await supabase.from('team_members')
        .update({ expires_at: memberExpiryValue || null })
        .eq('id', memberId)
      setMemberExpiryEditing(null)
      setMemberExpiryValue('')
    } catch {}
  }

  // استخدام القوائم الحيّ — يربط كل عنصر ببياناته الحقيقية (لوحات الإعدادات الذكية)
  const specUsage = useMemo(() => computeListUsage(specs, employees, { countKey: 'specialization' }), [specs, employees])
  const catUsage  = useMemo(() => computeListUsage(expCats, expenses, { countKey: 'category', amountKey: 'amount' }), [expCats, expenses])
  const payUsage  = useMemo(() => computeListUsage(payMethods, payments, { countKey: 'method', amountKey: 'amount' }), [payMethods, payments])
  const [editName, setEditName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('idle') // idle | checking | upToDate | updating

  // ── إعدادات الضرائب: פנסיה شهرية + رقم العوسيك ──
  const [pensionInput, setPensionInput] = useState(String(pensionMonthly || ''))
  const [taxNumInput,  setTaxNumInput]  = useState('')
  const [taxNumSaved,  setTaxNumSaved]  = useState(false)
  useEffect(() => { setPensionInput(String(pensionMonthly || '')) }, [pensionMonthly])
  useEffect(() => { setTaxNumInput(profile?.contractor_number || '') }, [profile?.contractor_number])

  const MORE_WITH_ICONS = MORE_SCREENS.map(s => ({ ...s, IconComp: NAV_ICONS_MAP[s.id] || Settings }))

  async function handleCheckUpdate() {
    if (updateStatus === 'checking') return
    setUpdateStatus('checking')
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) {
        // انتظر نهاية التحديث قبل الفحص
        await reg.update()

        const sw = reg.installing || reg.waiting
        if (sw) {
          // أرسل له skipWaiting مباشرةً ليتفعّل فوراً
          sw.postMessage({ type: 'SKIP_WAITING' })
          setUpdateStatus('updating')
          setTimeout(() => window.location.reload(), 1000)
        } else {
          // لا يوجد SW جديد — أعد التحميل مع تجاوز الـ cache
          setUpdateStatus('updating')
          setTimeout(() => window.location.reload(true), 500)
        }
      } else {
        // لا يوجد service worker — أعد تحميل عادي
        setUpdateStatus('updating')
        setTimeout(() => window.location.reload(true), 300)
      }
    } catch {
      // في حال أي خطأ — أعد تحميل قسري
      setUpdateStatus('updating')
      setTimeout(() => window.location.reload(true), 300)
    }
  }

  // ── جاهزية الحساب: تُحسب من الإشارات الحقيقية ──
  const readiness = useMemo(() => computeAccountReadiness({
    displayName:     profile?.display_name,
    hasAvatar:       !!profile?.avatar_url,
    contractorNumber: profile?.contractor_number,
    pensionMonthly,
    hasPasskey,
    notifGranted:    permission === 'granted',
    dailySpendLimit: appCfg?.config?.daily_spend_limit,
  }), [profile?.display_name, profile?.avatar_url, profile?.contractor_number, pensionMonthly, hasPasskey, permission, appCfg?.config?.daily_spend_limit])

  // الفئات المرئية (data/security للمالك فقط) + الفئة النشطة
  const visibleCategories = useMemo(
    () => CATEGORIES.filter(c => !c.ownerOnly || permissions?.isOwner),
    [permissions?.isOwner]
  )
  // null = شاشة البلاطات (الرئيسية) · id = لوحة فئة مفتوحة
  const [activeCat, setActiveCat] = useState(null)
  useEffect(() => {
    if (activeCat && !visibleCategories.some(c => c.id === activeCat)) setActiveCat(null)
  }, [visibleCategories, activeCat])
  const catLang = language === 'he' ? 'he' : language === 'en' ? 'en' : 'ar'

  // عند الضغط على بند ناقص في «جاهزية الحساب» → انتقل لفئته ومرّر لقسمه
  function fixReadiness(key) {
    const map = {
      name: ['account', 'set-profile'], avatar: ['account', 'set-profile'],
      taxNumber: ['finance', 'set-tax'], pension: ['finance', 'set-tax'],
      passkey: ['security', 'set-security'], spendLimit: ['security', 'set-security'],
      notify: ['finance', 'set-notify'],
    }
    const [grp, el] = map[key] || []
    if (grp) setActiveCat(grp)
    setTimeout(() => document.getElementById(el)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180)
  }

  // ── البيانات: نسخة احتياطية + إجازات ──
  const backupKey = userId ? `last_backup_${userId}` : null
  const [backupAt, setBackupAt] = useState(() => (backupKey ? localStorage.getItem(backupKey) : null))
  const [backingUp, setBackingUp] = useState(false)
  const [holName, setHolName] = useState('')
  const [holDate, setHolDate] = useState('')

  async function doBackup() {
    setBackingUp(true)
    try {
      const m = await import('../../lib/export.js')
      m.exportAllDataJSON({ projects, employees, workDays, expenses, payments, clientReceipts, advances, holidays })
      const now = new Date().toISOString()
      if (backupKey) localStorage.setItem(backupKey, now)
      setBackupAt(now)
    } finally {
      setBackingUp(false)
    }
  }

  const backupAgo = (() => {
    if (!backupAt) return null
    const days = Math.floor((Date.now() - new Date(backupAt)) / 86400000)
    return days <= 0 ? 'اليوم' : days === 1 ? 'أمس' : `قبل ${days} يوم`
  })()

  function addHolidayRow() {
    if (!holDate || !holName.trim()) return
    addHoliday?.({ name: holName.trim(), date: holDate })
    setHolName(''); setHolDate('')
  }

  // تسجيل الخروج من كل الأجهزة (إبطال كل الجلسات) — بنقرتين للتأكيد
  const [globalConfirm, setGlobalConfirm] = useState(false)
  function globalSignout() {
    if (!globalConfirm) {
      setGlobalConfirm(true)
      setTimeout(() => setGlobalConfirm(false), 4000)
      return
    }
    supabase.auth.signOut({ scope: 'global' })
  }

  // حذف الحساب الذاتي — يتطلّب كتابة كلمة تأكيد قبل التنفيذ النهائي
  const DELETE_WORD = language === 'he' ? 'מחק' : language === 'en' ? 'DELETE' : 'حذف'
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  async function handleDeleteAccount() {
    if (deleteConfirmText.trim() !== DELETE_WORD) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteAccount()
      // إنهاء الجلسة داخل deleteAccount يُحوّل التطبيق لشاشة الدخول تلقائياً
    } catch (e) {
      setDeleteError(e.message || 'فشل حذف الحساب')
      setDeleting(false)
    }
  }

  return (
    <div dir={dir} style={{ position: 'relative', padding: '16px 16px 8px', minHeight: '100%' }}>
      {/* ── خلفية Aurora حيّة ── */}
      <AuroraBackground />

      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('settings.title')}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
          {language === 'he' ? 'הגדרות והתאמה אישית' : language === 'en' ? 'Preferences & customization' : 'الإعدادات والتخصيص'}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
      {activeCat === null ? (
        // ════ الشاشة الرئيسية: بطاقة الهوية + جاهزية الحساب + Bento ════
        <motion.div key="home"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          {/* ── بطاقة هوية المقاول (3D) ── */}
          <ContractorCard profile={profile} business={activeBusiness} lang={catLang} />

          {/* ── جاهزية الحساب (Hero) — مستثناة من التصميم الجديد ── */}
          <AccountReadiness readiness={readiness} onFix={fixReadiness} />

          {/* ── شبكة Bento للفئات ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 4 }}>
            {visibleCategories.map((cat, i) => (
              <BentoTile key={cat.id} cat={cat} lang={catLang} onSelect={setActiveCat}
                span={(cat.id === 'account' || cat.id === 'appTools') ? 2 : 1} />
            ))}
          </div>
        </motion.div>
      ) : (
        // ════ لوحة فئة مفتوحة ════
        <motion.div key={activeCat}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          {/* رأس اللوحة: زرّ رجوع + شريط تبديل سريع */}
          {(() => {
            const cur = CATEGORIES.find(c => c.id === activeCat)
            return (
              <motion.button layoutId={`cat-${activeCat}`} onClick={() => setActiveCat(null)}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', marginBottom: 14,
                  borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
                  background: `linear-gradient(135deg, ${cur?.color}1f, ${cur?.color}0a)`, border: `1px solid ${cur?.color}3a` }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `${cur?.color}22`, border: `1px solid ${cur?.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {cur && <cur.icon size={18} color={cur.color} strokeWidth={2.3} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: '-0.01em' }}>{cur?.[catLang] || cur?.ar}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{cur?.hint?.[catLang] || cur?.hint?.ar}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: cur?.color, fontSize: 11, fontWeight: 800 }}>
                  {language === 'en' ? 'Back' : language === 'he' ? 'חזרה' : 'رجوع'}
                  <ArrowRight size={15} strokeWidth={2.5} style={{ transform: dir === 'rtl' ? 'none' : 'scaleX(-1)' }} />
                </div>
              </motion.button>
            )
          })()}

          <CategoryNav categories={visibleCategories} active={activeCat} onChange={setActiveCat} lang={catLang} />

      {activeCat === 'account' && (<>

      {/* ── Profile ── */}
      <Section id="set-profile" icon={User} accent={C.primary} title={language === 'he' ? 'פרופיל' : language === 'en' ? 'Profile' : 'الملف الشخصي'}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 17, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
              : <HardHat size={26} color="#fff" strokeWidth={1.5} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                  style={{ flex: 1, padding: '6px 10px', background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={() => { saveName?.(editName); setEditingName(false) }}
                  style={{ padding: '6px 12px', borderRadius: 10, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Save size={13} />
                </button>
              </div>
            ) : (
              <div onClick={() => { setEditName(profile?.display_name || ''); setEditingName(true) }} style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{profile?.display_name || (language === 'en' ? 'Tap to set name' : language === 'he' ? 'לחץ להוסיף שם' : 'اضغط لإضافة اسم')}</div>
                <div style={{ fontSize: 11, color: C.primary, marginTop: 2 }}>
                  {language === 'en' ? 'Tap to edit' : language === 'he' ? 'לחץ לעריכה' : 'اضغط للتعديل'}
                </div>
              </div>
            )}
          </div>
        </div>
        <Row icon={Smartphone} label={language === 'he' ? 'התנתק מכל המכשירים' : language === 'en' ? 'Sign out everywhere' : 'تسجيل الخروج من كل الأجهزة'} color={C.cyan} value={globalConfirm ? (language === 'en' ? 'Tap to confirm' : 'اضغط للتأكيد') : ''} onClick={globalSignout} />
        <Row icon={LogOut} label={language === 'he' ? 'יציאה' : language === 'en' ? 'Sign Out' : 'تسجيل الخروج'} danger onClick={() => supabase.auth.signOut()} last />
      </Section>

      {/* ── منطقة الخطر: حذف الحساب نهائياً (للمالك فقط) ── */}
      {permissions?.isOwner && (
        <Section icon={AlertTriangle} accent={C.accent} title={language === 'he' ? 'אזור מסוכן' : language === 'en' ? 'Danger zone' : 'منطقة الخطر'}>
          <Row icon={Trash2}
            label={language === 'he' ? 'מחק את חשבוני לצמיתות' : language === 'en' ? 'Delete my account permanently' : 'حذف حسابي نهائياً'}
            danger last
            onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(''); setDeleteError('') }} />
        </Section>
      )}

      </>)}

      {activeCat === 'customization' && (<>

      {/* ── Language ── */}
      <Section icon={Globe} accent={C.secondary} title={t('settings.language')}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {LANGS.map(l => (
              <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => setLanguage(l.code)}
                style={{ padding: '12px 8px', borderRadius: 14, background: language === l.code ? GRAD.primary : C.card, border: `1px solid ${language === l.code ? 'transparent' : C.border}`, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, boxShadow: language === l.code ? '0 4px 16px rgba(249,115,22,0.3)' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.04em', color: language === l.code ? '#fff' : C.primary, background: language === l.code ? 'rgba(255,255,255,0.18)' : `${C.primary}18`, border: `1px solid ${language === l.code ? 'rgba(255,255,255,0.3)' : C.primary + '30'}`, borderRadius: 9, padding: '4px 10px', minWidth: 34, textAlign: 'center' }}>{l.code.toUpperCase()}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: language === l.code ? '#fff' : C.textDim }}>{l.label}</span>
                {language === l.code && <Check size={12} color="#fff" strokeWidth={3} />}
              </motion.button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Specialties ── */}
      <Section icon={HardHat} accent={C.primary} title={t('settings.specs')}>
        <SmartList
          icon={HardHat} accent={C.primary} variant="cloud"
          title={language === 'he' ? 'מפת מיומנויות הצוות' : language === 'en' ? 'Crew skills map' : 'خريطة مهارات الطاقم'}
          usage={specUsage} onAdd={addSpec} onRemove={removeSpec}
          addPlaceholder={language === 'en' ? 'New specialty...' : language === 'he' ? 'התמחות חדשה...' : 'تخصص جديد...'}
          language={language}
        />
      </Section>

      {/* ── Expense Categories ── */}
      <Section icon={CreditCard} accent={C.accent} title={t('settings.categories')}>
        <SmartList
          icon={CreditCard} accent={C.gold} variant="bars" valueMode="amount"
          title={language === 'he' ? 'פילוח הוצאות' : language === 'en' ? 'Spend breakdown' : 'توزيع الإنفاق'}
          usage={catUsage} onAdd={addExpCat} onRemove={removeExpCat}
          addPlaceholder={language === 'en' ? 'New category...' : language === 'he' ? 'קטגוריה חדשה...' : 'فئة جديدة...'}
          language={language}
        />
      </Section>

      {/* ── Payment Methods ── */}
      <Section icon={Banknote} accent={C.secondary} title={t('settings.payMethods')}>
        <SmartList
          icon={Banknote} accent={C.secondary} variant="bars" valueMode="amount"
          title={language === 'he' ? 'תמהיל תשלום' : language === 'en' ? 'Payment mix' : 'مزيج الدفع'}
          usage={payUsage} onAdd={addPayMethod} onRemove={removePayMethod}
          addPlaceholder={language === 'en' ? 'New method...' : language === 'he' ? 'אמצעי חדש...' : 'طريقة جديدة...'}
          language={language}
        />
      </Section>

      </>)}

      {activeCat === 'finance' && (<>

      {/* ── تنبيهات الرواتب المتأخّرة ── */}
      {permissions?.isOwner && (
        <Section icon={BellRing} accent={C.warning} title={language === 'he' ? 'התראות שכר' : language === 'en' ? 'Salary Alerts' : 'تنبيهات الرواتب'}>
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.warning}15`, border: `1px solid ${C.warning}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BellRing size={16} color={C.warning} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>تنبيه الرواتب المتأخّرة</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>تنبيه يومي للعمّال اللي مستحقاتهم متأخّرة 14+ يوم</div>
            </div>
            <button onClick={() => setSalaryAlerts?.(!salaryAlerts)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: salaryAlerts ? C.success : C.textDim }}>
              {salaryAlerts ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.cyan}15`, border: `1px solid ${C.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BellRing size={16} color={C.cyan} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>الملخّص اليومي</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>إشعار يومي: الطلبات المعلّقة وصرف اليوم</div>
            </div>
            <button onClick={() => setDailyDigest?.(!dailyDigest)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: dailyDigest ? C.success : C.textDim }}>
              {dailyDigest ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </Section>
      )}

      {/* ── الضرائب والمصلحة ── */}
      {permissions?.isOwner && (
        <Section id="set-tax" icon={Calculator} accent={C.gold} title={language === 'he' ? 'מסים ועסק' : language === 'en' ? 'Tax & Business' : 'الضرائب والمصلحة'}>
          {/* پنسيه شهرية — يُخصم من الوعاء الضريبي */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.blue}15`, border: `1px solid ${C.blue}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Banknote size={16} color={C.blue} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>قسط الפנסיה الشهري</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>يُخصم من الوعاء الضريبي ويظهر الوفر في ملخص الضرائب</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min="0" value={pensionInput}
                onChange={e => setPensionInput(e.target.value)}
                onBlur={() => setPensionMonthly?.(pensionInput)}
                placeholder="0"
                style={{ width: 72, padding: '6px 8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>₪</span>
            </div>
          </div>

          {/* رقم العوسيك / ח.פ — للفواتير الرسمية */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.gold}15`, border: `1px solid ${C.gold}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Tag size={16} color={C.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{language === 'he' ? 'מספר עוסק / ח.פ' : 'رقم العوسيك / ח.פ'}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>يظهر على الفواتير الرسمية وملخص الضرائب</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text" inputMode="numeric" value={taxNumInput}
                onChange={e => { setTaxNumInput(e.target.value); setTaxNumSaved(false) }}
                onBlur={() => { if (taxNumInput !== (profile?.contractor_number || '')) { saveContractorNumber?.(taxNumInput); setTaxNumSaved(true) } }}
                placeholder="—"
                style={{ width: 110, padding: '6px 8px', background: C.card, border: `1px solid ${taxNumSaved ? C.success+'55' : C.border}`, borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'inherit', textAlign: 'center', outline: 'none', direction: 'ltr' }}
              />
              {taxNumSaved && <Check size={14} color={C.success} strokeWidth={2.5} />}
            </div>
          </div>
        </Section>
      )}

      {/* ── Notifications Permission ── */}
      {pushSupported && (
        <Section id="set-notify" icon={Bell} accent={C.primary} title={language === 'he' ? 'התראות' : language === 'en' ? 'Notifications' : 'الإشعارات'}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: permission === 'granted' ? `${C.success}18` : permission === 'denied' ? `${C.accent}18` : `${C.primary}18`,
                border: `1px solid ${permission === 'granted' ? C.success : permission === 'denied' ? C.accent : C.primary}28`,
              }}>
                {permission === 'granted'
                  ? <BellRing size={18} color={C.success} strokeWidth={2} />
                  : permission === 'denied'
                  ? <BellOff size={18} color={C.accent} strokeWidth={2} />
                  : <Bell size={18} color={C.primary} strokeWidth={2} />
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {permission === 'granted'
                    ? (language === 'he' ? 'התראות מופעלות' : language === 'en' ? 'Notifications enabled' : 'الإشعارات مفعّلة')
                    : permission === 'denied'
                    ? (language === 'he' ? 'התראות חסומות' : language === 'en' ? 'Notifications blocked' : 'الإشعارات محظورة')
                    : (language === 'he' ? 'הפעל התראות' : language === 'en' ? 'Enable notifications' : 'تفعيل الإشعارات')
                  }
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                  {permission === 'granted'
                    ? (language === 'he' ? 'תקבל התראות גם כשהאפליקציה סגורה' : language === 'en' ? 'You\'ll get alerts even when the app is closed' : 'ستصلك إشعارات حتى لو التطبيق مغلق')
                    : permission === 'denied'
                    ? (language === 'he' ? 'אפשר מהגדרות הדפדפן / מערכת' : language === 'en' ? 'Enable from browser / system settings' : 'فعّلها من إعدادات المتصفح أو الهاتف')
                    : (language === 'he' ? 'לקבל התראות על ימי עבודה, תשלומים ועוד' : language === 'en' ? 'Get alerts for work days, payments & more' : 'استقبل تنبيهات عن أيام العمل والمدفوعات')
                  }
                </div>
              </div>
            </div>
            {permission !== 'denied' && permission !== 'granted' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={notifLoading}
                onClick={async () => {
                  setNotifLoading(true)
                  await requestPermission()
                  setNotifLoading(false)
                }}
                style={{
                  width: '100%', padding: '11px 16px', borderRadius: 14, border: 'none',
                  cursor: notifLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  background: GRAD.primary, color: '#fff',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                  opacity: notifLoading ? 0.7 : 1,
                }}
              >
                <Bell size={15} strokeWidth={2.5} />
                {language === 'he' ? 'אפשר התראות' : language === 'en' ? 'Allow Notifications' : 'السماح بالإشعارات'}
              </motion.button>
            )}
            {permission === 'granted' && (
              <div style={{ marginBottom: 10 }}>
                {/* Push subscription status badge — hide when idle (not yet checked) */}
                {pushSubStatus && pushSubStatus !== 'idle' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, marginBottom: 8,
                    background: pushSubStatus === 'ok' ? `${C.success}12` : pushSubStatus === 'subscribing' ? `${C.primary}12` : pushSubStatus === 'no_vapid' ? `${C.warning}12` : `${C.accent}12`,
                    border: `1px solid ${pushSubStatus === 'ok' ? C.success : pushSubStatus === 'subscribing' ? C.primary : pushSubStatus === 'no_vapid' ? C.warning : C.accent}25`,
                  }}>
                    {pushSubStatus === 'ok'
                      ? <Check size={14} color={C.success} strokeWidth={2.5} />
                      : pushSubStatus === 'subscribing'
                      ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={14} color={C.primary} /></motion.div>
                      : <BellOff size={14} color={pushSubStatus === 'no_vapid' ? C.warning : C.accent} strokeWidth={2} />
                    }
                    <span style={{ fontSize: 12, fontWeight: 700, color: pushSubStatus === 'ok' ? C.success : pushSubStatus === 'subscribing' ? C.primary : pushSubStatus === 'no_vapid' ? C.warning : C.accent }}>
                      {pushSubStatus === 'ok'
                        ? (language === 'en' ? 'Subscribed — background push active' : language === 'he' ? 'מנוי — התראות רקע פעילות' : 'مشترك — الإشعارات الخلفية فعّالة')
                        : pushSubStatus === 'subscribing'
                        ? (language === 'en' ? 'Subscribing...' : language === 'he' ? 'נרשם...' : 'جاري التسجيل...')
                        : pushSubStatus === 'no_vapid'
                        ? (language === 'en' ? 'Push key not configured (admin)' : language === 'he' ? 'מפתח ההתראות לא מוגדר' : 'مفتاح الإشعارات غير مُعدّ')
                        : pushSubStatus === 'db_error'
                        ? (language === 'en' ? 'Subscription save error — retry' : language === 'he' ? 'שגיאה בשמירת המנוי — הפעל מחדש' : 'خطأ في حفظ الاشتراك — أعد التفعيل')
                        : (language === 'en' ? 'Not subscribed — tap Re-activate' : language === 'he' ? 'לא רשום — לחץ להפעלה מחדש' : 'غير مشترك — اضغط إعادة التفعيل')
                      }
                    </span>
                  </div>
                )}

                {/* Re-subscribe button — shown on any error except no_vapid */}
                {pushSubStatus !== 'ok' && pushSubStatus !== 'subscribing' && pushSubStatus !== 'no_vapid' && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => forceResubscribePush?.()}
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: 13, border: 'none',
                      background: GRAD.primary, color: '#fff',
                      fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      marginBottom: 8, boxShadow: '0 3px 12px rgba(245,158,11,0.3)',
                    }}
                  >
                    <RefreshCw size={13} strokeWidth={2.5} />
                    {language === 'en' ? 'Re-activate Push' : language === 'he' ? 'הפעל התראות מחדש' : 'إعادة تفعيل الإشعارات'}
                  </motion.button>
                )}

                {/* Test notification button — always shown when permission granted */}
                {pushSubStatus !== 'subscribing' && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={sendTestNotification}
                    disabled={testNotifLoading}
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: 13,
                      border: `1px solid ${pushSubStatus === 'ok' ? C.success : C.primary}30`,
                      background: pushSubStatus === 'ok' ? `${C.success}12` : `${C.primary}12`,
                      color: pushSubStatus === 'ok' ? C.success : C.primary,
                      fontSize: 12, fontWeight: 800, cursor: testNotifLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      opacity: testNotifLoading ? 0.6 : 1,
                    }}
                  >
                    {testNotifLoading
                      ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={13} /></motion.div>{language === 'en' ? 'Sending...' : language === 'he' ? 'שולח...' : 'جاري الإرسال...'}</>
                      : <><BellRing size={13} strokeWidth={2.5} />{language === 'en' ? 'Send Test Notification' : language === 'he' ? 'שלח התראת בדיקה' : 'إرسال إشعار تجريبي'}</>
                    }
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Subscription ── */}
      {permissions?.isOwner && (() => {
        const pm = PLAN_META_UI[plan] || PLAN_META_UI.free
        const paid = subIsActive()
        const statusText = paid
          ? (isCanceling()
              ? `يُلغى بعد ${daysUntilPeriodEnd() ?? 0} يوم`
              : `نشط${daysUntilPeriodEnd() != null ? ` · تجديد بعد ${daysUntilPeriodEnd()} يوم` : ''}`)
          : trialActive ? 'تجربة مجانية' : 'بدون اشتراك'
        return (
          <Section icon={Shield} accent={C.gold} title={t('settings.subscription')}>
            {/* بطاقة الخطة الحالية */}
            <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${pm.color}18`, border: `1px solid ${pm.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={16} color={pm.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>خطتك الحالية: {pm.label}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{statusText}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: pm.color, background: `${pm.color}16`, border: `1px solid ${pm.color}3a`, borderRadius: 9, padding: '4px 9px', whiteSpace: 'nowrap' }}>{pm.label}</span>
            </div>
            {/* زر الإدارة: المشترك → بوّابة Paddle · غير المشترك → صفحة الأسعار */}
            {paid && subscription?.paddle_subscription_id ? (
              <Row icon={SlidersHorizontal} label={language === 'he' ? 'ניהול / ביטול מנוי' : language === 'en' ? 'Manage / Cancel' : 'إدارة / إلغاء الاشتراك'} color={C.gold}
                onClick={() => openCustomerPortal(subscription.paddle_subscription_id)} last />
            ) : (
              <Row icon={Shield} label={language === 'he' ? 'בחר תוכנית' : language === 'en' ? 'Choose a plan' : 'اختر خطة اشتراك'} color={C.gold}
                onClick={() => navigate('/pricing')} last />
            )}
          </Section>
        )
      })()}

      </>)}

      {activeCat === 'data' && (<>

      {/* ── نسخة احتياطية / تصدير الكل ── */}
      {permissions?.isOwner && (
        <Section icon={Database} accent={C.cyan} title={language === 'he' ? 'גיבוי נתונים' : language === 'en' ? 'Backup' : 'نسخة احتياطية'}>
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.cyan}15`, border: `1px solid ${C.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database size={16} color={C.cyan} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>تصدير كل بياناتك</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                {backupAgo ? `آخر نسخة: ${backupAgo}` : 'ملف JSON كامل (مشاريع · عمّال · مالية · إجازات)'}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }} onClick={doBackup} disabled={backingUp}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11, background: GRAD.cyan, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: backingUp ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: backingUp ? 0.7 : 1 }}
            >
              <Download size={13} strokeWidth={2.5} />
              {backingUp ? '...' : 'تصدير'}
            </motion.button>
          </div>
        </Section>
      )}

      {/* ── الإجازات الرسمية ── */}
      {permissions?.isOwner && (
        <Section icon={CalendarDays} accent={C.gold} title={language === 'he' ? 'חגים' : language === 'en' ? 'Holidays' : 'الإجازات الرسمية'}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 10 }}>الأيام المسجّلة هنا تُحتسب كعطل في حساب أيام العمل والرواتب.</div>
            {(holidays || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {[...holidays].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11 }}>
                    <CalendarDays size={14} color={C.gold} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text }}>{h.name}</span>
                    <span style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>{fmtDate(h.date)}</span>
                    <button onClick={() => deleteHoliday?.(h.id)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 7 }}>
              <input type="date" value={holDate} onChange={e => setHolDate(e.target.value)}
                style={{ width: 140, padding: '8px 10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <input value={holName} onChange={e => setHolName(e.target.value)}
                placeholder="اسم العطلة..."
                onKeyDown={e => { if (e.key === 'Enter') addHolidayRow() }}
                style={{ flex: 1, padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={addHolidayRow}
                style={{ padding: '8px 14px', borderRadius: 10, background: GRAD.gold, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </Section>
      )}

      </>)}

      {activeCat === 'appTools' && (<>

      {/* ── App Update ── */}
      <Section icon={RefreshCw} accent={C.primary} title={language === 'he' ? 'עדכון אפליקציה' : language === 'en' ? 'App Update' : 'تحديث التطبيق'}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.primary}18`, border: `1px solid ${C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RefreshCw size={18} color={C.primary} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                Contractor Pro v{__APP_VERSION__}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                {updateStatus === 'upToDate'
                  ? (language === 'he' ? 'האפליקציה מעודכנת' : language === 'en' ? 'App is up to date' : 'التطبيق محدّث')
                  : updateStatus === 'updating'
                  ? (language === 'he' ? 'מעדכן...' : language === 'en' ? 'Updating...' : 'جاري التحديث...')
                  : (language === 'he' ? 'בדוק אם קיים עדכון' : language === 'en' ? 'Check for a new version' : 'تحقق من إصدار جديد')}
              </div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCheckUpdate}
            disabled={updateStatus === 'checking' || updateStatus === 'updating'}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 14,
              border: 'none',
              cursor: updateStatus === 'checking' || updateStatus === 'updating' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: updateStatus === 'upToDate'
                ? `${C.success}20`
                : updateStatus === 'updating'
                ? `${C.primary}20`
                : GRAD.primary,
              color: updateStatus === 'upToDate' || updateStatus === 'updating' ? C.success : '#fff',
              boxShadow: updateStatus === 'idle' || updateStatus === 'checking' ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
              opacity: updateStatus === 'checking' ? 0.7 : 1,
            }}
          >
            {updateStatus === 'upToDate' ? (
              <><Check size={15} strokeWidth={2.5} />{language === 'he' ? 'מעודכן' : language === 'en' ? 'Up to date' : 'محدّث'}</>
            ) : updateStatus === 'updating' ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Download size={15} /></motion.div>{language === 'he' ? 'מעדכן...' : language === 'en' ? 'Updating...' : 'جاري التحديث...'}</>
            ) : updateStatus === 'checking' ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={15} /></motion.div>{language === 'he' ? 'בודק...' : language === 'en' ? 'Checking...' : 'جاري التحقق...'}</>
            ) : (
              <><RefreshCw size={15} strokeWidth={2.5} />{language === 'he' ? 'בדוק עדכונים' : language === 'en' ? 'Check for Updates' : 'التحقق من التحديثات'}</>
            )}
          </motion.button>
        </div>
      </Section>

      {/* ── More Screens / Quick Access ── */}
      <Section icon={Settings} accent={C.success} title={language === 'he' ? 'כלים נוספים' : language === 'en' ? 'More Tools' : 'أدوات إضافية'}>
        {MORE_WITH_ICONS.map((item, i) => (
          <Row
            key={item.id}
            icon={item.IconComp}
            label={item.label}
            color={[C.primary, C.secondary, C.gold, C.cyan, C.success, C.warning, C.accent][i % 7]}
            onClick={() => onNav?.(item.id)}
            last={i === MORE_WITH_ICONS.length - 1}
          />
        ))}
      </Section>

      </>)}

      {activeCat === 'security' && (<>

      {/* ── Security & Access Control ── */}
      {permissions?.isOwner && appCfg && (
        <Section id="set-security" icon={Lock} accent={C.accent} title="الأمان والتحكم">

          {/* وضع القراءة فقط */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: appCfg.config.is_read_only ? `${C.accent}18` : `${C.primary}15`, border: `1px solid ${appCfg.config.is_read_only ? C.accent : C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {appCfg.config.is_read_only ? <Lock size={16} color={C.accent} /> : <EyeOff size={16} color={C.primary} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>وضع القراءة فقط</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                {appCfg.config.is_read_only ? 'مفعّل — لا يمكن لأي عضو إضافة أو حذف بيانات' : 'معطّل — الأعضاء يمكنهم العمل بشكل طبيعي'}
              </div>
            </div>
            <button
              onClick={() => appCfg.update({ is_read_only: !appCfg.config.is_read_only })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: appCfg.config.is_read_only ? C.accent : C.primary }}
            >
              {appCfg.config.is_read_only ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {/* حد الصرف اليومي */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.warning}15`, border: `1px solid ${C.warning}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Banknote size={16} color={C.warning} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>حد الصرف اليومي</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>يطلب توقيع إضافي عند التجاوز (0 = معطّل)</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min="0" value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                onBlur={() => appCfg.update({ daily_spend_limit: Number(limitInput) || 0 })}
                style={{ width: 70, padding: '6px 8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>₪</span>
            </div>
          </div>

          {/* حدّ تأكيد البصمة للدفعات */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.secondary}15`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <KeyRound size={16} color={C.secondary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>بصمة للدفعات الكبيرة</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>تأكيد بصمة عند تسجيل دفعة بهذا المبلغ أو أكثر (0 = معطّل)</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min="0" value={bioThrInput}
                onChange={e => setBioThrInput(e.target.value)}
                onBlur={() => appCfg.update({ payment_bio_threshold: Number(bioThrInput) || 0 })}
                style={{ width: 70, padding: '6px 8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>₪</span>
            </div>
          </div>

          {/* مهلة الجلسة */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.cyan}15`, border: `1px solid ${C.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Timer size={16} color={C.cyan} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>مهلة قفل الجلسة</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>دقائق بدون نشاط قبل قفل التطبيق</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min="5" max="480" value={timeoutInput}
                onChange={e => setTimeoutInput(e.target.value)}
                onBlur={() => appCfg.update({ session_timeout: Number(timeoutInput) || 30 })}
                style={{ width: 55, padding: '6px 8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>د</span>
            </div>
          </div>

          {/* سجل الدخول */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.secondary}15`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Smartphone size={16} color={C.secondary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>سجل تسجيل الدخول</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>آخر 30 عملية دخول</div>
            </div>
            <button
              onClick={loadLoginLog}
              style={{ padding: '6px 12px', borderRadius: 10, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, color: C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              عرض
            </button>
          </div>
        </Section>
      )}

      {/* Login log sheet */}
      {loginLogOpen && (
        <div onClick={() => setLoginLogOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: '20px 20px 0 0', padding: '16px 16px calc(32px + env(safe-area-inset-bottom,0px))', width: '100%', maxWidth: 480, maxHeight: '70dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>سجل تسجيل الدخول</div>
            {loginLog.length === 0
              ? <div style={{ textAlign: 'center', color: C.textDim, padding: 24, fontSize: 12 }}>لا توجد سجلات</div>
              : loginLog.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: l.role === 'owner' ? `${C.primary}18` : `${C.secondary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Smartphone size={13} color={l.role === 'owner' ? C.primary : C.secondary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{l.email || '—'}</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.device_info}</div>
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, flexShrink: 0, marginTop: 2 }}>
                    {new Date(l.logged_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Timed Permissions (members) ── */}
      {permissions?.isOwner && teamMembers.length > 0 && (
        <Section icon={UserCheck} accent={C.warning} title="صلاحيات الأعضاء الوقتية">
          {teamMembers.map(m => {
            const hasExpiry = !!m.expires_at
            const isExpired = hasExpiry && new Date(m.expires_at) < new Date()
            const isEditing = memberExpiryEditing === m.id
            return (
              <div key={m.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: isExpired ? `${C.accent}18` : hasExpiry ? `${C.warning}18` : `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isExpired ? <UserX size={14} color={C.accent} /> : <UserCheck size={14} color={hasExpiry ? C.warning : C.primary} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.display_name || m.username}</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <input type="datetime-local" value={memberExpiryValue}
                        onChange={e => setMemberExpiryValue(e.target.value)}
                        style={{ flex: 1, padding: '4px 6px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 10, fontFamily: 'inherit', outline: 'none' }}
                      />
                      <button onClick={() => saveMemberExpiry(m.id)}
                        style={{ padding: '4px 8px', borderRadius: 7, background: C.primary, border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: isExpired ? C.accent : hasExpiry ? C.warning : C.textDim, marginTop: 1 }}>
                      {isExpired ? 'منتهي الصلاحية' : hasExpiry ? `ينتهي ${new Date(m.expires_at).toLocaleDateString('ar-SA')}` : 'بدون انتهاء'}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <button onClick={() => { setMemberExpiryEditing(m.id); setMemberExpiryValue(m.expires_at ? m.expires_at.slice(0,16) : '') }}
                    style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    تعديل
                  </button>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* ── Biometric Status + Signature Log ── */}
      {permissions?.isOwner && (
        <Section icon={Fingerprint} accent={C.success} title="التوقيع الرقمي بالبصمة">
          {/* Passkey status row */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasPasskey ? `${C.success}18` : `${C.primary}18`, border: `1px solid ${hasPasskey ? C.success : C.primary}28` }}>
              <Fingerprint size={18} color={hasPasskey ? C.success : C.primary} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {hasPasskey ? 'البصمة مفعّلة على هذا الجهاز' : 'البصمة غير مفعّلة'}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                {hasPasskey
                  ? 'العمليات الحساسة تتطلب تأكيد ببصمة الإصبع'
                  : 'اضغط تفعيل لتأمين عملياتك بالبصمة'}
              </div>
            </div>
            {hasPasskey ? (
              <button
                onClick={() => { removePasskey(); setHasPasskey(false) }}
                style={{ padding: '6px 12px', borderRadius: 9, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >إلغاء</button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setBioError(''); setShowRegisterBio(true) }}
                style={{ padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#F97316,#DC2626)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Fingerprint size={13} />
                تفعيل
              </motion.button>
            )}
          </div>

          {/* Register biometric modal */}
          <AnimatePresence>
            {showRegisterBio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                onClick={e => e.target === e.currentTarget && setShowRegisterBio(false)}
              >
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  style={{ background: C.surface, borderRadius: '24px 24px 0 0', padding: '8px 20px calc(32px + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: 480 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 12px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Fingerprint size={22} color={C.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تفعيل التوقيع بالبصمة</div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>سيطلب الجهاز تأكيد هويتك مرة واحدة</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>
                    سيطلب الجهاز تأكيد بصمتك — يتم التحقق مباشرة مع السيرفر دون تخزين أي بيانات حساسة محلياً.
                  </div>

                  {bioError && (
                    <div style={{ fontSize: 12, color: C.accent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertTriangle size={13} strokeWidth={2.2} /> {bioError}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRegisterBiometric}
                    disabled={bioLoading}
                    style={{ width: '100%', padding: '15px', borderRadius: 16, background: bioLoading ? `${C.primary}55` : 'linear-gradient(135deg,#F97316,#DC2626)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: bioLoading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {bioLoading
                      ? <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}><Fingerprint size={18} /></motion.div>
                      : <><Fingerprint size={18} /> تسجيل البصمة</>}
                  </motion.button>

                  <button onClick={() => setShowRegisterBio(false)}
                    style={{ width: '100%', marginTop: 10, padding: '11px', background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    إلغاء
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signature log */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 8, letterSpacing: '0.05em' }}>سجل التوقيعات الأخيرة</div>
            {sigLogLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: C.textDim, fontSize: 12 }}>جاري التحميل...</div>
            ) : sigLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: C.textDim, fontSize: 12 }}>لا توجد توقيعات بعد</div>
            ) : sigLog.slice(0, 10).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.primary}15`, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={13} color={C.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{s.signer_name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: s.signer_role === 'owner' ? C.primary : C.secondary, background: s.signer_role === 'owner' ? `${C.primary}15` : `${C.secondary}15`, border: `1px solid ${s.signer_role === 'owner' ? C.primary : C.secondary}30`, borderRadius: 4, padding: '1px 5px' }}>
                      {s.signer_role === 'owner' ? 'مالك' : 'عضو'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.record_label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Clock size={10} color={C.textDim} />
                  <span style={{ fontSize: 9, color: C.textDim }}>{new Date(s.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      </>)}

        </motion.div>
      )}
      </AnimatePresence>

      {/* ── نافذة تأكيد حذف الحساب نهائياً ── */}
      <AnimatePresence>
        {showDeleteAccount && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setShowDeleteAccount(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div onClick={e => e.stopPropagation()}
              initial={{ scale: 0.92, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 14 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              style={{ width: '100%', maxWidth: 420, background: C.surface, border: `1px solid ${C.accent}3a`, borderRadius: 22, padding: 22, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, insetInlineEnd: -40, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${C.accent}45, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: `${C.accent}1c`, border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <AlertTriangle size={24} color={C.accent} strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', marginBottom: 6 }}>
                  {language === 'he' ? 'מחיקת חשבון לצמיתות' : language === 'en' ? 'Delete account permanently' : 'حذف الحساب نهائياً'}
                </div>
                <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.6, marginBottom: 16 }}>
                  {language === 'he'
                    ? 'פעולה זו בלתי הפיכה. כל הנתונים שלך — פרויקטים, עובדים, כספים, צוות — יימחקו לצמיתות ולא ניתן יהיה לשחזרם.'
                    : language === 'en'
                    ? 'This action is irreversible. All your data — projects, workers, finances, team — will be permanently deleted and cannot be recovered.'
                    : 'هذا الإجراء لا رجعة فيه. كل بياناتك — المشاريع، العمّال، المالية، الفريق — ستُحذف نهائياً ولا يمكن استعادتها.'}
                </div>
                <div style={{ fontSize: 11.5, color: C.text, marginBottom: 8 }}>
                  {language === 'he' ? <>הקלד <b style={{ color: C.accent }}>{DELETE_WORD}</b> לאישור</>
                    : language === 'en' ? <>Type <b style={{ color: C.accent }}>{DELETE_WORD}</b> to confirm</>
                    : <>اكتب <b style={{ color: C.accent }}>{DELETE_WORD}</b> للتأكيد</>}
                </div>
                <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} disabled={deleting}
                  autoFocus dir={dir}
                  style={{ width: '100%', padding: '11px 14px', background: C.card, border: `1px solid ${deleteConfirmText.trim() === DELETE_WORD ? C.accent : C.borderMid}`, borderRadius: 12, color: C.text, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                {deleteError && (
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 8 }}>{deleteError}</div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setShowDeleteAccount(false)} disabled={deleting}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontWeight: 800, cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.5 : 1 }}>
                    {language === 'he' ? 'ביטול' : language === 'en' ? 'Cancel' : 'إلغاء'}
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText.trim() !== DELETE_WORD}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, background: deleteConfirmText.trim() === DELETE_WORD ? GRAD.danger : `${C.accent}22`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: (deleting || deleteConfirmText.trim() !== DELETE_WORD) ? 'default' : 'pointer', opacity: (deleting || deleteConfirmText.trim() !== DELETE_WORD) ? 0.55 : 1 }}>
                    {deleting
                      ? (language === 'he' ? 'מוחק…' : language === 'en' ? 'Deleting…' : 'جارٍ الحذف…')
                      : <><Trash2 size={15} />{language === 'he' ? 'מחק לצמיתות' : language === 'en' ? 'Delete forever' : 'حذف نهائي'}</>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App version */}
      <div style={{ textAlign: 'center', padding: '20px 0 8px', fontSize: 10, color: C.textDim }}>
        Contractor Pro v{__APP_VERSION__} · {__BUILD_DATE__}
        <br />
        {language === 'he' ? 'כל הזכויות שמורות' : language === 'en' ? 'All rights reserved' : 'جميع الحقوق محفوظة'}
      </div>
      </div>
    </div>
  )
}
