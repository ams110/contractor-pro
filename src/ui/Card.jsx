import React from 'react'
import { motion } from 'framer-motion'

export function Card({ children, style = {}, className = '', onClick, glow = false, animate = true }) {
  const base = {
    background: '#13151E',
    border: '1px solid color-mix(in srgb, var(--c-primary) 8%, transparent)',
    borderRadius: 20,
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
    ...(glow ? { boxShadow: '0 0 24px color-mix(in srgb, var(--c-primary) 8%, transparent)' } : {}),
    ...(onClick ? { cursor: 'pointer' } : {}),
    ...style,
  }

  if (!animate) return <div style={base} className={className} onClick={onClick}>{children}</div>

  return (
    <motion.div
      style={base}
      className={className}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {children}
    </motion.div>
  )
}

export function GlassCard({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(13,15,24,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid color-mix(in srgb, var(--c-primary) 10%, transparent)',
        borderRadius: 20,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
