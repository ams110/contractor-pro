import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { C } from '../constants/index.js'

// ─── أكسسوار «دفتر المخططات» للتطبيق ──────────────────────────────────────────
// لمسة هندسية خفيفة للأسطح «الفاضية بطبيعتها» (شاشات فاضية، ترحيب، إعداد) —
// بتاخد روح صفحة الهبوط (الشبكة السماوية + الزوايا + شارة CP + خط الأبعاد الذهبي
// اللي يرسم حاله) **بدون** ما تلمس البطاقات والجداول اليومية. تستعمل توكنات C
// (لا قيم مبعثرة) وتحترم prefers-reduced-motion.

// شبكة المخطط الباهتة — أخفّ من الهبوط (أكسسوار داخل التطبيق مش هيرو)
const GRID_BG = `
  linear-gradient(${C.cyan}0d 1px, transparent 1px),
  linear-gradient(90deg, ${C.cyan}0d 1px, transparent 1px),
  linear-gradient(160deg, ${C.surface}, ${C.bg} 82%)`
const GRID_SIZE = '22px 22px, 22px 22px, 100% 100%'

// علامات زوايا الورقة
function Corners() {
  return [
    { top: 9, insetInlineStart: 9 }, { top: 9, insetInlineEnd: 9 },
    { bottom: 9, insetInlineStart: 9 }, { bottom: 9, insetInlineEnd: 9 },
  ].map((pos, i) => (
    <div key={i} aria-hidden style={{
      position: 'absolute', width: 15, height: 15, zIndex: 2, ...pos,
      borderTop: i < 2 ? `2px solid ${C.cyan}55` : 'none',
      borderBottom: i >= 2 ? `2px solid ${C.cyan}55` : 'none',
      borderInlineStart: i % 2 === 0 ? `2px solid ${C.cyan}55` : 'none',
      borderInlineEnd: i % 2 === 1 ? `2px solid ${C.cyan}55` : 'none',
    }} />
  ))
}

// خط الأبعاد الذهبي (يرسم حاله مرّة عند الظهور) — توقيع المخطط
function DimLine({ width = 130, animate = true }) {
  const reduce = useReducedMotion()
  const on = animate && !reduce
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <span style={{ width: 1.5, height: 9, background: `${C.gold}88` }} />
      <motion.span
        initial={on ? { scaleX: 0 } : false}
        whileInView={on ? { scaleX: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ width, maxWidth: '40vw', height: 1.4, background: `${C.gold}55`, transformOrigin: 'center', display: 'block' }} />
      <span style={{ width: 1.5, height: 9, background: `${C.gold}88` }} />
    </div>
  )
}

// الإطار: ورقة مخطط خفيفة بشبكة + زوايا + شارة رقم الورقة
export function BlueprintFrame({ label = 'CP-00', children, padding = '40px 22px 28px', style = {} }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${C.cyan}2e`,
      background: GRID_BG, backgroundSize: GRID_SIZE,
      boxShadow: `inset 0 0 60px ${C.cyan}08`,
      padding, ...style,
    }}>
      <Corners />
      <div style={{
        position: 'absolute', top: 11, insetInlineStart: 28, zIndex: 2,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 9.5, fontWeight: 800, color: `${C.cyan}AA`, letterSpacing: '0.14em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 7px ${C.cyan}` }} />
        {label}
      </div>
      {children}
    </div>
  )
}

// شاشة فاضية بطابع هندسي: أيقونة داخل شريحة سماوية + خط أبعاد + نص + إجراء
export function BlueprintEmpty({ icon, text, label = 'فاضي — CP-00', action, dim = C.textDim, style = {} }) {
  return (
    <BlueprintFrame label={label} style={{ textAlign: 'center', ...style }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 60, height: 60, borderRadius: 16, marginBottom: 14,
        background: `${C.cyan}12`, border: `1px solid ${C.cyan}33`,
      }}>
        {icon}
      </div>
      <DimLine />
      <div style={{
        fontSize: 13.5, color: dim, lineHeight: 1.7,
        maxWidth: 300, margin: '14px auto 0',
      }}>
        {text}
      </div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </BlueprintFrame>
  )
}
