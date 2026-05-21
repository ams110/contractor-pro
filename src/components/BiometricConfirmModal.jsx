import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, X, ShieldCheck, AlertCircle, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { runBiometricAuth } from '../hooks/useBiometricConfirm.js'
import { C } from '../constants/index.js'

const ACTION_LABELS = {
  projects:     'حذف مشروع',
  employees:    'حذف عامل',
  payments:     'حذف دفعة',
  advances:     'حذف سلفة',
  expenses:     'حذف مصروف',
  receipts:     'حذف قبضة',
  confirm:      'تأكيد عملية',
}

export default function BiometricConfirmModal() {
  const {
    bioPending, resolveBioConfirm, rejectBioConfirm,
    signerName, signerRole,
  } = useAppStore()

  const [phase, setPhase] = useState('idle') // idle | scanning | success | error
  const [errMsg, setErrMsg] = useState('')

  // Reset phase when modal closes
  if (!bioPending && phase !== 'idle') setTimeout(() => setPhase('idle'), 300)
  if (!bioPending) return null

  const actionLabel = ACTION_LABELS[bioPending.tbl] || 'تأكيد عملية'

  async function handleFingerprint() {
    setPhase('scanning')
    setErrMsg('')
    try {
      await runBiometricAuth()
      setPhase('success')
      setTimeout(() => {
        resolveBioConfirm()
        setPhase('idle')
      }, 800)
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.message === 'NO_PASSKEY') {
        setPhase('idle')
        if (e.message === 'NO_PASSKEY') rejectBioConfirm()
      } else {
        setPhase('error')
        setErrMsg(e.message || 'فشل التحقق، حاول مرة أخرى')
        setTimeout(() => setPhase('idle'), 2500)
      }
    }
  }

  const isScanning = phase === 'scanning'
  const isSuccess  = phase === 'success'
  const isError    = phase === 'error'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 950,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={e => e.target === e.currentTarget && rejectBioConfirm()}
      >
        <motion.div
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{actionLabel}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 3, maxWidth: 280, lineHeight: 1.4 }}>
                  {bioPending.description}
                </div>
              </div>
              <button
                onClick={rejectBioConfirm}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={14} color={C.textDim} />
              </button>
            </div>

            {/* Signer chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: `${C.primary}10`, border: `1px solid ${C.primary}25`,
              borderRadius: 14, padding: '10px 14px', marginBottom: 20,
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

            {/* Fingerprint button */}
            <motion.button
              onClick={isScanning || isSuccess ? undefined : handleFingerprint}
              whileTap={isScanning || isSuccess ? {} : { scale: 0.96 }}
              style={{
                width: '100%', padding: '18px',
                borderRadius: 18, border: 'none',
                background: isSuccess
                  ? C.success
                  : isError
                  ? C.accent
                  : isScanning
                  ? `${C.primary}88`
                  : GRAD_STYLE,
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

            {/* Error message */}
            <AnimatePresence>
              {isError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12 }}
                >
                  <AlertCircle size={13} />
                  {errMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cancel */}
            {!isSuccess && (
              <button
                onClick={rejectBioConfirm}
                style={{ width: '100%', marginTop: 12, padding: '11px', background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                إلغاء
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const GRAD_STYLE = 'linear-gradient(135deg, #F97316, #DC2626)'
