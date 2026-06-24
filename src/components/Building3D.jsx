import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Layers, Building2, Sparkles, RotateCw, Trash2, Check, ChevronLeft, Home, Copy, Hand, CalendarClock, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { C } from '../constants/index.js'
import {
  phaseColor, phaseOf, nextPhase, SITE_PHASES, buildingProgress,
  floorProgress, phaseFromProgress, unitProgress, nextTradeState, UNIT_TRADES,
  unitTone, floorUnits, buildUnitRows, buildReplicaRows, replicaTargets,
  computeScheduleVariance, isHouseFloor, normalizeFootprint, footprintToGrid, gridToFootprint,
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
  floorId, w, d, h, y, ox = 0, oz = 0, color, accent, status, wire, glow, nWin = 3, delay = 0, animate = true,
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
  if (!animate || ox || oz) {
    return (
      <div onClick={click} style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', transform: `translate3d(${ox}px, ${y}px, ${oz}px)`, cursor: click ? 'pointer' : 'default' }}>
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
  // الحالة الفعلية لطابق: شقق أو طابق-دار يُشتقّ من تقدّمه، وإلا حالته المباشرة.
  const effStatus = (f) => {
    if (f.id === building.id) return f.status
    const hasUnits = units.some(u => u.level === 'unit' && u.parent_id === f.id)
    return (hasUnits || isHouseFloor(f)) ? phaseFromProgress(floorProgress(f, units)) : f.status
  }
  // لو ما في طوابق: كتلة واحدة بحالة العمارة نفسها
  const stack = floors.length ? floors : [{ id: building.id, status: building.status }]
  const total = stack.length * H
  const topInProgress = stack.some(f => { const s = effStatus(f); return s !== 'planned' && s !== 'done' })
  // مخطّط أرضية مخصّص (footprint) لرسم الشكل الحقيقي — اتّحاد مستطيلات بدل صندوق واحد
  const fp = normalizeFootprint(building.footprint)
  const FW = W * 1.3, FD = D * 0.72 // مستوى الأرضية: ممدود (بيت طولاني)

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
            <FloorBox w={fp.length ? FW * 1.16 : W * 1.5} d={fp.length ? FD * 1.3 : D * 1.5} h={mini ? 5 : 9} y={mini ? 3 : 5}
              color={`${C.cyan}33`} animate={false} />
            {/* الطوابق */}
            {stack.map((f, i) => {
              const s = effStatus(f)
              const wire = s === 'planned'
              const y = -(H / 2 + i * H)
              const sel = interactive && selFloorId === f.id
              // شكل حقيقي: ارسم كل مستطيل من مخطّط الأرضية كصندوق بإزاحته الخاصة
              if (fp.length) {
                return fp.map((r, ri) => {
                  const bw = Math.max(6, r.w * FW), bd = Math.max(6, r.d * FD)
                  const ox = (r.x + r.w / 2 - 0.5) * FW
                  const oz = (r.z + r.d / 2 - 0.5) * FD
                  return (
                    <FloorBox key={`${f.id}-${ri}`} floorId={f.id} w={bw} d={bd} h={H} y={y} ox={ox} oz={oz}
                      color={FACADE[s] || '#64748B'} accent={phaseColor(s)} status={s} wire={wire}
                      nWin={Math.max(1, Math.round(bw / (mini ? 20 : 30)))}
                      interactive={interactive} selected={sel} onPickFloor={onPickFloor} animate={false} />
                  )
                })
              }
              const apts = f.id === building.id ? [] : floorUnits(units, f.id)
              return (
                <FloorBox key={f.id} floorId={f.id} w={W} d={D} h={H} y={y}
                  color={FACADE[s] || '#64748B'} accent={phaseColor(s)} status={s} wire={wire} nWin={nWin}
                  apts={apts} interactive={interactive} selected={sel}
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

// ─── المخطط ضد الواقع — جدول التنفيذ المتوقّع مقابل الفعلي ───────────────────────
const SCHED_META = {
  done:    { color: C.success, label: 'مكتمل', Icon: Check },
  ahead:   { color: C.success, label: 'متقدّم', Icon: TrendingUp },
  onTrack: { color: C.cyan,    label: 'على المسار', Icon: Check },
  behind:  { color: C.accent,  label: 'متأخّر', Icon: TrendingDown },
}
function SchedulePanel({ building, actualPct, updateSiteUnit }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(building.start_date || '')
  const [target, setTarget] = useState(building.target_date || '')
  const v = computeScheduleVariance({ startDate: building.start_date, targetDate: building.target_date, actualPct })
  const meta = SCHED_META[v.state]

  const openEdit = () => { setStart(building.start_date || ''); setTarget(building.target_date || ''); setEditing(true) }
  const save = () => { updateSiteUnit(building.id, { start_date: start || null, target_date: target || null }); setEditing(false) }
  const clear = () => { updateSiteUnit(building.id, { start_date: null, target_date: null }); setEditing(false) }

  const dateInput = {
    flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.cyan}44`,
    background: C.bg, color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit', colorScheme: 'dark',
  }

  if (editing) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.cyan}33`, borderRadius: 13, padding: '11px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarClock size={14} color={C.cyan} /> جدول تنفيذ العمارة
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 9.5, color: C.textDim, display: 'block', marginBottom: 3 }}>البداية</span>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={dateInput} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 9.5, color: C.textDim, display: 'block', marginBottom: 3 }}>الهدف</span>
            <input type="date" value={target} onChange={e => setTarget(e.target.value)} style={dateInput} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: `${C.cyan}1f`, border: `1px solid ${C.cyan}55`, borderRadius: 10, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={14} /> حفظ</button>
          {(building.start_date || building.target_date) && (
            <button onClick={clear} style={{ padding: '9px 12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>مسح</button>
          )}
          <button onClick={() => setEditing(false)} style={{ padding: '9px 12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
        </div>
      </div>
    )
  }

  if (!v.has) {
    return (
      <button onClick={openEdit}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', marginBottom: 12, background: `${C.cyan}10`, border: `1px dashed ${C.cyan}44`, borderRadius: 12, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        <CalendarClock size={15} /> حدّد جدول التنفيذ (المخطط ضد الواقع)
      </button>
    )
  }

  const overdue = v.daysLeft < 0
  const daysTxt = v.state === 'done' ? 'تمّ التسليم'
    : overdue ? `متأخّر ${Math.abs(v.daysLeft)} يوم عن الهدف`
    : `باقي ${v.daysLeft} يوم على الهدف`
  return (
    <div style={{ background: `linear-gradient(135deg, ${meta.color}12, ${C.card} 75%)`, border: `1px solid ${meta.color}3a`, borderRadius: 13, padding: '11px 12px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <CalendarClock size={14} color={meta.color} />
        <span style={{ fontSize: 12, fontWeight: 900, color: C.text }}>المخطط ضد الواقع</span>
        <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: meta.color, background: `${meta.color}1a`, border: `1px solid ${meta.color}44`, borderRadius: 8, padding: '3px 9px' }}>
          <meta.Icon size={11} /> {meta.label}{v.state !== 'done' && v.deltaPct !== 0 ? ` ${v.deltaPct > 0 ? '+' : ''}${v.deltaPct}%` : ''}
        </span>
        <button onClick={openEdit} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}><Pencil size={12} /></button>
      </div>
      <SchedBar label="متوقّع" pct={v.expectedPct} color={C.textDim} />
      <div style={{ height: 6 }} />
      <SchedBar label="فعلي" pct={v.actualPct} color={meta.color} />
      <div style={{ fontSize: 10, color: overdue ? C.accent : C.textDim, marginTop: 8, fontWeight: 600 }}>{daysTxt}</div>
    </div>
  )
}
function SchedBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 9.5, color: C.textDim, width: 34, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: `${color}22`, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color, width: 32, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
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

// ─── صفّ طابق — شقق (عمارة) أو بنود مباشرة (دار) + أدوات الإضافة بالجملة ───────
function FloorRow({ floor, units, building, open, onToggle, selUnitId, onPickUnit, addSiteUnitsBulk, updateSiteUnit, deleteSiteUnit }) {
  const rowRef = useRef(null)
  const [count, setCount] = useState(1)
  const unitsOf = useMemo(() => floorUnits(units, floor.id), [units, floor.id])
  const hasUnits = unitsOf.length > 0
  const house = (building && building.kind === 'house') || isHouseFloor(floor)
  const tracked = hasUnits || house
  const pct = floorProgress(floor, units)
  const col = pct >= 100 ? C.success : (tracked ? (pct > 0 ? C.cyan : C.textDim) : phaseColor(floor.status))
  const targets = useMemo(() => replicaTargets(units, floor.parent_id, floor.id), [units, floor.parent_id, floor.id])

  useEffect(() => {
    if (open && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  const addUnits = (n) => addSiteUnitsBulk(buildUnitRows(floor.id, unitsOf.length, n))
  const replicate = () => addSiteUnitsBulk(buildReplicaRows(units, floor.id, targets))
  const setFloorTrade = (tid) => {
    const cur = floor.trades || {}
    updateSiteUnit(floor.id, { trades: { ...cur, [tid]: nextTradeState(cur[tid]) } })
  }

  return (
    <div ref={rowRef} style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0' }}>
        <button onClick={() => onToggle(floor.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
          <ChevronLeft size={15} color={C.cyan} style={{ transform: open ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        <span onClick={() => onToggle(floor.id)} style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{floor.name}</span>
        {tracked
          ? <span style={{ fontSize: 11.5, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
          : <PhaseChip status={floor.status} onClick={() => updateSiteUnit(floor.id, { status: nextPhase(floor.status) })} />}
        {hasUnits && <span style={{ fontSize: 9.5, color: C.textDim }}>{unitsOf.length} شقّة</span>}
        {house && !hasUnits && <span style={{ fontSize: 9, fontWeight: 800, color: C.secondary, background: `${C.secondary}1a`, border: `1px solid ${C.secondary}40`, borderRadius: 6, padding: '1px 6px' }}>دار</span>}
        <button onClick={() => deleteSiteUnit(floor.id)}
          style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><Trash2 size={13} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingInlineStart: 16 }}>
              {house && !hasUnits ? (
                /* دار مستقلة: بنود الطابق الخمسة مباشرةً (بلا شقق) */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0 11px' }}>
                  {UNIT_TRADES.map(t => (
                    <TradeChip key={t.id} trade={t} state={(floor.trades || {})[t.id] || 'todo'} onClick={() => setFloorTrade(t.id)} />
                  ))}
                </div>
              ) : (
                <>
                  {unitsOf.map(u => (
                    <UnitRow key={u.id} unit={u} open={selUnitId === u.id} onToggle={onPickUnit}
                      updateSiteUnit={updateSiteUnit} deleteSiteUnit={deleteSiteUnit} />
                  ))}

                  {/* أدوات الإضافة بالجملة (عمارة شقق) */}
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── محرّر شكل البيت (footprint) — شبكة من فوق تُلوَّن بالإصبع + معاينة 3D حيّة ──
const FP_COLS = 14, FP_ROWS = 9
const fullGrid = () => Array.from({ length: FP_ROWS }, () => Array(FP_COLS).fill(true))
const emptyGrid = () => Array.from({ length: FP_ROWS }, () => Array(FP_COLS).fill(false))

function FootprintEditor({ building, updateSiteUnit, onClose }) {
  const [grid, setGrid] = useState(() => {
    const g = footprintToGrid(building.footprint, FP_COLS, FP_ROWS)
    return g.some(row => row.some(Boolean)) ? g : fullGrid()
  })
  const [saving, setSaving] = useState(false)
  const downRef = useRef(false)
  const valRef = useRef(true)

  useEffect(() => {
    const up = () => { downRef.current = false }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const setCell = (r, c, val) => setGrid(g => {
    if (g[r][c] === val) return g
    const n = g.map(row => row.slice()); n[r][c] = val; return n
  })
  const start = (r, c) => { downRef.current = true; valRef.current = !grid[r][c]; setCell(r, c, valRef.current) }
  const over = (r, c) => { if (downRef.current) setCell(r, c, valRef.current) }

  const rects = useMemo(() => gridToFootprint(grid, FP_COLS, FP_ROWS), [grid])
  const filled = grid.some(row => row.some(Boolean))
  const previewB = { id: 'fp-preview', status: 'structure', footprint: rects }
  const previewUnits = [
    { id: 'fp-1', level: 'floor', parent_id: 'fp-preview', sort_order: 0, status: 'finishing' },
    { id: 'fp-2', level: 'floor', parent_id: 'fp-preview', sort_order: 1, status: 'structure' },
  ]

  const save = async () => {
    setSaving(true)
    try { await updateSiteUnit(building.id, { footprint: filled ? rects : null }); onClose() }
    finally { setSaving(false) }
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(2,4,10,0.86)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', direction: 'rtl' }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: C.surface, border: `1px solid ${C.cyan}3a`, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>

        {/* رأس */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.cyan}1f`, border: `1px solid ${C.cyan}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={16} color={C.cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>شكل البيت — مخطّط الأرضية</div>
            <div style={{ fontSize: 10, color: C.cyan }}>لوّن الخلايا اللي فيها بناء · اسحب إصبعك</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* معاينة 3D حيّة */}
          <div style={{ height: 150, marginBottom: 12, borderRadius: 14, background: 'radial-gradient(circle at 50% 35%, #0b1530, #05060c 75%)', border: `1px solid ${C.cyan}22`, overflow: 'hidden' }}>
            <Building3D building={previewB} units={previewUnits} size="full" spin animate={false} />
          </div>

          {/* الشبكة */}
          <div onPointerLeave={() => { downRef.current = false }}
            style={{ display: 'grid', gridTemplateColumns: `repeat(${FP_COLS}, 1fr)`, gap: 2, padding: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, touchAction: 'none' }}>
            {grid.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`}
                onPointerDown={() => start(r, c)} onPointerEnter={() => over(r, c)}
                style={{ aspectRatio: '1', borderRadius: 3, cursor: 'pointer', background: cell ? C.cyan : C.card, border: `1px solid ${cell ? C.cyan : C.border}`, boxShadow: cell ? `inset 0 0 4px ${C.cyan}` : 'none', transition: 'background .08s' }} />
            )))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.textDim, marginTop: 5, padding: '0 4px' }}>
            <span>◄ خلف البيت</span>
            <span>الواجهة الأمامية ►</span>
          </div>

          {/* أدوات */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setGrid(fullGrid())} style={{ flex: 1, padding: '9px', borderRadius: 10, background: `${C.cyan}12`, border: `1px solid ${C.cyan}44`, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>ملء الكل</button>
            <button onClick={() => setGrid(emptyGrid())} style={{ flex: 1, padding: '9px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>مسح الكل</button>
          </div>
        </div>

        {/* تذييل */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: !saving ? `linear-gradient(135deg, ${C.cyan}, ${C.secondary})` : `${C.cyan}33`, border: 'none', color: '#06121f', fontSize: 13.5, fontWeight: 900, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {saving
              ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#06121f', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> يحفظ…</>
              : <><Check size={16} strokeWidth={2.6} /> احفظ الشكل</>}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export function Building3DViewer({ building, units, celebrate = false, addSiteUnit, addSiteUnitsBulk, updateSiteUnit, deleteSiteUnit, onClose }) {
  const [adding, setAdding] = useState(false)
  const [floorName, setFloorName] = useState('')
  const [spin, setSpin] = useState(true)
  const [selFloorId, setSelFloorId] = useState(null)
  const [selUnitId, setSelUnitId] = useState(null)
  const [fpEdit, setFpEdit] = useState(false)

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

  const isHouse = building.kind === 'house'
  const addFloor = async (name) => {
    // دار: الطابق يُتتبّع ببنوده (يبدأ ٠٪) · عمارة: ينزل «جاهز» كقاعدة باطون (أساس)
    await addSiteUnit({
      level: 'floor', name: name.trim(), parent_id: building.id,
      status: isHouse ? 'planned' : 'foundation', kind: isHouse ? 'house' : null,
    })
    setFloorName('')
  }

  return createPortal(
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

        {/* تعديل شكل البيت (مخطّط الأرضية) */}
        <button onClick={() => setFpEdit(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', marginBottom: 12, background: `${C.cyan}10`, border: `1px dashed ${C.cyan}44`, borderRadius: 12, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Pencil size={14} /> {building.footprint ? 'تعديل شكل البيت' : 'ارسم شكل البيت (مخطّط الأرضية)'}
        </button>

        {/* المخطط ضد الواقع — جدول التنفيذ */}
        <SchedulePanel building={building} actualPct={pct} updateSiteUnit={updateSiteUnit} />

        <AnimatePresence>
          {fpEdit && <FootprintEditor building={building} updateSiteUnit={updateSiteUnit} onClose={() => setFpEdit(false)} />}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Layers size={15} color={C.cyan} />
          <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>الطوابق</span>
          <span style={{ fontSize: 10.5, color: C.textDim }}>· افتح الطابق لشققه وبنودها</span>
        </div>

        {floors.map(f => (
          <FloorRow key={f.id} floor={f} units={units} building={building}
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
    </motion.div>,
    document.body,
  )
}
