import React, { useState, useEffect } from 'react'
import { C, GRAD } from '../constants/index.js'
import { fmt, todayStr } from '../lib/helpers.js'
import { useMaterialLogs } from '../hooks/useMaterialLogs.js'

const UNITS = ['م', 'م²', 'م³', 'طن', 'كيس', 'قطعة', 'لتر', 'يوم', 'ساعة', 'متر طولي']

const EXTRA_STATUS = {
  pending:  { label: 'معلق',   color: C.warning },
  approved: { label: 'موافق',  color: C.success },
  done:     { label: 'منجز',   color: C.primary },
}

function statusBadge(status) {
  const s = EXTRA_STATUS[status] || EXTRA_STATUS.pending
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}22`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  )
}

function loadExtras(projectId) {
  if (!projectId) return []
  try { return JSON.parse(localStorage.getItem(`extras_${projectId}`)) || [] } catch { return [] }
}

function saveExtras(projectId, items) {
  if (!projectId) return
  localStorage.setItem(`extras_${projectId}`, JSON.stringify(items))
}

const EMPTY_EXTRA = { title: '', qty: '', unit: 'م', unitPrice: '', status: 'pending', notes: '' }

// ─── فورم إضافة/تعديل زيادة ──────────────────────────────────────────────────
function ExtraForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_EXTRA)

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  const valid = form.title.trim() && parseFloat(form.qty) > 0 && parseFloat(form.unitPrice) >= 0

  return (
    <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.borderMid}`, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>
        {initial?.id ? '✏️ تعديل الزيادة' : '➕ زيادة جديدة'}
      </div>

      {/* العنوان */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>الوصف *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="مثال: توسعة حمام إضافي"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* الكمية والوحدة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>الكمية *</label>
          <input
            type="number" min="0" step="any" value={form.qty}
            onChange={e => set('qty', e.target.value)}
            placeholder="0"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>الوحدة</label>
          <select
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* سعر الوحدة */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>سعر الوحدة (₪) *</label>
        <input
          type="number" min="0" step="0.01" value={form.unitPrice}
          onChange={e => set('unitPrice', e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }}
        />
        {form.qty && form.unitPrice && (
          <div style={{ marginTop: 4, fontSize: 11, color: C.primary, fontWeight: 700 }}>
            الإجمالي: {fmt(parseFloat(form.qty) * parseFloat(form.unitPrice))}₪
          </div>
        )}
      </div>

      {/* الحالة */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 600 }}>الحالة</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(EXTRA_STATUS).map(([key, s]) => (
            <button key={key} onClick={() => set('status', key)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1.5px solid ${form.status === key ? s.color : C.border}`, background: form.status === key ? `${s.color}22` : 'transparent', color: form.status === key ? s.color : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ملاحظات */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>ملاحظات</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="أي تفاصيل إضافية..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          إلغاء
        </button>
        <button onClick={() => valid && onSave(form)} disabled={!valid}
          style={{ flex: 2, padding: '11px 0', borderRadius: 11, border: 'none', background: valid ? GRAD.brand : C.border, color: valid ? '#000' : C.textDim, fontSize: 13, fontWeight: 800, cursor: valid ? 'pointer' : 'default' }}>
          {initial?.id ? 'حفظ التعديل' : '+ إضافة'}
        </button>
      </div>
    </div>
  )
}

// ─── تبويب الزيادات ───────────────────────────────────────────────────────────
function ExtrasTab({ projectId }) {
  const [extras,       setExtras]       = useState(() => loadExtras(projectId))
  const [showForm,     setShowForm]     = useState(false)
  const [editingExtra, setEditingExtra] = useState(null)
  const [filterStatus, setFilterStatus] = useState('الكل')

  useEffect(() => {
    setExtras(loadExtras(projectId))
  }, [projectId])

  function persist(items) {
    setExtras(items)
    saveExtras(projectId, items)
  }

  function addExtra(form) {
    const item = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }
    persist([item, ...extras])
    setShowForm(false)
  }

  function updateExtra(form) {
    persist(extras.map(e => e.id === form.id ? { ...form } : e))
    setEditingExtra(null)
  }

  function deleteExtra(id) {
    if (!window.confirm('حذف هذه الزيادة؟')) return
    persist(extras.filter(e => e.id !== id))
  }

  function cycleStatus(id) {
    const order = ['pending', 'approved', 'done']
    persist(extras.map(e => {
      if (e.id !== id) return e
      const idx = order.indexOf(e.status)
      return { ...e, status: order[(idx + 1) % order.length] }
    }))
  }

  const filtered = filterStatus === 'الكل' ? extras : extras.filter(e => e.status === filterStatus)
  const grandTotal = extras.reduce((s, e) => s + (parseFloat(e.qty) || 0) * (parseFloat(e.unitPrice) || 0), 0)

  return (
    <div>
      {/* إجمالي */}
      {extras.length > 0 && (
        <div style={{ background: `${C.primary}14`, borderRadius: 14, border: `1px solid ${C.primary}33`, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>إجمالي الزيادات</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{extras.length} بند · {extras.filter(e => e.status === 'done').length} منجز</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(grandTotal)}₪</div>
        </div>
      )}

      {/* فلتر */}
      {extras.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {['الكل', ...Object.entries(EXTRA_STATUS).map(([, s]) => s.label)].map(label => {
            const active = filterStatus === label
            return (
              <button key={label} onClick={() => setFilterStatus(label)}
                style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? C.primary : C.border}`, background: active ? `${C.primary}22` : 'transparent', color: active ? C.primary : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* فورم إضافة */}
      {showForm && !editingExtra && (
        <ExtraForm onSave={addExtra} onCancel={() => setShowForm(false)} />
      )}

      {/* قائمة الزيادات */}
      {filtered.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>لا توجد زيادات مسجّلة</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف أي أعمال إضافية خارج نطاق العقد</div>
        </div>
      ) : (
        filtered.map(extra => (
          editingExtra?.id === extra.id ? (
            <ExtraForm key={extra.id} initial={editingExtra} onSave={updateExtra} onCancel={() => setEditingExtra(null)} />
          ) : (
            <div key={extra.id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{extra.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>
                    {extra.qty} {extra.unit} × {fmt(parseFloat(extra.unitPrice) || 0)}₪
                  </div>
                  {extra.notes && (
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, fontStyle: 'italic' }}>{extra.notes}</div>
                  )}
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, fontFamily: 'monospace', marginBottom: 4 }}>
                    {fmt((parseFloat(extra.qty) || 0) * (parseFloat(extra.unitPrice) || 0))}₪
                  </div>
                  {statusBadge(extra.status)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => cycleStatus(extra.id)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  ⟳ الحالة
                </button>
                <button onClick={() => setEditingExtra({ ...extra })}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${C.primary}44`, background: `${C.primary}11`, color: C.primary, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ تعديل
                </button>
                <button onClick={() => deleteExtra(extra.id)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  🗑 حذف
                </button>
              </div>
            </div>
          )
        ))
      )}

      {/* زر الإضافة */}
      {!showForm && !editingExtra && (
        <button onClick={() => setShowForm(true)}
          style={{ width: '100%', marginTop: 6, padding: '13px 0', borderRadius: 14, border: `2px dashed ${C.primary}55`, background: `${C.primary}08`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ➕ إضافة زيادة جديدة
        </button>
      )}
    </div>
  )
}

// ─── تبويب المستلزمات ─────────────────────────────────────────────────────────
function MaterialLogsTab({ projectId, worker }) {
  const { workerAddMaterialLog, loading, error } = useMaterialLogs()
  const [form,    setForm]    = useState({ date: todayStr(), itemName: '', quantity: '', unit: 'قطعة', notes: '' })
  const [done,    setDone]    = useState(false)
  const [formErr, setFormErr] = useState('')

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit() {
    if (!form.itemName.trim())              return setFormErr('أدخل اسم المادة')
    if (!parseFloat(form.quantity) > 0)    return setFormErr('أدخل الكمية')
    if (!worker?.id)                        return setFormErr('العامل غير محدد')
    setFormErr('')
    try {
      await workerAddMaterialLog({
        employeeId: worker.id,
        projectId,
        date:       form.date,
        itemName:   form.itemName.trim(),
        quantity:   parseFloat(form.quantity),
        unit:       form.unit,
        notes:      form.notes,
      })
      setDone(true)
      setForm({ date: todayStr(), itemName: '', quantity: '', unit: 'قطعة', notes: '' })
      setTimeout(() => setDone(false), 3000)
    } catch { /* error shown from hook */ }
  }

  return (
    <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.borderMid}`, padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>📦 تسجيل مستلزم</div>

      {done && (
        <div style={{ padding: '10px 14px', background: `${C.success}18`, borderRadius: 12, marginBottom: 14, fontSize: 13, color: C.success, fontWeight: 700, textAlign: 'center', border: `1px solid ${C.success}33` }}>
          ✓ تم التسجيل بنجاح
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>التاريخ</label>
        <input type="date" value={form.date} max={todayStr()} onChange={e => set('date', e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>اسم المادة *</label>
        <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
          placeholder="مثال: أسمنت بورتلاند"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>الكمية *</label>
          <input type="number" min="0" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)}
            placeholder="0"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>الوحدة</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 600 }}>ملاحظات</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="أي تفاصيل إضافية..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      {(formErr || error) && (
        <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 12, fontSize: 13, color: C.accent, border: `1px solid ${C.accent}33` }}>
          ⚠ {formErr || error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: loading ? C.border : GRAD.brand, color: loading ? C.textDim : '#000', fontSize: 14, fontWeight: 800, cursor: loading ? 'default' : 'pointer' }}>
        {loading ? '⏳ جاري الحفظ...' : '📦 تسجيل المستلزم'}
      </button>
    </div>
  )
}

// ─── الشاشة الرئيسية ──────────────────────────────────────────────────────────
export default function UnitTrackerScreen({ projects = [], worker = null }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '')
  const [tab, setTab] = useState('extras')

  const TABS = [
    { id: 'extras',   label: '📋 زيادات' },
    { id: 'materials', label: '📦 مستلزمات' },
  ]

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl' }}>

      {/* اختيار المشروع */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8, fontWeight: 700, letterSpacing: '0.04em' }}>المشروع</div>
        {projects.length === 0 ? (
          <div style={{ padding: '12px 14px', background: C.card, borderRadius: 12, fontSize: 13, color: C.textDim, textAlign: 'center' }}>
            لا توجد مشاريع
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map(p => (
              <button key={p.id} onClick={() => setSelectedProjectId(p.id)}
                style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${selectedProjectId === p.id ? C.primary : C.border}`, background: selectedProjectId === p.id ? `${C.primary}22` : C.bg, color: selectedProjectId === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all .2s',
              background: tab === t.id ? GRAD.brand : 'transparent',
              color: tab === t.id ? '#000' : C.textDim,
              boxShadow: tab === t.id ? '0 4px 14px #00DDB344' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      {!selectedProjectId ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
          <div>اختر مشروعاً للبدء</div>
        </div>
      ) : (
        <>
          {tab === 'extras'    && <ExtrasTab   projectId={selectedProjectId} />}
          {tab === 'materials' && <MaterialLogsTab projectId={selectedProjectId} worker={worker} />}
        </>
      )}
    </div>
  )
}
