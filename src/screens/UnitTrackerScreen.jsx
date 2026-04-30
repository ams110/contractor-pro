import React, { useState, useMemo, useCallback } from 'react'
import { C, GRAD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

// ─── localStorage helpers ────────────────────────────────────────────────────

function loadTracker(projectId) {
  try {
    const raw = localStorage.getItem(`tracker_${projectId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveTracker(projectId, data) {
  localStorage.setItem(`tracker_${projectId}`, JSON.stringify(data))
}

function calcProgress(groups) {
  let total = 0, done = 0
  groups.forEach(g => g.items.forEach(item => {
    Object.values(item.tasks).forEach(v => { total++; if (v) done++ })
  }))
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

function calcGroupProgress(group) {
  let total = 0, done = 0
  group.items.forEach(item => Object.values(item.tasks).forEach(v => { total++; if (v) done++ }))
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

// ─── Setup Wizard ────────────────────────────────────────────────────────────

function SetupWizard({ project, onSave }) {
  const [step, setStep] = useState(0)
  const [taskDefs, setTaskDefs] = useState(['أسود', 'مفاتيح', 'أباريز', 'لوحة'])
  const [newTask, setNewTask] = useState('')
  const [groupLabel, setGroupLabel] = useState('مجموعة')
  const [itemLabel, setItemLabel] = useState('وحدة')
  const [groups, setGroups] = useState([{ name: 'مجموعة 1', count: 5 }])

  function addTask() {
    const t = newTask.trim()
    if (t && !taskDefs.includes(t)) { setTaskDefs(d => [...d, t]); setNewTask('') }
  }

  function addGroup() {
    setGroups(g => [...g, { name: `${groupLabel} ${g.length + 1}`, count: 5 }])
  }

  function buildTrackerData() {
    const builtGroups = groups.map(g => ({
      name: g.name,
      items: Array.from({ length: g.count }, (_, i) => ({
        name: `${itemLabel} ${i + 1}`,
        tasks: Object.fromEntries(taskDefs.map(t => [t, false])),
      })),
    }))
    return { taskDefs, groupLabel, itemLabel, groups: builtGroups }
  }

  const steps = [
    {
      title: 'تسمية الهيكل',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>
            كيف تسمي المجموعات والوحدات في مشروعك؟<br />
            <span style={{ color: C.primary }}>مثال كهرباء:</span> مجموعة = مجراش، وحدة = بيت<br />
            <span style={{ color: C.blue }}>مثال دهان:</span> مجموعة = دور، وحدة = غرفة
          </div>
          {[
            { label: 'اسم المجموعة', val: groupLabel, set: setGroupLabel, ph: 'مجراش / دور / قسم' },
            { label: 'اسم الوحدة',   val: itemLabel,  set: setItemLabel,  ph: 'بيت / غرفة / وحدة' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4, fontWeight: 600 }}>{label}</div>
              <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'تحديد المهام',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.textDim }}>ما هي مراحل/مهام كل وحدة؟</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {taskDefs.map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${C.primary}15`, borderRadius: 20, border: `1px solid ${C.primary}33` }}>
                <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>{t}</span>
                <button onClick={() => setTaskDefs(d => d.filter(x => x !== t))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="أضف مهمة جديدة..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 12, outline: 'none' }} />
            <button onClick={addTask}
              style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ fontSize: 10, color: C.textDim, padding: '6px 10px', background: `${C.primary}0A`, borderRadius: 8 }}>
            💡 اقتراحات: أسود، مفاتيح، أباريز، لوحة، إضاءة، سباكة، جبص، دهان...
          </div>
        </div>
      ),
    },
    {
      title: `تحديد ${groupLabel}ات`,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>اسم كل {groupLabel} وعدد {itemLabel}اتها</div>
          {groups.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={g.name} onChange={e => setGroups(gs => gs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                style={{ flex: 2, padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 12, outline: 'none' }} />
              <input type="number" min="1" max="100" value={g.count}
                onChange={e => setGroups(gs => gs.map((x, j) => j === i ? { ...x, count: parseInt(e.target.value) || 1 } : x))}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
              <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>{itemLabel}</span>
              {groups.length > 1 && (
                <button onClick={() => setGroups(gs => gs.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontSize: 16 }}>🗑️</button>
              )}
            </div>
          ))}
          <button onClick={addGroup}
            style={{ padding: '8px', borderRadius: 9, border: `1px dashed ${C.border}`, background: 'transparent', color: C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
            + إضافة {groupLabel}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>إعداد تتبع المشروع</div>
        <div style={{ fontSize: 11, color: C.textDim }}>{project.name}</div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, background: i === step ? C.primary : i < step ? C.success : C.border, transition: 'all .3s' }} />
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.primary, marginBottom: 14 }}>{steps[step].title}</div>
        {steps[step].content}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ← رجوع
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: GRAD.brand, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            التالي ←
          </button>
        ) : (
          <button onClick={() => onSave(buildTrackerData())}
            disabled={taskDefs.length === 0}
            style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: taskDefs.length ? GRAD.brand : C.border, color: '#fff', fontSize: 13, fontWeight: 800, cursor: taskDefs.length ? 'pointer' : 'not-allowed' }}>
            ✓ ابدأ التتبع
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Tracker View ────────────────────────────────────────────────────────────

function TrackerView({ project, data, onChange, onReset }) {
  const [expandedGroup, setExpandedGroup] = useState(0)
  const [expandedItem, setExpandedItem] = useState(null)
  const overall = useMemo(() => calcProgress(data.groups), [data])

  function toggleTask(gIdx, iIdx, task) {
    const updated = { ...data, groups: data.groups.map((g, gi) => gi !== gIdx ? g : {
      ...g, items: g.items.map((item, ii) => ii !== iIdx ? item : {
        ...item, tasks: { ...item.tasks, [task]: !item.tasks[task] }
      })
    })}
    onChange(updated)
  }

  function toggleAllGroup(gIdx) {
    const group = data.groups[gIdx]
    const pct = calcGroupProgress(group)
    const target = pct < 100
    const updated = { ...data, groups: data.groups.map((g, gi) => gi !== gIdx ? g : {
      ...g, items: g.items.map(item => ({
        ...item, tasks: Object.fromEntries(Object.keys(item.tasks).map(k => [k, target]))
      }))
    })}
    onChange(updated)
  }

  const overallColor = overall >= 100 ? C.success : overall >= 60 ? C.primary : overall >= 30 ? C.warning : C.accent

  return (
    <div style={{ padding: '16px 16px 0' }}>

      {/* Header */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{project.name}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{data.groups.length} {data.groupLabel}ات · {data.groups.reduce((s, g) => s + g.items.length, 0)} {data.itemLabel}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: overallColor, fontFamily: 'monospace' }}>{overall}%</div>
            <div style={{ fontSize: 9, color: C.textDim }}>إجمالي</div>
          </div>
        </div>
        <div style={{ height: 8, background: `${C.border}88`, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overall}%`, background: `linear-gradient(90deg, ${overallColor}, ${overallColor}bb)`, borderRadius: 4, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.taskDefs.map(t => (
              <span key={t} style={{ fontSize: 9, padding: '2px 7px', background: `${C.primary}12`, borderRadius: 10, color: C.primary, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
          <button onClick={onReset}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '3px 8px', fontSize: 9, color: C.textDim, cursor: 'pointer' }}>
            إعادة إعداد
          </button>
        </div>
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
        {data.groups.map((group, gIdx) => {
          const gPct = calcGroupProgress(group)
          const isOpen = expandedGroup === gIdx
          const gColor = gPct >= 100 ? C.success : gPct >= 50 ? C.primary : C.warning
          return (
            <div key={gIdx} style={{ background: C.card, borderRadius: 14, border: `1px solid ${isOpen ? C.primary + '44' : C.border}`, overflow: 'hidden' }}>
              {/* Group Header */}
              <button onClick={() => setExpandedGroup(isOpen ? -1 : gIdx)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: isOpen ? `${C.primary}08` : 'transparent', border: 'none', cursor: 'pointer', direction: 'rtl' }}>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{group.name}</div>
                  <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{group.items.length} {data.itemLabel} · {gPct}% مكتمل</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 50, height: 6, background: `${C.border}66`, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${gPct}%`, background: gColor, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: gColor, fontFamily: 'monospace', minWidth: 32 }}>{gPct}%</div>
                  <span style={{ fontSize: 10, color: C.textDim }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Group Items */}
              {isOpen && (
                <div style={{ padding: '4px 10px 10px' }}>
                  <button onClick={() => toggleAllGroup(gIdx)}
                    style={{ width: '100%', padding: '6px', borderRadius: 8, border: `1px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                    {gPct < 100 ? '✓ تأشير الكل' : '✕ إلغاء الكل'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.items.map((item, iIdx) => {
                      const tasksDone = Object.values(item.tasks).filter(Boolean).length
                      const tasksTotal = Object.keys(item.tasks).length
                      const itemPct = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0
                      const isItemOpen = expandedItem === `${gIdx}_${iIdx}`
                      return (
                        <div key={iIdx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${itemPct === 100 ? C.success + '44' : C.border}`, overflow: 'hidden' }}>
                          <button onClick={() => setExpandedItem(isItemOpen ? null : `${gIdx}_${iIdx}`)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', direction: 'rtl' }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>
                              {itemPct === 100 ? '✅' : itemPct > 0 ? '🔄' : '⬜'}
                            </span>
                            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: itemPct === 100 ? C.success : C.text, textAlign: 'right' }}>{item.name}</span>
                            <span style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace' }}>{tasksDone}/{tasksTotal}</span>
                            <span style={{ fontSize: 9, color: C.textDim }}>{isItemOpen ? '▲' : '▼'}</span>
                          </button>
                          {isItemOpen && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 10px' }}>
                              {Object.entries(item.tasks).map(([task, done]) => (
                                <button key={task} onClick={() => toggleTask(gIdx, iIdx, task)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: `1px solid ${done ? C.success + '66' : C.border}`, background: done ? `${C.success}15` : 'transparent', cursor: 'pointer', transition: 'all .2s' }}>
                                  <span style={{ fontSize: 12 }}>{done ? '✅' : '⬜'}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: done ? C.success : C.textDim }}>{task}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Project List ────────────────────────────────────────────────────────────

function ProjectList({ projects, onSelect }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 4 }}>📋 تتبع المشاريع</div>
        <div style={{ fontSize: 11, color: C.textDim }}>اختر مشروعاً لتتبع تقدمه</div>
      </div>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.textDim, fontSize: 12 }}>
          لا توجد مشاريع — أضف مشروعاً أولاً
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => {
            const saved = loadTracker(p.id)
            const pct = saved ? calcProgress(saved.groups) : null
            return (
              <button key={p.id} onClick={() => onSelect(p)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, cursor: 'pointer', direction: 'rtl', textAlign: 'right', transition: 'border-color .2s' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 2 }}>{p.name}</div>
                  {saved ? (
                    <div style={{ fontSize: 10, color: C.textDim }}>{saved.groups.length} {saved.groupLabel}ات · {saved.taskDefs.join('، ')}</div>
                  ) : (
                    <div style={{ fontSize: 10, color: C.warning }}>لم يُعدّ بعد — اضغط لإعداده</div>
                  )}
                </div>
                {pct !== null ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: pct >= 100 ? C.success : C.primary, fontFamily: 'monospace' }}>{pct}%</div>
                    <div style={{ width: 40, height: 4, background: `${C.border}66`, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? C.success : C.primary, borderRadius: 2 }} />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 18, color: C.textDim }}>→</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function UnitTrackerScreen({ projects = [] }) {
  const [selectedProject, setSelectedProject] = useState(null)
  const [trackerData, setTrackerData] = useState(null)

  function selectProject(p) {
    const saved = loadTracker(p.id)
    setSelectedProject(p)
    setTrackerData(saved)
  }

  function handleSave(data) {
    saveTracker(selectedProject.id, data)
    setTrackerData(data)
  }

  function handleChange(data) {
    saveTracker(selectedProject.id, data)
    setTrackerData(data)
  }

  function handleReset() {
    if (!window.confirm('إعادة إعداد التتبع؟ سيتم حذف التقدم الحالي.')) return
    localStorage.removeItem(`tracker_${selectedProject.id}`)
    setTrackerData(null)
  }

  if (!selectedProject) {
    return <ProjectList projects={projects} onSelect={selectProject} />
  }

  if (!trackerData) {
    return (
      <>
        <button onClick={() => setSelectedProject(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 16px 0', background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 12 }}>
          ← الرجوع
        </button>
        <SetupWizard project={selectedProject} onSave={handleSave} />
      </>
    )
  }

  return (
    <>
      <button onClick={() => setSelectedProject(null)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 16px 0', background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 12 }}>
        ← كل المشاريع
      </button>
      <TrackerView project={selectedProject} data={trackerData} onChange={handleChange} onReset={handleReset} />
    </>
  )
}
