import React, { useState, useRef } from 'react'
import { C, SPECS, PROJECT_TYPES, PROJECT_STATUS, PAY_METHODS } from '../constants/index.js'
import { fmt, fmtDate, validateProject, todayStr } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, Badge, EmptyState, TabBar, ConfirmDialog } from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'

export default function ProjectsScreen({ projects, workDays, expenses, clientReceipts, addProject, updateProject, deleteProject, addReceipt, deleteReceipt, userId, permissions }) {
  const [showForm,        setShowForm]        = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [editing,         setEditing]         = useState(null)
  const [filter,          setFilter]          = useState('الكل')
  const [detail,          setDetail]          = useState(null)
  const [confirmDel,      setConfirmDel]      = useState(null)
  const [confirmDelR,     setConfirmDelR]     = useState(null)
  const [formError,       setFormError]       = useState('')
  const [receiptError,    setReceiptError]    = useState('')
  const [saving,          setSaving]          = useState(false)
  const [receiptFile,     setReceiptFile]     = useState(null)
  const [receiptPreview,  setReceiptPreview]  = useState('')
  const receiptFileRef = useRef()

  const emptyForm    = { name:'', client_name:'', client_phone:'', type:'', price:'', status:'نشط', specialization:'', notes:'' }
  const emptyReceipt = { amount:'', date: todayStr(), notes:'', payment_method:'كاش' }
  const [form,        setForm]        = useState(emptyForm)
  const [receiptForm, setReceiptForm] = useState(emptyReceipt)

  function f(key)  { return v => setForm(prev => ({ ...prev, [key]: v })) }
  function fr(key) { return v => setReceiptForm(prev => ({ ...prev, [key]: v })) }

  function openNew() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }

  function openEdit(p) {
    setForm({ ...p, price: String(p.price || '') })
    setEditing(p.id)
    setFormError('')
    setShowForm(true)
    setDetail(null)
  }

  function openReceiptForm() {
    setReceiptForm(emptyReceipt)
    setReceiptError('')
    setShowReceiptForm(true)
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

  async function saveReceipt() {
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0)
      return setReceiptError('أدخل المبلغ المقبوض')
    setSaving(true)
    try {
      let receipt_url = ''
      if (receiptFile && receiptForm.payment_method === 'تحويل بنكي') {
        receipt_url = await uploadReceipt(userId, receiptFile)
      }
      await addReceipt({ ...receiptForm, amount: parseFloat(receiptForm.amount), project_id: detail, receipt_url })
      setShowReceiptForm(false); setReceiptFile(null); setReceiptPreview('')
    } catch (e) {
      setReceiptError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    await deleteProject(confirmDel)
    setConfirmDel(null)
    setDetail(null)
  }

  async function confirmDeleteReceipt() {
    await deleteReceipt(confirmDelR)
    setConfirmDelR(null)
  }

  const filtered = projects.filter(p => filter === 'الكل' || p.status === filter)
  const proj = detail ? projects.find(p => p.id === detail) : null

  // ─── تفاصيل مشروع ───
  if (proj) {
    const labor    = workDays.filter(w => w.project_id === proj.id).reduce((s, w) => s + (w.amount || 0), 0)
    const exps     = expenses.filter(e => e.project_id === proj.id).reduce((s, e) => s + (e.amount || 0), 0)
    const receipts = (clientReceipts || []).filter(r => r.project_id === proj.id)
    const received = receipts.reduce((s, r) => s + (r.amount || 0), 0)
    const total    = labor + exps
    const profit   = received - total
    const pending  = (proj.price || 0) - received
    const margin   = received > 0 ? ((profit / received) * 100).toFixed(1) : 0

    return (
      <div className="fade-in" style={{ padding:16 }}>
        <button onClick={() => setDetail(null)} style={{ background:'none', border:'none', color:C.primary, fontSize:14, cursor:'pointer', padding:0, marginBottom:12 }}>← رجوع</button>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{proj.name}</div>
        <div style={{ fontSize:13, color:C.textDim, marginBottom:16 }}>{proj.client_name} • {proj.client_phone || ''}</div>

        {/* ملخص المشروع */}
        <Card>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>📊 ملخص مالي</div>
            {[
              { label:'قيمة العقد',        value:`${fmt(proj.price)}₪`,    bold:true },
              { label:'المقبوض من العميل', value:`${fmt(received)}₪`,      bold:true, color:C.success },
              { label:'المتبقي للتحصيل',   value:`${fmt(Math.max(0,pending))}₪`, color:pending>0?C.warning:C.success },
              { label:'──────────────',     value:'', },
              { label:'(-) تكلفة العمال',  value:`${fmt(labor)}₪`,         color:C.accent },
              { label:'(-) المصاريف',      value:`${fmt(exps)}₪`,          color:C.accent },
              { label:'إجمالي التكاليف',   value:`${fmt(total)}₪`,         bold:true, color:C.accent },
              { label:'صافي الربح الفعلي', value:`${fmt(profit)}₪`,        bold:true, color:profit >= 0 ? C.primary : C.accent },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:i%2?`${C.border}22`:'transparent', borderRadius:8, marginBottom:2 }}>
                <span style={{ fontSize:12, color:r.bold?C.text:C.textDim, fontWeight:r.bold?700:400 }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:r.bold?800:600, color:r.color||C.text, fontFamily:'monospace' }}>{r.value}</span>
              </div>
            ))}
            {received > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:12, background:`${C.primary}18`, borderRadius:8, marginTop:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>نسبة الربح</span>
                <span style={{ fontSize:16, fontWeight:800, color:profit>=0?C.primary:C.accent, fontFamily:'monospace' }}>{margin}%</span>
              </div>
            )}
          </div>
        </Card>

        {/* سجل المقبوضات */}
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>💵 المقبوضات من العميل</div>
            {permissions?.editProjects !== false && <Btn onClick={openReceiptForm}>+ قبض</Btn>}
          </div>
          {receipts.length === 0
            ? <div style={{ fontSize:12, color:C.textDim, textAlign:'center', padding:16 }}>لم يُقبض شيء بعد</div>
            : receipts.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.success, fontFamily:'monospace' }}>{fmt(r.amount)}₪</div>
                  <div style={{ fontSize:11, color:C.textDim }}>{fmtDate(r.date)} • {r.payment_method} {r.notes ? `• ${r.notes}` : ''}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize:18, textDecoration:'none' }} title="عرض الإثبات">📎</a>}
                  <button onClick={() => setConfirmDelR(r.id)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:16 }}>🗑️</button>
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          {permissions?.editProjects !== false && <Btn onClick={() => openEdit(proj)} variant="outline" color={C.blue}>✏️ تعديل</Btn>}
          {permissions?.canDelete    !== false && <Btn onClick={() => setConfirmDel(proj.id)} variant="outline" color={C.accent}>🗑️ حذف</Btn>}
        </div>

        {/* فورم قبض دفعة */}
        <Modal open={showReceiptForm} onClose={() => { setShowReceiptForm(false); setReceiptFile(null); setReceiptPreview('') }} title="تسجيل دفعة مقبوضة">
          <Input label="المبلغ المقبوض (₪)" value={receiptForm.amount} onChange={fr('amount')} type="number" min="0" required />
          <Input label="التاريخ"            value={receiptForm.date}   onChange={fr('date')}   type="date" required />
          <Input label="طريقة الدفع"        value={receiptForm.payment_method} onChange={fr('payment_method')} options={PAY_METHODS} />
          <Input label="ملاحظات"            value={receiptForm.notes}  onChange={fr('notes')} />

          {receiptForm.payment_method === 'تحويل بنكي' && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6 }}>📎 إثبات التحويل</label>
              <input ref={receiptFileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)) } }} />
              {receiptPreview
                ? <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
                    <img src={receiptPreview} alt="إثبات" style={{ width:'100%', maxHeight:150, objectFit:'cover', borderRadius:10, border:`1px solid ${C.border}` }} />
                    <button onClick={() => { setReceiptFile(null); setReceiptPreview('') }}
                      style={{ position:'absolute', top:4, left:4, background:`${C.accent}cc`, border:'none', borderRadius:'50%', width:22, height:22, color:'#fff', cursor:'pointer', fontSize:12 }}>×</button>
                  </div>
                : <button onClick={() => receiptFileRef.current.click()}
                    style={{ width:'100%', padding:'12px', borderRadius:10, border:`2px dashed ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, cursor:'pointer' }}>
                    📷 اضغط لرفع صورة الإثبات
                  </button>
              }
            </div>
          )}

          {receiptError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {receiptError}</div>}
          <Btn onClick={saveReceipt} full disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الدفعة'}</Btn>
        </Modal>

        <ConfirmDialog open={!!confirmDel}  onClose={() => setConfirmDel(null)}  onConfirm={confirmDelete}        message="متأكد بدك تحذف هالمشروع؟" />
        <ConfirmDialog open={!!confirmDelR} onClose={() => setConfirmDelR(null)} onConfirm={confirmDeleteReceipt} message="متأكد بدك تحذف هالدفعة؟" />
      </div>
    )
  }

  // ─── قائمة المشاريع ───
  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>🏗️ المشاريع</div>
        {permissions?.editProjects !== false && <Btn onClick={openNew}>+ جديد</Btn>}
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
