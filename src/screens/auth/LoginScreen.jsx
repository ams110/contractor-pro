import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { HardHat, Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2, Building2, Users, Wallet, TrendingUp, Fingerprint, KeyRound, Delete, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { C, GRAD } from '../../constants/index.js'
import { useAppStore } from '../../store/useAppStore.js'
import { teamMemberSignIn as _teamSignIn } from '../../hooks/useTeam.js'
import { useAuth } from '../../hooks/useAuth.js'

const PASSKEY_KEY  = 'cpro_passkey_cred'
const PIN_HASH_KEY = 'cpro_pin_hash'

const LANGS = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'עברית',   dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
]

const FEATURES = [
  { icon: Building2, label_ar: 'إدارة المشاريع',    label_he: 'ניהול פרויקטים', label_en: 'Project Management', color: C.primary },
  { icon: Users,     label_ar: 'إدارة العمال',       label_he: 'ניהול עובדים',   label_en: 'Worker Management',  color: C.secondary },
  { icon: Wallet,    label_ar: 'محاسبة متكاملة',     label_he: 'הנהלת חשבונות', label_en: 'Full Accounting',     color: C.gold },
  { icon: TrendingUp,label_ar: 'تقارير وتحليلات',   label_he: 'דוחות ואנליטיקה', label_en: 'Reports & Analytics', color: C.cyan },
]

export default function LoginScreen({ teamMemberSignIn }) {
  const { t } = useTranslation()
  const { language, setLanguage } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const { signInWithPasskey, signInWithPin, hasPasskeyRegistered } = useAuth()

  const [mode, setMode] = useState('owner') // 'owner' | 'team'
  // ownerEntry: 'quick' (passkey/pin) | 'password' (email+pass form)
  const [ownerEntry, setOwnerEntry] = useState('quick')
  // quickMode: 'passkey' | 'pin'
  const [quickMode, setQuickMode] = useState('passkey')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [teamPass, setTeamPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)

  // PIN pad state
  const [pin, setPin] = useState('')
  const [pinPhase, setPinPhase] = useState('idle') // idle | checking | success | error

  const hasPasskey = hasPasskeyRegistered()
  const hasPin     = !!localStorage.getItem(PIN_HASH_KEY)
  const hasQuick   = hasPasskey || hasPin

  useEffect(() => {
    if (hasPasskey) { setOwnerEntry('quick'); setQuickMode('passkey') }
    else if (hasPin) { setOwnerEntry('quick'); setQuickMode('pin') }
    else setOwnerEntry('password')
  }, [])

  // ── Passkey login ──────────────────────────────────────────────────────────
  async function handlePasskeyLogin() {
    setLoading(true); setError('')
    try {
      await signInWithPasskey()
    } catch (e) {
      if (e.name === 'SessionExpiredError' || e.message?.includes('SESSION_EXPIRED')) {
        setError(language === 'en' ? 'Session expired — please sign in with password once.' : language === 'he' ? 'הפעלה פגה — היכנס עם סיסמה פעם אחת.' : 'انتهت الجلسة — سجّل الدخول بالباسورد مرة واحدة.')
        setOwnerEntry('password')
      } else if (e.name !== 'NotAllowedError') {
        setError(e.message || 'فشل التحقق بالبصمة')
      }
    }
    setLoading(false)
  }

  // ── PIN login ──────────────────────────────────────────────────────────────
  function handlePinKey(val) {
    if (pin.length >= 6 || pinPhase === 'checking' || pinPhase === 'success') return
    const next = pin + val
    setPin(next); setError('')
    if (next.length >= 4) attemptPinLogin(next)
  }

  async function attemptPinLogin(candidate) {
    setPinPhase('checking')
    try {
      await signInWithPin(candidate)
      setPinPhase('success')
    } catch (e) {
      if (e.message?.includes('SESSION_EXPIRED')) {
        setError(language === 'en' ? 'Session expired — please sign in with password once.' : 'انتهت الجلسة — سجّل الدخول بالباسورد مرة واحدة.')
        setOwnerEntry('password')
      } else {
        setPinPhase('error')
        setTimeout(() => { setPin(''); setPinPhase('idle') }, 700)
      }
    }
  }

  function featureLabel(f) {
    if (language === 'he') return f.label_he
    if (language === 'en') return f.label_en
    return f.label_ar
  }

  async function handleOwnerLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message || t('auth.wrongCredentials'))
    setLoading(false)
  }

  async function handleTeamLogin(e) {
    e.preventDefault()
    if (!teamCode || !teamPass) return
    setLoading(true); setError('')
    try {
      await _teamSignIn(teamCode, teamPass)
    } catch (err) {
      setError(err.message || t('auth.wrongCredentials'))
    }
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setResetSent(true); setLoading(false); setShowReset(false)
  }

  return (
    <div dir={dir} style={{ minHeight: '100dvh', background: C.bg, display: 'flex', overflow: 'hidden' }}>

      {/* ── Left/Right panel — branding (desktop only) ── */}
      <div style={{ display: 'none', flex: 1, background: `linear-gradient(135deg, ${C.bg} 0%, #0D0F1C 50%, #12152A 100%)`, borderInlineEnd: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}
        className="desktop-brand-panel">
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -120, insetInlineStart: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -80, insetInlineEnd: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

        {/* Aurora background */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(249,115,22,0.09) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.07) 0%, transparent 60%)' }} />

        {/* Language switcher */}
        <div style={{ position: 'absolute', top: 20, insetInlineEnd: 20, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '4px' }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => setLanguage(l.code)}
              style={{ padding: '5px 10px', borderRadius: 8, background: language === l.code ? GRAD.primary : 'transparent', border: 'none', color: language === l.code ? '#fff' : C.textDim, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              {l.code === 'ar' ? 'ع' : l.code === 'he' ? 'ע' : 'EN'}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 80, height: 80, borderRadius: 26, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 20px 60px rgba(249,115,22,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset' }}
            >
              <HardHat size={40} color="#fff" strokeWidth={1.5} />
            </motion.div>
            <div style={{ fontSize: 28, fontWeight: 900, background: GRAD.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Contractor Pro
            </div>
            <div style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>
              {language === 'he' ? 'נהל את הפרויקטים שלך בחוכמה' : language === 'en' ? 'Manage your projects smartly' : 'إدارة مشاريعك بذكاء'}
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: C.surface, borderRadius: 16, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
            {[
              { id: 'owner', label: language === 'he' ? 'בעל חשבון' : language === 'en' ? 'Owner' : 'صاحب الحساب' },
              { id: 'team',  label: language === 'he' ? 'חבר צוות' : language === 'en' ? 'Team Member' : 'عضو فريق' },
            ].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setError('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: mode === m.id ? GRAD.primary : 'transparent', color: mode === m.id ? '#fff' : C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: C.surface, borderRadius: 24, border: `1px solid ${C.border}`, padding: '24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            {mode === 'owner' ? (
              <>
                {/* ── Quick login (passkey / PIN) ── */}
                {ownerEntry === 'quick' && (
                  <div>
                    {/* Passkey/PIN tabs (only if both exist) */}
                    {hasPasskey && hasPin && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: C.card, borderRadius: 14, padding: 4, border: `1px solid ${C.border}` }}>
                        {[
                          { id: 'passkey', label: language === 'en' ? 'Fingerprint' : language === 'he' ? 'טביעת אצבע' : 'بصمة', icon: Fingerprint },
                          { id: 'pin',     label: 'PIN', icon: KeyRound },
                        ].map(({ id, label, icon: Icon }) => (
                          <button key={id} onClick={() => { setQuickMode(id); setPin(''); setPinPhase('idle'); setError('') }}
                            style={{ flex: 1, padding: '9px 8px', borderRadius: 10, border: 'none', background: quickMode === id ? GRAD.primary : 'transparent', color: quickMode === id ? '#fff' : C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <Icon size={13} /> {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Fingerprint ── */}
                    {quickMode === 'passkey' && (
                      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={handlePasskeyLogin}
                          disabled={loading}
                          style={{ width: 88, height: 88, borderRadius: '50%', background: loading ? `${C.primary}22` : `${C.primary}18`, border: `2px solid ${C.primary}44`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: `0 0 0 0 ${C.primary}44` }}
                          animate={loading ? { boxShadow: [`0 0 0 0 ${C.primary}44`, `0 0 0 18px ${C.primary}00`] } : {}}
                          transition={loading ? { repeat: Infinity, duration: 1.1 } : {}}
                        >
                          <Fingerprint size={40} color={C.primary} strokeWidth={1.5} />
                        </motion.button>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                          {language === 'en' ? 'Touch to sign in' : language === 'he' ? 'גע להיכנס' : 'المس للدخول'}
                        </div>
                        <div style={{ fontSize: 11, color: C.textDim }}>
                          {language === 'en' ? 'Use Face ID or Touch ID' : language === 'he' ? 'השתמש ב-Face ID או Touch ID' : 'استخدم Face ID أو بصمة الإصبع'}
                        </div>
                        {error && (
                          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#FCA5A5' }}>
                            {error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── PIN pad ── */}
                    {quickMode === 'pin' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 16 }}>
                          {language === 'en' ? 'Enter PIN' : language === 'he' ? 'הזן PIN' : 'أدخل رمز PIN'}
                        </div>
                        {/* Dots */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                          {[0,1,2,3,4,5].slice(0, Math.max(4, pin.length + (pinPhase === 'idle' ? 1 : 0))).map((_, i) => (
                            <motion.div key={i}
                              animate={pinPhase === 'error' ? { x: [-4,4,-4,4,0] } : {}}
                              transition={{ duration: 0.3 }}
                              style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? (pinPhase === 'error' ? C.accent : pinPhase === 'success' ? C.success : C.primary) : 'rgba(255,255,255,0.12)', border: `2px solid ${i < pin.length ? 'transparent' : 'rgba(255,255,255,0.2)'}`, transition: 'background .15s' }} />
                          ))}
                        </div>
                        {/* Keypad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 240, margin: '0 auto' }}>
                          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                            <button key={i} onClick={() => k === '⌫' ? setPin(p => p.slice(0,-1)) : k && handlePinKey(k)}
                              disabled={!k || pinPhase === 'checking' || pinPhase === 'success'}
                              style={{ padding: '14px 0', borderRadius: 14, background: k ? 'rgba(255,255,255,0.06)' : 'transparent', border: k ? `1px solid ${C.border}` : 'none', color: C.text, fontSize: k === '⌫' ? 16 : 20, fontWeight: 700, cursor: k ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {k === '⌫' ? <Delete size={18} color={C.textDim} /> : k}
                            </button>
                          ))}
                        </div>
                        {error && (
                          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#FCA5A5' }}>
                            {error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Use password link */}
                    <button type="button" onClick={() => { setOwnerEntry('password'); setError('') }}
                      style={{ marginTop: 18, width: '100%', background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Lock size={11} />
                      {language === 'en' ? 'Sign in with password' : language === 'he' ? 'כניסה עם סיסמה' : 'الدخول بكلمة المرور'}
                    </button>
                  </div>
                )}

                {/* ── Password form ── */}
                {ownerEntry === 'password' && (
                  <form onSubmit={handleOwnerLogin}>
                    {/* Email */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>
                        {language === 'he' ? 'אימייל' : language === 'en' ? 'Email' : 'البريد الإلكتروني'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={15} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder={language === 'en' ? 'your@email.com' : 'example@email.com'}
                          style={{ width: '100%', padding: '11px 13px 11px 38px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>
                        {language === 'he' ? 'סיסמה' : language === 'en' ? 'Password' : 'كلمة المرور'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          style={{ width: '100%', padding: '11px 40px 11px 38px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr' }}
                          required
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex', alignItems: 'center' }}>
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#FCA5A5', marginBottom: 14 }}>
                          {error}
                        </motion.div>
                      )}
                      {resetSent && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#86EFAC', marginBottom: 14 }}>
                          {language === 'en' ? 'Reset link sent! Check your email.' : language === 'he' ? 'קישור אופס נשלח! בדוק את האימייל.' : 'تم إرسال رابط الاسترداد — تحقق من بريدك.'}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      style={{ width: '100%', padding: '13px', borderRadius: 14, background: loading ? 'rgba(249,115,22,0.4)' : GRAD.primary, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(249,115,22,0.35)' }}
                    >
                      {loading ? <Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} /> : null}
                      {language === 'he' ? 'כניסה' : language === 'en' ? 'Sign In' : 'تسجيل الدخول'}
                    </motion.button>

                    {/* Forgot password */}
                    <button type="button" onClick={() => setShowReset(true)}
                      style={{ marginTop: 8, width: '100%', background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                      {language === 'he' ? 'שכחת סיסמה?' : language === 'en' ? 'Forgot password?' : 'نسيت كلمة المرور؟'}
                    </button>

                    {/* Back to quick login */}
                    {hasQuick && (
                      <button type="button" onClick={() => { setOwnerEntry('quick'); setError('') }}
                        style={{ marginTop: 6, width: '100%', background: 'none', border: 'none', color: C.primary, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 700 }}>
                        <Fingerprint size={12} />
                        {language === 'en' ? 'Use biometrics instead' : language === 'he' ? 'השתמש בביומטריה' : 'الدخول بالبصمة'}
                      </button>
                    )}
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={handleTeamLogin}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>
                    {language === 'he' ? 'קוד עובד' : language === 'en' ? 'Team Code' : 'كود العضو'}
                  </label>
                  <input
                    value={teamCode} onChange={e => setTeamCode(e.target.value)}
                    placeholder={language === 'en' ? 'TEAM-XXXX' : 'TEAM-XXXX'}
                    style={{ width: '100%', padding: '11px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr', letterSpacing: '0.05em' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>
                    {language === 'he' ? 'סיסמה' : language === 'en' ? 'Password' : 'كلمة المرور'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} value={teamPass} onChange={e => setTeamPass(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '11px 40px 11px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr' }}
                      required
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textDim }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#FCA5A5', marginBottom: 14 }}>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
                  style={{ width: '100%', padding: '13px', borderRadius: 14, background: loading ? `${C.secondary}60` : GRAD.premium, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(124,58,237,0.35)' }}>
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} /> : null}
                  {language === 'he' ? 'כניסה' : language === 'en' ? 'Sign In' : 'دخول'}
                </motion.button>
              </form>
            )}
          </div>

          {/* Features strip */}
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f.label_ar} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${f.color}18`, border: `1px solid ${f.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <f.icon size={14} color={f.color} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{featureLabel(f)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Reset Password Modal ── */}
      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowReset(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 380 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                {language === 'en' ? 'Reset Password' : language === 'he' ? 'אפס סיסמה' : 'استرداد كلمة المرور'}
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>
                {language === 'en' ? "Enter your email and we'll send a reset link." : language === 'he' ? 'הזן אימייל ונשלח קישור לאיפוס.' : 'أدخل بريدك ونرسل لك رابط الاسترداد.'}
              </div>
              <form onSubmit={handleReset}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '11px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr', marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setShowReset(false)}
                    style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {language === 'en' ? 'Cancel' : language === 'he' ? 'ביטול' : 'إلغاء'}
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 1, padding: '11px', borderRadius: 12, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {loading ? '...' : (language === 'en' ? 'Send' : language === 'he' ? 'שלח' : 'إرسال')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
