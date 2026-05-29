import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Check, PenLine, ShieldCheck } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { useBiometricConfirm } from '../hooks/useBiometricConfirm.js'

// ─── Canvas Signature Pad ─────────────────────────────────────────────────────
function SignatureCanvas({ onSign, color = C.primary }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width  = canvas.offsetWidth  * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = color
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [color])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left),
      y: (src.clientY - rect.top),
    }
  }

  function startDraw(e) {
    e.preventDefault()
    drawing.current = true
    lastPos.current = getPos(e, canvasRef.current)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
  }

  function endDraw(e) {
    e.preventDefault()
    drawing.current = false
    if (!isEmpty && onSign) {
      onSign(canvasRef.current.toDataURL('image/png'))
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setIsEmpty(true)
    if (onSign) onSign(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        style={{ width: '100%', height: 140, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1.5px dashed ${isEmpty ? 'rgba(255,255,255,0.15)' : C.primary + '55'}`, cursor: 'crosshair', display: 'block', touchAction: 'none' }}
      />
      {isEmpty && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
          <PenLine size={18} />
          <span style={{ fontSize: 13 }}>ارسم توقيعك هنا</span>
        </div>
      )}
      {!isEmpty && (
        <button
          onClick={clear}
          style={{ position: 'absolute', top: 8, insetInlineEnd: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Trash2 size={13} color={C.accent} />
        </button>
      )}
    </div>
  )
}

// ─── Signature Modal ──────────────────────────────────────────────────────────
export default function SignatureModal({ open, onClose, onConfirm, title, subtitle, tbl = 'signature', requireBio = false }) {
  const [sigData, setSigData]   = useState(null)
  const [method, setMethod]     = useState('draw') // 'draw' | 'bio'
  const [loading, setLoading]   = useState(false)
  const [bioPhase, setBioPhase] = useState('idle') // idle | scanning | success | error
  const { confirm: bioConfirm, isPasskeyRegistered, isPinSet } = useBiometricConfirm()

  const hasBio = isPasskeyRegistered() || isPinSet()

  useEffect(() => {
    if (open) {
      setSigData(null)
      setMethod(requireBio && hasBio ? 'bio' : 'draw')
      setBioPhase('idle')
      setLoading(false)
    }
  }, [open])

  async function handleConfirm() {
    if (method === 'draw' && !sigData) return
    setLoading(true)
    try {
      if (method === 'bio' || requireBio) {
        const result = await bioConfirm(title || 'تأكيد العملية', tbl)
        if (!result) { setLoading(false); return }
      }
      onConfirm({ sigData: method === 'draw' ? sigData : null, method })
      onClose()
    } catch {
      // cancelled
    }
    setLoading(false)
  }

  async function handleBioOnly() {
    setBioPhase('scanning')
    const result = await bioConfirm(title || 'تأكيد العملية', tbl)
    if (result) {
      setBioPhase('success')
      setTimeout(() => {
        onConfirm({ sigData: null, method: 'bio' })
        onClose()
        setBioPhase('idle')
      }, 600)
    } else {
      setBioPhase('idle')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{ width: '100%', maxWidth: 480, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: '24px 24px 0 0', padding: '8px 20px calc(28px + env(safe-area-inset-bottom, 0px))', direction: 'rtl' }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={20} color={C.primary} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{title || 'التوقيع الرقمي'}</div>
                {subtitle && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{subtitle}</div>}
              </div>
            </div>

            {/* Method tabs */}
            {hasBio && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: C.card, borderRadius: 14, padding: 4, border: `1px solid ${C.border}` }}>
                {[
                  { id: 'draw', label: 'توقيع بالرسم', icon: PenLine },
                  { id: 'bio',  label: 'تأكيد بالبصمة', icon: ShieldCheck },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setMethod(id)}
                    style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: 'none', background: method === id ? GRAD.primary : 'transparent', color: method === id ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            )}

            {/* Draw method */}
            {method === 'draw' && (
              <SignatureCanvas onSign={setSigData} />
            )}

            {/* Bio method */}
            {method === 'bio' && (
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <motion.div
                  animate={bioPhase === 'scanning' ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: bioPhase === 'success' ? `${C.success}22` : `${C.primary}15`, border: `2px solid ${bioPhase === 'success' ? C.success : C.primary}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                >
                  <ShieldCheck size={32} color={bioPhase === 'success' ? C.success : C.primary} strokeWidth={1.5} />
                </motion.div>
                <div style={{ fontSize: 13, color: C.textDim }}>
                  {bioPhase === 'success' ? 'تم التحقق بنجاح' : 'سيُطلب تأكيد البصمة عند الحفظ'}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={onClose} disabled={loading}
                style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={loading || (method === 'draw' && !sigData)}
                style={{ flex: 2, padding: '12px', borderRadius: 14, background: (method === 'draw' && !sigData) ? 'rgba(249,115,22,0.3)' : GRAD.primary, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: (method === 'draw' && !sigData) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: (method === 'draw' && !sigData) ? 'none' : '0 6px 20px rgba(249,115,22,0.35)' }}
              >
                {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Check size={16} /></motion.div> : <Check size={16} />}
                تأكيد وحفظ
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
