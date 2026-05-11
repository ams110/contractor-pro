import React from 'react'

const colors = {
  brand:   { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  success: { bg: 'rgba(34,197,94,0.15)',  color: '#22C55E', border: 'rgba(34,197,94,0.25)'  },
  danger:  { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
  warning: { bg: 'rgba(234,179,8,0.15)',  color: '#EAB308', border: 'rgba(234,179,8,0.25)'  },
  blue:    { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  purple:  { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: 'rgba(139,92,246,0.25)' },
  neutral: { bg: 'rgba(255,255,255,0.07)',color: '#94A3B8', border: 'rgba(255,255,255,0.1)'  },
}

export function Badge({ children, color = 'brand', size = 'md', dot = false, style = {} }) {
  const c = colors[color] || colors.neutral
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 11
  const padding  = size === 'sm' ? '2px 8px' : size === 'lg' ? '5px 12px' : '3px 10px'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 99,
      fontSize,
      fontWeight: 700,
      padding,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, flexShrink: 0 }} />}
      {children}
    </span>
  )
}
