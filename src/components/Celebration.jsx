import { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Coins, Trophy, BadgeCheck } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { celebrationConfig } from '../lib/celebrations.js'
import { C, GRAD } from '../constants/index.js'

const ICONS = { party: PartyPopper, coins: Coins, trophy: Trophy, check: BadgeCheck }

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

// توليد جسيمات الانفجار مرّة واحدة لكل احتفال (تنفجر من المركز لكل الاتّجاهات ثم تسقط بالجاذبيّة).
function makeParticles(cfg, reduced) {
  const n = reduced ? Math.min(12, Math.round(cfg.count / 5)) : cfg.count
  const out = []
  for (let i = 0; i < n; i++) {
    const ang  = Math.random() * Math.PI * 2
    const dist = 80 + Math.random() * 240
    const dx   = Math.cos(ang) * dist
    const dy   = Math.sin(ang) * dist
    const fall = (150 + Math.random() * 320) * cfg.gravity
    const rot  = (Math.random() - 0.5) * 720
    const size = 7 + Math.random() * 7
    out.push({
      id: i,
      color:  cfg.colors[i % cfg.colors.length],
      size,
      round:  Math.random() > 0.5,
      // مسارات بثلاث محطّات متطابقة الطول مع times أدناه
      x:      [0, dx, dx + (Math.random() - 0.5) * 90],
      y:      [0, dy, dy + fall],
      rotate: [0, rot * 0.5, rot],
      delay:  Math.random() * 0.08,
      dur:    (cfg.duration / 1000) * (0.7 + Math.random() * 0.4),
    })
  }
  return out
}

function Burst({ celebration, reduced }) {
  const cfg  = celebrationConfig(celebration.variant)
  const Icon = ICONS[cfg.icon] || PartyPopper
  const main = cfg.colors[0]
  const particles = useMemo(() => makeParticles(cfg, reduced), [celebration.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // اهتزاز خفيف على الموبايل (إن دُعم) — مرّة لكل احتفال
  useEffect(() => {
    if (!reduced && Array.isArray(cfg.haptic) && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(cfg.haptic) } catch { /* تجاهل */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {/* توهّج ناعم يتمدّد ويخفت */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.55, 0], scale: [0.4, 1.4, 1.8] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: 340, height: 340, borderRadius: '50%',
          background: `radial-gradient(circle, ${main}59, transparent 70%)`,
        }}
      />

      {/* الجسيمات */}
      {!reduced && particles.map(p => (
        <motion.div
          key={p.id}
          animate={{ x: p.x, y: p.y, rotate: p.rotate, opacity: [1, 1, 0], scale: [0.6, 1, 0.85] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.4, 1] }}
          style={{
            position: 'absolute',
            width: p.size, height: p.round ? p.size : p.size * 0.7,
            borderRadius: p.round ? '50%' : 2,
            background: p.color, boxShadow: `0 0 8px ${p.color}88`,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* القشرة المركزيّة — أيقونة تقفز ثم تخفت */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -22 }}
        animate={{ scale: [0, 1.18, 1, 1], opacity: [0, 1, 1, 0], rotate: [-22, 0, 0, 0] }}
        transition={{ duration: Math.min(1.7, cfg.duration / 1000), times: [0, 0.28, 0.7, 1], ease: 'easeOut' }}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 92, height: 92, borderRadius: 28,
            background: cfg.gradient || GRAD.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 18px 50px ${main}66, 0 0 0 1px rgba(255,255,255,0.14) inset`,
          }}
        >
          <Icon size={46} color="#fff" strokeWidth={2} />
        </motion.div>

        {celebration.label ? (
          <div style={{
            fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: '-0.01em',
            background: `${C.surface}d9`, padding: '6px 14px', borderRadius: 12,
            border: `1px solid ${main}40`, textShadow: '0 2px 12px rgba(0,0,0,0.45)',
          }}>
            {celebration.label}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}

// مكوّن عام يُركّب مرّة في App — يستمع لـ useAppStore.celebration ويعرض الانفجار.
export default function Celebration() {
  const celebration = useAppStore(s => s.celebration)
  const reduced = useMemo(prefersReducedMotion, [])
  return (
    <AnimatePresence>
      {celebration && <Burst key={celebration.id} celebration={celebration} reduced={reduced} />}
    </AnimatePresence>
  )
}
