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

const avg = (arr) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0)
const childrenOf = (units, parentId) => units.filter(u => (u.parent_id || null) === (parentId || null))

/** تقدّم عمارة: متوسّط طوابقها إن وُجدت، وإلا وزن حالتها نفسها. */
export function buildingProgress(building, units) {
  const floors = childrenOf(units, building.id).filter(u => u.level === 'floor')
  if (floors.length) return Math.round(avg(floors.map(f => phaseWeight(f.status))))
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

/** توزيع عدد العمارات حسب المرحلة (للأسطورة/الملخّص). */
export function phaseTally(units) {
  const buildings = units.filter(u => u.level === 'building')
  const t = {}
  for (const p of SITE_PHASES) t[p.id] = 0
  for (const b of buildings) t[b.status] = (t[b.status] || 0) + 1
  return t
}
