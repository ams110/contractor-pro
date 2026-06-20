import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { C } from '../constants/index.js'

// ─── هيرو «دفتر المشروع»: بيت يرسم حاله (SVG pathLength) + خطوط أبعاد ذهبية ───
// + ختم «جاهز للتنفيذ» يهبط مثل ختم مطّاط — بروح ورقة المخطط بصفحة الهبوط.
const BLUE = C.cyan

// واجهة بيت بسقف جملوني + طابقين + باب — مسارات منفصلة لترسم تباعاً
const HOUSE_PATHS = [
  'M60 172 L60 92 L260 92 L260 172 Z',                          // الجدران
  'M46 96 L160 42 L274 96',                                     // السقف الجملوني
  'M60 132 L260 132',                                           // فاصل الطابق
  'M88 106 h30 v18 h-30 Z M202 106 h30 v18 h-30 Z',            // شبابيك علوية
  'M140 172 v-30 h40 v30',                                      // الباب
]

export default function BlueprintIntro({ title = 'دفتر المشروع', subtitle = 'المخططات · المواد · الموقع · الوثائق' }) {
  const reduce = useReducedMotion()
  const draw = (i) => reduce ? {} : {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.85, delay: 0.15 + i * 0.22, ease: 'easeInOut' },
  }
  const after = (delay) => reduce ? {} : {
    initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.5 },
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 14,
        border: `1.5px solid ${BLUE}3a`,
        background: `
          linear-gradient(${BLUE}10 1px, transparent 1px),
          linear-gradient(90deg, ${BLUE}10 1px, transparent 1px),
          linear-gradient(${BLUE}07 1px, transparent 1px),
          linear-gradient(90deg, ${BLUE}07 1px, transparent 1px),
          linear-gradient(165deg, #0A1226, #0A0F22 70%)`,
        backgroundSize: '64px 64px, 64px 64px, 16px 16px, 16px 16px, 100% 100%',
        boxShadow: `0 20px 50px rgba(0,0,0,0.4), inset 0 0 60px ${BLUE}08`,
      }}>
      {/* علامات الزوايا */}
      {[{ top: 9, insetInlineStart: 9 }, { top: 9, insetInlineEnd: 9 }, { bottom: 9, insetInlineStart: 9 }, { bottom: 9, insetInlineEnd: 9 }].map((pos, i) => (
        <div key={i} aria-hidden style={{ position: 'absolute', width: 15, height: 15, ...pos,
          borderTop: i < 2 ? `2px solid ${BLUE}66` : 'none', borderBottom: i >= 2 ? `2px solid ${BLUE}66` : 'none',
          borderInlineStart: i % 2 === 0 ? `2px solid ${BLUE}66` : 'none', borderInlineEnd: i % 2 === 1 ? `2px solid ${BLUE}66` : 'none' }} />
      ))}

      {/* رقم الورقة */}
      <div style={{ position: 'absolute', top: 12, insetInlineStart: 16, fontSize: 10, fontWeight: 800, color: `${BLUE}cc`, fontFamily: 'monospace', letterSpacing: '0.14em' }}>CP-00 · DRAWING SET</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px' }}>
        {/* الرسمة */}
        <svg viewBox="0 0 320 200" style={{ width: 'min(220px, 46%)', overflow: 'visible', flexShrink: 0 }} aria-hidden>
          {/* خط الأرض */}
          <motion.path d="M20 172 L300 172" stroke={`${BLUE}AA`} strokeWidth="2" fill="none" {...draw(0)} />
          {HOUSE_PATHS.map((d, i) => (
            <motion.path key={i} d={d} stroke={BLUE} strokeWidth="1.7" fill="none"
              strokeLinecap="round" strokeLinejoin="round" {...draw(i + 1)} />
          ))}
          {/* خطوط الأبعاد الذهبية */}
          <motion.g {...after(1.6)}>
            <path d="M60 30 L260 30 M60 24 L60 36 M260 24 L260 36" stroke={`${C.gold}AA`} strokeWidth="1.2" fill="none" />
            <text x="160" y="22" textAnchor="middle" fill={C.gold} fontSize="12" fontWeight="700" style={{ fontVariantNumeric: 'tabular-nums' }}>12.00 م</text>
            <path d="M286 92 L286 172 M280 92 L292 92 M280 172 L292 172" stroke={`${C.gold}AA`} strokeWidth="1.2" fill="none" />
          </motion.g>
        </svg>

        {/* النص + الختم */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <motion.div {...after(0.4)}>
            <div style={{ fontSize: 'clamp(17px, 5vw, 21px)', fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 3 }}>{subtitle}</div>
          </motion.div>

          {/* الختم — يهبط مثل ختم مطّاط */}
          <motion.div
            initial={reduce ? false : { scale: 1.8, opacity: 0, rotate: -32 }}
            animate={{ scale: 1, opacity: 1, rotate: -13 }}
            transition={reduce ? {} : { delay: 1.9, type: 'spring', stiffness: 420, damping: 12 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
              padding: '6px 13px', borderRadius: 8,
              border: `2px solid ${C.success}`, color: C.success,
              background: `${C.success}12`, fontWeight: 900, fontSize: 12.5,
              transformOrigin: 'center', boxShadow: `0 0 0 3px ${C.success}10`,
            }}>
            جاهز للتنفيذ ✓
          </motion.div>
        </div>
      </div>

      {/* جدول العنوان المصغّر */}
      <motion.div {...after(2.2)} style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${BLUE}2e` }}>
        {[['المقياس', '1 : 1'], ['رسم', 'Contractor Pro'], ['الحالة', 'مختوم']].map(([k, v], i) => (
          <div key={i} style={{ flex: '1 1 90px', padding: '7px 14px', borderInlineStart: i ? `1px solid ${BLUE}1f` : 'none' }}>
            <div style={{ fontSize: 8.5, color: `${BLUE}AA`, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 11, color: C.text, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
