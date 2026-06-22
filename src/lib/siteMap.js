// ─── خريطة الموقع الحيّة — منطق المراحل والتقدّم (دوال نقيّة، قابلة للاختبار) ───
// المراحل الإنشائية: مخطط → أساس → هيكل → تشطيب → مكتمل
// لكل مرحلة وزن (0–100) يُحسب منه تقدّم الوحدة والقطعة والموقع كاملاً.

import { C } from '../constants/index.js'

export const SITE_PHASES = [
  { id: 'planned',   label: 'مخطط',  weight: 0   },
  { id: 'foundation', label: 'أساس',  weight: 25  },
  { id: 'structure', label: 'هيكل',  weight: 55  },
  { id: 'finishing', label: 'تشطيب', weight: 80  },
  { id: 'done',      label: 'مكتمل', weight: 100 },
]

// لون كل مرحلة (مصدر واحد يشاركه SiteMapTab والمجسّم 3D)
export const PHASE_COLOR = {
  planned: C.textDim, foundation: C.primary, structure: C.warning, finishing: C.cyan, done: C.success,
}
export const phaseColor = (status) => PHASE_COLOR[status] || C.textDim

export const phaseOf = (status) => SITE_PHASES.find(p => p.id === status) || SITE_PHASES[0]
export const phaseWeight = (status) => phaseOf(status).weight
export const nextPhase = (status) => {
  const i = SITE_PHASES.findIndex(p => p.id === status)
  return SITE_PHASES[(i + 1) % SITE_PHASES.length].id
}

/** أقرب مرحلة (للتلوين) لنسبة تقدّم 0–100 — لطابق مبنيّ من شقق. */
export function phaseFromProgress(pct) {
  let best = SITE_PHASES[0]
  for (const p of SITE_PHASES) if (pct >= p.weight) best = p
  return best.id
}

// ─── البنود الخمسة للشقّة (مرتّبة حسب التنفيذ الفعلي على الأرض) ───────────────
// كل بند حصّة متساوية من تقدّم الشقّة (٢٠٪)، والحالة «ماشي» = نص الحصّة.
export const UNIT_TRADES = [
  { id: 'structure',  label: 'هيكل',   color: C.primary   }, // 🟧
  { id: 'plumbing',   label: 'مواسير', color: C.warning   }, // 🟨
  { id: 'electrical', label: 'كهرباء', color: C.cyan      }, // 🟦
  { id: 'finishing',  label: 'تشطيب',  color: C.secondary }, // 🟪
  { id: 'handover',   label: 'تسليم',  color: C.success   }, // 🟩
]

// حالات البند: لسا → ماشي → خلص (دورة بالنقر)، لكلٍّ كسر مساهمته في التقدّم.
export const TRADE_STATES = [
  { id: 'todo',  label: 'لسا',  frac: 0   },
  { id: 'doing', label: 'ماشي', frac: 0.5 },
  { id: 'done',  label: 'خلص',  frac: 1   },
]
export const tradeState = (id) => TRADE_STATES.find(s => s.id === id) || TRADE_STATES[0]
export const nextTradeState = (id) => {
  const i = TRADE_STATES.findIndex(s => s.id === id)
  const cur = i < 0 ? 0 : i // غير معرّف = 'todo' فالتالي 'ماشي' (لا 'لسا')
  return TRADE_STATES[(cur + 1) % TRADE_STATES.length].id
}

/** تقدّم شقّة (0–100) من بنودها الخمسة. trades = { tradeId: 'todo'|'doing'|'done' }. */
export function unitProgress(unit) {
  const trades = (unit && unit.trades) || {}
  const share = 100 / UNIT_TRADES.length
  let pct = 0
  for (const t of UNIT_TRADES) pct += tradeState(trades[t.id]).frac * share
  return Math.round(pct)
}

/** تقدّم طابق: متوسّط شققه إن وُجدت، وإلا وزن مرحلته (توافق خلفي مع الطوابق بلا شقق). */
export function floorProgress(floor, units) {
  const uns = childrenOf(units, floor.id).filter(u => u.level === 'unit')
  if (uns.length) return Math.round(avg(uns.map(unitProgress)))
  return phaseWeight(floor.status)
}

const avg = (arr) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0)
const childrenOf = (units, parentId) => units.filter(u => (u.parent_id || null) === (parentId || null))

/** تقدّم عمارة: متوسّط تقدّم طوابقها (شقق-واعٍ) إن وُجدت، وإلا وزن حالتها نفسها. */
export function buildingProgress(building, units) {
  const floors = childrenOf(units, building.id).filter(u => u.level === 'floor')
  if (floors.length) return Math.round(avg(floors.map(f => floorProgress(f, units))))
  return phaseWeight(building.status)
}

/** تقدّم قطعة: متوسّط عماراتها إن وُجدت، وإلا وزن حالتها نفسها. */
export function blockProgress(block, units) {
  const buildings = childrenOf(units, block.id).filter(u => u.level === 'building')
  if (buildings.length) return Math.round(avg(buildings.map(b => buildingProgress(b, units))))
  return phaseWeight(block.status)
}

/** تقدّم الموقع كاملاً: متوسّط القطع العليا (parent_id = null). */
export function siteProgress(units) {
  const blocks = childrenOf(units, null).filter(u => u.level === 'block')
  if (blocks.length) return Math.round(avg(blocks.map(b => blockProgress(b, units))))
  // لا قطع: اعتمد على العمارات العليا إن وُجدت
  const topBuildings = childrenOf(units, null).filter(u => u.level === 'building')
  if (topBuildings.length) return Math.round(avg(topBuildings.map(b => buildingProgress(b, units))))
  return 0
}

/** لون شقّة حسب تقدّمها (مصدر واحد يشاركه صفّ الشقّة وخلايا المجسّم 3D). */
export function unitTone(pct) {
  if (pct >= 100) return C.success
  if (pct > 0) return C.cyan
  return C.textDim
}

/** شقق طابق مرتّبة. */
export function floorUnits(units, floorId) {
  return childrenOf(units, floorId)
    .filter(u => u.level === 'unit')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

// ─── الإضافة بالجملة (شقق متكرّرة) — دوال نقيّة تبني صفوف الإدراج ───────────────
/** أسماء N شقق جديدة تتابع العدد القائم: «شقّة 4»، «شقّة 5»… */
export function nextUnitNames(existingCount, n, prefix = 'شقّة') {
  const start = Math.max(0, existingCount | 0)
  return Array.from({ length: Math.max(0, n | 0) }, (_, i) => `${prefix} ${start + i + 1}`)
}

/** صفوف إدراج N شقق فارغة تحت طابق. */
export function buildUnitRows(floorId, existingCount, n, prefix = 'شقّة') {
  return nextUnitNames(existingCount, n, prefix).map(name => ({
    level: 'unit', name, parent_id: floorId, status: 'planned', trades: {},
  }))
}

/** الطوابق المؤهّلة لاستقبال نسخة شقق طابق المصدر: طوابق العمارة بلا شقق (عدا المصدر). */
export function replicaTargets(units, buildingId, sourceFloorId) {
  return childrenOf(units, buildingId)
    .filter(f => f.level === 'floor' && f.id !== sourceFloorId)
    .filter(f => floorUnits(units, f.id).length === 0)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(f => f.id)
}

/** صفوف إدراج تكرّر شقق طابق المصدر (بالأسماء، بتقدّم صفر) على كل طابق هدف. */
export function buildReplicaRows(units, sourceFloorId, targetFloorIds) {
  const src = floorUnits(units, sourceFloorId)
  const rows = []
  for (const fid of targetFloorIds || []) {
    for (const u of src) rows.push({ level: 'unit', name: u.name, parent_id: fid, status: 'planned', trades: {} })
  }
  return rows
}

// ─── بناء الموقع من قراءة مخطط بالرؤية (AI) ───────────────────────────────────
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))

/** تطبيع اقتراح الـAI لمخطط: قائمة عمارات، كل واحدة طوابق×شقق ضمن حدود معقولة. */
export function normalizePlan(result) {
  const raw = Array.isArray(result?.buildings) ? result.buildings : []
  const buildings = raw.map((b, i) => {
    let floors = clampInt(b?.floors, 0, 60)
    const unitsPerFloor = clampInt(b?.unitsPerFloor, 0, 30)
    if (floors < 1 && unitsPerFloor > 0) floors = 1 // مخطط طابق واحد
    const name = (b && typeof b.name === 'string' && b.name.trim()) ? b.name.trim() : `عمارة ${i + 1}`
    return { name, floors, unitsPerFloor }
  }).filter(b => b.floors > 0 || b.unitsPerFloor > 0)
  return {
    buildings,
    confidence: ['high', 'medium', 'low'].includes(result?.confidence) ? result.confidence : 'medium',
    notes: typeof result?.notes === 'string' ? result.notes.slice(0, 200) : '',
  }
}

const defaultMakeId = () =>
  (globalThis.crypto && globalThis.crypto.randomUUID)
    ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

/**
 * يبني صفوف إدراج شجرة الموقع (قطعة→عمارات→طوابق→شقق) بمعرّفات مولّدة مسبقاً.
 * الترتيب «الأب قبل الابن» فالإدراج الدفعي الواحد يحترم مفاتيح FK.
 */
export function planToSiteRows(plan, {
  blockId = null, blockName = 'القطعة 1', buildingStart = 0,
  floorStatus = 'foundation', buildingStatus = 'planned', makeId = defaultMakeId,
} = {}) {
  const rows = []
  let blkId = blockId
  if (!blkId) {
    blkId = makeId()
    rows.push({ id: blkId, level: 'block', name: blockName, parent_id: null, status: 'planned', trades: {}, sort_order: 0 })
  }
  ;(plan?.buildings || []).forEach((b, bi) => {
    const bId = makeId()
    rows.push({ id: bId, level: 'building', name: b.name, parent_id: blkId, status: buildingStatus, trades: {}, sort_order: buildingStart + bi })
    for (let fi = 0; fi < b.floors; fi++) {
      const fId = makeId()
      rows.push({ id: fId, level: 'floor', name: `طابق ${fi + 1}`, parent_id: bId, status: floorStatus, trades: {}, sort_order: fi })
      for (let ui = 0; ui < b.unitsPerFloor; ui++) {
        rows.push({ id: makeId(), level: 'unit', name: `شقّة ${ui + 1}`, parent_id: fId, status: 'planned', trades: {}, sort_order: ui })
      }
    }
  })
  return rows
}

/** ملخّص عددي لاقتراح المخطط (عمارات/طوابق/شقق) — للعرض قبل البناء. */
export function planTotals(plan) {
  const buildings = plan?.buildings || []
  return buildings.reduce((t, b) => ({
    buildings: t.buildings + 1,
    floors: t.floors + b.floors,
    units: t.units + b.floors * b.unitsPerFloor,
  }), { buildings: 0, floors: 0, units: 0 })
}

/** توزيع عدد العمارات حسب المرحلة (للأسطورة/الملخّص). */
export function phaseTally(units) {
  const buildings = units.filter(u => u.level === 'building')
  const t = {}
  for (const p of SITE_PHASES) t[p.id] = 0
  for (const b of buildings) t[b.status] = (t[b.status] || 0) + 1
  return t
}
