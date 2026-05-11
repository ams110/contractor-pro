import React from 'react'
import { cn } from '../lib/cn'

export function Card({ className, children, hover = false, gradient = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.07] bg-[#131920] p-4',
        hover && 'transition-all duration-200 hover:border-white/[0.14] hover:shadow-card cursor-pointer',
        gradient && 'border-gradient',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-sm font-bold text-[#F8FAFC] tracking-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}
