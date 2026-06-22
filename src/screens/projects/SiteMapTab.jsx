import React, { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Minus, Trash2, MapPin, Check, X, Radar, Box, ScanLine, Sparkles,
  Building2, Layers, Home, AlertTriangle, Upload, FileText,
} from 'lucide-react'
import { C } from '../../constants/index.js'
import { supabase } from '../../lib/supabase.js'
import { compressImage } from '../../lib/storage.js'
import {
  SITE_PHASES, phaseColor, buildingProgress, blockProgress, siteProgress, phaseTally,
  normalizePlan, planToSiteRows, planTotals,
} from '../../lib/siteMap.js'
import Building3D, { Building3DViewer } from '../../components/Building3D.jsx'

const BLUE = C.cyan

const blueprintBg = {
  backgroundColor: C.surface,
  backgroundImage: `linear-gradient(${BLUE}10 1px, transparent 1px), linear-gradient(90deg, ${BLUE}10 1px, transparent 1px)`,
  backgroundSize: '14px 14px',
}

// ─── الإشارة الحيّة — تنبض فقط على العمائر اللي شغل فيها فعلاً (هادئة) ─────────
function LiveSignal({ color, active = false }) {
  return (
    <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0.4 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: color }} />
      )}
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88`, zIndex: 1 }} />
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
export default function SiteMapTab({ units, addSiteUnit, addSiteUnitsBulk, addSiteUnitsTree, updateSiteUnit, deleteSiteUnit }) {
  const [addingBlock, setAddingBlock] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  // عارض المجسّم 3D: { buildingId, celebrate }
  const [viewer, setViewer] = useState(null)
  // نافذة «ابنِ من مخطط» (AI)
  const [scanOpen, setScanOpen] = useState(false)

  const blocks = useMemo(
    () => units.filter(u => u.level === 'block' && !u.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [units],
  )
  const overall = useMemo(() => siteProgress(units), [units])
  const tally = useMemo(() => phaseTally(units), [units])
  // العمارة المعروضة في العارض (حيّة من units)
  const viewerBuilding = viewer ? units.find(u => u.id === viewer.buildingId) : null

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

      {/* ── ابنِ الموقع من مخطط (AI) ── */}
      {addSiteUnitsTree && (
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setScanOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: `linear-gradient(135deg, ${C.secondary}1c, ${C.surface} 75%)`, border: `1px solid ${C.secondary}44`, borderRadius: 14, color: C.text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.secondary}22`, border: `1px solid ${C.secondary}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ScanLine size={17} color={C.secondary} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
              ابنِ الموقع من مخطط <Sparkles size={12} color={C.secondary} />
            </div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>صوّر المخطط — الذكاء يقرأه ويبني العمارات والطوابق والشقق</div>
          </div>
        </motion.button>
      )}

      {/* ── القطع ── */}
      {blocks.map(block => (
        <BlockSection key={block.id} block={block} units={units}
          addSiteUnit={addSiteUnit} onDelete={setConfirmDel}
          openViewer={(b, celebrate) => setViewer({ buildingId: b.id, celebrate })} />
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

      {/* ── نافذة بناء الموقع من مخطط (AI) ── */}
      <AnimatePresence>
        {scanOpen && (
          <ScanPlanModal
            units={units} addSiteUnitsTree={addSiteUnitsTree}
            onClose={() => setScanOpen(false)}
            onBuilt={(firstBuildingId) => { setScanOpen(false); if (firstBuildingId) setViewer({ buildingId: firstBuildingId, celebrate: true }) }} />
        )}
      </AnimatePresence>

      {/* ── عارض المجسّم 3D ── */}
      <AnimatePresence>
        {viewerBuilding && (
          <Building3DViewer
            building={viewerBuilding} units={units} celebrate={viewer?.celebrate}
            addSiteUnit={addSiteUnit} addSiteUnitsBulk={addSiteUnitsBulk} updateSiteUnit={updateSiteUnit} deleteSiteUnit={deleteSiteUnit}
            onClose={() => setViewer(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── قسم القطعة ───────────────────────────────────────────────────────────────
function BlockSection({ block, units, addSiteUnit, onDelete, openViewer }) {
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: buildings.length ? 8 : 0 }}>
            {buildings.map(b => (
              <BuildingTile key={b.id} building={b} units={units} onDelete={onDelete} openViewer={openViewer} />
            ))}
          </div>
        )}
        {addingBuilding ? (
          <div style={{ padding: '8px', background: C.surface, borderRadius: 11, border: `1px solid ${BLUE}33` }}>
            <AddRow placeholder="اسم العمارة (مثال: عمارة A)" onCancel={() => setAddingBuilding(false)}
              onAdd={async (name) => {
                const created = await addSiteUnit({ level: 'building', name, parent_id: block.id })
                setAddingBuilding(false)
                if (created) openViewer(created, true) // لحظة الـ«wow»: افتح المجسّم 3D
              }} />
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

// ─── بلاطة العمارة — مجسّم 3D مصغّر، نقرة تفتح العارض ─────────────────────────
function BuildingTile({ building, units, onDelete, openViewer }) {
  const floors = units.filter(u => u.level === 'floor' && u.parent_id === building.id)
  const pct = buildingProgress(building, units)
  const col = pct >= 100 ? C.success : (floors.length ? BLUE : phaseColor(building.status))

  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={() => openViewer(building, false)}
      style={{ ...blueprintBg, border: `1px solid ${col}3a`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
      {/* مسرح المجسّم 3D المصغّر */}
      <div style={{ position: 'relative', height: 124, borderBottom: `1px solid ${col}1f`, overflow: 'hidden' }}>
        <Building3D building={building} units={units} size="mini" animate={false} />
        <div style={{ position: 'absolute', insetInlineStart: 7, top: 7, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, color: col, background: `${C.bg}cc`, border: `1px solid ${col}44`, borderRadius: 7, padding: '2px 6px' }}>
          <Box size={10} /> 3D
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(building) }}
          style={{ position: 'absolute', insetInlineEnd: 6, top: 6, width: 24, height: 24, borderRadius: 7, background: `${C.bg}cc`, border: `1px solid ${C.borderMid}`, color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={12} />
        </button>
      </div>
      {/* معلومات */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <LiveSignal color={col} active={pct > 0 && pct < 100} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{building.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
        <Bar pct={pct} color={col} />
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 6 }}>
          {floors.length ? `${floors.length} طابق · انقر للـ3D` : 'انقر لبناء الطوابق'}
        </div>
      </div>
    </motion.div>
  )
}

// ─── عدّاد صغير ─────────────────────────────────────────────────────────────────
function MiniStepper({ value, setValue, min = 0, max = 60, color = BLUE }) {
  const btn = { width: 26, height: 26, borderRadius: 7, background: `${color}14`, border: `1px solid ${color}44`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <button onClick={() => setValue(Math.max(min, value - 1))} style={btn}><Minus size={12} strokeWidth={2.8} /></button>
      <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <button onClick={() => setValue(Math.min(max, value + 1))} style={btn}><Plus size={12} strokeWidth={2.8} /></button>
    </div>
  )
}

const CONF = {
  high: { label: 'ثقة عالية', color: C.success },
  medium: { label: 'ثقة متوسّطة', color: C.warning },
  low: { label: 'ثقة منخفضة — راجع الأرقام', color: C.accent },
}

// ─── نافذة بناء الموقع من مخطط (قراءة بالرؤية ثم بناء الهيكل) ─────────────────────
function ScanPlanModal({ units, addSiteUnitsTree, onClose, onBuilt }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState(null) // { buildings, confidence, notes }
  const [building, setBuilding] = useState(false)
  const [targetBlock, setTargetBlock] = useState('new')

  const blocks = useMemo(() => units.filter(u => u.level === 'block' && !u.parent_id).sort((a, b) => a.sort_order - b.sort_order), [units])
  const newBlockName = `القطعة ${blocks.length + 1}`

  function pick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const isImg = f.type.startsWith('image/')
    const isPdf = f.type === 'application/pdf'
    if (!isImg && !isPdf) { setError('ارفع صورة أو ملف PDF للمخطط'); return }
    if (f.size > 12 * 1024 * 1024) { setError('حجم الملف أكبر من 12MB'); return }
    setError(''); setFile(f); setSuggestion(null)
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setPreview(isImg ? URL.createObjectURL(f) : '')
  }

  async function scan() {
    if (!file) return
    setScanning(true); setError('')
    try {
      const payload = file.type.startsWith('image/') ? await compressImage(file, 2000, 0.85) : file
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1]); r.onerror = rej
        r.readAsDataURL(payload)
      })
      const { data, error: err } = await supabase.functions.invoke('scan-plan', {
        body: { imageBase64: base64, mimeType: payload.type },
      })
      if (err) throw new Error(err.message)
      if (data?.error) throw new Error(data.error)
      const norm = normalizePlan(data?.result)
      if (!norm.buildings.length) { setError('ما قدرت أقرأ هيكلاً واضحاً — جرّب ملفاً أوضح أو أضِف العمارات يدوياً بالأسفل.'); setSuggestion({ buildings: [], confidence: 'low', notes: '' }); return }
      setSuggestion(norm)
    } catch (e) { setError(e.message || 'فشل قراءة المخطط') }
    finally { setScanning(false) }
  }

  const setB = (i, patch) => setSuggestion(s => ({ ...s, buildings: s.buildings.map((b, j) => (j === i ? { ...b, ...patch } : b)) }))
  const removeB = (i) => setSuggestion(s => ({ ...s, buildings: s.buildings.filter((_, j) => j !== i) }))
  const addB = () => setSuggestion(s => ({ ...s, buildings: [...s.buildings, { name: `عمارة ${s.buildings.length + 1}`, floors: 1, unitsPerFloor: 1 }] }))

  const totals = suggestion ? planTotals(suggestion) : null
  const canBuild = !!totals && totals.buildings > 0

  async function build() {
    if (!canBuild) return
    setBuilding(true); setError('')
    try {
      const blockId = targetBlock === 'new' ? null : targetBlock
      const buildingStart = blockId ? units.filter(u => u.level === 'building' && u.parent_id === blockId).length : 0
      const rows = planToSiteRows(suggestion, { blockId, blockName: newBlockName, buildingStart })
      await addSiteUnitsTree(rows)
      onBuilt?.(rows.find(r => r.level === 'building')?.id)
    } catch (e) { setError(e.message); setBuilding(false) }
  }

  const conf = suggestion ? (CONF[suggestion.confidence] || CONF.medium) : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,4,10,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', direction: 'rtl' }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: C.surface, border: `1px solid ${C.secondary}3a`, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>

        {/* رأس */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.secondary}22`, border: `1px solid ${C.secondary}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={17} color={C.secondary} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>بناء الموقع من مخطط</div>
            <div style={{ fontSize: 9.5, color: C.secondary, fontFamily: 'monospace', letterSpacing: '0.1em' }}>AI · يقرأ ويبني الهيكل</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {/* جسم */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* منطقة الملف (صورة أو PDF) */}
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={pick} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', minHeight: preview ? 0 : 130, padding: preview ? 8 : 16, ...blueprintBg, border: `1.5px dashed ${C.secondary}55`, borderRadius: 14, color: C.textDim, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            {preview ? (
              <img src={preview} alt="المخطط" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 9, objectFit: 'contain' }} />
            ) : file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: `${C.accent}1a`, border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={19} color={C.accent} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              </div>
            ) : (
              <>
                <Upload size={26} color={`${C.secondary}cc`} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>صوّر أو ارفع المخطط</span>
                <span style={{ fontSize: 10.5 }}>صورة أو PDF · مخطط طابق / واجهة / موقع</span>
              </>
            )}
          </button>
          {file && <div style={{ fontSize: 10.5, color: C.secondary, textAlign: 'center', marginTop: 6, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>تغيير الملف</div>}

          {/* زر القراءة */}
          {!suggestion && (
            <button onClick={scan} disabled={!file || scanning}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginTop: 12, background: file && !scanning ? C.secondary : `${C.secondary}33`, border: 'none', borderRadius: 12, color: file && !scanning ? '#fff' : C.textDim, fontSize: 13.5, fontWeight: 800, cursor: file && !scanning ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {scanning
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> يقرأ المخطط…</>
                : <><ScanLine size={16} /> اقرأ المخطط</>}
            </button>
          )}

          {/* الاقتراح القابل للتعديل */}
          {suggestion && (
            <div style={{ marginTop: 14 }}>
              {conf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: conf.color, background: `${conf.color}1a`, border: `1px solid ${conf.color}44`, borderRadius: 8, padding: '3px 9px' }}>
                    <Sparkles size={11} /> {conf.label}
                  </span>
                  {suggestion.notes && <span style={{ fontSize: 10.5, color: C.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.notes}</span>}
                </div>
              )}

              {/* اختيار القطعة الهدف */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>أضِف إلى:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <Chip active={targetBlock === 'new'} onClick={() => setTargetBlock('new')} icon={Plus} label={newBlockName} />
                {blocks.map(b => (
                  <Chip key={b.id} active={targetBlock === b.id} onClick={() => setTargetBlock(b.id)} icon={MapPin} label={b.name} />
                ))}
              </div>

              {/* العمارات */}
              {suggestion.buildings.map((b, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 11px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                    <Building2 size={14} color={BLUE} style={{ flexShrink: 0 }} />
                    <input value={b.name} onChange={e => setB(i, { name: e.target.value })}
                      style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontWeight: 700, outline: 'none', fontFamily: 'inherit', padding: '2px 0' }} />
                    <button onClick={() => removeB(i)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={12} color={C.textDim} />
                      <span style={{ flex: 1, fontSize: 11, color: C.textDim }}>طوابق</span>
                      <MiniStepper value={b.floors} setValue={v => setB(i, { floors: v })} min={1} max={60} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Home size={12} color={C.textDim} />
                      <span style={{ flex: 1, fontSize: 11, color: C.textDim }}>شقق/طابق</span>
                      <MiniStepper value={b.unitsPerFloor} setValue={v => setB(i, { unitsPerFloor: v })} min={0} max={30} />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addB}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: `${BLUE}10`, border: `1px dashed ${BLUE}44`, borderRadius: 11, color: BLUE, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={14} strokeWidth={2.6} /> أضف عمارة
              </button>

              {totals && totals.buildings > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, fontSize: 11.5, color: C.text, fontWeight: 700 }}>
                  <span><b style={{ color: BLUE }}>{totals.buildings}</b> عمارة</span>
                  <span style={{ color: C.textDim }}>·</span>
                  <span><b style={{ color: BLUE }}>{totals.floors}</b> طابق</span>
                  <span style={{ color: C.textDim }}>·</span>
                  <span><b style={{ color: BLUE }}>{totals.units}</b> شقّة</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', marginTop: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, borderRadius: 11, color: C.accent, fontSize: 12 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
        </div>

        {/* تذييل */}
        {suggestion && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => { setSuggestion(null); setError('') }}
              style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>رجوع</button>
            <button onClick={build} disabled={!canBuild || building}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: canBuild && !building ? `linear-gradient(135deg, ${C.secondary}, ${C.primary})` : `${C.secondary}33`, border: 'none', color: canBuild && !building ? '#fff' : C.textDim, fontSize: 13.5, fontWeight: 800, cursor: canBuild && !building ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {building
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> يبني…</>
                : <><Check size={16} strokeWidth={2.6} /> ابنِ الموقع</>}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── شريحة اختيار ───────────────────────────────────────────────────────────────
function Chip({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, background: active ? `${C.secondary}22` : C.card, border: `1px solid ${active ? C.secondary + '66' : C.border}`, color: active ? C.secondary : C.textDim, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      <Icon size={12} /> {label}
    </button>
  )
}
