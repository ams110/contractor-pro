import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore.js'
import { SUPABASE_URL } from '../lib/supabase.js'
import { C } from '../constants/index.js'

/*
 * ConnectionStatus — مؤشّر حالة الاتصال والمزامنة (خرافي ✦)
 *
 * آلة حالات بصرية متحرّكة بدل البانر الثابت القديم:
 *   idle         → مخفي (متصل وكل شيء متزامن)
 *   offline      → بانر أحمر نابض: لا اتصال، البيانات محلية + عدّاد مدة الانقطاع
 *   reconnecting → بانر سماوي: عاد الاتصال، نتحقّق فعلياً من Supabase ونزامن
 *   synced       → ومضة خضراء: تمت المزامنة (تختفي تلقائياً بعد ~2.4ث)
 *
 * نتحقّق من الاتصال الحقيقي بـ ping خفيف لـ /auth/v1/health لأنّ
 * navigator.onLine يكذب أحياناً (شبكة موجودة بلا إنترنت فعلي).
 */

const PING_TIMEOUT = 6000

async function verifyReachable() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT)
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(t)
    return true            // أي ردّ (حتى خطأ HTTP) يعني الخادم وصلناه
  } catch {
    return false           // خطأ شبكة/مهلة = ما زلنا فعلياً غير متصلين
  }
}

function useElapsed(since) {
  const { t } = useTranslation()
  const [, force] = useState(0)
  useEffect(() => {
    if (!since) return
    const id = setInterval(() => force(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [since])
  if (!since) return ''
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000))
  if (s < 60)   return t('common.secondsShort', { count: s, defaultValue: `${s}s` })
  const m = Math.floor(s / 60)
  if (m < 60)   return t('common.minutesShort', { count: m, defaultValue: `${m}m` })
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export default function ConnectionStatus() {
  const { t } = useTranslation()
  const isOnline = useAppStore(s => s.isOnline)

  // idle | offline | reconnecting | synced
  const [phase, setPhase] = useState(isOnline ? 'idle' : 'offline')
  const [offlineSince, setOfflineSince] = useState(isOnline ? null : Date.now())
  const wasOffline = useRef(!isOnline)
  const syncTimer  = useRef(null)
  const elapsed    = useElapsed(phase === 'offline' ? offlineSince : null)

  useEffect(() => {
    if (!isOnline) {
      // انقطع الاتصال
      clearTimeout(syncTimer.current)
      wasOffline.current = true
      setOfflineSince(prev => prev || Date.now())
      setPhase('offline')
      return
    }

    // عاد الاتصال (أو هو متصل أصلاً عند الإقلاع)
    if (!wasOffline.current) { setPhase('idle'); return }

    let cancelled = false
    setPhase('reconnecting')
    ;(async () => {
      const ok = await verifyReachable()
      if (cancelled) return
      if (!ok) {
        // كذبة navigator.onLine — ما زلنا غير متصلين فعلياً
        setPhase('offline')
        return
      }
      // الـ realtime channels تعيد الاشتراك وتجلب البيانات تلقائياً
      wasOffline.current = false
      setOfflineSince(null)
      setPhase('synced')
      syncTimer.current = setTimeout(() => setPhase('idle'), 2400)
    })()

    return () => { cancelled = true }
  }, [isOnline])

  useEffect(() => () => clearTimeout(syncTimer.current), [])

  const cfg = {
    offline: {
      Icon: WifiOff,
      tone: C.accent,
      spin: false,
      pulse: true,
      label: t('offline.message'),
      sub: elapsed ? t('offline.offlineFor', { time: elapsed }) : '',
    },
    reconnecting: {
      Icon: RefreshCw,
      tone: C.cyan,
      spin: true,
      pulse: false,
      label: t('offline.reconnecting'),
      sub: '',
    },
    synced: {
      Icon: CheckCircle2,
      tone: C.success,
      spin: false,
      pulse: false,
      label: t('offline.synced'),
      sub: '',
    },
  }[phase]

  return (
    <AnimatePresence>
      {phase !== 'idle' && cfg && (
        <motion.div
          key={phase}
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -44, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          style={{
            position: 'sticky', top: 0, zIndex: 200,
            background: 'rgba(7,8,15,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            borderBottom: `1px solid ${cfg.tone}33`,
            boxShadow: `0 1px 22px ${cfg.tone}1f`,
          }}
        >
          {/* شريط ضوئي يمشي للحالة reconnecting */}
          {phase === 'reconnecting' && (
            <motion.div
              aria-hidden
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(90deg, transparent, ${cfg.tone}22, transparent)`,
                pointerEvents: 'none',
              }}
            />
          )}

          <motion.span
            aria-hidden
            animate={
              cfg.spin  ? { rotate: 360 } :
              cfg.pulse ? { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] } :
              { scale: [0.6, 1.15, 1] }
            }
            transition={
              cfg.spin  ? { duration: 0.9, repeat: Infinity, ease: 'linear' } :
              cfg.pulse ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } :
              { duration: 0.4, ease: 'backOut' }
            }
            style={{ display: 'inline-flex', lineHeight: 0 }}
          >
            <cfg.Icon size={14} color={cfg.tone} strokeWidth={2.4} />
          </motion.span>

          <span style={{ fontSize: 11.5, color: C.text, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {cfg.label}
          </span>
          {cfg.sub && (
            <span style={{ fontSize: 10.5, color: C.textDim, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              · {cfg.sub}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
