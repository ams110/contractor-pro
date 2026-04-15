import React, { useState } from 'react'
import { C, SPECS, PROJECT_TYPES, PROJECT_STATUS } from '../constants/index.js'
import { fmt, fmtDate, validateProject } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, Badge, EmptyState, TabBar, ConfirmDialog } from '../components/index.jsx'

export default function ProjectsScreen({ projects, workDays, expenses, addProject, updateProject, deleteProject }) {
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [filter,      setFilter]      = useState('الكل')
  const [detail,      setDetail]      = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)

  const emptyForm = { name:'', client_name:'', client_phone:'', type:'', price:'', status:'نشط', specialization:'', notes:'' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function openNew() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }

  function openEdit(p) {
    setForm({ ...p, price: String(p.price || '') })
    setEditing(p.id)
    setFormError('')
    setShowForm(true)
    setDetail(null)
  }

  async function save() {
    const err = validateProject(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0 }
      if (editing) await updateProject(editing, payload)
      else         await addProject(payload)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    await deleteProject(confirmDel)
    setConfirmDel(null)
    setDetail(null)
  }

  const filtered = projects.filter(p => filter === 'الكل' || p.status === filter)
  const proj = detail ? projects.find(p => p.id === detail) : null

  // ─── تفاصيل مشروع ───
  if (proj) {
    const labor  = workDays.filter(w => w.project_id === proj.id).reduce((s, w) => s + (w.amount || 0), 0)
    const exps   = expenses.filter(e => e.project_id === proj.id).reduce((s, e) => s + (e.amount || 0), 0)
    const total  = labor + exps
    const profit = (proj.price || 0) - total
    const margin = proj.price ? ((profit / proj.price) * 100).toFixed(1) : 0

    return (
      <div className="fade-in" style={{ padding:16 }}>
        <button onClick={() => setDetail(null)} style={{ background:'none', border:'none', color:C.primary, fontSize:14, cursor:'pointer', padding:0, marginBottom:12 }}>← رجوع</button>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{proj.name}</div>
        <div style={{ fontSize:13, color:C.textDim, marginBottom:16 }}>{proj.client_name} • {proj.client_phone || ''}</div>

        <Card>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>📊 ربح وخسارة</div>
            {[
              { label:'سعر العقد',       value:`${fmt(proj.price)}₪`,  bold:true },
              { label:'(-) تكلفة العمال',value:`${fmt(labor)}₪`,       color:C.accent },
              { label:'(-) المصاريف',    value:`${fmt(exps)}₪`,        color:C.accent },
              { label:'إجمالي التكاليف', value:`${fmt(total)}₪`,       bold:true, color:C.accent },
              { label:'صافي الربح',      value:`${fmt(profit)}₪`,      bold:true, color:profit >= 0 ? C.success : C.accent },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:i%2?`${C.border}22`:'transparent', borderRadius:8, marginBottom:2 }}>
                <span style={{ fontSize:13, color:C.textDim, fontWeight:r.bold?700:400 }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:r.bold?800:600, color:r.color||C.text, fontFamily:'monospace' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:12, background:`${C.primary}18`, borderRadius:8, marginTop:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>نسبة الربح</span>
              <span style={{ fontSize:16, fontWeight:800, color:profit>=0?C.primary:C.accent, fontFamily:'monospace' }}>{margin}%</span>
            </div>
          </div>
        </Card>

        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <Btn onClick={() => openEdit(proj)} variant="outline" color={C.blue}>✏️ تعديل</Btn>
          <Btn onClick={() => setConfirmDel(proj.id)} variant="outline" color={C.accent}>🗑️ حذف</Btn>
        </div>
        <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={confirmDelete} message="متأكد بدك تحذف هالمشروع؟" />
      </div>
    )
  }

  // ─── قائمة المشاريع ───
  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>🏗️ المشاريع</div>
        <Btn onClick={openNew}>+ جديد</Btn>
      </div>

      <TabBar tabs={['الكل','نشط','مكتمل']} active={filter} onChange={setFilter} />

      {filtered.length === 0
        ? <EmptyState icon="🏗️" text="ما في مشاريع بعد" action="+ أضف مشروع" onAction={openNew} />
        : filtered.map(pr => {
            const spent = workDays.filter(w => w.project_id === pr.id).reduce((s, w) => s + w.amount, 0)
                        + expenses.filter(e => e.project_id === pr.id).reduce((s, e) => s + e.amount, 0)
            const profit = (pr.price || 0) - spent
            return (
              <Card key={pr.id} onClick={() => setDetail(pr.id)}>
                <div style={{ padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{pr.name}</div>
                    <Badge text={pr.status} color={pr.status==='نشط'?C.primary:pr.status==='مكتمل'?C.blue:C.warning} />
                  </div>
                  <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>{pr.client_name} • {pr.type}</div>
                  {pr.price > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span style={{ fontSize:12, color:C.textDim }}>{fmt(pr.price)}₪</span>
                      <span style={{ fontSize:12, fontWeight:700, color:profit>=0?C.success:C.accent, fontFamily:'monospace' }}>ربح: {fmt(profit)}₪</span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
      }

      {/* فورم إضافة/تعديل */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'تعديل مشروع' : 'مشروع جديد'}>
        <Input label="اسم المشروع"   value={form.name}          onChange={f('name')}          required />
        <Input label="اسم الزبون"    value={form.client_name}   onChange={f('client_name')} />
        <Input label="تلفون الزبون"  value={form.client_phone}  onChange={f('client_phone')}  type="tel" />
        <Input label="نوع المشروع"   value={form.type}          onChange={f('type')}          options={PROJECT_TYPES} required />
        <Input label="السعر (₪)"     value={form.price}         onChange={f('price')}         type="number" min="0" />
        <Input label="التخصص"        value={form.specialization}onChange={f('specialization')}options={SPECS} />
        <Input label="الحالة"        value={form.status}        onChange={f('status')}        options={PROJECT_STATUS} />
        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving}>{saving ? 'جاري الحفظ...' : editing ? 'حفظ' : 'أضف المشروع'}</Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={confirmDelete} message="متأكد بدك تحذف هالمشروع؟" />
    </div>
  )
}
