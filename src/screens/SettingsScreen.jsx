import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Bell, Wrench, Tag, CreditCard, CalendarDays, Users, FileDown, Download, KeyRound, Fingerprint, Camera, User, Clock, FileSpreadsheet } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { Btn, GlassCard, SectionLabel, ConfirmDialog } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { exportFullReportToExcel, exportTaxSummary } from '../lib/export.js'
import { usePushNotifications, getNotifPrefs, setNotifPref } from '../hooks/usePushNotifications.js'

const PERM_LABELS = [
  ['can_view_projects',    'مشاهدة المشاريع'],
  ['can_edit_projects',    'إضافة/تعديل المشاريع'],
  ['can_view_workers',     'مشاهدة العمال'],
  ['can_edit_workers',     'إضافة/تعديل العمال'],
  ['can_view_expenses',    'مشاهدة المصاريف'],
  ['can_add_expenses',     'إضافة المصاريف'],
  ['can_view_payments',    'مشاهدة الرواتب'],
  ['can_add_payments',     'إضافة الرواتب'],
  ['can_delete',           'حذف السجلات'],
  ['can_manage_team',      'إدارة الفريق'],
  ['can_view_amounts',     'مشاهدة المبالغ'],
  ['can_view_activity',    'مشاهدة سجل النشاط'],
  ['can_view_blueprints',  'مشاهدة خرائط المشاريع'],
]

const ROLES = ['مشرف', 'محاسب', 'مساعد', 'عضو']
const DEFAULT_NEW_PERMS = Object.fromEntries(PERM_LABELS.map(([k]) => [k, k === 'can_view_amounts']))
const emptyMemberForm = { displayName: '', username: '', password: '', role: 'عضو', expiresAt: '', perms: DEFAULT_NEW_PERMS }

function fmtRelative(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)   return 'الآن'
  if (min < 60)  return `منذ ${min} د`
  const hr = Math.floor(min / 60)
  if (hr  < 24)  return `منذ ${hr} س`
  const days = Math.floor(hr / 24)
  return `منذ ${days} يوم`
}

const ACTION_AR = { insert: 'أضاف', update: 'عدّل', delete: 'حذف', view: 'فتح' }
const TBL_AR    = {
  projects: 'مشروع', employees: 'عامل', expenses: 'مصروف',
  payments: 'دفعة', work_days: 'يوم عمل',
  dashboard: 'الرئيسية', projects_screen: 'المشاريع',
  workers: 'العمال', workdays: 'أيام العمل',
  settings: 'الإعدادات', payments_screen: 'الرواتب', expenses_screen: 'المصاريف',
}
const ACTION_ICON = { insert: Plus, update: Pencil, delete: Trash2, view: Eye }
const ACTION_COLOR = { insert: C.success, update: C.primary, delete: C.accent, view: C.textDim }

export default function SettingsScreen({ projects, employees, workDays, expenses, payments, clientReceipts, userId, specs, expCats, payMethods, addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod, pensionMonthly, setPensionMonthly, taxEnabled, businessType, setTaxEnabled, setBusinessType, taxModules = {}, setTaxModule, holidays = [], addHoliday, deleteHoliday, profile, profSaving, uploading, saveName, uploadAvatar, saveContractorNumber, permissions, teamMembers, addMember, resetMemberPassword, updateMember, removeMember, blockMember, getActivity, reloadTeam }) {
  const { signOut, registerPasskey, isPasskeySupported, hasPasskeyRegistered, removePasskey, setPin, hasPinSet, removePin, user } = useAuth()
  const { supported: pushWebSupported, notifSupported: pushSupported, permission: pushPerm, subscribing: pushSubscribing, subscribeToPush, unsubscribeFromPush } = usePushNotifications(userId)
  const [notifPrefs, setNotifPrefsState] = useState(() => getNotifPrefs())

  function toggleNotifPref(key) {
    const current = notifPrefs[key] !== false
    setNotifPref(key, !current)
    setNotifPrefsState(p => ({ ...p, [key]: !current }))
  }
  const [confirmSignOut,   setConfirmSignOut]   = useState(false)
  const [passkeyStatus,    setPasskeyStatus]    = useState('')
  const [passkeyLoading,   setPasskeyLoading]   = useState(false)
  const [pkStep,           setPkStep]           = useState(null) // null | 'password'
  const [pkPassword,       setPkPassword]       = useState('')
  const [pkError,          setPkError]          = useState('')
  const [pinStep,          setPinStep]          = useState(null) // null | 'password' | 'enter' | 'confirm'
  const [pinPassword,      setPinPassword]      = useState('')
  const [pinInput,         setPinInput]         = useState('')
  const [pinConfirm,       setPinConfirm]       = useState('')
  const [pinStatus,        setPinStatus]        = useState('')
  const [pinError,         setPinError]         = useState('')
  const [newSpec,          setNewSpec]          = useState('')
  const [newExpCat,        setNewExpCat]        = useState('')
  const [newPayMethod,     setNewPayMethod]     = useState('')
  const [editingName,        setEditingName]        = useState(false)
  const [nameInput,          setNameInput]          = useState('')
  const [editingContractor,  setEditingContractor]  = useState(false)
  const [contractorInput,    setContractorInput]    = useState('')
  const [uploadError,      setUploadError]      = useState('')
  const [showAddMember,    setShowAddMember]    = useState(false)
  const [memberForm,       setMemberForm]       = useState(emptyMemberForm)
  const [addingMember,     setAddingMember]     = useState(false)
  const [addMemberErr,     setAddMemberErr]     = useState('')
  const [editingMember,    setEditingMember]    = useState(null)
  const [editPerms,        setEditPerms]        = useState({})
  const [activityMember,   setActivityMember]   = useState(null)
  const [activityData,     setActivityData]     = useState([])
  const [activityLoading,  setActivityLoading]  = useState(false)
  const [confirmBlock,     setConfirmBlock]     = useState(null)
  const [showResetPass,    setShowResetPass]    = useState(null)  // member object
  const [newPass,          setNewPass]          = useState('')
  const [resetPassSaving,  setResetPassSaving]  = useState(false)
  const [resetPassErr,     setResetPassErr]     = useState('')
  const [showHolForm,      setShowHolForm]      = useState(false)
  const [holForm,          setHolForm]          = useState({ name: '', date: '' })
  const [holSaving,        setHolSaving]        = useState(false)

  async function openActivity(m) {
    setActivityMember(m)
    setActivityLoading(true)
    setActivityData([])
    try { setActivityData(await getActivity(m.email)) }
    catch { /* ignore */ }
    finally { setActivityLoading(false) }
  }

  async function handleBlock(m, blocked) {
    setConfirmBlock({ id: m.id, email: m.email, blocked })
  }

  async function confirmDoBlock() {
    if (!confirmBlock) return
    try { await blockMember(confirmBlock.id, confirmBlock.blocked) }
    catch { /* ignore */ }
    finally { setConfirmBlock(null) }
  }

  async function handleRegisterPasskey() {
    if (!pkPassword) { setPkStep('password'); setPkError(''); return }
    setPasskeyLoading(true); setPasskeyStatus(''); setPkError('')
    try {
      await registerPasskey(pkPassword)
      setPasskeyStatus('✓ تم تفعيل البصمة بنجاح!')
      setPkStep(null); setPkPassword('')
    } catch (e) {
      if (e.message === 'كلمة المرور غير صحيحة') { setPkError(e.message) }
      else { setPasskeyStatus(`⚠ ${e.message}`); setPkStep(null); setPkPassword('') }
    } finally { setPasskeyLoading(false) }
  }

  function exportData() {
    const payload = { projects, employees, workDays, expenses, payments, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `contractor-pro-backup-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { l:'مشاريع', v: projects.length,  c: C.primary  },
    { l:'عمال',   v: employees.length, c: C.secondary },
    { l:'أيام',   v: workDays.length,  c: C.success   },
    { l:'مصاريف', v: expenses.length,  c: C.warning   },
    { l:'دفعات',  v: payments.length,  c: C.accent    },
  ]

  return (
    <div className="fade-up" style={{ padding:16, paddingBottom:100 }}>

      {/* ── بطاقة الحساب ── */}
      <GlassCard style={{ overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:3, background:GRAD.brand }} />
        <div style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:4 }}>
            {/* صورة بـ gradient border */}
            <label style={{ cursor:'pointer', flexShrink:0, position:'relative' }}>
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadError('')
                  try { await uploadAvatar(file) }
                  catch { setUploadError('فشل رفع الصورة') }
                }}
              />
              <div style={{ padding:3, borderRadius:'50%', background:GRAD.brand, display:'inline-block' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar"
                      style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', display:'block', border:`2px solid ${C.bg}` }} />
                  : <div style={{ width:64, height:64, borderRadius:'50%', background:C.surface, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, border:`2px solid ${C.bg}` }}>
                      {profile?.full_name ? <span style={{ fontSize:26, fontWeight:900, color:C.primary }}>{profile.full_name.charAt(0)}</span> : <User size={28} strokeWidth={1.5} style={{ color: C.textDim }} />}
                    </div>
                }
              </div>
              <div style={{ position:'absolute', bottom:2, right:2, width:20, height:20, borderRadius:'50%', background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.bg}` }}>
                <Camera size={10} strokeWidth={2} color="#000" />
              </div>
            </label>

            {/* الاسم والإيميل */}
            <div style={{ flex:1, minWidth:0 }}>
              {editingName
                ? <div style={{ display:'flex', gap:6 }}>
                    <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { saveName(nameInput); setEditingName(false) }
                        if (e.key === 'Escape') { setEditingName(false) }
                      }}
                      style={{ flex:1, padding:'8px 12px', borderRadius:10, border:`1.5px solid ${C.primary}`, background:C.surface, color:C.text, fontSize:15, fontWeight:700, outline:'none' }}
                    />
                    <button onClick={() => { saveName(nameInput); setEditingName(false) }}
                      style={{ padding:'8px 12px', borderRadius:10, background:GRAD.brand, color:'#000', border:'none', cursor:'pointer', fontSize:13, fontWeight:800 }}>
                      {profSaving ? '...' : '✓'}
                    </button>
                  </div>
                : <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontSize:18, fontWeight:900, color:C.text }}>{profile?.full_name || 'أضف اسمك'}</div>
                    <button onClick={() => { setNameInput(profile?.full_name || ''); setEditingName(true) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:C.textDim }}>✏️</button>
                  </div>
              }
              <div style={{ fontSize:11, color:C.textDim, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>

            {/* خروج */}
            <button onClick={() => setConfirmSignOut(true)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1.5px solid ${C.accent}44`, background:`${C.accent}15`, color:C.accent, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              🚪
            </button>
          </div>
          {uploadError && <div style={{ fontSize:11, color:C.accent, marginTop:8 }}>{uploadError}</div>}

          {/* Contractor number */}
          {saveContractorNumber && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 6 }}>🪪 رقم ترخيص المقاول (اختياري)</div>
              {editingContractor
                ? <div style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus value={contractorInput} onChange={e => setContractorInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { saveContractorNumber(contractorInput); setEditingContractor(false) }
                        if (e.key === 'Escape') { setEditingContractor(false) }
                      }}
                      placeholder="مثال: 12345"
                      dir="ltr"
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${C.primary}`, background: C.surface, color: C.text, fontSize: 14, fontWeight: 700, outline: 'none' }}
                    />
                    <button onClick={() => { saveContractorNumber(contractorInput); setEditingContractor(false) }}
                      style={{ padding: '8px 12px', borderRadius: 10, background: GRAD.brand, color: '#000', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
                      {profSaving ? '...' : '✓'}
                    </button>
                  </div>
                : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: profile?.contractor_number ? C.text : C.textDim, fontFamily: 'monospace' }}>
                      {profile?.contractor_number || 'لم يُضف بعد'}
                    </span>
                    <button onClick={() => { setContractorInput(profile?.contractor_number || ''); setEditingContractor(true) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.textDim }}>✏️</button>
                  </div>
              }
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── إحصائيات ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
        {stats.map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'12px 4px', background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', borderRadius:14, border:`1px solid ${s.c}33` }}>
            <div style={{ fontSize:20, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
            <div style={{ fontSize:9, color:C.textDim, marginTop:2, fontWeight:600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── البصمة ── */}
      {isPasskeySupported() && (
        <div style={{ marginBottom:16 }}>
          {hasPasskeyRegistered() ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ padding:'10px 14px', background:`${C.success}15`, borderRadius:12, border:`1px solid ${C.success}33`, fontSize:12, color:C.success, fontWeight:700, textAlign:'center' }}>
                ✓ البصمة مفعّلة على هذا الجهاز
              </div>
              <Btn onClick={() => { removePasskey(); setPasskeyStatus('تم حذف البصمة') }} variant="outline" full>
                إلغاء تفعيل البصمة
              </Btn>
            </div>
          ) : pkStep === 'password' ? (
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:16, padding:16, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:4, textAlign:'center' }}>أدخل كلمة مرورك الحالية</div>
              <div style={{ fontSize:10, color:C.textDim, textAlign:'center', marginBottom:10 }}>مطلوب مرة واحدة فقط — لحفظ الدخول بشكل دائم</div>
              <input
                type="password"
                value={pkPassword}
                onChange={e => { setPkPassword(e.target.value); setPkError('') }}
                placeholder="••••••••"
                style={{ width:'100%', padding:'12px', borderRadius:12, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:16, letterSpacing:2, textAlign:'center', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}
                autoFocus
              />
              {pkError && <div style={{ fontSize:11, color:C.accent, textAlign:'center', marginTop:6, fontWeight:600 }}>⚠ {pkError}</div>}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={() => { setPkStep(null); setPkPassword(''); setPkError('') }}
                  style={{ flex:1, padding:'10px', borderRadius:12, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer' }}>إلغاء</button>
                <button onClick={handleRegisterPasskey} disabled={passkeyLoading || !pkPassword}
                  style={{ flex:2, padding:'10px', borderRadius:12, border:'none', background: passkeyLoading || !pkPassword ? C.surface : C.primary, color:'white', fontSize:12, fontWeight:700, cursor: passkeyLoading || !pkPassword ? 'not-allowed' : 'pointer' }}>
                  {passkeyLoading ? '...' : 'تفعيل البصمة'}
                </button>
              </div>
            </div>
          ) : (
            <Btn onClick={() => { setPkStep('password'); setPkPassword(''); setPkError('') }} disabled={passkeyLoading} variant="outline" full>
              {passkeyLoading ? '...' : 'تفعيل الدخول بالبصمة / Face ID'}
            </Btn>
          )}
          {passkeyStatus && (
            <div style={{ fontSize:12, marginTop:8, color: passkeyStatus.startsWith('✓') ? C.success : C.accent, textAlign:'center', fontWeight:600 }}>
              {passkeyStatus}
            </div>
          )}
        </div>
      )}

      {/* ── PIN Login ── */}
      {permissions?.isOwner && (
        <div style={{ marginBottom:16 }}>
          {hasPinSet() ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ padding:'10px 14px', background:`${C.secondary}15`, borderRadius:12, border:`1px solid ${C.secondary}33`, fontSize:12, color:C.secondary, fontWeight:700, textAlign:'center' }}>
                ✓ الدخول بـ PIN مفعّل على هذا الجهاز
              </div>
              <Btn onClick={() => { removePin(); setPinStatus('تم حذف الـ PIN'); setPinStep(null) }} variant="outline" full>
                حذف الـ PIN
              </Btn>
            </div>
          ) : pinStep === null ? (
            <Btn onClick={() => { setPinStep('password'); setPinPassword(''); setPinInput(''); setPinConfirm(''); setPinError('') }} variant="outline" full>
              إعداد الدخول بـ PIN (4–6 أرقام)
            </Btn>
          ) : (
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:16, padding:16, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:4, textAlign:'center' }}>
                {pinStep === 'password' ? 'أدخل كلمة مرورك الحالية' : pinStep === 'enter' ? 'أدخل PIN جديد (4–6 أرقام)' : 'أعد الإدخال للتأكيد'}
              </div>
              {pinStep === 'password' && (
                <div style={{ fontSize:10, color:C.textDim, textAlign:'center', marginBottom:10 }}>مطلوب مرة واحدة فقط — لحفظ الدخول بشكل دائم</div>
              )}
              <input
                key={pinStep}
                type="password"
                inputMode={pinStep === 'password' ? 'text' : 'numeric'}
                pattern={pinStep === 'password' ? undefined : '[0-9]*'}
                maxLength={pinStep === 'password' ? undefined : 6}
                value={pinStep === 'password' ? pinPassword : pinStep === 'enter' ? pinInput : pinConfirm}
                onChange={e => {
                  setPinError('')
                  if (pinStep === 'password') setPinPassword(e.target.value)
                  else { const v = e.target.value.replace(/\D/g, ''); pinStep === 'enter' ? setPinInput(v) : setPinConfirm(v) }
                }}
                placeholder={pinStep === 'password' ? '••••••••' : '••••••'}
                style={{ width:'100%', padding:'12px', borderRadius:12, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize: pinStep === 'password' ? 16 : 22, letterSpacing: pinStep === 'password' ? 2 : 8, textAlign:'center', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}
                autoFocus
              />
              {pinError && <div style={{ fontSize:11, color:C.accent, textAlign:'center', marginTop:6, fontWeight:600 }}>⚠ {pinError}</div>}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={() => { setPinStep(null); setPinPassword(''); setPinInput(''); setPinConfirm('') }}
                  style={{ flex:1, padding:'10px', borderRadius:12, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    if (pinStep === 'password') {
                      if (!pinPassword) return setPinError('أدخل كلمة المرور')
                      setPinStep('enter')
                    } else {
                      const val = pinStep === 'enter' ? pinInput : pinConfirm
                      if (val.length < 4) return setPinError('PIN يجب أن يكون 4 أرقام على الأقل')
                      if (pinStep === 'enter') {
                        setPinStep('confirm')
                      } else {
                        if (pinConfirm !== pinInput) return setPinError('الرمزان غير متطابقَين')
                        try {
                          await setPin(pinInput, pinPassword)
                          setPinStep(null); setPinPassword(''); setPinInput(''); setPinConfirm('')
                          setPinStatus('✓ تم تفعيل الـ PIN بنجاح!')
                        } catch (e) { setPinError(e.message) }
                      }
                    }
                  }}
                  style={{ flex:2, padding:'10px', borderRadius:12, border:'none', background:GRAD.brand, color:'#000', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  {pinStep === 'confirm' ? '✓ حفظ PIN' : 'التالي →'}
                </button>
              </div>
            </div>
          )}
          {pinStatus && (
            <div style={{ fontSize:12, marginTop:8, color: pinStatus.startsWith('✓') ? C.success : C.accent, textAlign:'center', fontWeight:600 }}>
              {pinStatus}
            </div>
          )}
        </div>
      )}

      {/* ── إشعارات Push ── */}
      {pushSupported && (
        <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ height:3, background:'linear-gradient(90deg,#F59E0B,#EF4444)' }} />
          <div style={{ padding:'14px 16px' }}>
            <SectionLabel color={C.warning}>إشعارات التطبيق</SectionLabel>

            {pushPerm !== 'granted' ? (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:10 }}>
                  {pushWebSupported
                    ? 'فعّل إشعارات الهاتف لتلقّي تنبيهات فورية حتى لو التطبيق مغلق'
                    : 'فعّل الإشعارات لتلقّي تنبيهات عند وجود طلبات جديدة من العمال'}
                </div>
                <button
                  onClick={async () => { await subscribeToPush(); setNotifPrefsState(getNotifPrefs()) }}
                  disabled={pushSubscribing}
                  style={{ padding:'10px 24px', borderRadius:12, border:'none', background:'linear-gradient(90deg,#F59E0B,#EF4444)', color:'#fff', fontSize:12, fontWeight:800, cursor: pushSubscribing ? 'wait' : 'pointer', opacity: pushSubscribing ? 0.7 : 1 }}>
                  {pushSubscribing ? 'جاري التفعيل...' : pushWebSupported ? 'تفعيل إشعارات الهاتف' : 'تفعيل الإشعارات'}
                </button>
                {pushPerm === 'denied' && (
                  <div style={{ fontSize:10, color:C.accent, marginTop:8 }}>
                    تم رفض الإذن — افتح إعدادات المتصفح وأعد التفعيل يدوياً
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:`${C.success}12`, borderRadius:10, border:`1px solid ${C.success}30`, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:C.success, fontWeight:700 }}>
                    {pushWebSupported ? 'إشعارات الهاتف مفعّلة' : 'إشعارات المتصفح مفعّلة'}
                  </span>
                  <button onClick={unsubscribeFromPush}
                    style={{ fontSize:10, color:C.textDim, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    إلغاء
                  </button>
                </div>
                {[
                  { key:'advance',  label:'طلبات السلفة' },
                  { key:'workday',  label:'أيام العمل' },
                  { key:'payment',  label:'طلبات الراتب' },
                  { key:'expense',  label:'طلبات المصاريف' },
                  { key:'salary',   label:'تذكيرات الراتب' },
                  { key:'team',     label:'نشاط الفريق' },
                ].map(({ key, label }) => {
                  const on = notifPrefs[key] !== false
                  return (
                    <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{label}</span>
                      <button onClick={() => toggleNotifPref(key)}
                        style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', position:'relative', background: on ? C.warning : C.surface, transition:'background .2s', flexShrink:0 }}>
                        <div style={{ position:'absolute', top:2, left: on ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                      </button>
                    </div>
                  )
                })}
                <div style={{ fontSize:10, color:C.success, textAlign:'center', marginTop:4 }}>
                  {pushWebSupported ? 'الإشعارات تصلك حتى لو التطبيق مغلق' : 'الإشعارات تعمل عند فتح التطبيق في المتصفح'}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ── التخصصات ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.blue }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.blue}>التخصصات</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(specs || []).map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, background:`${C.blue}18`, border:`1px solid ${C.blue}33` }}>
                <span style={{ color:C.blue, fontSize:11, fontWeight:600 }}>{s}</span>
                <button onClick={() => removeSpec(s)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newSpec} onChange={e => setNewSpec(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              placeholder="تخصص جديد..."
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              style={{ padding:'9px 14px', borderRadius:10, background:GRAD.blue, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:800 }}>+</button>
          </div>
        </div>
      </GlassCard>

      {/* ── تصنيفات المصاريف ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.warm }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.warning}>تصنيفات المصاريف</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(expCats || []).map(c => (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, background:`${C.orange}18`, border:`1px solid ${C.orange}33` }}>
                <span style={{ color:C.orange, fontSize:11, fontWeight:600 }}>{c}</span>
                <button onClick={() => removeExpCat(c)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newExpCat} onChange={e => setNewExpCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              placeholder="تصنيف جديد..."
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              style={{ padding:'9px 14px', borderRadius:10, background:GRAD.warm, color:'#000', border:'none', cursor:'pointer', fontSize:14, fontWeight:800 }}>+</button>
          </div>
        </div>
      </GlassCard>

      {/* ── طرق الدفع ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.success }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.success}>طرق الدفع</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(payMethods || []).map(m => (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, background:`${C.success}18`, border:`1px solid ${C.success}33` }}>
                <span style={{ color:C.success, fontSize:11, fontWeight:600 }}>{m}</span>
                <button onClick={() => removePayMethod(m)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newPayMethod.trim()) { addPayMethod(newPayMethod); setNewPayMethod('') } }}
              placeholder="طريقة دفع جديدة (فيزا، ביט، PayPal...)"
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newPayMethod.trim()) { addPayMethod(newPayMethod); setNewPayMethod('') } }}
              style={{ padding:'9px 14px', borderRadius:10, background:GRAD.success, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:800 }}>+</button>
          </div>
        </div>
      </GlassCard>

      {/* ── الأعياد والعطل ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.warm }} />
        <div style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <SectionLabel color={C.warning}>الأعياد والعطل</SectionLabel>
            <button onClick={() => setShowHolForm(v => !v)}
              style={{ padding:'5px 12px', borderRadius:9, background:`${C.warning}20`, color:C.warning, border:`1px solid ${C.warning}44`, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              + إضافة
            </button>
          </div>

          {showHolForm && (
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, marginBottom:12, border:`1px solid ${C.border}` }}>
              <input value={holForm.name} onChange={e => setHolForm(f => ({ ...f, name: e.target.value }))}
                placeholder="اسم العيد (مثال: عيد الفطر)"
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, marginBottom:8, boxSizing:'border-box', outline:'none' }}
              />
              <input type="date" value={holForm.date} onChange={e => setHolForm(f => ({ ...f, date: e.target.value }))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, marginBottom:10, boxSizing:'border-box', outline:'none' }}
              />
              <Btn onClick={async () => {
                if (!holForm.name.trim() || !holForm.date) return
                setHolSaving(true)
                try {
                  await addHoliday({ name: holForm.name.trim(), date: holForm.date })
                  setHolForm({ name: '', date: '' })
                  setShowHolForm(false)
                } catch { /* ignore */ }
                finally { setHolSaving(false) }
              }} full disabled={holSaving || !holForm.name.trim() || !holForm.date}>
                {holSaving ? '...' : '✓ حفظ العيد'}
              </Btn>
            </div>
          )}

          {holidays.length === 0
            ? <div style={{ fontSize:12, color:C.textDim, textAlign:'center', padding:'8px 0' }}>لا توجد أعياد مسجلة</div>
            : [...holidays].sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(h => (
              <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, marginBottom:6, border:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{h.name}</div>
                  <div style={{ fontSize:10, color:C.warning }}>{h.date}</div>
                </div>
                <button onClick={() => deleteHoliday(h.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:C.accent, padding:'2px 6px', display:'flex', fontFamily:'inherit' }}><Trash2 size={14} strokeWidth={2} /></button>
              </div>
            ))
          }
        </div>
      </GlassCard>

      {/* ── إدارة الفريق — انتقلت إلى صفحة العمال ── */}
      {false && permissions?.manageTeam && (
        <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ height:3, background:GRAD.success }} />
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <SectionLabel color={C.success}>الفريق</SectionLabel>
              <button onClick={() => { setShowAddMember(!showAddMember); setAddMemberErr(''); setMemberForm(emptyMemberForm) }}
                style={{ padding:'6px 14px', borderRadius:10, background:`${C.success}20`, color:C.success, border:`1px solid ${C.success}44`, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                + إضافة عضو
              </button>
            </div>

            {/* فورم إضافة عضو مباشرة */}
            {showAddMember && (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div>
                    <label style={{ fontSize:10, color:C.textDim, display:'block', marginBottom:4 }}>الاسم *</label>
                    <input value={memberForm.displayName} onChange={e => setMemberForm(p => ({ ...p, displayName: e.target.value }))}
                      placeholder="مثال: أبو محمد"
                      style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, boxSizing:'border-box', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:C.textDim, display:'block', marginBottom:4 }}>الدور</label>
                    <select value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, boxSizing:'border-box', outline:'none' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div>
                    <label style={{ fontSize:10, color:C.textDim, display:'block', marginBottom:4 }}>اسم المستخدم *</label>
                    <input value={memberForm.username} onChange={e => setMemberForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                      placeholder="مثال: abumohammad"
                      style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, boxSizing:'border-box', outline:'none', direction:'ltr' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:C.textDim, display:'block', marginBottom:4 }}>الباسورد *</label>
                    <input type="password" value={memberForm.password} onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="6 أحرف على الأقل"
                      style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, boxSizing:'border-box', outline:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:8 }}>
                  <label style={{ fontSize:10, color:C.textDim, display:'block', marginBottom:4 }}>⏰ تاريخ انتهاء الصلاحية (اختياري)</label>
                  <input type="date" value={memberForm.expiresAt} onChange={e => setMemberForm(p => ({ ...p, expiresAt: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, boxSizing:'border-box', outline:'none' }} />
                </div>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:8, fontWeight:700 }}>الصلاحيات:</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:12 }}>
                  {PERM_LABELS.map(([key, label]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.text, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!memberForm.perms[key]} onChange={e => setMemberForm(p => ({ ...p, perms: { ...p.perms, [key]: e.target.checked } }))} />
                      {label}
                    </label>
                  ))}
                </div>
                {addMemberErr && <div style={{ fontSize:11, color:C.accent, marginBottom:8 }}>⚠ {addMemberErr}</div>}
                <Btn onClick={async () => {
                  if (!memberForm.displayName.trim()) return setAddMemberErr('أدخل الاسم')
                  if (!memberForm.username.trim())    return setAddMemberErr('أدخل اسم المستخدم')
                  if (memberForm.password.length < 6) return setAddMemberErr('الباسورد 6 أحرف على الأقل')
                  setAddingMember(true); setAddMemberErr('')
                  try {
                    await addMember({ displayName: memberForm.displayName, username: memberForm.username, password: memberForm.password, role: memberForm.role, expiresAt: memberForm.expiresAt || null, perms: memberForm.perms })
                    setShowAddMember(false); setMemberForm(emptyMemberForm)
                  } catch(e) { setAddMemberErr(e.message) }
                  finally { setAddingMember(false) }
                }} full disabled={addingMember}>{addingMember ? '⏳ جاري الإنشاء...' : '✓ إضافة العضو'}</Btn>
              </div>
            )}

            {teamMembers.length === 0
              ? <div style={{ fontSize:12, color:C.textDim, textAlign:'center', padding:'8px 0' }}>لا يوجد أعضاء بعد</div>
              : teamMembers.map(m => {
                const blocked  = !!m.is_blocked
                const expired  = m.expires_at && new Date(m.expires_at) < new Date()
                const lastSeen = fmtRelative(m.last_seen_at)
                const name     = m.display_name || m.email
                return (
                  <div key={m.id} style={{ marginBottom:8, background: blocked ? `${C.accent}10` : 'rgba(255,255,255,0.04)', borderRadius:12, padding:12, border:`1px solid ${blocked ? C.accent + '44' : C.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color: blocked ? C.accent : C.text }}>{name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3, flexWrap:'wrap' }}>
                          {m.username && <span style={{ fontSize:9, color:C.textDim, background:'rgba(255,255,255,0.06)', padding:'1px 6px', borderRadius:4 }}>@{m.username}</span>}
                          {m.role     && <span style={{ fontSize:9, color:C.secondary, fontWeight:700 }}>{m.role}</span>}
                          {blocked    && <span style={{ fontSize:9, color:C.accent, fontWeight:700, background:`${C.accent}22`, padding:'2px 6px', borderRadius:4 }}>🚫 محجوب</span>}
                          {expired    && <span style={{ fontSize:9, color:C.warning, fontWeight:700, background:`${C.warning}22`, padding:'2px 6px', borderRadius:4 }}>⏰ منتهي</span>}
                          {!blocked && !expired && <span style={{ fontSize:9, color:C.success, fontWeight:700 }}>● نشط</span>}
                          {lastSeen && <span style={{ fontSize:9, color:C.textDim, display:'flex', alignItems:'center', gap:3 }}><Clock size={9} strokeWidth={2} /> {lastSeen}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <button onClick={() => { setShowResetPass(m); setNewPass(''); setResetPassErr('') }}
                          title="تغيير الباسورد"
                          style={{ background:'none', border:`1px solid ${C.warning}44`, borderRadius:8, cursor:'pointer', padding:'4px 7px', color:C.warning, display:'flex', fontFamily:'inherit' }}><KeyRound size={13} strokeWidth={2} /></button>
                        <button onClick={() => handleBlock(m, !blocked)}
                          title={blocked ? 'رفع الحجب' : 'حجب الوصول'}
                          style={{ background:'none', border:`1px solid ${blocked ? C.success + '44' : C.accent + '44'}`, borderRadius:8, cursor:'pointer', padding:'4px 8px', color: blocked ? C.success : C.accent, fontSize:10, fontWeight:700, fontFamily:'inherit' }}>
                          {blocked ? 'رفع' : 'حجب'}
                        </button>
                        <button onClick={() => { setEditingMember(m.id); setEditPerms(Object.fromEntries(PERM_LABELS.map(([k]) => [k, m[k]]))) }}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', color:C.primary, fontFamily:'inherit' }}><Pencil size={13} strokeWidth={2} /></button>
                        <button onClick={() => removeMember(m.id)}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', color:C.accent, fontFamily:'inherit' }}><Trash2 size={13} strokeWidth={2} /></button>
                      </div>
                    </div>
                    {editingMember === m.id && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:8 }}>
                          {PERM_LABELS.map(([key, label]) => (
                            <label key={key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.text, cursor:'pointer' }}>
                              <input type="checkbox" checked={!!editPerms[key]} onChange={e => setEditPerms(p => ({ ...p, [key]: e.target.checked }))} />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn onClick={async () => { await updateMember(m.id, editPerms); setEditingMember(null) }} full>حفظ</Btn>
                          <Btn onClick={() => setEditingMember(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            }

            {/* ── Reset Password Modal ── */}
            {showResetPass && (
              <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', padding:16 }}
                onClick={e => { if (e.target === e.currentTarget) { setShowResetPass(null); setNewPass(''); setResetPassErr('') } }}>
                <div style={{ width:'100%', maxWidth:360, background:C.surface, borderRadius:20, padding:20, border:`1px solid ${C.borderMid}` }}>
                  <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4, display:'flex', alignItems:'center', gap:7 }}><KeyRound size={15} strokeWidth={2} style={{ color: C.warning }} /> تغيير الباسورد</div>
                  <div style={{ fontSize:11, color:C.textDim, marginBottom:14 }}>{showResetPass.display_name || showResetPass.username}</div>
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                    placeholder="الباسورد الجديد (6 أحرف+)"
                    style={{ width:'100%', padding:'11px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:13, marginBottom:10, boxSizing:'border-box', outline:'none' }} />
                  {resetPassErr && <div style={{ fontSize:11, color:C.accent, marginBottom:8 }}>⚠ {resetPassErr}</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn onClick={async () => {
                      if (newPass.length < 6) return setResetPassErr('6 أحرف على الأقل')
                      setResetPassSaving(true); setResetPassErr('')
                      try { await resetMemberPassword(showResetPass.id, newPass); setShowResetPass(null) }
                      catch(e) { setResetPassErr(e.message) }
                      finally { setResetPassSaving(false) }
                    }} full disabled={resetPassSaving}>{resetPassSaving ? '...' : 'حفظ'}</Btn>
                    <Btn onClick={() => { setShowResetPass(null); setNewPass(''); setResetPassErr('') }} variant="outline" color={C.textDim} full>إلغاء</Btn>
                  </div>
                </div>
              </div>
            )}

            {/* ── تأكيد الحجب ── */}
            {confirmBlock && (
              <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', padding:24 }}>
                <div style={{ background:C.surface, borderRadius:20, padding:24, maxWidth:320, width:'100%', border:`1px solid ${C.borderMid}` }}>
                  <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>{confirmBlock.blocked ? '🚫' : '✅'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text, textAlign:'center', marginBottom:8 }}>
                    {confirmBlock.blocked ? 'حجب الوصول' : 'رفع الحجب'}
                  </div>
                  <div style={{ fontSize:12, color:C.textDim, textAlign:'center', marginBottom:20 }}>
                    {confirmBlock.blocked
                      ? `سيُمنع ${confirmBlock.email} من الدخول فوراً`
                      : `سيستعيد ${confirmBlock.email} صلاحياته`
                    }
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn onClick={confirmDoBlock} full style={{ background: confirmBlock.blocked ? GRAD.danger : GRAD.success }}>تأكيد</Btn>
                    <Btn onClick={() => setConfirmBlock(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ── التصدير (المالك فقط) ── */}
      {permissions?.isOwner && (
        <>
          <SectionLabel color={C.primary}>تصدير البيانات</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            <button onClick={() => exportFullReportToExcel({ projects, employees, workDays, expenses, payments, clientReceipts: clientReceipts || [] })}
              style={{ padding:'13px 16px', borderRadius:14, border:'none', background:GRAD.success, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 16px ${C.success}44` }}>
              تصدير تقرير Excel كامل
            </button>
            <button onClick={() => exportTaxSummary({ year: new Date().getFullYear(), clientReceipts: clientReceipts || [], expenses, projects })}
              style={{ padding:'13px 16px', borderRadius:14, border:'none', background:GRAD.purple, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 16px ${C.purple}44` }}>
              تصدير ملخص ضريبي للمحاسب
            </button>
            <button onClick={exportData}
              style={{ padding:'13px 16px', borderRadius:14, border:`1.5px solid ${C.blue}44`, background:`${C.blue}15`, color:C.blue, fontSize:13, fontWeight:800, cursor:'pointer' }}>
              نسخة احتياطية (JSON)
            </button>
          </div>
        </>
      )}

      <ConfirmDialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} onConfirm={signOut} message="متأكد بدك تسجّل خروج؟" />
    </div>
  )
}
