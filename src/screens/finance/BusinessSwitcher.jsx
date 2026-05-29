import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, ChevronDown, Plus, Check, Settings } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { useBusinessStore, BUSINESS_TYPES } from '../../store/useBusinessStore.js'
import BusinessSetup from './BusinessSetup.jsx'
import BusinessEditSheet from './BusinessEditSheet.jsx'

function typeLabel(type) {
  return BUSINESS_TYPES.find(t => t.id === type)?.label ?? ''
}

function typeColor(type) {
  if (type === 'osek_patur') return '#EAB308'
  if (type === 'osek_moreh') return '#22C55E'
  if (type === 'hevra')      return '#3B82F6'
  return C.primary
}

export default function BusinessSwitcher() {
  const { businesses, activeBusinessId, setActiveBusiness, initialized } = useBusinessStore()
  const active = businesses.find(b => b.id === activeBusinessId) ?? businesses[0] ?? null

  const [open,     setOpen]     = useState(false)
  const [addOpen,  setAddOpen]  = useState(false)
  const [editBiz,  setEditBiz]  = useState(null)
  const ref = useRef(null)

  // إغلاق الـ dropdown عند الضغط خارجه
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!initialized) return null
  if (!active) return null

  const color = typeColor(active.business_type)

  return (
    <>
      <div ref={ref} style={{ position: 'relative', marginBottom: 16 }}>

        {/* Trigger button */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: C.surface,
            border: `1.5px solid ${open ? C.primary + '60' : C.borderMid}`,
            borderRadius: 16,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color .2s',
          }}
        >
          {/* Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${color}18`,
            border: `1.5px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={16} color={color} strokeWidth={2} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {active.name}
            </div>
            <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 1, direction: 'rtl' }}>
              {typeLabel(active.business_type)}
              {active.reg_number && (
                <span style={{ color: C.textDim, fontWeight: 400, marginRight: 6 }}>
                  {active.business_type === 'hevra' ? 'ח.פ' : 'ע.מ'} {active.reg_number}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} color={C.textDim} />
          </motion.div>
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                zIndex: 200,
                background: C.surface,
                border: `1.5px solid ${C.borderMid}`,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* قائمة المصالح */}
              {businesses.map(biz => {
                const isActive = biz.id === activeBusinessId
                const c = typeColor(biz.business_type)
                return (
                  <div
                    key={biz.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px',
                      background: isActive ? `${C.primary}0C` : 'transparent',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onClick={() => { setActiveBusiness(biz.id); setOpen(false) }}
                  >
                    {/* Active check */}
                    <div style={{ width: 18, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      {isActive
                        ? <Check size={14} color={C.primary} strokeWidth={2.5} />
                        : <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? C.primary : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {biz.name}
                      </div>
                      <div style={{ fontSize: 10, color: c, fontWeight: 600, marginTop: 1, direction: 'rtl' }}>
                        {typeLabel(biz.business_type)}
                        {biz.reg_number && (
                          <span style={{ color: C.textDim, fontWeight: 400, marginRight: 6 }}>
                            {biz.reg_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit */}
                    <button
                      onClick={e => { e.stopPropagation(); setOpen(false); setEditBiz(biz) }}
                      style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.textDim, display: 'flex' }}
                    >
                      <Settings size={13} />
                    </button>
                  </div>
                )
              })}

              {/* + إضافة مصلحة */}
              <button
                onClick={() => { setOpen(false); setAddOpen(true) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ width: 18, display: 'flex', justifyContent: 'center' }}>
                  <Plus size={14} color={C.primary} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
                  إضافة مصلحة جديدة
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add new business — reuse BusinessSetup as a sheet */}
      {createPortal(
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAddOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                maxWidth: 480, margin: '0 auto',
                background: C.bg,
                borderRadius: '24px 24px 0 0',
                maxHeight: '92dvh', overflowY: 'auto',
              }}
            >
              <BusinessSetup onDone={() => setAddOpen(false)} compact />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}

      {/* Edit business sheet */}
      {editBiz && (
        <BusinessEditSheet
          business={editBiz}
          onClose={() => setEditBiz(null)}
        />
      )}
    </>
  )
}
