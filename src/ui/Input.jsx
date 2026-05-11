import React from 'react'
import { cn } from '../lib/cn'

export function Input({ className, label, error, icon, ...props }) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'bg-white/[0.04] border border-white/[0.08]',
            'text-[#F8FAFC] text-sm placeholder:text-[#64748B]',
            'transition-all duration-200',
            'focus:outline-none focus:border-primary/60 focus:bg-white/[0.06]',
            'focus:ring-2 focus:ring-primary/20',
            icon && 'pr-10',
            error && 'border-danger/50 focus:border-danger/60 focus:ring-danger/20',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  )
}

export function Select({ className, label, error, children, ...props }) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-xl px-4 py-3',
          'bg-white/[0.04] border border-white/[0.08]',
          'text-[#F8FAFC] text-sm',
          'transition-all duration-200',
          'focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20',
          error && 'border-danger/50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
