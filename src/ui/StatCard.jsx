import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/cn'

export function StatCard({ label, value, sub, icon, color = '#00DDB3', trend, className }) {
  const isPositive = trend > 0
  const isNegative = trend < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-xl border border-white/[0.07] bg-[#131920] p-4',
        'transition-all duration-200 hover:border-white/[0.14] hover:shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: `${color}18`, color }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl font-extrabold tracking-tight" style={{ color }}>
        {value}
      </div>

      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trend !== undefined && (
            <span className={cn(
              'text-xs font-semibold',
              isPositive && 'text-success',
              isNegative && 'text-danger',
              !isPositive && !isNegative && 'text-[#64748B]'
            )}>
              {isPositive ? '▲' : isNegative ? '▼' : '—'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-xs text-[#64748B]">{sub}</span>}
        </div>
      )}
    </motion.div>
  )
}
