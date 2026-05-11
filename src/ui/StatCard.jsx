import React from 'react'
import { motion } from 'framer-motion'

export function StatCard({ label, value, sub, icon: Icon, color = '#F59E0B', gradient, onClick, style = {} }) {
  const grad = gradient || `linear-gradient(135deg, ${color}22, ${color}08)`

  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        background: '#13151E',
        border: `1px solid rgba(245,158,11,0.08)`,
        borderRadius: 18,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* gradient blob */}
      <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: grad, filter: 'blur(24px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
          {Icon && (
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}22` }}>
              <Icon size={16} color={color} strokeWidth={2} />
            </div>
          )}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{sub}</div>}
      </div>
    </motion.div>
  )
}
