import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Building2, Layers, MapPin, ChevronDown, Check, X, Radar,
} from 'lucide-react'
import { C } from '../../constants/index.js'
import {
  SITE_PHASES, phaseOf, nextPhase, buildingProgress, blockProgress, siteProgress, phaseTally,
} from '../../lib/siteMap.js'

const BLUE = C.cyan
const PHASE_COLOR = {
  planned: C.textDim, foundation: C.primary, structure: C.warning, finishing: C.cyan, done: C.success,
}
const phaseColor = (s) => PHASE_COLOR[s] || C.textDim

const blueprintBg = {
  backgroundColor: C.surface,
  backgroundImage: `linear-gradient(${BLUE}10 1px, transparent 1px), linear-gradient(90deg, ${BLUE}10 1px, transparent 1px)`,
  backgroundSize: '14px 14px',
}

// ─── الإشارة الحيّة النابضة ───────────────────────────────────────────────────
function LiveSignal({ color, done }) {
  return (
    <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!done && [0, 0.6].map((d, i) => (
        <motion.div key={i}
          initial={{ scale: 0.5, opacity: 0.55 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: d }}
          style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: color }} />
      ))}
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, zIndex: 1 }} />
    </div>
  )
}

// ─── صفّ إضافة سطري ────────────────────────────────────────────────────────────
function AddRow({ placeholder, onAdd, onCancel, color = BLUE }) {
  const [v, setV] = useState('')
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input autoFocus value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && v.trim()) { onAdd(v.trim()); setV('') } if (e.key === 'Escape') onCancel() }}
        style={{ flex: 1, padding: '8px 11px', borderRadius: 10, border: `1px solid ${color}55`, background: C.bg, color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
      <button onClick={() => { if (v.trim()) { onAdd(v.trim()); setV('') } }}
        style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}44`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Check size={15} strokeWidth={2.6} />
      </button>
      <button onClick={onCancel}
        style={{ width: 32, height: 32, borderRadius: 9, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={15} strokeWidth={2.4} />
      </button>
    </div>
  )
}

// ─── شارة المرحلة (قابلة للتدوير) ─────────────────────────────────────────────
function PhasePill({ status, onClick }) {
  const ph = phaseOf(status); const col = phaseColor(status)
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 8, background: `${col}18`, border: `1px solid ${col}44`, color: col, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      <LiveSignal color={col} done={status === 'done'} /> {ph.label}
    </motion.button>
  )
}

// ─── شريط تقدّم رفيع ───────────────────────────────────────────────────────────
function Bar({ pct, color }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: `${color}1c`, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function SiteMapTab({ units, addSiteUnit, updateSiteUnit, deleteSiteUnit }) {
  const [addingBlock, setAddingBlock] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const blocks = useMemo(
    () => units.filter(u => u.level === 'block' && !u.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [units],
  )
  const overall = useMemo(() => siteProgress(units), [units])
  const tally = useMemo(() => phaseTally(units), [units])
  const cycle = (u) => updateSiteUnit(u.id, { status: nextPhase(u.status) })

  return (
    <div style={{ direction: 'rtl' }}>
      {/* ── ملخّص الموقع الحيّ ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', ...blueprintBg, border: `1px solid ${BLUE}33`, borderRadius: 14, padding: '14px', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${BLUE}1c`, border: `1px solid ${BLUE}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Radar size={17} color={BLUE} strokeWidth={2.1} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>خريطة الموقع الحيّة</div>
            <div style={{ fontSize: 9.5, color: BLUE, fontFamily: 'monospace', letterSpacing: '0.1em', marginTop: 1 }}>SITE PROGRESS · تتبّع التنفيذ</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: overall >= 100 ? C.success : BLUE, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{overall}<span style={{ fontSize: 12 }}>%</span></div>
          </div>
        </div>
        <Bar pct={overall} color={overall >= 100 ? C.success : BLUE} />
        {/* أسطورة المراحل */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
          {SITE_PHASES.map(p => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: C.textDim, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: phaseColor(p.id), boxShadow: `0 0 5px ${phaseColor(p.id)}88` }} />
              {p.label}{tally[p.id] > 0 && <b style={{ color: phaseColor(p.id) }}> {tally[p.id]}</b>}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── القطع ── */}
      {blocks.map(block => (
        <BlockSection key={block.id} block={block} units={units}
          addSiteUnit={addSiteUnit} cycle={cycle} onDelete={setConfirmDel} />
      ))}

      {/* إضافة قطعة */}
      <div style={{ marginTop: 4 }}>
        {addingBlock ? (
          <div style={{ padding: '10px 12px', background: C.surface, borderRadius: 12, border: `1px solid ${BLUE}44` }}>
            <AddRow placeholder="اسم القطعة (مثال: מגרש 71)" onCancel={() => setAddingBlock(false)}
              onAdd={async (name) => { await addSiteUnit({ level: 'block', name, parent_id: null }); setAddingBlock(false) }} />
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setAddingBlock(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: `${BLUE}12`, border: `1.5px dashed ${BLUE}55`, borderRadius: 13, color: BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={16} strokeWidth={2.5} /> إضافة قطعة (מגרש)
          </motion.button>
        )}
      </div>

      {blocks.length === 0 && !addingBlock && (
        <div style={{ textAlign: 'center', padding: '32px 0 8px', color: C.textDim }}>
          <MapPin size={36} color={`${BLUE}88`} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>لا قطع بعد</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>أضف قطعة ثم عمائرها وطوابقها لتتبّع التنفيذ حيّاً</div>
        </div>
      )}

      {/* تأكيد الحذف */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDel(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 300, background: C.surface, border: `1px solid ${C.accent}4d`, borderRadius: 20, padding: '22px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6, textAlign: 'center' }}>حذف «{confirmDel.name}»؟</div>
              <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 18 }}>سيُحذف كل ما بداخله أيضاً.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                <button onClick={async () => { await deleteSiteUnit(confirmDel.id); setConfirmDel(null) }} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── قسم القطعة ───────────────────────────────────────────────────────────────
function BlockSection({ block, units, addSiteUnit, cycle, onDelete }) {
  const [addingBuilding, setAddingBuilding] = useState(false)
  const buildings = units.filter(u => u.level === 'building' && u.parent_id === block.id).sort((a, b) => a.sort_order - b.sort_order)
  const pct = blockProgress(block, units)
  const col = pct >= 100 ? C.success : BLUE

  return (
    <div style={{ marginBottom: 12, border: `1px solid ${BLUE}26`, borderRadius: 14, overflow: 'hidden' }}>
      {/* رأس القطعة */}
      <div style={{ ...blueprintBg, padding: '11px 12px', borderBottom: `1px solid ${BLUE}1f` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <MapPin size={15} color={BLUE} strokeWidth={2.3} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: C.text }}>{block.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
          <span style={{ fontSize: 10, color: C.textDim, background: C.card, padding: '1px 7px', borderRadius: 6 }}>{buildings.length} عمارة</span>
          <button onClick={() => onDelete(block)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}><Trash2 size={13} /></button>
        </div>
        <Bar pct={pct} color={col} />
      </div>

      {/* العمائر */}
      <div style={{ padding: 10, background: C.bg }}>
        {buildings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: buildings.length ? 8 : 0 }}>
            {buildings.map(b => (
              <BuildingTile key={b.id} building={b} units={units} addSiteUnit={addSiteUnit} cycle={cycle} onDelete={onDelete} />
            ))}
          </div>
        )}
        {addingBuilding ? (
          <div style={{ padding: '8px', background: C.surface, borderRadius: 11, border: `1px solid ${BLUE}33` }}>
            <AddRow placeholder="اسم العمارة (مثال: عمارة A)" onCancel={() => setAddingBuilding(false)}
              onAdd={async (name) => { await addSiteUnit({ level: 'building', name, parent_id: block.id }); setAddingBuilding(false) }} />
          </div>
        ) : (
          <button onClick={() => setAddingBuilding(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'transparent', border: `1px dashed ${BLUE}3a`, borderRadius: 11, color: BLUE, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14} strokeWidth={2.5} /> عمارة
          </button>
        )}
      </div>
    </div>
  )
}

// ─── بلاطة العمارة (بالإشارة الحيّة) ──────────────────────────────────────────
function BuildingTile({ building, units, addSiteUnit, cycle, onDelete }) {
  const [open, setOpen] = useState(false)
  const [addingFloor, setAddingFloor] = useState(false)
  const floors = units.filter(u => u.level === 'floor' && u.parent_id === building.id).sort((a, b) => a.sort_order - b.sort_order)
  const pct = buildingProgress(building, units)
  const col = pct >= 100 ? C.success : phaseColor(building.status)
  const hasFloors = floors.length > 0

  return (
    <div style={{ ...blueprintBg, border: `1px solid ${col}3a`, borderRadius: 11, overflow: 'hidden' }}>
      <div style={{ padding: '9px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <LiveSignal color={col} done={pct >= 100} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{building.name}</span>
          <button onClick={() => onDelete(building)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 1, display: 'flex' }}><Trash2 size={12} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <Building2 size={11} color={C.textDim} />
          <span style={{ fontSize: 10, color: C.textDim, flex: 1 }}>{hasFloors ? `${floors.length} طابق` : 'بلا طوابق'} · {pct}%</span>
        </div>
        <Bar pct={pct} color={col} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          {/* بلا طوابق → تدوير حالة العمارة مباشرة. مع طوابق → الحالة محسوبة منها */}
          {!hasFloors && <PhasePill status={building.status} onClick={() => cycle(building)} />}
          <button onClick={() => setOpen(o => !o)}
            style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: BLUE, background: `${BLUE}12`, border: `1px solid ${BLUE}33`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Layers size={12} /> طوابق
            <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={12} /></motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${BLUE}1f`, background: C.bg }}>
            <div style={{ padding: 8 }}>
              {floors.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 4px' }}>
                  <span style={{ flex: 1, fontSize: 11.5, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                  <PhasePill status={f.status} onClick={() => cycle(f)} />
                  <button onClick={() => onDelete(f)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 1, display: 'flex' }}><Trash2 size={11} /></button>
                </div>
              ))}
              {addingFloor ? (
                <div style={{ marginTop: 4 }}>
                  <AddRow placeholder="اسم الطابق (مثال: طابق أرضي)" onCancel={() => setAddingFloor(false)}
                    onAdd={async (name) => { await addSiteUnit({ level: 'floor', name, parent_id: building.id }) }} />
                </div>
              ) : (
                <button onClick={() => setAddingFloor(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', marginTop: 4, background: 'transparent', border: `1px dashed ${BLUE}33`, borderRadius: 9, color: BLUE, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={12} strokeWidth={2.5} /> طابق
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
