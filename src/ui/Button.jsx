import React from 'react'
import { motion } from 'framer-motion'

const variants = {
  brand: {
    background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EF4444 100%)',
    color: '#000',
    border: 'none',
    boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
  },
  warm: {
    background: 'linear-gradient(135deg, #F59E0B, #F97316)',
    color: '#000',
    border: 'none',
    boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.05)',
    color: '#F8FAFC',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'none',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.25)',
    boxShadow: 'none',
  },
  success: {
    background: 'rgba(34,197,94,0.15)',
    color: '#22C55E',
    border: '1px solid rgba(34,197,94,0.25)',
    boxShadow: 'none',
  },
}

const sizes = {
  sm:  { padding: '8px 14px',  fontSize: 12, borderRadius: 10, height: 38 },
  md:  { padding: '10px 18px', fontSize: 13, borderRadius: 12, height: 44 },
  lg:  { padding: '12px 24px', fontSize: 15, borderRadius: 14, height: 50 },
  xl:  { padding: '14px 32px', fontSize: 16, borderRadius: 16, height: 56 },
  icon:{ padding: '0',         fontSize: 16, borderRadius: 12, width: 44, height: 44 },
}

export function Button({
  children,
  variant = 'brand',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  style = {},
  className = '',
  type = 'button',
}) {
  const v = variants[variant] || variants.ghost
  const s = sizes[size] || sizes.md

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        width: fullWidth ? '100%' : (s.width || 'auto'),
        transition: 'opacity .2s, box-shadow .2s',
        letterSpacing: '0.01em',
        ...v,
        ...s,
        ...style,
      }}
    >
      {loading
        ? <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
        : children
      }
    </motion.button>
  )
}
