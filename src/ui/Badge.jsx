import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2 py-0.5',
  {
    variants: {
      variant: {
        primary:  'bg-primary/15 text-primary',
        success:  'bg-success/15 text-success',
        danger:   'bg-danger/15 text-danger',
        warning:  'bg-warning/15 text-warning',
        info:     'bg-secondary/15 text-secondary',
        ghost:    'bg-white/[0.06] text-[#64748B]',
        outline:  'border border-white/[0.12] text-[#64748B]',
      },
    },
    defaultVariants: { variant: 'ghost' },
  }
)

export function Badge({ className, variant, dot, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-primary':  variant === 'primary',
          'bg-success':  variant === 'success',
          'bg-danger':   variant === 'danger',
          'bg-warning':  variant === 'warning',
          'bg-secondary':variant === 'info',
          'bg-[#64748B]':!variant || variant === 'ghost',
        })} />
      )}
      {children}
    </span>
  )
}
