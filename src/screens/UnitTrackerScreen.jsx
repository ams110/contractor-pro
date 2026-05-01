import React, { useState, useEffect } from 'react'
import { C, GRAD } from '../constants/index.js'
import { fmt, uid } from '../lib/helpers.js'

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadTracker(pid) {
  try {
    const d = JSON.parse(localStorage.getItem(`tracker_${pid}`))
    if (!d || !Array.isArray(d.plots)) return { plots: [] }
    return d
  } catch { return { plots: [] } }
}
function saveTracker(pid, data) { localStorage.setItem(`tracker_${pid}`, JSON.stringify(data)) }
function loadExtras(pid) {
  try { return JSON.parse(localStorage.getItem(`extras_${pid}`)) || [] } catch { return [] }
}
function saveExtras(pid, items) { localStorage.setItem(`extras_${pid}`, JSON.stringify(items)) }

// ─── constants ────────────────────────────────────────────────────────────────
const TASK_STATUS = {
  pending:     { icon: '⬜', label: 'لم يبدأ', color: C.textDim },
  in_progress: { icon: '🔄', label: 'جاري',    color: C.warning },
  done:        { icon: '✅', label: 'منجز',    color: C.success },
}
const STATUS_ORDER = ['pending', 'in_progress', 'done']

const DEFAULT_TASKS = ['شغل أسود', 'شغل أبيض', 'تركيب أباريز', 'حمالات', 'تركيب ألواح كهرباء']

const EXTRA_STATUS = {
  pending:  { label: 'معلق',  color: C.warning },
  approved: { label: 'موافق', color: C.success },
  done:     { label: 'منجز',  color: C.primary },
}
const EXTRA_STATUS_ORDER = ['pending', 'approved', 'done']
const UNITS_LIST = ['م', 'م²', 'م³', 'طن', 'كيس', 'قطعة', 'لتر', 'يوم', 'ساعة']

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeTasks() { return DEFAULT_TASKS.map(name => ({ id: uid(), name, status: 'pending' })) }
function pct(tasks) {
  if (!tasks.length) return 0
  return Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100)
}
function plotTasks(plot)   { return (plot.houses  || []).flatMap(h => (h.floors || []).flatMap(f => f.tasks || [])) }
function houseTasks(house) { return (house.floors || []).flatMap(f => f.tasks || []) }
function allTasks(data)    { return (data.plots   || []).flatMap(plotTasks) }

// ─── shared UI ────────────────────────────────────────────────────────────────
function ProgressBar({ p: pval, height = 5 }) {
  const v = Math.min(100, Math.max(0, pval || 0))
  return (
    <div style={{ height, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${v}%`, background: v === 100 ? GRAD.success : GRAD.brand, borderRadius: 99, transition: 'width .4s ease' }} />
    </div>
  )
}

function AddRow({ placeholder, onAdd, onCancel }) {
  const [v, setV] = useState('')
  function submit() { if (v.trim()) { onAdd(v.trim()); setV('') } }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') onCancel() }}
        placeholder={placeholder} autoFocus
        style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.primary}66`, background: C.bg, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
      <button onClick={submit}
        style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: C.primary, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+</button>
      <button onClick={onCancel}
        style={{ padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 12, cursor: 'pointer' }}>✕</button>
    </div>
  )
}

// ─── Tracking Tab ─────────────────────────────────────────────────────────────
function TrackingTab({ projectId }) {
  const [data, setData] = useState(() => loadTracker(projectId))

  const [openPlots,  setOpenPlots]  = useState({})
  const [openHouses, setOpenHouses] = useState({})
  const [openFloors, setOpenFloors] = useState({})

  const [addingPlot,  setAddingPlot]  = useState(false)
  const [addingHouse, setAddingHouse] = useState(null)  // plotId
  const [addingFloor, setAddingFloor] = useState(null)  // houseId
  const [addingTask,  setAddingTask]  = useState(null)  // floorId

  useEffect(() => {
    const d = loadTracker(projectId)
    setData(d)
    setAddingPlot(false); setAddingHouse(null); setAddingFloor(null); setAddingTask(null)
    if (d.plots[0]) {
      setOpenPlots({ [d.plots[0].id]: true })
      if (d.plots[0].houses[0]) setOpenHouses({ [d.plots[0].houses[0].id]: true })
    }
  }, [projectId])

  function save(next) { setData(next); saveTracker(projectId, next) }

  // ── plot CRUD ──
  function addPlot(name) {
    save({ ...data, plots: [...data.plots, { id: uid(), name, houses: [] }] })
    setAddingPlot(false)
  }
  function delPlot(plotId) {
    if (!window.confirm('حذف هذه القطعة وكل محتوياتها؟')) return
    save({ ...data, plots: data.plots.filter(p => p.id !== plotId) })
  }

  // ── house CRUD ──
  function addHouse(plotId, name) {
    save({ ...data, plots: data.plots.map(p => p.id !== plotId ? p : { ...p, houses: [...p.houses, { id: uid(), name, floors: [] }] }) })
    setAddingHouse(null)
  }
  function delHouse(plotId, houseId) {
    if (!window.confirm('حذف هذا البيت وكل طوابقه؟')) return
    save({ ...data, plots: data.plots.map(p => p.id !== plotId ? p : { ...p, houses: p.houses.filter(h => h.id !== houseId) }) })
  }

  // ── floor CRUD ──
  function addFloor(plotId, houseId, name) {
    const floor = { id: uid(), name, tasks: makeTasks() }
    save({
      ...data,
      plots: data.plots.map(p => p.id !== plotId ? p : {
        ...p, houses: p.houses.map(h => h.id !== houseId ? h : { ...h, floors: [...h.floors, floor] })
      })
    })
    setAddingFloor(null)
  }
  function delFloor(plotId, houseId, floorId) {
    if (!window.confirm('حذف هذا الطابق؟')) return
    save({
      ...data,
      plots: data.plots.map(p => p.id !== plotId ? p : {
        ...p, houses: p.houses.map(h => h.id !== houseId ? h : { ...h, floors: h.floors.filter(f => f.id !== floorId) })
      })
    })
  }

  // ── task CRUD ──
  function cycleTask(plotId, houseId, floorId, taskId) {
    save({
      ...data,
      plots: data.plots.map(p => p.id !== plotId ? p : {
        ...p, houses: p.houses.map(h => h.id !== houseId ? h : {
          ...h, floors: h.floors.map(f => f.id !== floorId ? f : {
            ...f, tasks: f.tasks.map(t => t.id !== taskId ? t : {
              ...t, status: STATUS_ORDER[(STATUS_ORDER.indexOf(t.status) + 1) % STATUS_ORDER.length]
            })
          })
        })
      })
    })
  }
  function addTask(plotId, houseId, floorId, name) {
    save({
      ...data,
      plots: data.plots.map(p => p.id !== plotId ? p : {
        ...p, houses: p.houses.map(h => h.id !== houseId ? h : {
          ...h, floors: h.floors.map(f => f.id !== floorId ? f : {
            ...f, tasks: [...f.tasks, { id: uid(), name, status: 'pending' }]
          })
        })
      })
    })
    setAddingTask(null)
  }
  function delTask(plotId, houseId, floorId, taskId) {
    save({
      ...data,
      plots: data.plots.map(p => p.id !== plotId ? p : {
        ...p, houses: p.houses.map(h => h.id !== houseId ? h : {
          ...h, floors: h.floors.map(f => f.id !== floorId ? f : {
            ...f, tasks: f.tasks.filter(t => t.id !== taskId)
          })
        })
      })
    })
  }

  const total   = allTasks(data)
  const totalPct = pct(total)

  return (
    <div>
      {/* التقدم الكلي */}
      {total.length > 0 && (
        <div style={{ background: `${C.primary}12`, borderRadius: 14, border: `1px solid ${C.primary}33`, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDim }}>التقدم الكلي</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: totalPct === 100 ? C.success : C.primary, fontFamily: 'monospace' }}>{totalPct}%</span>
          </div>
          <ProgressBar p={totalPct} height={8} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 6 }}>
            {total.filter(t => t.status === 'done').length} منجز من {total.length} مهمة
          </div>
        </div>
      )}

      {/* ── مستوى 1: القطع ── */}
      {data.plots.map(plot => {
        const pt    = plotTasks(plot)
        const pp    = pct(pt)
        const pOpen = openPlots[plot.id] !== false

        return (
          <div key={plot.id} style={{ marginBottom: 10 }}>

            {/* رأس القطعة */}
            <div style={{
              background: C.card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderRadius: pOpen ? '14px 14px 0 0' : 14,
              border: `1px solid ${C.borderMid}`,
            }}>
              <button onClick={() => setOpenPlots(s => ({ ...s, [plot.id]: !pOpen }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.textDim, padding: 0, flexShrink: 0 }}>
                {pOpen ? '▼' : '►'}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>🏘️ {plot.name}</span>
                  <span style={{ fontSize: 10, background: C.surface, color: C.textDim, padding: '1px 7px', borderRadius: 6 }}>{plot.houses.length} بيت</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: pp === 100 ? C.success : C.primary, fontFamily: 'monospace', marginRight: 'auto' }}>{pp}%</span>
                </div>
                <ProgressBar p={pp} height={5} />
              </div>
              <button onClick={() => delPlot(plot.id)}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>🗑</button>
            </div>

            {/* داخل القطعة: البيوت */}
            {pOpen && (
              <div style={{
                background: C.bg, padding: '10px 12px 12px',
                borderRadius: '0 0 14px 14px',
                border: `1px solid ${C.borderMid}`, borderTop: 'none',
              }}>

                {/* ── مستوى 2: البيوت ── */}
                {plot.houses.map(house => {
                  const ht    = houseTasks(house)
                  const hp    = pct(ht)
                  const hOpen = openHouses[house.id] !== false

                  return (
                    <div key={house.id} style={{ marginBottom: 8 }}>

                      {/* رأس البيت */}
                      <div style={{
                        background: C.surface, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                        borderRadius: hOpen ? '11px 11px 0 0' : 11,
                        border: `1px solid ${C.border}`,
                      }}>
                        <button onClick={() => setOpenHouses(s => ({ ...s, [house.id]: !hOpen }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: C.textDim, padding: 0, flexShrink: 0 }}>
                          {hOpen ? '▼' : '►'}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>🏠 {house.name}</span>
                            <span style={{ fontSize: 10, background: C.bg, color: C.textDim, padding: '1px 6px', borderRadius: 5 }}>{house.floors.length} طابق</span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: hp === 100 ? C.success : C.secondary, fontFamily: 'monospace', marginRight: 'auto' }}>{hp}%</span>
                          </div>
                          <ProgressBar p={hp} height={4} />
                        </div>
                        <button onClick={() => delHouse(plot.id, house.id)}
                          style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>🗑</button>
                      </div>

                      {/* داخل البيت: الطوابق */}
                      {hOpen && (
                        <div style={{
                          background: C.card, padding: '8px 10px 10px',
                          borderRadius: '0 0 11px 11px',
                          border: `1px solid ${C.border}`, borderTop: 'none',
                        }}>

                          {/* ── مستوى 3: الطوابق ── */}
                          {house.floors.map(floor => {
                            const fp    = pct(floor.tasks)
                            const fOpen = openFloors[floor.id] !== false

                            return (
                              <div key={floor.id} style={{ marginBottom: 6 }}>

                                {/* رأس الطابق */}
                                <div style={{
                                  background: C.bg, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7,
                                  borderRadius: fOpen ? '9px 9px 0 0' : 9,
                                  border: `1px solid ${C.border}`,
                                }}>
                                  <button onClick={() => setOpenFloors(s => ({ ...s, [floor.id]: !fOpen }))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: C.textDim, padding: 0, flexShrink: 0 }}>
                                    {fOpen ? '▼' : '►'}
                                  </button>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>🏢 {floor.name}</span>
                                      <span style={{ fontSize: 9, color: C.textDim, background: C.surface, padding: '1px 5px', borderRadius: 4 }}>
                                        {floor.tasks.filter(t => t.status === 'done').length}/{floor.tasks.length}
                                      </span>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: fp === 100 ? C.success : C.orange, fontFamily: 'monospace', marginRight: 'auto' }}>{fp}%</span>
                                    </div>
                                    <ProgressBar p={fp} height={3} />
                                  </div>
                                  <button onClick={() => delFloor(plot.id, house.id, floor.id)}
                                    style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>🗑</button>
                                </div>

                                {/* ── مستوى 4: المهام ── */}
                                {fOpen && (
                                  <div style={{
                                    background: `${C.surface}cc`, padding: '8px 10px 10px',
                                    borderRadius: '0 0 9px 9px',
                                    border: `1px solid ${C.border}`, borderTop: 'none',
                                  }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                                      {floor.tasks.map(task => {
                                        const st = TASK_STATUS[task.status]
                                        return (
                                          <div key={task.id}
                                            onClick={() => cycleTask(plot.id, house.id, floor.id, task.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px 4px 6px', borderRadius: 8, background: `${st.color}15`, border: `1.5px solid ${st.color}44`, cursor: 'pointer', userSelect: 'none' }}>
                                            <span style={{ fontSize: 13 }}>{st.icon}</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{task.name}</span>
                                            <button onClick={e => { e.stopPropagation(); delTask(plot.id, house.id, floor.id, task.id) }}
                                              style={{ background: 'none', border: 'none', color: `${C.textDim}99`, fontSize: 9, cursor: 'pointer', padding: '0 0 0 3px', lineHeight: 1 }}>✕</button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    {addingTask === floor.id ? (
                                      <AddRow placeholder="اسم المهمة" onAdd={name => addTask(plot.id, house.id, floor.id, name)} onCancel={() => setAddingTask(null)} />
                                    ) : (
                                      <button onClick={() => setAddingTask(floor.id)}
                                        style={{ fontSize: 10, color: C.orange, background: `${C.orange}11`, border: `1px dashed ${C.orange}44`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                                        + مهمة
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* + طابق */}
                          <div style={{ marginTop: 4 }}>
                            {addingFloor === house.id ? (
                              <AddRow placeholder="اسم الطابق (مثال: طابق أرضي)" onAdd={name => addFloor(plot.id, house.id, name)} onCancel={() => setAddingFloor(null)} />
                            ) : (
                              <button onClick={() => setAddingFloor(house.id)}
                                style={{ width: '100%', padding: '7px 0', borderRadius: 9, border: `1.5px dashed ${C.secondary}44`, background: `${C.secondary}08`, color: C.secondary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                + طابق
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* + بيت */}
                <div style={{ marginTop: 4 }}>
                  {addingHouse === plot.id ? (
                    <AddRow placeholder="اسم البيت (مثال: بيت 1)" onAdd={name => addHouse(plot.id, name)} onCancel={() => setAddingHouse(null)} />
                  ) : (
                    <button onClick={() => setAddingHouse(plot.id)}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 11, border: `1.5px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      + بيت
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* + قطعة */}
      {addingPlot ? (
        <div style={{ marginTop: 6 }}>
          <AddRow placeholder="اسم القطعة (مثال: מגרש 71)" onAdd={addPlot} onCancel={() => setAddingPlot(false)} />
        </div>
      ) : (
        <button onClick={() => setAddingPlot(true)}
          style={{ width: '100%', marginTop: 6, padding: '12px 0', borderRadius: 13, border: `2px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ➕ إضافة قطعة (מגרש)
        </button>
      )}

      {data.plots.length === 0 && !addingPlot && (
        <div style={{ textAlign: 'center', padding: '36px 0', color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏘️</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>لا توجد قطع بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف قطعة (מגרש) للبدء بالتتبع</div>
        </div>
      )}
    </div>
  )
}

// ─── Extras Tab ───────────────────────────────────────────────────────────────
const EMPTY_EXTRA = { title: '', qty: '', unit: 'م', unitPrice: '', status: 'pending', notes: '' }

function ExtrasTab({ projectId }) {
  const [extras,       setExtras]       = useState(() => loadExtras(projectId))
  const [showForm,     setShowForm]     = useState(false)
  const [editingExtra, setEditingExtra] = useState(null)
  const [form,         setForm]         = useState(EMPTY_EXTRA)

  useEffect(() => { setExtras(loadExtras(projectId)); setShowForm(false); setEditingExtra(null) }, [projectId])

  function persist(items) { setExtras(items); saveExtras(projectId, items) }
  function setF(field, val) { setForm(p => ({ ...p, [field]: val })) }

  const isValid = form.title.trim() && parseFloat(form.qty) > 0 && parseFloat(form.unitPrice) >= 0

  function handleSave() {
    if (!isValid) return
    if (editingExtra) {
      persist(extras.map(e => e.id === editingExtra ? { ...form, id: editingExtra } : e))
      setEditingExtra(null)
    } else {
      persist([{ ...form, id: uid(), createdAt: new Date().toISOString() }, ...extras])
      setShowForm(false)
    }
    setForm(EMPTY_EXTRA)
  }

  function startEdit(extra) {
    setForm({ title: extra.title, qty: extra.qty, unit: extra.unit, unitPrice: extra.unitPrice, status: extra.status, notes: extra.notes || '' })
    setEditingExtra(extra.id)
    setShowForm(false)
  }

  function cycleStatus(id) {
    persist(extras.map(e => e.id !== id ? e : { ...e, status: EXTRA_STATUS_ORDER[(EXTRA_STATUS_ORDER.indexOf(e.status) + 1) % EXTRA_STATUS_ORDER.length] }))
  }

  const approvedTotal = extras.filter(e => e.status === 'approved' || e.status === 'done')
    .reduce((s, e) => s + (parseFloat(e.qty) || 0) * (parseFloat(e.unitPrice) || 0), 0)
  const grandTotal = extras.reduce((s, e) => s + (parseFloat(e.qty) || 0) * (parseFloat(e.unitPrice) || 0), 0)

  const ExtraFormEl = (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.borderMid}`, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>{editingExtra ? '✏️ تعديل الزيادة' : '➕ زيادة جديدة'}</div>

      <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="الوصف *"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 8 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>الكمية *</div>
          <input type="number" min="0" step="any" value={form.qty} onChange={e => setF('qty', e.target.value)} placeholder="0"
            style={{ width: '100%', padding: '9px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>الوحدة</div>
          <select value={form.unit} onChange={e => setF('unit', e.target.value)}
            style={{ width: '100%', padding: '9px 8px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
            {UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>السعر (₪) *</div>
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setF('unitPrice', e.target.value)} placeholder="0"
            style={{ width: '100%', padding: '9px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
        </div>
      </div>

      {form.qty && form.unitPrice && (
        <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, marginBottom: 8 }}>
          الإجمالي: {fmt((parseFloat(form.qty) || 0) * (parseFloat(form.unitPrice) || 0))}₪
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {Object.entries(EXTRA_STATUS).map(([key, s]) => (
          <button key={key} onClick={() => setF('status', key)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${form.status === key ? s.color : C.border}`, background: form.status === key ? `${s.color}22` : 'transparent', color: form.status === key ? s.color : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="ملاحظات (اختياري)" rows={2}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setShowForm(false); setEditingExtra(null); setForm(EMPTY_EXTRA) }}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          إلغاء
        </button>
        <button onClick={handleSave} disabled={!isValid}
          style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: isValid ? GRAD.brand : C.border, color: isValid ? '#000' : C.textDim, fontSize: 12, fontWeight: 800, cursor: isValid ? 'pointer' : 'default' }}>
          {editingExtra ? 'حفظ التعديل' : '+ إضافة'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {extras.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.borderMid}`, padding: '12px 16px', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: 3, background: GRAD.brand, margin: '-12px -16px 12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: `${C.success}12`, borderRadius: 10, border: `1px solid ${C.success}22` }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>معتمد</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>{fmt(approvedTotal)}₪</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: `${C.primary}12`, borderRadius: 10, border: `1px solid ${C.primary}22` }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>الإجمالي</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(grandTotal)}₪</div>
            </div>
          </div>
        </div>
      )}

      {showForm && !editingExtra && ExtraFormEl}
      {editingExtra && ExtraFormEl}

      {extras.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: C.textDim }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>لا توجد زيادات بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف أي أعمال خارج نطاق العقد</div>
        </div>
      ) : (
        extras.map(extra => {
          const s   = EXTRA_STATUS[extra.status] || EXTRA_STATUS.pending
          const tot = (parseFloat(extra.qty) || 0) * (parseFloat(extra.unitPrice) || 0)
          if (editingExtra === extra.id) return null
          return (
            <div key={extra.id} style={{ background: C.card, borderRadius: 13, border: `1px solid ${C.border}`, padding: '11px 13px', marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{extra.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>
                    {extra.qty} {extra.unit} × {fmt(parseFloat(extra.unitPrice) || 0)}₪
                  </div>
                  {extra.notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, fontStyle: 'italic' }}>{extra.notes}</div>}
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, fontFamily: 'monospace', marginBottom: 4 }}>{fmt(tot)}₪</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}22`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.color}33` }}>{s.label}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, paddingTop: 8, borderTop: `1px solid ${C.border}22` }}>
                <button onClick={() => cycleStatus(extra.id)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>⟳ الحالة</button>
                <button onClick={() => startEdit(extra)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.primary}44`, background: `${C.primary}11`, color: C.primary, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✏️ تعديل</button>
                <button onClick={() => { if (window.confirm('حذف هذه الزيادة؟')) persist(extras.filter(e => e.id !== extra.id)) }}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>🗑 حذف</button>
              </div>
            </div>
          )
        })
      )}

      {!showForm && !editingExtra && (
        <button onClick={() => { setShowForm(true); setForm(EMPTY_EXTRA) }}
          style={{ width: '100%', marginTop: 4, padding: '12px 0', borderRadius: 13, border: `2px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ➕ زيادة جديدة
        </button>
      )}
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UnitTrackerScreen({ projects = [] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [tab,       setTab]       = useState('track')

  useEffect(() => { if (!projectId && projects.length) setProjectId(projects[0].id) }, [projects])

  const TABS = [
    { id: 'track',  label: '📐 تتبع الأعمال' },
    { id: 'extras', label: '➕ الزيادات'      },
  ]

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl' }}>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
          متتبع الأعمال
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>قطعة ← بيت ← طابق ← مهام</div>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
          <div>لا توجد مشاريع</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {projects.map(p => (
              <button key={p.id} onClick={() => setProjectId(p.id)}
                style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${projectId === p.id ? C.primary : C.border}`, background: projectId === p.id ? `${C.primary}22` : C.bg, color: projectId === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {p.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 13, padding: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all .2s',
                  background: tab === t.id ? GRAD.brand : 'transparent',
                  color:      tab === t.id ? '#000' : C.textDim,
                  boxShadow:  tab === t.id ? '0 4px 14px #00DDB344' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'track'  && <TrackingTab projectId={projectId} key={`track-${projectId}`} />}
          {tab === 'extras' && <ExtrasTab   projectId={projectId} key={`extras-${projectId}`} />}
        </>
      )}
    </div>
  )
}
