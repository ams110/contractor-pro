import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, X, ShieldCheck, AlertCircle, User, Lock, Delete } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { runBiometricAuth, verifyPinLocal } from '../hooks/useBiometricConfirm.js'
import { hasPin } from '../lib/pinCrypto.js'
import { C } from '../constants/index.js'

const PASSKEY_KEY = 'cpro_passkey_cred'

const ACTION_LABELS = {
  projects:  'تأكيد عملية مشروع',
  employees: 'تأكيد عملية عامل',
  payments:  'تأكيد دفعة',
  advances:  'تأكيد سلفة',
  expenses:  'تأكيد مصروف',
  receipts:  'تأكيد قبضة',
  confirm:   'تأكيد عملية',
}

const GRAD = 'linear-gradient(135deg, #F97316, #DC2626)'

function getInitialMode() {
  if (localStorage.getItem(PASSKEY_KEY)) return 'fingerprint'
  if (hasPin()) return 'pin'
  return 'none'
}

export default function BiometricConfirmModal() {
  const { bioPending, resolveBioConfirm, rejectBioConfirm, signerName, signerRole } = useAppStore()

  const [mode,   setMode]   = useState('fingerprint')
  const [phase,  setPhase]  = useState('idle')
  const [errMsg, setErrMsg] = useState('')
  const [pin,    setPin]    = useState('')
  const [pinErr, setPinErr] = useState('')

  // Reset state each time the modal opens
  useEffect(() => {
    if (bioPending) {
      setMode(getInitialMode())
      setPhase('idle')
      setPin('')
      setPinErr('')
      setErrMsg('')
    }
  }, [bioPending])

  if (!bioPending) return null

  const hasPasskey = !!localStorage.getItem(PASSKEY_KEY)
  const pinSet     = hasPin()

  const actionLabel = ACTION_LABELS[bioPending.tbl] || 'تأكيد عملية'

  // ─── Fingerprint ────────────────────────────────────────────────────────────
  async function handleFingerprint() {
    setPhase('scanning')
    setErrMsg('')
    try {
      await runBiometricAuth()
      setPhase('success')
      setTimeout(() => {
        resolveBioConfirm()
        setPhase('idle')
      }, 700)
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        // user cancelled the system dialog — switch to PIN if available
        if (pinSet) {
          setMode('pin')
          setPhase('idle')
        } else {
          setPhase('error')
          setErrMsg('تم إلغاء البصمة')
        }
      } else {
        setPhase('error')
        setErrMsg(e.message === 'NO_PASSKEY' ? 'لا توجد بصمة مسجّلة' : 'فشل التحقق بالبصمة')
      }
    }
  }

  // ─── PIN ────────────────────────────────────────────────────────────────────
  function handlePinKey(val) {
    if (pin.length >= 6) return
    const next = pin + val
    setPin(next)
    setPinErr('')
    if (next.length >= 4) verifyPin(next)
  }

  function handlePinDelete() {
    setPin(p => p.slice(0, -1))
    setPinErr('')
  }

  async function verifyPin(candidate) {
    try {
      await verifyPinLocal(candidate)
      setPhase('success')
      setTimeout(() => {
        resolveBioConfirm()
        setPhase('idle')
        setPin('')
      }, 700)
    } catch (e) {
      if (e.message === 'PIN_LOCKED') {
        setPinErr('محاولات كثيرة — أُلغي الـ PIN، استعمل البصمة أو سجّل الدخول من جديد')
        setPin('')
      } else if (e.message === 'WRONG_PIN') {
        setPinErr('رقم PIN غير صحيح')
        setPin('')
      }
      // if length < 4 just keep waiting
    }
  }

  function handleCancel() {
    rejectBioConfirm()
    setPhase('idle')
    setPin('')
    setPinErr('')
    setErrMsg('')
  }

  const isScanning = phase === 'scanning'
  const isSuccess  = phase === 'success'
  const isError    = phase === 'error'

  return (
    <AnimatePresence>
      <motion.div
        key="bio-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.82)',
          zIndex: 10100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={e => e.target === e.currentTarget && handleCancel()}
      >
        <motion.div
          key="bio-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{
            background: C.surface,
            borderRadius: '24px 24px 0 0',
            padding: '0 0 calc(32px + env(safe-area-inset-bottom, 0px))',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          <div style={{ padding: '4px 20px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{actionLabel}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 3, maxWidth: 280, lineHeight: 1.4 }}>
                  {bioPending.description}
                </div>
              </div>
              <button
                onClick={handleCancel}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={14} color={C.textDim} />
              </button>
            </div>

            {/* Signer chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: `${C.primary}10`, border: `1px solid ${C.primary}25`,
              borderRadius: 14, padding: '10px 14px', marginBottom: 18,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `${C.primary}20`, border: `1px solid ${C.primary}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <User size={16} color={C.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.textDim }}>سيُوقَّع باسم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 1 }}>
                  {signerName || 'المستخدم الحالي'}
                </div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                color: signerRole === 'owner' ? C.primary : C.secondary,
                background: signerRole === 'owner' ? `${C.primary}18` : `${C.secondary}18`,
                border: `1px solid ${signerRole === 'owner' ? C.primary : C.secondary}30`,
                borderRadius: 6, padding: '3px 8px',
              }}>
                {signerRole === 'owner' ? 'مالك' : 'عضو'}
              </span>
            </div>

            {/* Mode tabs — only if both methods available */}
            {hasPasskey && pinSet && mode !== 'none' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'fingerprint', label: 'بصمة', icon: <Fingerprint size={13} /> },
                  { id: 'pin',         label: 'PIN',   icon: <Lock size={13} /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setMode(tab.id); setPhase('idle'); setPin(''); setPinErr(''); setErrMsg('') }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: 'none',
                      background: mode === tab.id ? `${C.primary}22` : 'rgba(255,255,255,0.04)',
                      color: mode === tab.id ? C.primary : C.textDim,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      outline: mode === tab.id ? `1px solid ${C.primary}44` : 'none',
                    }}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── FINGERPRINT mode ── */}
            {mode === 'fingerprint' && (
              <>
                <motion.button
                  onClick={isScanning || isSuccess ? undefined : handleFingerprint}
                  whileTap={isScanning || isSuccess ? {} : { scale: 0.96 }}
                  style={{
                    width: '100%', padding: '18px',
                    borderRadius: 18, border: 'none',
                    background: isSuccess ? C.success : isError ? C.accent : isScanning ? `${C.primary}88` : GRAD,
                    color: '#fff',
                    fontSize: 14, fontWeight: 800,
                    cursor: isScanning || isSuccess ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.25s',
                    fontFamily: 'inherit',
                    boxShadow: isSuccess ? `0 4px 20px ${C.success}55` : isScanning ? 'none' : `0 4px 20px ${C.primary}44`,
                  }}
                >
                  {isSuccess ? (
                    <><ShieldCheck size={20} />تم التوقيع بنجاح</>
                  ) : isScanning ? (
                    <>
                      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>
                        <Fingerprint size={20} />
                      </motion.div>
                      جاري التحقق...
                    </>
                  ) : (
                    <><Fingerprint size={20} />وقّع بالبصمة</>
                  )}
                </motion.button>

                <AnimatePresence>
                  {isError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ marginTop: 10 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12, marginBottom: 8 }}>
                        <AlertCircle size={13} />{errMsg}
                      </div>
                      {pinSet && (
                        <button
                          onClick={() => { setMode('pin'); setPhase('idle'); setErrMsg('') }}
                          style={{ width: '100%', padding: '10px', borderRadius: 12, background: `${C.primary}12`, border: `1px solid ${C.primary}30`, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          استخدم رقم PIN بدلاً
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isSuccess && !isError && (
                  <button onClick={handleCancel} style={{ width: '100%', marginTop: 12, padding: '11px', background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    إلغاء العملية
                  </button>
                )}
              </>
            )}

            {/* ── PIN mode ── */}
            {mode === 'pin' && (
              <>
                {/* PIN dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{
                      width: i < 4 ? 14 : 12,
                      height: i < 4 ? 14 : 12,
                      borderRadius: '50%',
                      background: i < pin.length
                        ? (isSuccess ? C.success : C.primary)
                        : 'rgba(255,255,255,0.12)',
                      border: i < pin.length ? 'none' : `1.5px solid rgba(255,255,255,0.18)`,
                      transition: 'background 0.15s',
                    }} />
                  ))}
                </div>

                {pinErr && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.accent, fontSize: 12, marginBottom: 10 }}>
                    <AlertCircle size={13} />{pinErr}
                  </div>
                )}

                {isSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.success, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                    <ShieldCheck size={18} />تم التوقيع بنجاح
                  </div>
                )}

                {/* Numpad */}
                {!isSuccess && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                    {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                      k === '' ? (
                        <div key={i} />
                      ) : k === '⌫' ? (
                        <button
                          key={i}
                          onClick={handlePinDelete}
                          style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Delete size={18} color={C.textDim} />
                        </button>
                      ) : (
                        <button
                          key={i}
                          onClick={() => handlePinKey(k)}
                          style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text, fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {k}
                        </button>
                      )
                    ))}
                  </div>
                )}

                <button onClick={handleCancel} style={{ width: '100%', padding: '11px', background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  إلغاء العملية
                </button>
              </>
            )}

            {/* ── NO METHOD mode ── */}
            {mode === 'none' && (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <AlertCircle size={26} color={C.accent} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                    لا توجد وسيلة تحقق
                  </div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
                    يجب تفعيل البصمة أو رقم PIN من الإعدادات لتتمكن من تنفيذ العمليات الحساسة
                  </div>
                </div>
                <button onClick={handleCancel} style={{ width: '100%', marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 14, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  إغلاق
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
