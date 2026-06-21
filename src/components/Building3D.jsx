import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Layers, Building2, Sparkles, RotateCw, Trash2, Check, ChevronLeft, Home, Copy, Hand } from 'lucide-react'
import { C } from '../constants/index.js'
import {
  phaseColor, phaseOf, nextPhase, SITE_PHASES, buildingProgress,
  floorProgress, phaseFromProgress, unitProgress, nextTradeState, UNIT_TRADES,
  unitTone, floorUnits, buildUnitRows, buildReplicaRows, replicaTargets,
} from '../lib/siteMap.js'

// ════════════════════════════════════════════════════════════════════════════
// مجسّم 3D حقيقي (CSS 3D) — برج إيزومتري يُبنى طابقاً فوق طابق.
// كل طابق صندوق مظلَّل (5 أوجه)، لونه حسب مرحلته. الطابق المخطّط = هيكل سلكي.
// مرحلة B: الطابق ذو الشقق ينقسم خلايا ملوّنة كل وحدة بتقدّمها، وكل شيء قابل للنقر.
// ════════════════════════════════════════════════════════════════════════════

const ov = (a, base) => `linear-gradient(0deg, rgba(2,6,15,${a}), rgba(2,6,15,${a})), ${base}`
const lite = (a, base) => `linear-gradient(0deg, rgba(255,255,255,${a}), rgba(255,255,255,${a})), ${base}`

// واجهة باطون متماسكة (عائلة رمادية واحدة) — تتدرّج من مكتمل فاتح لخام غامق.
const FACADE = {
  done: '#8c97aa', finishing: '#828da1', structure: '#5c6675', foundation: '#454d5b', planned: '#64748B',
}
// زجاج الشبابيك حسب المرحلة: مكتمل=مضيء دافئ · تشطيب=مضيء بارد · هيكل=فتحات غامقة · أساس/مخطّط=بلا
function glassFor(status) {
  if (status === 'done') return { glass: 'linear-gradient(180deg,#fde9a8,#f59e0b)', glow: '#f59e0b' }
  if (status === 'finishing') return { glass: 'linear-gradient(180deg,#dbeafe,#93c5fd)', glow: '#bfdbfe' }
  if (status === 'structure') return { glass: '#0b1018', glow: null }
  return null
}

// صفّ شبابيك داخل وجه جداري (للطوابق بلا شقق)
function Windows({ fw, fh, n, g }) {
  const wWin = fw / (n * 2.0)
  const hWin = fh * 0.5
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', padding: `0 ${fw * 0.09}px` }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          width: wWin, height: hWin, borderRadius: 1, background: g.glass,
          boxShadow: g.glow ? `0 0 ${fh * 0.35}px ${g.glow}, inset 0 0 2px rgba(255,255,255,0.6)` : 'inset 0 0 3px rgba(0,0,0,0.7)',
        }} />
      ))}
    </div>
  )
}

// خلايا الشقق على وجه الطابق — كل خلية شقّة ملوّنة بتقدّمها، قابلة للنقر عند التفاعل.
function UnitCells({ fw, fh, apts, interactive, selUnitId, onPickUnit }) {
  const gap = Math.max(1.5, fw * 0.022)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch', gap, padding: `${fh * 0.16}px ${fw * 0.06}px` }}>
      {apts.map(a => {
        const pct = unitProgress(a)
        const col = unitTone(pct)
        const sel = selUnitId === a.id
        const lit = pct >= 100
        return (
          <div key={a.id}
            onClick={interactive ? (e) => { e.stopPropagation(); onPickUnit?.(a.id) } : undefined}
            title={`${a.name} · ${pct}%`}
            style={{
              flex: 1, minWidth: 0, borderRadius: 2,
              background: pct > 0 ? `linear-gradient(180deg, ${col}, ${col}aa)` : `${C.bg}cc`,
              border: sel ? '1.5px solid #fff' : `0.5px solid ${col}${pct > 0 ? 'cc' : '55'}`,
              boxShadow: sel ? '0 0 10px #fff' : (lit ? `0 0 8px ${col}` : (pct > 0 ? `inset 0 0 4px ${col}88` : 'none')),
              cursor: interactive ? 'pointer' : 'default', transition: 'box-shadow .2s, border-color .2s',
            }} />
        )
      })}
    </div>
  )
}

function Face({ w, h, transform, bg, wire, glow, ring, children }) {
  const shadow = [
    glow ? `inset 0 0 16px ${glow}` : '',
    ring ? `inset 0 0 0 2px ${ring}, 0 0 18px ${ring}aa` : '',
  ].filter(Boolean).join(', ')
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', width: w, height: h,
      marginLeft: -w / 2, marginTop: -h / 2, transform, transformOrigin: 'center center',
      background: wire ? `${C.cyan}10` : bg,
      border: wire ? `1px dashed ${C.cyan}99` : `0.5px solid rgba(2,6,15,0.45)`,
      boxShadow: shadow || 'none',
      boxSizing: 'border-box', backfaceVisibility: 'hidden', overflow: 'hidden',
    }}>{children}</div>
  )
}

// صندوق طابق واحد عند ارتفاع y (سالب = أعلى). يهبط من فوق عند الإضافة (متل الرافعة).
function FloorBox({
  floorId, w, d, h, y, color, accent, status, wire, glow, nWin = 3, delay = 0, animate = true,
  apts = [], interactive = false, selected = false, selUnitId = null, onPickFloor, onPickUnit,
}) {
  const g = wire ? null : glassFor(status)
  const hasApts = apts.length > 0
  const ring = selected ? C.cyan : null
  // محتوى الوجه الجداري: خلايا شقق (إن وُجدت) أو شبابيك + شريط حالة رفيع بلون المرحلة أسفله
  const wall = (fw, fh) => (
    <>
      {hasApts
        ? <UnitCells fw={fw} fh={fh} apts={apts} interactive={interactive} selUnitId={selUnitId} onPickUnit={onPickUnit} />
        : (g && <Windows fw={fw} fh={fh} n={nWin} g={g} />)}
      {!wire && accent && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2.5, background: accent, opacity: 0.9 }} />}
    </>
  )
  const faces = wire
    ? { front: null, back: null, left: null, right: null, top: null }
    : { front: color, back: ov(0.28, color), right: ov(0.18, color), left: ov(0.38, color), top: lite(0.16, color) }
  const inner = (
    <>
      <Face w={w} h={h} transform={`translateZ(${d / 2}px)`} bg={faces.front} wire={wire} glow={glow} ring={ring}>{wall(w, h)}</Face>
      <Face w={w} h={h} transform={`rotateY(180deg) translateZ(${d / 2}px)`} bg={faces.back} wire={wire} ring={ring}>{wall(w, h)}</Face>
      <Face w={d} h={h} transform={`rotateY(90deg) translateZ(${w / 2}px)`} bg={faces.right} wire={wire} ring={ring}>{wall(d, h)}</Face>
      <Face w={d} h={h} transform={`rotateY(-90deg) translateZ(${w / 2}px)`} bg={faces.left} wire={wire} ring={ring}>{wall(d, h)}</Face>
      <Face w={w} h={d} transform={`rotateX(90deg) translateZ(${h / 2}px)`} bg={faces.top} wire={wire} glow={glow} ring={ring} />
    </>
  )
  const click = interactive && onPickFloor
    ? (e) => { e.stopPropagation(); onPickFloor(floorId) }
    : undefined
  if (!animate) {
    return (
      <div onClick={click} style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', transform: `translateY(${y}px)`, cursor: click ? 'pointer' : 'default' }}>
        {inner}
      </div>
    )
  }
  return (
    <motion.div
      onClick={click}
      style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', cursor: click ? 'pointer' : 'default' }}
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
 * @param units كل وحدات الموقع (نستخرج منها الطوابق والشقق).
 * @param size 'mini' | 'full'
 * @param spin دوران تلقائي بطيء (للعارض الكبير فقط).
 * @param animate هبوط الطوابق عند الدخول.
 * @param interactive تمكين النقر على الطوابق/الشقق داخل الموديل (مرحلة B).
 */
export default function Building3D({
  building, units, size = 'mini', spin = false, animate = true,
  interactive = false, selFloorId = null, selUnitId = null, onPickFloor, onPickUnit,
}) {
  const mini = size === 'mini'
  const W = mini ? 54 : 116
  const D = mini ? 54 : 116
  const H = mini ? 18 : 33
  const nWin = mini ? 2 : 3

  const floors = useMemo(
    () => units.filter(u => u.level === 'floor' && u.parent_id === building.id).sort((a, b) => a.sort_order - b.sort_order),
    [units, building.id],
  )
  // الحالة الفعلية لطابق: لو عنده شقق نشتقّها من تقدّمها، وإلا حالته المباشرة.
  const effStatus = (f) => {
    if (f.id === building.id) return f.status
    const hasUnits = units.some(u => u.level === 'unit' && u.parent_id === f.id)
    return hasUnits ? phaseFromProgress(floorProgress(f, units)) : f.status
  }
  // لو ما في طوابق: كتلة واحدة بحالة العمارة نفسها
  const stack = floors.length ? floors : [{ id: building.id, status: building.status }]
  const total = stack.length * H
  const topInProgress = stack.some(f => { const s = effStatus(f); return s !== 'planned' && s !== 'done' })

  return (
    <div style={{ perspective: mini ? 460 : 820, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-25deg)' }}>
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
              const s = effStatus(f)
              const wire = s === 'planned'
              const y = -(H / 2 + i * H)
              const apts = f.id === building.id ? [] : floorUnits(units, f.id)
              return (
                <FloorBox key={f.id} floorId={f.id} w={W} d={D} h={H} y={y}
                  color={FACADE[s] || '#64748B'} accent={phaseColor(s)} status={s} wire={wire} nWin={nWin}
                  apts={apts} interactive={interactive} selected={interactive && selFloorId === f.id}
                  selUnitId={selUnitId} onPickFloor={onPickFloor} onPickUnit={onPickUnit}
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
// Building3DViewer — عارض ملء الشاشة: البرج تفاعلي + إدارة الطوابق والشقق حيّاً.
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

// ─── شريحة بند (لسا/ماشي/خلص) — نقرة تدوّر الحالة ───────────────────────────
function TradeChip({ trade, state, onClick }) {
  const col = trade.color
  const isDone = state === 'done'
  const isDoing = state === 'doing'
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 9,
        background: isDone ? col : `${col}${isDoing ? '2a' : '12'}`,
        border: `1px solid ${col}${isDone ? 'ff' : '55'}`,
        color: isDone ? '#06121f' : col, fontSize: 11, fontWeight: 800, cursor: 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: state === 'todo' ? 0.72 : 1,
      }}>
      {isDone
        ? <Check size={12} strokeWidth={3} />
        : <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, opacity: isDoing ? 1 : 0.45, boxShadow: isDoing ? `0 0 6px ${col}` : 'none' }} />}
      {trade.label}
    </motion.button>
  )
}

// ─── صفّ شقّة — يفتح على البنود الخمسة (مُتحكَّم: open/onToggle لمزامنة الموديل) ─
function UnitRow({ unit, open, onToggle, updateSiteUnit, deleteSiteUnit }) {
  const rowRef = useRef(null)
  const pct = unitProgress(unit)
  const col = unitTone(pct)
  const setTrade = (tid) => {
    const cur = unit.trades || {}
    updateSiteUnit(unit.id, { trades: { ...cur, [tid]: nextTradeState(cur[tid]) } })
  }
  useEffect(() => {
    if (open && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  return (
    <div ref={rowRef} style={{ borderTop: `1px solid ${C.border}`, background: open ? `${C.cyan}0c` : 'transparent', borderRadius: open ? 8 : 0 }}>
      <div onClick={() => onToggle(unit.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 6px', cursor: 'pointer' }}>
        <ChevronLeft size={13} color={C.textDim} style={{ transform: open ? 'rotate(-90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        <Home size={13} color={col} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.name}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        <button onClick={e => { e.stopPropagation(); deleteSiteUnit(unit.id) }}
          style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><Trash2 size={12} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '2px 0 10px 20px' }}>
              {UNIT_TRADES.map(t => (
                <TradeChip key={t.id} trade={t} state={(unit.trades || {})[t.id] || 'todo'} onClick={() => setTrade(t.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── عدّاد كمّية صغير (للإضافة بالجملة) ─────────────────────────────────────────
function Stepper({ value, setValue, min = 1, max = 30 }) {
  const btn = {
    width: 30, height: 30, borderRadius: 8, background: `${C.cyan}14`, border: `1px solid ${C.cyan}44`,
    color: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <button onClick={() => setValue(v => Math.max(min, v - 1))} style={btn}><Minus size={14} strokeWidth={2.6} /></button>
      <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <button onClick={() => setValue(v => Math.min(max, v + 1))} style={btn}><Plus size={14} strokeWidth={2.6} /></button>
    </div>
  )
}

// ─── صفّ طابق — يفتح على شققه (مُتحكَّم) + أدوات الإضافة بالجملة ───────────────
function FloorRow({ floor, units, open, onToggle, selUnitId, onPickUnit, addSiteUnitsBulk, updateSiteUnit, deleteSiteUnit }) {
  const rowRef = useRef(null)
  const [count, setCount] = useState(1)
  const unitsOf = useMemo(() => floorUnits(units, floor.id), [units, floor.id])
  const hasUnits = unitsOf.length > 0
  const pct = floorProgress(floor, units)
  const col = pct >= 100 ? C.success : (hasUnits ? C.cyan : phaseColor(floor.status))
  const targets = useMemo(() => replicaTargets(units, floor.parent_id, floor.id), [units, floor.parent_id, floor.id])

  useEffect(() => {
    if (open && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  const addUnits = (n) => addSiteUnitsBulk(buildUnitRows(floor.id, unitsOf.length, n))
  const replicate = () => addSiteUnitsBulk(buildReplicaRows(units, floor.id, targets))

  return (
    <div ref={rowRef} style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0' }}>
        <button onClick={() => onToggle(floor.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
          <ChevronLeft size={15} color={C.cyan} style={{ transform: open ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        <span onClick={() => onToggle(floor.id)} style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{floor.name}</span>
        {hasUnits
          ? <span style={{ fontSize: 11.5, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
          : <PhaseChip status={floor.status} onClick={() => updateSiteUnit(floor.id, { status: nextPhase(floor.status) })} />}
        {hasUnits && <span style={{ fontSize: 9.5, color: C.textDim }}>{unitsOf.length} شقّة</span>}
        <button onClick={() => deleteSiteUnit(floor.id)}
          style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><Trash2 size={13} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingInlineStart: 16 }}>
              {unitsOf.map(u => (
                <UnitRow key={u.id} unit={u} open={selUnitId === u.id} onToggle={onPickUnit}
                  updateSiteUnit={updateSiteUnit} deleteSiteUnit={deleteSiteUnit} />
              ))}

              {/* أدوات الإضافة بالجملة */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '9px 0 4px' }}>
                <Stepper value={count} setValue={setCount} />
                <button onClick={() => addUnits(count)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: `${C.cyan}12`, border: `1px dashed ${C.cyan}55`, borderRadius: 10, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={14} strokeWidth={2.6} /> {count > 1 ? `أضف ${count} شقق` : 'أضف شقّة'}
                </button>
              </div>

              {/* تكرار شقق هذا الطابق على بقيّة الطوابق الفارغة */}
              {hasUnits && targets.length > 0 && (
                <button onClick={replicate}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', margin: '0 0 9px', background: `${C.secondary}12`, border: `1px dashed ${C.secondary}55`, borderRadius: 10, color: C.secondary, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Copy size={13} strokeWidth={2.4} /> كرّر شقق هذا الطابق على {targets.length} {targets.length === 1 ? 'طابق' : 'طوابق'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Building3DViewer({ building, units, celebrate = false, addSiteUnit, addSiteUnitsBulk, updateSiteUnit, deleteSiteUnit, onClose }) {
  const [adding, setAdding] = useState(false)
  const [floorName, setFloorName] = useState('')
  const [spin, setSpin] = useState(true)
  const [selFloorId, setSelFloorId] = useState(null)
  const [selUnitId, setSelUnitId] = useState(null)

  const floors = units.filter(u => u.level === 'floor' && u.parent_id === building.id).sort((a, b) => a.sort_order - b.sort_order)
  const pct = buildingProgress(building, units)
  const col = pct >= 100 ? C.success : (floors.length ? C.cyan : phaseColor(building.status))

  // اختيار طابق من الموديل أو اللائحة (toggle) — يوقف الدوران ويزامن الجهتين.
  const pickFloor = (fid) => {
    setSpin(false)
    setSelUnitId(null)
    setSelFloorId(prev => (prev === fid ? null : fid))
  }
  // اختيار شقّة — يفتح طابقها وبنودها.
  const pickUnit = (uid) => {
    setSpin(false)
    const u = units.find(x => x.id === uid)
    if (u) setSelFloorId(u.parent_id)
    setSelUnitId(prev => (prev === uid ? null : uid))
  }

  const addFloor = async (name) => {
    // الطابق الجديد ينزل «جاهز» كقاعدة باطون (أساس) بدل هيكل سلكي فاضي
    await addSiteUnit({ level: 'floor', name: name.trim(), parent_id: building.id, status: 'foundation' })
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

      {/* المسرح 3D التفاعلي */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Building3D building={building} units={units} size="full" spin={spin} animate
          interactive selFloorId={selFloorId} selUnitId={selUnitId}
          onPickFloor={pickFloor} onPickUnit={pickUnit} />
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 1.4] }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '38%', left: '50%', translateX: '-50%', translateY: '-50%', fontSize: 13, fontWeight: 900, color: C.warning, textShadow: `0 0 20px ${C.warning}`, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            ✦ تأسّست العمارة ✦
          </motion.div>
        )}
        {/* تلميح/زر الدوران */}
        <div style={{ position: 'absolute', insetInlineStart: 14, bottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSpin(s => !s)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: spin ? C.cyan : C.textDim, background: `${C.bg}cc`, border: `1px solid ${spin ? C.cyan + '55' : C.borderMid}`, borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <RotateCw size={12} /> {spin ? 'إيقاف الدوران' : 'تدوير'}
          </button>
          {!selFloorId && floors.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.textDim }}>
              <Hand size={12} color={C.cyan} /> انقر طابقاً بالموديل
            </span>
          )}
        </div>
      </div>

      {/* لوحة التحكّم بالطوابق */}
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: C.surface, borderTop: `1px solid ${C.cyan}33`, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '14px 16px', maxHeight: '46vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Layers size={15} color={C.cyan} />
          <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>الطوابق</span>
          <span style={{ fontSize: 10.5, color: C.textDim }}>· افتح الطابق لشققه وبنودها</span>
        </div>

        {floors.map(f => (
          <FloorRow key={f.id} floor={f} units={units}
            open={selFloorId === f.id} onToggle={pickFloor}
            selUnitId={selUnitId} onPickUnit={pickUnit}
            addSiteUnitsBulk={addSiteUnitsBulk} updateSiteUnit={updateSiteUnit} deleteSiteUnit={deleteSiteUnit} />
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
