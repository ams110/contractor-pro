import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function Modal({ open, onClose, title, children, action, size = 'md', style = {} }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const maxW = size === 'sm' ? 340 : size === 'lg' ? 520 : 430

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <motion.div
            key="modal-content"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0D0F18',
              border: '1px solid rgba(245,158,11,0.12)',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: maxW,
              maxHeight: '90dvh',
              display: 'flex',
              flexDirection: 'column',
              direction: 'rtl',
              ...style,
            }}
          >
            {/* drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {title && (
              <div style={{ padding: '10px 20px 14px', borderBottom: '1px solid rgba(245,158,11,0.08)', flexShrink: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>{title}</h2>
              </div>
            )}

            {/* Scrollable body */}
            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
              {children}
            </div>

            {/* Sticky action footer — always visible above nav bar */}
            {action && (
              <div style={{
                padding: '12px 20px',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                borderTop: '1px solid rgba(245,158,11,0.08)',
                background: '#0D0F18',
                flexShrink: 0,
              }}>
                {action}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
