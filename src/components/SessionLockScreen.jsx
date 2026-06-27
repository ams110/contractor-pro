import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Fingerprint, ShieldCheck, AlertCircle, Delete, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAppStore } from '../store/useAppStore.js'
import { runBiometricAuth, verifyPinLocal } from '../hooks/useBiometricConfirm.js'
import { hasPin } from '../lib/pinCrypto.js'
import { tl } from '../lib/labels.js'
import { C } from '../constants/index.js'

const PASSKEY_KEY = 'cpro_passkey_cred'
const GRAD = 'linear-gradient(135deg, #F97316, #DC2626)'

export default function SessionLockScreen() {
  const { isLocked, unlockSession } = useAppStore()
  const language = useAppStore(s => s.language)

  const hasPasskey = !!localStorage.getItem(PASSKEY_KEY)
  const pinSet     = hasPin()
  // وسيلة الفتح الافتراضية: بصمة ← PIN ← كلمة السر (دائماً متاحة كحلّ أخير)
  const initMode   = hasPasskey ? 'fingerprint' : pinSet ? 'pin' : 'password'

  const [mode,   setMode]   = useState(initMode)
  const [phase,  setPhase]  = useState('idle')
  const [pin,    setPin]    = useState('')
  const [pinErr, setPinErr] = useState('')
  const [fpErr,  setFpErr]  = useState('')
  const [pw,     setPw]     = useState('')
  const [pwErr,  setPwErr]  = useState('')

  if (!isLocked) return null

  async function handlePassword(e) {
    e?.preventDefault?.()
    if (!pw || phase === 'scanning') return
    setPhase('scanning'); setPwErr('')
    try {
      const { data } = await supabase.auth.getUser()
      const email = data?.user?.email
      if (!email) throw new Error('no-email')
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error
      setPhase('success')
      setTimeout(() => { unlockSession(); setPhase('idle'); setPw('') }, 600)
    } catch {
      setPhase('idle'); setPwErr(tl(language, 'كلمة السر غير صحيحة', 'הסיסמה שגויה', 'Incorrect password')); setPw('')
    }
  }

  async function handleFingerprint() {
    setPhase('scanning'); setFpErr('')
    try {
      await runBiometricAuth()
      setPhase('success')
      setTimeout(() => { unlockSession(); setPhase('idle') }, 600)
    } catch (e) {
      if (e.name === 'NotAllowedError' && pinSet) { setMode('pin'); setPhase('idle') }
      else { setPhase('idle'); setFpErr(tl(language, 'فشل التحقق — حاول مجدداً', 'האימות נכשל — נסה שוב', 'Verification failed — try again')) }
    }
  }

  function handlePinKey(val) {
    if (pin.length >= 6) return
    const next = pin + val
    setPin(next); setPinErr('')
    if (next.length >= 4) checkPin(next)
  }

  async function checkPin(candidate) {
    try {
      await verifyPinLocal(candidate)
      setPhase('success')
      setTimeout(() => { unlockSession(); setPhase('idle'); setPin('') }, 600)
    } catch (e) {
      if (e.message?.includes('PIN_LOCKED')) {
        // محاولات كثيرة → أُلغي الـ PIN: أنهِ الجلسة لإجبار دخول كامل بالباسورد
        setPinErr(tl(language, 'محاولات كثيرة — سجّل الدخول من جديد', 'יותר מדי ניסיונות — התחבר מחדש', 'Too many attempts — sign in again'))
        setPin('')
        await supabase.auth.signOut().catch(() => {})
        unlockSession()
      } else {
        setPinErr(tl(language, 'PIN غير صحيح', 'קוד PIN שגוי', 'Incorrect PIN')); setPin('')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10200,
        background: C.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        padding: 24,
      }}
    >
      {/* Lock icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ width: 72, height: 72, borderRadius: 22, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        {phase === 'success'
          ? <ShieldCheck size={32} color={C.success} />
          : <Lock size={32} color={C.primary} />
        }
      </motion.div>

      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 6 }}>{tl(language, 'الجلسة مُقفلة', 'הפעלה נעולה', 'Session locked')}</div>
      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 32, textAlign: 'center' }}>
        {phase === 'success' ? tl(language, 'تم التحقق بنجاح', 'האימות הצליח', 'Verified successfully') : tl(language, 'تحقق من هويتك للمتابعة', 'אמת את זהותך כדי להמשיך', 'Verify your identity to continue')}
      </div>

      {/* Mode tabs */}
      {hasPasskey && pinSet && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%', maxWidth: 320 }}>
          {[{ id: 'fingerprint', label: tl(language, 'بصمة', 'טביעת אצבע', 'Fingerprint') }, { id: 'pin', label: 'PIN' }].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setPin(''); setPinErr(''); setFpErr('') }}
              style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: mode === t.id ? `${C.primary}22` : 'rgba(255,255,255,0.05)', color: mode === t.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', outline: mode === t.id ? `1px solid ${C.primary}44` : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Fingerprint mode */}
      {mode === 'fingerprint' && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <motion.button
            onClick={phase === 'scanning' ? undefined : handleFingerprint}
            whileTap={{ scale: 0.96 }}
            style={{ width: '100%', padding: '18px', borderRadius: 18, border: 'none', background: phase === 'success' ? C.success : phase === 'scanning' ? `${C.primary}88` : GRAD, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', boxShadow: `0 4px 20px ${C.primary}44` }}
          >
            {phase === 'scanning'
              ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}><Fingerprint size={20} /></motion.div>
              : <Fingerprint size={20} />
            }
            {phase === 'scanning' ? tl(language, 'جاري التحقق...', 'מאמת...', 'Verifying...') : phase === 'success' ? tl(language, 'تم التحقق', 'אומת', 'Verified') : tl(language, 'التحقق بالبصمة', 'אימות בטביעת אצבע', 'Verify with fingerprint')}
          </motion.button>
          {fpErr && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12, marginTop: 10, justifyContent: 'center' }}><AlertCircle size={13} />{fpErr}</div>}
        </div>
      )}

      {/* PIN mode */}
      {mode === 'pin' && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ width: i < 4 ? 14 : 12, height: i < 4 ? 14 : 12, borderRadius: '50%', background: i < pin.length ? (phase === 'success' ? C.success : C.primary) : 'rgba(255,255,255,0.12)', border: i < pin.length ? 'none' : '1.5px solid rgba(255,255,255,0.18)', transition: 'background 0.15s' }} />
            ))}
          </div>
          {pinErr && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12, marginBottom: 10, justifyContent: 'center' }}><AlertCircle size={13} />{pinErr}</div>}
          {!phase.includes('success') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                k === '' ? <div key={i} /> :
                k === '⌫' ? (
                  <button key={i} onClick={() => { setPin(p => p.slice(0, -1)); setPinErr('') }}
                    style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Delete size={18} color={C.textDim} />
                  </button>
                ) : (
                  <button key={i} onClick={() => handlePinKey(k)}
                    style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text, fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {k}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password mode — يعمل دائماً (لا يعتمد على تخزين محلي) */}
      {mode === 'password' && (
        <form onSubmit={handlePassword} style={{ width: '100%', maxWidth: 320 }}>
          <input
            type="password" value={pw} autoFocus
            onChange={e => { setPw(e.target.value); setPwErr('') }}
            placeholder={tl(language, 'كلمة سر حسابك', 'סיסמת החשבון שלך', 'Your account password')}
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14, background: C.card, border: `1px solid ${pwErr ? C.accent : C.border}`, color: C.text, fontSize: 15, fontFamily: 'inherit', outline: 'none', textAlign: 'center', marginBottom: 12 }}
          />
          {pwErr && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12, marginBottom: 10, justifyContent: 'center' }}><AlertCircle size={13} />{pwErr}</div>}
          <button type="submit" disabled={!pw || phase === 'scanning'}
            style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: phase === 'success' ? C.success : GRAD, color: '#fff', fontSize: 14, fontWeight: 800, cursor: pw ? 'pointer' : 'default', opacity: pw ? 1 : 0.6, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 20px ${C.primary}44` }}>
            {phase === 'scanning' ? tl(language, 'جاري التحقق...', 'מאמת...', 'Verifying...') : phase === 'success' ? tl(language, 'تم التحقق', 'אומת', 'Verified') : <><KeyRound size={18} /> {tl(language, 'فتح القفل', 'בטל נעילה', 'Unlock')}</>}
          </button>
        </form>
      )}

      {/* تبديل وسيلة الفتح */}
      {mode !== 'password' ? (
        <button
          onClick={() => { setMode('password'); setPin(''); setPinErr(''); setFpErr('') }}
          style={{ marginTop: 24, background: 'none', border: 'none', color: C.primary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {tl(language, 'فتح بكلمة السر', 'פתח עם סיסמה', 'Unlock with password')}
        </button>
      ) : (hasPasskey || pinSet) && (
        <button
          onClick={() => { setMode(hasPasskey ? 'fingerprint' : 'pin'); setPw(''); setPwErr('') }}
          style={{ marginTop: 24, background: 'none', border: 'none', color: C.primary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {hasPasskey ? tl(language, 'فتح بالبصمة', 'פתח עם טביעת אצבע', 'Unlock with fingerprint') : tl(language, 'فتح بالـ PIN', 'פתח עם קוד PIN', 'Unlock with PIN')}
        </button>
      )}

      <button
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 16, background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {tl(language, 'تسجيل الخروج', 'יציאה', 'Sign out')}
      </button>
    </motion.div>
  )
}
