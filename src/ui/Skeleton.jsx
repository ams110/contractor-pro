import React from 'react'
import { C } from '../constants/index.js'

/*
 * Skeleton — هياكل تحميل متوهّجة (shimmer) بدل النصوص/الـ spinners.
 * تحترم الهوية البصرية (C.card كقاعدة + وميض برتقالي خفيف من C.primary)
 * وتأخذ نفس مساحة المحتوى الحقيقي لمنع قفزة التخطيط (layout shift).
 *
 * الوميض عبر keyframe واحد مُحقَن مرّة (أداء عالٍ — لا motion لكل عنصر).
 */

const SHIMMER_CSS = `
@keyframes cp-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cp-skeleton { animation: none !important; }
}`

// حقن الـ keyframes مرّة واحدة فقط
if (typeof document !== 'undefined' && !document.getElementById('cp-skeleton-style')) {
  const el = document.createElement('style')
  el.id = 'cp-skeleton-style'
  el.textContent = SHIMMER_CSS
  document.head.appendChild(el)
}

const SHIMMER_BG = `linear-gradient(90deg, ${C.card} 0%, ${C.card} 30%, rgba(249,115,22,0.18) 45%, rgba(249,115,22,0.26) 50%, rgba(249,115,22,0.18) 55%, ${C.card} 70%, ${C.card} 100%)`

export function Skeleton({ w = '100%', h = 14, radius = 8, circle = false, style = {} }) {
  const size = circle ? { width: h, height: h, borderRadius: '50%' } : { width: w, height: h, borderRadius: radius }
  return (
    <span
      aria-hidden="true"
      className="cp-skeleton"
      style={{
        display: 'block',
        background: SHIMMER_BG,
        backgroundSize: '200% 100%',
        animation: 'cp-shimmer 1.3s ease-in-out infinite',
        flexShrink: 0,
        ...size,
        ...style,
      }}
    />
  )
}

// عدّة أسطر نصّية (آخر سطر أقصر — أكثر واقعية)
export function SkeletonText({ lines = 3, gap = 8, lastWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={11} w={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  )
}

// بطاقة شبحية جاهزة (أيقونة + عنوان + قيمة)
export function SkeletonCard({ style = {} }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: '18px 16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <Skeleton w={38} h={38} radius={12} />
        <Skeleton w={46} h={20} radius={8} />
      </div>
      <Skeleton w="55%" h={22} radius={6} style={{ marginBottom: 9 }} />
      <Skeleton w="40%" h={11} radius={6} />
    </div>
  )
}

export default Skeleton
