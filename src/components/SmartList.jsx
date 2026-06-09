import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

// ─── SmartList ────────────────────────────────────────────────────────────────
// قائمة إدارة ذكية بلغة تصميم «جاهزية الحساب»: كل عنصر يعرض بصمته الحقيقية.
// variant: 'cloud' (سحابة مهارات — حجم حسب الاستخدام) | 'bars' (أشرطة نسبة + قيمة)
// valueMode: 'count' | 'amount'

export default function SmartList({
  icon: Icon, title, accent = C.primary, variant = 'cloud', valueMode = 'count',
  usage, onAdd, onRemove, addPlaceholder = 'إضافة...', language = 'ar',
}) {
  const [input, setInput]   = useState('')
  const [confirm, setConfirm] = useState(null)   // العنصر بانتظار تأكيد الحذف
  const rows = usage?.rows || []

  function submit() {
    const v = input.trim()
    if (!v) return
    onAdd?.(v); setInput('')
  }

  function tryRemove(label, count) {
    if (count > 0 && confirm !== label) { setConfirm(label); setTimeout(() => setConfirm(c => c === label ? null : c), 3500); return }
    onRemove?.(label); setConfirm(null)
  }

  const val = (r) => valueMode === 'amount' ? `₪${fmt(r.amount)}` : r.count
  const shareOf = (r) => {
    const denom = valueMode === 'amount' ? usage.totalAmount : usage.totalCount
    return denom > 0 ? Math.round(((valueMode === 'amount' ? r.amount : r.count) / denom) * 100) : 0
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* ملخّص علوي */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon && <Icon size={15} color={accent} strokeWidth={2.2} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{title}</div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
            {usage.total} عنصر · {usage.used} مُستخدم
            {valueMode === 'amount' && usage.totalAmount > 0 ? ` · ₪${fmt(usage.totalAmount)}` : ''}
          </div>
        </div>
      </div>

      {/* ── السحابة (cloud) ── */}
      {variant === 'cloud' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          <AnimatePresence initial={false}>
            {rows.map(r => {
              const intensity = usage.maxCount > 0 ? r.count / usage.maxCount : 0
              const active = r.count > 0
              const isConfirm = confirm === r.label
              return (
                <motion.div
                  key={r.label} layout
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: `${6 + intensity * 3}px ${10 + intensity * 4}px`,
                    borderRadius: 11,
                    background: isConfirm ? `${C.accent}1f` : active ? `${accent}${intensity > 0.5 ? '22' : '14'}` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isConfirm ? C.accent + '66' : active ? accent + '3a' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: active && intensity > 0.6 ? `0 0 12px ${accent}33` : 'none',
                    opacity: active ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: 12 + intensity * 2, fontWeight: active ? 800 : 600, color: active ? accent : C.textDim }}>{r.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: active ? accent : C.textDim, background: active ? `${accent}26` : 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                    {r.count}
                  </span>
                  <button onClick={() => tryRemove(r.label, r.count)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: isConfirm ? C.accent : (active ? accent : C.textDim) }}>
                    {isConfirm ? <AlertTriangle size={12} strokeWidth={2.4} /> : <X size={12} strokeWidth={2.2} />}
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── الأشرطة (bars) ── */}
      {variant === 'bars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <AnimatePresence initial={false}>
            {rows.map(r => {
              const share = shareOf(r)
              const active = r.count > 0
              const isConfirm = confirm === r.label
              return (
                <motion.div
                  key={r.label} layout
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ background: C.card, border: `1px solid ${isConfirm ? C.accent + '55' : C.border}`, borderRadius: 12, padding: '9px 11px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: active ? 6 : 0 }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: active ? C.text : C.textDim }}>{r.label}</span>
                    {active && <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: 'monospace' }}>{val(r)}</span>}
                    {active && <span style={{ fontSize: 9, color: C.textDim, minWidth: 30, textAlign: 'end' }}>{share}%</span>}
                    {!active && <span style={{ fontSize: 9, color: C.textDim }}>غير مستخدم</span>}
                    <button onClick={() => tryRemove(r.label, r.count)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: isConfirm ? C.accent : C.textDim, flexShrink: 0 }}>
                      {isConfirm ? <AlertTriangle size={13} strokeWidth={2.4} /> : <X size={13} strokeWidth={2} />}
                    </button>
                  </div>
                  {active && (
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: accent, boxShadow: `0 0 8px ${accent}66` }} />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* تنبيه تأكيد الحذف */}
      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 10, color: C.accent, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={11} /> «{confirm}» مستخدم فعلاً — اضغط ✕ مرة ثانية للحذف.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* إضافة */}
      <div style={{ display: 'flex', gap: 7 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={addPlaceholder}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          style={{ flex: 1, padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <motion.button whileTap={{ scale: 0.94 }} onClick={submit}
          style={{ padding: '9px 15px', borderRadius: 11, background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}>
          <Plus size={14} strokeWidth={2.6} />
        </motion.button>
      </div>
    </div>
  )
}
