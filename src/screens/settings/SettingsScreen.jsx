import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Settings, User, Users, Users2, Globe, Shield, Bell, BellOff, BellRing, Database,
  ChevronRight, Check, LogOut, HardHat, Palette, CalendarDays,
  CreditCard, Banknote, ClipboardList, Package, Calculator,
  Activity, Plus, Trash2, Save, Camera, Tag, RefreshCw, Download,
  Fingerprint, ShieldCheck, Clock, Lock, Eye, EyeOff, Smartphone,
  ToggleLeft, ToggleRight, Timer, CalendarOff, UserCheck, UserX,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { C, GRAD, MORE_SCREENS } from '../../constants/index.js'
import { useAppStore } from '../../store/useAppStore.js'
import { navigate } from '../../Router.jsx'
import { usePushNotifications } from '../../hooks/usePushNotifications.js'
import { useAuth } from '../../hooks/useAuth.js'

const LANGS = [
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'he', label: 'עברית',   flag: '🇮🇱', dir: 'rtl' },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, paddingInlineStart: 4 }}>{title}</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
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

export default function SettingsScreen({
  projects = [], employees = [], workDays = [], expenses = [], payments = [], clientReceipts = [], advances = [],
  userId, profile, profSaving, uploading, saveName, uploadAvatar, saveContractorNumber,
  specs = [], expCats = [], payMethods = [],
  addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod,
  pensionMonthly, setPensionMonthly, taxEnabled,
  setTaxEnabled, taxModules, setTaxModule,
  holidays = [], addHoliday, deleteHoliday,
  permissions, teamMembers = [],
  addMember, updateMember, removeMember, blockMember, resetMemberPassword, getActivity, reloadTeam,
  onNav, appCfg,
  pushSubStatus, forceResubscribePush,
}) {
  const { t } = useTranslation()
  const { language, setLanguage } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const { registerPasskey, isPasskeySupported, hasPasskeyRegistered, removePasskey } = useAuth()
  const { supported: pushSupported, permission, requestPermission } = usePushNotifications(userId)
  const [notifLoading, setNotifLoading] = useState(false)
  const [testNotifLoading, setTestNotifLoading] = useState(false)

  async function sendTestNotification() {
    if (!userId) return
    setTestNotifLoading(true)
    try {
      await supabase.functions.invoke('send-push', {
        body: { user_ids: [userId], title: 'اختبار الإشعارات', body: 'وصل الإشعار بنجاح حتى بعد إغلاق التطبيق ✓' }
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
  const [memberExpiryEditing, setMemberExpiryEditing] = useState(null)
  const [memberExpiryValue, setMemberExpiryValue] = useState('')

  useEffect(() => {
    if (!limitInput && appCfg?.config) setLimitInput(String(appCfg.config.daily_spend_limit || ''))
  }, [appCfg?.config?.daily_spend_limit])

  useEffect(() => {
    if (!timeoutInput && appCfg?.config) setTimeoutInput(String(appCfg.config.session_timeout || '30'))
  }, [appCfg?.config?.session_timeout])

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

  const [newSpec, setNewSpec] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newMethod, setNewMethod] = useState('')
  const [editName, setEditName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('idle') // idle | checking | upToDate | updating

  // ── إعدادات الضرائب: پنسيה شهرية + رقم العوسيك ──
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

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('settings.title')}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
          {language === 'he' ? 'הגדרות והתאמה אישית' : language === 'en' ? 'Preferences & customization' : 'الإعدادات والتخصيص'}
        </div>
      </div>

      {/* ── Profile ── */}
      <Section title={language === 'he' ? 'פרופיל' : language === 'en' ? 'Profile' : 'الملف الشخصي'}>
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
        <Row icon={LogOut} label={language === 'he' ? 'יציאה' : language === 'en' ? 'Sign Out' : 'تسجيل الخروج'} danger onClick={() => supabase.auth.signOut()} last />
      </Section>

      {/* ── Language ── */}
      <Section title={t('settings.language')}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {LANGS.map(l => (
              <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => setLanguage(l.code)}
                style={{ padding: '12px 8px', borderRadius: 14, background: language === l.code ? GRAD.primary : C.card, border: `1px solid ${language === l.code ? 'transparent' : C.border}`, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, boxShadow: language === l.code ? '0 4px 16px rgba(249,115,22,0.3)' : 'none' }}>
                <span style={{ fontSize: 22 }}>{l.flag}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: language === l.code ? '#fff' : C.textDim }}>{l.label}</span>
                {language === l.code && <Check size={12} color="#fff" strokeWidth={3} />}
              </motion.button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── More Screens / Quick Access ── */}
      <Section title={language === 'he' ? 'כלים נוספים' : language === 'en' ? 'More Tools' : 'أدوات إضافية'}>
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

      {/* ── Specialties ── */}
      <Section title={t('settings.specs')}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {specs.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: `${C.primary}15`, border: `1px solid ${C.primary}28`, borderRadius: 9 }}>
                <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>{s}</span>
                <button onClick={() => removeSpec?.(s)} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <Trash2 size={10} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input value={newSpec} onChange={e => setNewSpec(e.target.value)}
              placeholder={language === 'en' ? 'New specialty...' : language === 'he' ? 'התמחות חדשה...' : 'تخصص جديد...'}
              style={{ flex: 1, padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && newSpec.trim()) { addSpec?.(newSpec.trim()); setNewSpec('') } }}
            />
            <button onClick={() => { if (newSpec.trim()) { addSpec?.(newSpec.trim()); setNewSpec('') } }}
              style={{ padding: '8px 14px', borderRadius: 10, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Section>

      {/* ── Expense Categories ── */}
      <Section title={t('settings.categories')}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {expCats.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: `${C.accent}12`, border: `1px solid ${C.accent}25`, borderRadius: 9 }}>
                <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>{c}</span>
                <button onClick={() => removeExpCat?.(c)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <Trash2 size={10} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)}
              placeholder={language === 'en' ? 'New category...' : language === 'he' ? 'קטגוריה חדשה...' : 'فئة جديدة...'}
              style={{ flex: 1, padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && newCat.trim()) { addExpCat?.(newCat.trim()); setNewCat('') } }}
            />
            <button onClick={() => { if (newCat.trim()) { addExpCat?.(newCat.trim()); setNewCat('') } }}
              style={{ padding: '8px 14px', borderRadius: 10, background: GRAD.danger, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Section>

      {/* ── Payment Methods ── */}
      <Section title={t('settings.payMethods')}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {payMethods.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: `${C.secondary}12`, border: `1px solid ${C.secondary}25`, borderRadius: 9 }}>
                <span style={{ fontSize: 11, color: C.secondary, fontWeight: 700 }}>{m}</span>
                <button onClick={() => removePayMethod?.(m)} style={{ background: 'none', border: 'none', color: C.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <Trash2 size={10} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input value={newMethod} onChange={e => setNewMethod(e.target.value)}
              placeholder={language === 'en' ? 'New method...' : language === 'he' ? 'אמצעי חדש...' : 'طريقة جديدة...'}
              style={{ flex: 1, padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && newMethod.trim()) { addPayMethod?.(newMethod.trim()); setNewMethod('') } }}
            />
            <button onClick={() => { if (newMethod.trim()) { addPayMethod?.(newMethod.trim()); setNewMethod('') } }}
              style={{ padding: '8px 14px', borderRadius: 10, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Section>

      {/* ── الضرائب والمصلحة ── */}
      {permissions?.isOwner && (
        <Section title={language === 'he' ? 'מסים ועסק' : language === 'en' ? 'Tax & Business' : 'الضرائب والمصلحة'}>
          {/* پنسيه شهرية — يُخصم من الوعاء الضريبي */}
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.blue}15`, border: `1px solid ${C.blue}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Banknote size={16} color={C.blue} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>قسط الپنسيה الشهري</div>
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
        <Section title={language === 'he' ? 'התראות' : language === 'en' ? 'Notifications' : 'الإشعارات'}>
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
                        ? (language === 'en' ? 'Subscribed — background push active' : 'مشترك — الإشعارات الخلفية فعّالة')
                        : pushSubStatus === 'subscribing'
                        ? (language === 'en' ? 'Subscribing...' : 'جاري التسجيل...')
                        : pushSubStatus === 'no_vapid'
                        ? (language === 'en' ? 'Push key not configured (admin)' : 'مفتاح الإشعارات غير مُعدّ')
                        : pushSubStatus === 'db_error'
                        ? (language === 'en' ? 'Subscription save error — retry' : 'خطأ في حفظ الاشتراك — أعد التفعيل')
                        : (language === 'en' ? 'Not subscribed — tap Re-activate' : 'غير مشترك — اضغط إعادة التفعيل')
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
                    {language === 'en' ? 'Re-activate Push' : 'إعادة تفعيل الإشعارات'}
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
                      ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={13} /></motion.div>{language === 'en' ? 'Sending...' : 'جاري الإرسال...'}</>
                      : <><BellRing size={13} strokeWidth={2.5} />{language === 'en' ? 'Send Test Notification' : 'إرسال إشعار تجريبي'}</>
                    }
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Subscription ── */}
      <Section title={t('settings.subscription')}>
        <Row icon={Shield} label={language === 'he' ? 'ניהול מנוי' : language === 'en' ? 'Manage Subscription' : 'إدارة الاشتراك'} color={C.gold} onClick={() => navigate('/pricing')} last />
      </Section>

      {/* ── App Update ── */}
      <Section title={language === 'he' ? 'עדכון אפליקציה' : language === 'en' ? 'App Update' : 'تحديث التطبيق'}>
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

      {/* ── Security & Access Control ── */}
      {permissions?.isOwner && appCfg && (
        <Section title="الأمان والتحكم">

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
        <Section title="صلاحيات الأعضاء الوقتية">
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
        <Section title="التوقيع الرقمي بالبصمة">
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
                      <span>⚠</span> {bioError}
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

      {/* App version */}
      <div style={{ textAlign: 'center', padding: '20px 0 8px', fontSize: 10, color: C.textDim }}>
        Contractor Pro v{__APP_VERSION__} · {__BUILD_DATE__}
        <br />
        {language === 'he' ? 'כל הזכויות שמורות' : language === 'en' ? 'All rights reserved' : 'جميع الحقوق محفوظة'}
      </div>
    </div>
  )
}
