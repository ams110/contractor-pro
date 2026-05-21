import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Settings, User, Users, Users2, Globe, Shield, Bell, BellOff, BellRing, Database,
  ChevronRight, Check, LogOut, HardHat, Palette, CalendarDays,
  CreditCard, Banknote, ClipboardList, Package, Calculator,
  Activity, Plus, Trash2, Save, Camera, Tag, RefreshCw, Download,
  Fingerprint, ShieldCheck, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { C, GRAD, MORE_SCREENS } from '../../constants/index.js'
import { useAppStore } from '../../store/useAppStore.js'
import { navigate } from '../../Router.jsx'
import { usePushNotifications } from '../../hooks/usePushNotifications.js'

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
  pensionMonthly, setPensionMonthly, taxEnabled, businessType,
  setTaxEnabled, setBusinessType, taxModules, setTaxModule,
  holidays = [], addHoliday, deleteHoliday,
  permissions, teamMembers = [],
  addMember, updateMember, removeMember, blockMember, resetMemberPassword, getActivity, reloadTeam,
  onNav,
}) {
  const { t } = useTranslation()
  const { language, setLanguage } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const { supported: pushSupported, permission, requestPermission } = usePushNotifications(userId)
  const [notifLoading, setNotifLoading] = useState(false)
  const [sigLog, setSigLog] = useState([])
  const [sigLogLoading, setSigLogLoading] = useState(false)

  useEffect(() => {
    if (!userId || !permissions?.isOwner) return
    setSigLogLoading(true)
    supabase.rpc('get_signature_log', { p_limit: 20 })
      .then(({ data }) => { setSigLog(data || []); setSigLogLoading(false) })
  }, [userId, permissions?.isOwner])

  const PASSKEY_KEY = 'cpro_passkey_cred'
  const [hasPasskey, setHasPasskey] = useState(!!localStorage.getItem(PASSKEY_KEY))

  const [newSpec, setNewSpec] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newMethod, setNewMethod] = useState('')
  const [editName, setEditName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('idle') // idle | checking | upToDate | updating

  const MORE_WITH_ICONS = MORE_SCREENS.map(s => ({ ...s, IconComp: NAV_ICONS_MAP[s.id] || Settings }))

  async function handleCheckUpdate() {
    if (updateStatus === 'checking') return
    setUpdateStatus('checking')
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) {
        await reg.update()
        if (reg.waiting || reg.installing) {
          setUpdateStatus('updating')
          setTimeout(() => window.location.reload(), 800)
        } else {
          setUpdateStatus('upToDate')
          setTimeout(() => setUpdateStatus('idle'), 3000)
        }
      } else {
        setUpdateStatus('upToDate')
        setTimeout(() => setUpdateStatus('idle'), 3000)
      }
    } catch {
      setUpdateStatus('idle')
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: `${C.success}12`, borderRadius: 10, border: `1px solid ${C.success}25` }}>
                <Check size={14} color={C.success} strokeWidth={2.5} />
                <span style={{ fontSize: 12, color: C.success, fontWeight: 700 }}>
                  {language === 'he' ? 'פעיל — תקבל התראות ברקע' : language === 'en' ? 'Active — background alerts on' : 'مفعّل — ستصلك إشعارات في الخلفية'}
                </span>
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
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Contractor Pro v2.0</div>
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

      {/* ── Biometric Status + Signature Log ── */}
      {permissions?.isOwner && (
        <Section title="التوقيع الرقمي بالبصمة">
          {/* Passkey status */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasPasskey ? `${C.success}18` : `${C.primary}18`, border: `1px solid ${hasPasskey ? C.success : C.primary}28` }}>
              <Fingerprint size={18} color={hasPasskey ? C.success : C.primary} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {hasPasskey ? 'البصمة مفعّلة على هذا الجهاز' : 'البصمة غير مفعّلة'}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                {hasPasskey ? 'العمليات الحساسة تتطلب تأكيد ببصمة الإصبع' : 'فعّل البصمة من إعدادات الأمان لحماية عملياتك'}
              </div>
            </div>
            {hasPasskey && (
              <button
                onClick={() => { localStorage.removeItem(PASSKEY_KEY); setHasPasskey(false) }}
                style={{ padding: '6px 12px', borderRadius: 9, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >إلغاء</button>
            )}
          </div>

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
        Contractor Pro v2.0 · {language === 'he' ? 'כל הזכויות שמורות' : language === 'en' ? 'All rights reserved' : 'جميع الحقوق محفوظة'}
      </div>
    </div>
  )
}
