import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Layers, Building2, Sparkles, RotateCw, Trash2, Check } from 'lucide-react'
import { C } from '../constants/index.js'
import {
  phaseColor, phaseOf, nextPhase, SITE_PHASES, buildingProgress,
} from '../lib/siteMap.js'

// ════════════════════════════════════════════════════════════════════════════
// مجسّم 3D حقيقي (CSS 3D) — برج إيزومتري يُبنى طابقاً فوق طابق.
// كل طابق صندوق مظلَّل (5 أوجه)، لونه حسب مرحلته. الطابق المخطّط = هيكل سلكي.
// ════════════════════════════════════════════════════════════════════════════

const ov = (a, base) => `linear-gradient(0deg, rgba(2,6,15,${a}), rgba(2,6,15,${a})), ${base}`
const lite = (a, base) => `linear-gradient(0deg, rgba(255,255,255,${a}), rgba(255,255,255,${a})), ${base}`

function Face({ w, h, transform, bg, wire, glow }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', width: w, height: h,
      marginLeft: -w / 2, marginTop: -h / 2, transform, transformOrigin: 'center center',
      background: wire ? `${C.cyan}10` : bg,
      border: wire ? `1px dashed ${C.cyan}99` : `0.5px solid rgba(2,6,15,0.45)`,
      boxShadow: glow ? `inset 0 0 16px ${glow}` : 'none',
      boxSizing: 'border-box', backfaceVisibility: 'hidden',
    }} />
  )
}

// صندوق طابق واحد عند ارتفاع y (سالب = أعلى). يهبط من فوق عند الإضافة (متل الرافعة).
function FloorBox({ w, d, h, y, color, wire, glow, delay = 0, animate = true }) {
  const faces = wire
    ? { front: null, back: null, left: null, right: null, top: null }
    : {
        front: color,
        back: ov(0.30, color),
        right: ov(0.20, color),
        left: ov(0.40, color),
        top: lite(0.20, color),
      }
  const inner = (
    <>
      <Face w={w} h={h} transform={`translateZ(${d / 2}px)`} bg={faces.front} wire={wire} glow={glow} />
      <Face w={w} h={h} transform={`rotateY(180deg) translateZ(${d / 2}px)`} bg={faces.back} wire={wire} />
      <Face w={d} h={h} transform={`rotateY(90deg) translateZ(${w / 2}px)`} bg={faces.right} wire={wire} />
      <Face w={d} h={h} transform={`rotateY(-90deg) translateZ(${w / 2}px)`} bg={faces.left} wire={wire} />
      <Face w={w} h={d} transform={`rotateX(90deg) translateZ(${h / 2}px)`} bg={faces.top} wire={wire} glow={glow} />
    </>
  )
  if (!animate) {
    return (
      <div style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', transform: `translateY(${y}px)` }}>
        {inner}
      </div>
    )
  }
  return (
    <motion.div
      style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: y - 90 }}
      animate={{ opacity: 1, y }}
      transition={{ type: 'spring', stiffness: 130, damping: 15, delay }}
    >
      {inner}
    </motion.div>
  )
}

/**
 * Building3D — البرج كامل.
 * @param building وحدة العمارة (لو بلا طوابق نعرضها كتلة واحدة بحالتها).
 * @param units كل وحدات الموقع (نستخرج منها الطوابق).
 * @param size 'mini' | 'full'
 * @param spin دوران تلقائي بطيء (للعارض الكبير فقط).
 * @param animate هبوط الطوابق عند الدخول.
 */
export default function Building3D({ building, units, size = 'mini', spin = false, animate = true }) {
  const mini = size === 'mini'
  const W = mini ? 46 : 104
  const D = mini ? 46 : 104
  const H = mini ? 13 : 26

  const floors = useMemo(
    () => units.filter(u => u.level === 'floor' && u.parent_id === building.id).sort((a, b) => a.sort_order - b.sort_order),
    [units, building.id],
  )
  // لو ما في طوابق: كتلة واحدة بحالة العمارة نفسها
  const stack = floors.length ? floors : [{ id: building.id, status: building.status }]
  const total = stack.length * H
  const topInProgress = stack.some(f => f.status !== 'planned' && f.status !== 'done')

  return (
    <div style={{ perspective: mini ? 460 : 820, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-22deg)' }}>
        <motion.div
          style={{ transformStyle: 'preserve-3d', position: 'relative', width: 0, height: 0 }}
          animate={spin ? { rotateY: [-36, 324] } : { rotateY: -36 }}
          transition={spin ? { duration: 26, repeat: Infinity, ease: 'linear' } : { duration: 0.8 }}
        >
          <div style={{ transformStyle: 'preserve-3d', transform: `translateY(${total / 2}px)` }}>
            {/* لوح الأرض / المخطّط */}
            <FloorBox w={W * 1.5} d={D * 1.5} h={mini ? 5 : 9} y={mini ? 3 : 5}
              color={`${C.cyan}33`} animate={false} />
            {/* الطوابق */}
            {stack.map((f, i) => {
              const wire = f.status === 'planned'
              const col = phaseColor(f.status)
              const y = -(H / 2 + i * H)
              return (
                <FloorBox key={f.id} w={W} d={D} h={H} y={y} color={col} wire={wire}
                  glow={f.status === 'done' ? `${col}77` : null}
                  delay={animate ? i * 0.09 : 0} animate={animate} />
              )
            })}
            {/* منارة حيّة على القمّة أثناء التنفيذ */}
            {topInProgress && !mini && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', transform: `translateY(${-(total + 16)}px)` }}>
                <motion.div
                  animate={{ opacity: [1, 0.25, 1], scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: C.warning, boxShadow: `0 0 14px ${C.warning}` }} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Building3DViewer — عارض ملء الشاشة: البرج يدور + إدارة الطوابق حيّاً.
// ════════════════════════════════════════════════════════════════════════════
function PhaseChip({ status, onClick }) {
  const ph = phaseOf(status); const col = phaseColor(status)
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9, background: `${col}1f`, border: `1px solid ${col}55`, color: col, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, boxShadow: `0 0 6px ${col}` }} />
      {ph.label}
    </motion.button>
  )
}

export function Building3DViewer({ building, units, celebrate = false, addSiteUnit, updateSiteUnit, deleteSiteUnit, onClose }) {
  const [adding, setAdding] = useState(false)
  const [floorName, setFloorName] = useState('')
  const floors = units.filter(u => u.level === 'floor' && u.parent_id === building.id).sort((a, b) => a.sort_order - b.sort_order)
  const pct = buildingProgress(building, units)
  const col = pct >= 100 ? C.success : (floors.length ? C.cyan : phaseColor(building.status))

  const cycleFloor = (f) => updateSiteUnit(f.id, { status: nextPhase(f.status) })
  const addFloor = async (name) => {
    await addSiteUnit({ level: 'floor', name: name.trim(), parent_id: building.id })
    setFloorName('')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'radial-gradient(circle at 50% 30%, #0b1530 0%, #05060c 70%)', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>

      {/* شبكة مخطّط خلفية */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${C.cyan}0d 1px, transparent 1px), linear-gradient(90deg, ${C.cyan}0d 1px, transparent 1px)`, backgroundSize: '26px 26px', pointerEvents: 'none' }} />

      {/* رأس */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 8px' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${col}1f`, border: `1px solid ${col}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={19} color={col} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            {building.name}
            {celebrate && <Sparkles size={15} color={C.warning} />}
          </div>
          <div style={{ fontSize: 10, color: col, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
            3D MODEL · {floors.length} طابق · {pct}%
          </div>
        </div>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* المسرح 3D */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Building3D building={building} units={units} size="full" spin animate />
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 1.4] }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '38%', left: '50%', translateX: '-50%', translateY: '-50%', fontSize: 13, fontWeight: 900, color: C.warning, textShadow: `0 0 20px ${C.warning}`, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            ✦ تأسّست العمارة ✦
          </motion.div>
        )}
        <div style={{ position: 'absolute', insetInlineStart: 14, bottom: 10, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.textDim }}>
          <RotateCw size={12} color={C.cyan} /> دوران تلقائي
        </div>
      </div>

      {/* لوحة التحكّم بالطوابق */}
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: C.surface, borderTop: `1px solid ${C.cyan}33`, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '14px 16px', maxHeight: '42vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Layers size={15} color={C.cyan} />
          <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>الطوابق</span>
          <span style={{ fontSize: 10.5, color: C.textDim }}>· المس المرحلة لتقديمها</span>
        </div>

        {floors.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
            <PhaseChip status={f.status} onClick={() => cycleFloor(f)} />
            <button onClick={() => deleteSiteUnit(f.id)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}><Trash2 size={13} /></button>
          </div>
        ))}

        {floors.length === 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.text }}>حالة العمارة كاملة</span>
              <PhaseChip status={building.status} onClick={() => updateSiteUnit(building.id, { status: nextPhase(building.status) })} />
            </div>
            <div style={{ fontSize: 11.5, color: C.textDim, padding: '8px 0 2px' }}>
              أضف طوابق لتتبّع كل طابق على حدة — وشوفه ينزل على المجسّم.
            </div>
          </>
        )}

        {adding ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>
            <input autoFocus value={floorName} onChange={e => setFloorName(e.target.value)}
              placeholder="اسم الطابق (مثال: طابق 3)"
              onKeyDown={e => { if (e.key === 'Enter' && floorName.trim()) addFloor(floorName); if (e.key === 'Escape') setAdding(false) }}
              style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: `1px solid ${C.cyan}55`, background: C.bg, color: C.text, fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={() => floorName.trim() && addFloor(floorName)} style={{ width: 36, height: 36, borderRadius: 10, background: `${C.cyan}1f`, border: `1px solid ${C.cyan}55`, color: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Check size={16} strokeWidth={2.6} /></button>
            <button onClick={() => setAdding(false)} style={{ width: 36, height: 36, borderRadius: 10, background: C.card, border: `1px solid ${C.borderMid}`, color: C.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setAdding(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', marginTop: 10, background: `${C.cyan}14`, border: `1.5px dashed ${C.cyan}55`, borderRadius: 12, color: C.cyan, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={16} strokeWidth={2.5} /> إضافة طابق
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
