import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all duration-150 ease-out active:scale-[0.94] disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-bg shadow-glow-sm hover:brightness-110 hover:shadow-glow',
        secondary: 'bg-white/[0.06] text-[#F8FAFC] border border-white/[0.08] hover:bg-white/[0.10]',
        ghost:     'text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.06] rounded-lg',
        danger:    'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
        outline:   'border border-primary/40 text-primary hover:bg-primary/10',
        gradient:  'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-sm hover:shadow-glow',
      },
      size: {
        sm:   'px-3 py-1.5 text-xs rounded-lg',
        md:   'px-5 py-2.5',
        lg:   'px-6 py-3 text-base',
        icon: 'w-9 h-9 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export function Button({ className, variant, size, children, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  )
}
