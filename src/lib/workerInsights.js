// ════════════════════════════════════════════════════════════════════════════
//  workerInsights.js — دوال نقيّة لميزات صفحة العمّال الذكية (قابلة للاختبار)
//    1. buildAttendanceHeatmap  — خريطة حضور حرارية (نمط GitHub)
//    2. buildFleetDna / buildRadarData — رادار أداء مقارن بالأسطول
//    3. detectWorkerAnomalies   — كشف الشذوذ الذكي
//    4. buildWorkerTimeline     — خطّ زمني موحّد لكل أحداث العامل
//    5. buildFleetLeaderboard   — لوحة شرف الأسطول (ترتيب + ميداليات)
//  كل الحسابات هنا نقيّة بلا أي تأثير جانبي؛ الـ UI يقرأ منها فقط.
// ════════════════════════════════════════════════════════════════════════════

import { calcMustahaq } from './calculations.js'

// ── أدوات داخلية ──────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0')
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const stripTime = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const wdAmount = w => w.amount || w.daily_rate || 0

// ════════════════════════════════════════════════════════════════════════════
//  1. خريطة الحضور الحرارية
//     تبني شبكة آخر `weeks` أسبوع (أعمدة) × 7 أيام (أحد→سبت)، كل خليّة بمستوى 0..4
// ════════════════════════════════════════════════════════════════════════════
export function buildAttendanceHeatmap(workDays = [], { weeks = 26, today = new Date() } = {}) {
  const totalDays = weeks * 7
  const end = stripTime(today)
  // محاذاة نهاية الشبكة لنهاية الأسبوع الحالي (السبت = 6)
  const weekEnd = new Date(end); weekEnd.setDate(end.getDate() + (6 - end.getDay()))
  // البداية = أحد، قبل weekEnd بـ totalDays-1 يوم
  const start = new Date(weekEnd); start.setDate(weekEnd.getDate() - (totalDays - 1))

  // تجميع أيام العمل حسب التاريخ
  const byDate = {}
  for (const w of workDays) {
    if (!w.date) continue
    const key = w.date.slice(0, 10)
    if (!byDate[key]) byDate[key] = { count: 0, amount: 0, types: [], pending: 0 }
    byDate[key].count += 1
    byDate[key].amount += wdAmount(w)
    if (w.status === 'pending') byDate[key].pending += 1
    if (w.day_type) byDate[key].types.push(w.day_type)
  }

  const cells = []
  let maxAmount = 0
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const key = toKey(d)
    const rec = byDate[key]
    const amount = rec?.amount || 0
    if (amount > maxAmount) maxAmount = amount
    cells.push({
      date: key, weekday: d.getDay(),
      amount, count: rec?.count || 0,
      pending: rec?.pending || 0,
      dayType: rec?.types[0] || null,
      future: d > end,
    })
  }
  // مستوى الحرارة 0..4 نسبةً لأعلى يوم
  for (const c of cells) {
    c.level = c.count === 0 ? 0 : (maxAmount > 0 ? clamp(Math.ceil((c.amount / maxAmount) * 4), 1, 4) : 1)
  }

  const grid = []
  for (let w = 0; w < weeks; w++) grid.push(cells.slice(w * 7, w * 7 + 7))

  const active = cells.filter(c => c.count > 0)
  return {
    grid, cells, weeks, maxAmount,
    totalActiveDays: active.length,
    totalAmount: active.reduce((s, c) => s + c.amount, 0),
    longestStreak: longestStreak(cells),
  }
}

// أطول سلسلة أيام عمل متتالية (بالأيام التقويمية)
function longestStreak(cells) {
  let best = 0, cur = 0
  for (const c of cells) {
    if (c.count > 0) { cur += 1; if (cur > best) best = cur }
    else cur = 0
  }
  return best
}

// ════════════════════════════════════════════════════════════════════════════
//  2. رادار الأداء — متوسّط بصمة الأسطول + تحويلها لبيانات رادار
// ════════════════════════════════════════════════════════════════════════════
export function buildFleetDna(dnaList = []) {
  const valid = dnaList.filter(d => d?.factors?.length)
  if (!valid.length) return null
  const base = valid[0].factors
  const factors = base.map((bf, idx) => {
    const avg = Math.round(
      valid.reduce((s, d) => s + (d.factors.find(f => f.key === bf.key)?.score || 0), 0) / valid.length
    )
    return { key: bf.key, label: bf.label, score: avg }
  })
  const score = Math.round(valid.reduce((s, d) => s + (d.score || 0), 0) / valid.length)
  return { factors, score, count: valid.length }
}

export function buildRadarData(dna, fleetDna) {
  if (!dna?.factors?.length) return []
  return dna.factors.map(f => ({
    axis: f.label,
    worker: f.score,
    fleet: fleetDna?.factors?.find(x => x.key === f.key)?.score ?? 50,
  }))
}

// ════════════════════════════════════════════════════════════════════════════
//  3. كشف الشذوذ الذكي
// ════════════════════════════════════════════════════════════════════════════
export function detectWorkerAnomalies(worker, { workDays = [], advances = [], expenses = [], today = new Date() } = {}) {
  if (!worker) return []
  const eid = worker.id
  const wds = workDays.filter(w => w.employee_id === eid)
  const wdsApp = wds.filter(w => w.status === 'approved')
  const out = []

  // (أ) أيام مكرّرة بنفس التاريخ والمشروع
  const seen = {}
  for (const w of wds) {
    if (!w.date) continue
    const k = `${w.date.slice(0, 10)}__${w.project_id || ''}`
    seen[k] = (seen[k] || 0) + 1
  }
  const dups = Object.values(seen).filter(n => n > 1).length
  if (dups) out.push({ severity: 'high', type: 'duplicate', icon: 'Copy', count: dups,
    text: `${dups} يوم مكرّر بنفس التاريخ والمشروع — تأكّد من عدم ازدواج الإدخال.` })

  // (ب) مبلغ يومي شاذّ (> 2.5× الوسيط)
  const amounts = wdsApp.map(wdAmount).filter(a => a > 0).sort((a, b) => a - b)
  if (amounts.length >= 4) {
    const med = amounts[Math.floor(amounts.length / 2)]
    const outliers = wdsApp.filter(w => med > 0 && wdAmount(w) > med * 2.5).length
    if (outliers) out.push({ severity: 'medium', type: 'amount_outlier', icon: 'TrendingUp', count: outliers,
      text: `${outliers} يوم بمبلغ أعلى بكثير من المعتاد (>2.5× الوسيط ₪${Math.round(med)}).` })
  }

  // (ج) ساعات طويلة غير منطقية
  const longDays = wdsApp.filter(w => (w.hours || 0) >= 16).length
  if (longDays) out.push({ severity: 'medium', type: 'long_hours', icon: 'Clock', count: longDays,
    text: `${longDays} يوم مسجّل بـ16 ساعة أو أكثر — راجِع الإدخال.` })

  // (د) السلف مقابل المستحق
  const expApp = expenses.filter(e => e.employee_id === eid && e.status === 'approved')
  const earned = calcMustahaq(wdsApp, expApp)
  const advTotal = advances.filter(a => a.employee_id === eid).reduce((s, a) => s + (a.amount || 0), 0)
  if (advTotal > 0 && advTotal > earned)
    out.push({ severity: 'high', type: 'over_advance', icon: 'AlertTriangle',
      text: `السلف (₪${Math.round(advTotal)}) تجاوزت المستحق (₪${Math.round(earned)}) — خطر عند التصفية.` })
  else if (earned > 0 && advTotal / earned >= 0.7)
    out.push({ severity: 'medium', type: 'high_advance', icon: 'CreditCard',
      text: `السلف تشكّل ${Math.round((advTotal / earned) * 100)}% من المستحق — راقب التصفية.` })

  // (هـ) خمول طويل
  const dates = wds.map(w => w.date).filter(Boolean).sort()
  if (dates.length) {
    const last = dates[dates.length - 1]
    const days = Math.floor((stripTime(today) - new Date(last)) / 86400000)
    if (days >= 14) out.push({ severity: 'low', type: 'inactive', icon: 'CalendarOff', days,
      text: `ما في تسجيل من ${days} يوم — آخر يوم عمل ${last}.` })
  }

  // (و) تكدّس أيام معلّقة
  const pend = wds.filter(w => w.status === 'pending').length
  if (pend >= 5) out.push({ severity: 'medium', type: 'pending', icon: 'Clock', count: pend,
    text: `${pend} يوم بانتظار موافقتك — راجِعها لتثبيت المستحق.` })

  const rank = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity])
}

// ════════════════════════════════════════════════════════════════════════════
//  4. الخطّ الزمني الموحّد
// ════════════════════════════════════════════════════════════════════════════
export function buildWorkerTimeline(worker, { workDays = [], payments = [], advances = [], expenses = [], projects = [] } = {}, { limit = 80 } = {}) {
  if (!worker) return []
  const eid = worker.id
  const projName = id => projects.find(p => p.id === id)?.name || ''
  const ev = []

  for (const w of workDays.filter(w => w.employee_id === eid))
    ev.push({ id: `wd-${w.id}`, kind: 'workday', date: (w.date || '').slice(0, 10), amount: wdAmount(w), sign: +1,
      title: projName(w.project_id) || 'يوم عمل', sub: w.day_type || '', status: w.status })

  for (const p of payments.filter(p => p.employee_id === eid))
    ev.push({ id: `pay-${p.id}`, kind: 'payment', date: (p.date || '').slice(0, 10), amount: p.amount || 0, sign: -1,
      title: 'دفعة راتب', sub: p.method || '', ref: p.ref_number })

  for (const a of advances.filter(a => a.employee_id === eid))
    ev.push({ id: `adv-${a.id}`, kind: 'advance', date: (a.date || a.requested_date || '').slice(0, 10), amount: a.amount || 0, sign: -1,
      title: 'سلفة', sub: a.notes || '', status: a.status })

  for (const e of expenses.filter(e => e.employee_id === eid))
    ev.push({ id: `exp-${e.id}`, kind: 'expense', date: (e.date || '').slice(0, 10), amount: e.amount || 0, sign: +1,
      title: e.category || 'مصروف', sub: projName(e.project_id) || '', status: e.status })

  ev.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return ev.slice(0, limit)
}

// ════════════════════════════════════════════════════════════════════════════
//  5. لوحة شرف الأسطول
// ════════════════════════════════════════════════════════════════════════════
export function buildFleetLeaderboard(employees = [], dnaMap = {}, statsMap = {}) {
  const rows = employees.map(e => {
    const dna = dnaMap[e.id]
    const st = statsMap[e.id] || {}
    return {
      id: e.id, name: e.name, specialty: e.specialty || '',
      score: dna?.score || 0, tier: dna?.tier || '', star: !!dna?.star,
      earned: st.earned || 0, days: st.days || 0,
    }
  }).filter(r => r.days > 0 || r.earned > 0)

  rows.sort((a, b) => (b.score - a.score) || (b.earned - a.earned))
  const medals = ['gold', 'silver', 'bronze']
  return rows.map((r, i) => ({ ...r, rank: i + 1, medal: medals[i] || null }))
}
