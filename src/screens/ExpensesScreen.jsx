import React, { useState, useRef } from 'react'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT, PAY_METHODS, VAT } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateExpense } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, FilterChip, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportExpensesToExcel } from '../lib/export.js'
import { supabase } from '../lib/supabase.js'

const CAT_ICONS  = { 'بضاعة':'🛒', 'مواد بناء / خامات':'🧱', 'عدد وأدوات':'🔧', 'وقود وتنقلات':'⛽', 'إيجار معدات':'🏗️', 'خدمات مهنية':'📋', 'صيانة مركبات':'🚗', 'رواتب عمال':'👷', 'تأمين':'🛡️', 'أخرى':'📦' }
const CAT_COLORS = { 'بضاعة':C.pink, 'مواد بناء / خامات':C.orange, 'عدد وأدوات':C.blue, 'وقود وتنقلات':C.cyan, 'إيجار معدات':C.purple, 'خدمات مهنية':C.secondary, 'صيانة مركبات':C.warning, 'رواتب عمال':C.primary, 'تأمين':C.success, 'أخرى':C.textDim }
const FILTER_CATS = ['الكل', 'مواد', 'بضاعة', 'عدد', 'وقود', 'إيجار', 'خدمات', 'رواتب', 'تأمين', 'أخرى']

export default function ExpensesScreen({ expenses, projects, expCats, addExpense, deleteExpense, approveExpense, rejectExpense, employees, userId, permissions, businessType, showVatExpenses = true }) {
  const showVAT = businessType !== 'osek_patur' && showVatExpenses
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('الكل')
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview,     setPreview]     = useState('')
  const [scanning,    setScanning]    = useState(false)
  const [scanMsg,     setScanMsg]     = useState('')
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), amount:'', category:'', project_id:'', vendor:'', payment_method:'' }
  const [form, setForm] = useState(emptyForm)
  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function pickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setFormError('حجم الملف يجب أن يكون أقل من 10MB'); return }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setReceiptFile(file)
    setScanMsg('')
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))
    else setPreview('')
  }

  async function scanReceipt() {
    if (!receiptFile || !receiptFile.type.startsWith('image/')) return
    setScanning(true); setScanMsg('')
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(receiptFile)
      })
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64, mimeType: receiptFile.type },
      })
      if (error) throw new Error(error.message)
      const r = data?.result || {}
      setForm(prev => ({
        ...prev,
        amount:   r.amount   ? String(r.amount) : prev.amount,
        vendor:   r.vendor   || prev.vendor,
        date:     r.date     || prev.date,
        category: r.category || prev.category,
      }))
      setScanMsg('✓ تم استخراج البيانات تلقائياً')
    } catch (e) { setScanMsg(`⚠ ${e.message}`) }
    finally     { setScanning(false) }
  }

  async function save() {
    const err = validateExpense(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      let receipt_url = ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      await addExpense({ ...form, amount: parseFloat(form.amount), receipt_url })
      setForm(emptyForm); setReceiptFile(null); setPreview(''); setShowForm(false)
    } catch (e) { setFormError(e.message) }
    finally     { setSaving(false) }
  }

  const pendingExpenses  = expenses.filter(e => e.status === 'pending')
  const approvedExpenses = expenses.filter(e => e.status !== 'pending')
  const total       = approvedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalVATIn  = Math.round(approvedExpenses.reduce((s, e) => {
    const rate   = (e.date || '') >= '2025-01-01' ? 0.18 : 0.17
    const deduct = EXP_CAT_VAT[e.category] ?? 1.00
    return s + (e.amount || 0) * deduct * (rate / (1 + rate))
  }, 0))
  const noVAT  = total - totalVATIn
  const filtered = approvedExpenses.filter(e => filter === 'الكل' || e.category?.includes(filter))
  const sorted   = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  function catColor(cat) {
    const k = Object.keys(CAT_COLORS).find(k => cat?.includes(k)) || 'أخرى'
    return CAT_COLORS[k]
  }
  function catIcon(cat) {
    const k = Object.keys(CAT_ICONS).find(k => cat?.includes(k)) || 'أخرى'
    return CAT_ICONS[k]
  }

  return (
    <div className="fade-up" style={{ padding:16, paddingBottom:100 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, background:GRAD.danger, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            💸 المصاريف
          </div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{approvedExpenses.length} سجل</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {permissions?.isOwner && approvedExpenses.length > 0 && (
            <button onClick={() => exportExpensesToExcel(approvedExpenses, projects)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, fontSize:12, cursor:'pointer', fontWeight:600 }}>
              📊
            </button>
          )}
          {permissions?.addExpenses !== false && (
            <button onClick={() => { setFormError(''); setShowForm(true) }}
              style={{ padding:'10px 18px', borderRadius:14, background:GRAD.danger, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontSize:13, boxShadow:'0 4px 16px rgba(244,63,94,0.4)' }}>
              + مصروف
            </button>
          )}
        </div>
      </div>

      {/* ── إجماليات ── */}
      {approvedExpenses.length > 0 && (
        <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ height:3, background:GRAD.danger }} />
          <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-around' }}>
            {showVAT ? (
              <>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>شامل الضريبة</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.accent, fontFamily:'monospace' }}>{fmt(total)}₪</div>
                </div>
                <div style={{ width:1, background:C.border }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>صافي بدون مع"מ</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.text, fontFamily:'monospace' }}>{fmt(noVAT)}₪</div>
                </div>
                <div style={{ width:1, background:C.border }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>מס תשומות</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.warning, fontFamily:'monospace' }}>{fmt(totalVATIn)}₪</div>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', width:'100%' }}>
                <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>إجمالي المصاريف</div>
                <div style={{ fontSize:26, fontWeight:900, color:C.accent, fontFamily:'monospace' }}>{fmt(total)}₪</div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ── مصاريف معلقة ── */}
      {pendingExpenses.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <SectionLabel color={C.warning}>⏳ بانتظار الموافقة ({pendingExpenses.length})</SectionLabel>
          {pendingExpenses.map(ex => {
            const worker = employees?.find(e => e.id === ex.employee_id)
            const proj   = projects.find(p => p.id === ex.project_id)
            return (
              <GlassCard key={ex.id} style={{ overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:3, background:GRAD.warm }} />
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{ex.category}</div>
                      {worker && <div style={{ fontSize:11, color:C.primary, fontWeight:600, marginTop:2 }}>👷 {worker.name}</div>}
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{ex.vendor || ''}{proj ? ` • ${proj.name}` : ''} • {fmtDate(ex.date)}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:C.accent, fontFamily:'monospace' }}>{fmt(ex.amount)}₪</div>
                  </div>
                  {ex.receipt_url && (
                    <div style={{ marginBottom:10 }}>
                      {ex.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <a href={ex.receipt_url} target="_blank" rel="noreferrer">
                          <img src={ex.receipt_url} alt="فاتورة" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10, border:`1px solid ${C.border}` }} />
                        </a>
                      ) : (
                        <a href={ex.receipt_url} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:`${C.border}33`, borderRadius:10, textDecoration:'none' }}>
                          <span style={{ fontSize:20 }}>📄</span>
                          <span style={{ fontSize:12, color:C.primary, fontWeight:600 }}>عرض الفاتورة (PDF)</span>
                        </a>
                      )}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => approveExpense(ex.id)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:GRAD.success, border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 2px 10px ${C.success}44` }}>
                      ✓ موافقة
                    </button>
                    <button onClick={() => rejectExpense(ex.id)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:`${C.accent}20`, border:`1px solid ${C.accent}55`, color:C.accent, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      ✗ رفض
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* ── فلتر التصنيف ── */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:16, scrollbarWidth:'none' }}>
        {FILTER_CATS.map(cat => (
          <FilterChip key={cat} label={cat} active={filter === cat} onClick={() => setFilter(cat)}
            color={cat === 'الكل' ? C.primary : catColor(cat)} />
        ))}
      </div>

      {/* ── قائمة المصاريف ── */}
      {sorted.length === 0 && pendingExpenses.length === 0
        ? <EmptyState icon="💸" text="ما في مصاريف" action="+ أضف مصروف" onAction={() => setShowForm(true)} />
        : sorted.length === 0 ? null
        : sorted.map(ex => {
            const proj   = projects.find(p => p.id === ex.project_id)
            const worker = employees?.find(e => e.id === ex.employee_id)
            const col    = catColor(ex.category)
            const ico    = catIcon(ex.category)
            return (
              <GlassCard key={ex.id} style={{ overflow:'hidden', marginBottom:8, position:'relative' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
                  {/* أيقونة ملونة */}
                  <div style={{ width:44, height:44, borderRadius:14, background:`${col}20`, border:`1px solid ${col}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                    {ico}
                  </div>

                  {/* المعلومات */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{ex.category}</div>
                      {showVAT && (() => {
                        const deduct = EXP_CAT_VAT[ex.category] ?? 1.00
                        const rate   = (ex.date || '') >= '2025-01-01' ? 0.18 : 0.17
                        if (deduct === 0) return <span style={{ fontSize:9, fontWeight:700, color:C.textDim, background:'rgba(255,255,255,0.06)', padding:'1px 6px', borderRadius:5, border:`1px solid ${C.border}` }}>لا مع"מ</span>
                        const vatAmt = Math.round((ex.amount || 0) * deduct * (rate / (1 + rate)))
                        const color  = deduct < 1 ? C.warning : C.cyan
                        return <span style={{ fontSize:9, fontWeight:700, color, background:`${color}15`, padding:'1px 6px', borderRadius:5, border:`1px solid ${color}33` }}>{deduct < 1 ? '⅔ ' : ''}מע"מ {fmt(vatAmt)}₪</span>
                      })()}
                    </div>
                    <div style={{ fontSize:11, color:C.textDim, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ex.vendor || ''}{proj ? ` • ${proj.name}` : ''}
                    </div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>
                      {fmtDate(ex.date)}{ex.payment_method ? ` • ${ex.payment_method}` : ''}
                    </div>
                    {(worker || ex.approved_by) && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                        {worker && (
                          <div style={{ fontSize:9, fontWeight:700, color:C.primary, background:`${C.primary}15`, padding:'2px 7px', borderRadius:6, border:`1px solid ${C.primary}33` }}>
                            👷 {worker.name}
                          </div>
                        )}
                        {ex.approved_by && (
                          <div style={{ fontSize:9, fontWeight:700, color:C.success, background:`${C.success}15`, padding:'2px 7px', borderRadius:6, border:`1px solid ${C.success}33` }}>
                            ✓ {ex.approved_by}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* المبلغ + أدوات */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <div style={{ fontSize:16, fontWeight:900, color:C.accent, fontFamily:'monospace' }}>{fmt(ex.amount)}₪</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {ex.receipt_url && (
                        <a href={ex.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration:'none', fontSize:16 }} title="عرض الفاتورة">📎</a>
                      )}
                      <button onClick={() => setConfirmDel(ex.id)}
                        style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:12 }}>🗑️</button>
                    </div>
                  </div>
                </div>
                {/* شريط لوني جانبي */}
                <div style={{ position:'absolute', top:0, right:0, width:3, height:'100%', background:col, borderRadius:'0 20px 20px 0' }} />
              </GlassCard>
            )
          })
      }

      {/* ── Modal إضافة مصروف ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setReceiptFile(null); setPreview('') }} title="مصروف جديد">
        <Input label="التاريخ"    value={form.date}   onChange={f('date')}   type="date" required />
        <Input label="المبلغ (₪)" value={form.amount} onChange={f('amount')} type="number" min="0.01" required />

        {showVAT && form.amount && parseFloat(form.amount) > 0 && (
          <div style={{ marginTop:-8, marginBottom:14, padding:'8px 12px', background:`${C.border}33`, borderRadius:10, display:'flex', justifyContent:'space-between' }}>
            {(() => {
              const amt    = parseFloat(form.amount)
              const deduct = EXP_CAT_VAT[form.category] ?? 1.00
              const vatAmt = Math.round(amt * deduct * (VAT / (1 + VAT)))
              const label  = deduct === 0 ? 'معفى من مع"מ' : deduct < 1 ? `مع"מ ⅔: ${fmt(vatAmt)}₪` : `מע"מ: ${fmt(vatAmt)}₪`
              return <>
                <span style={{ fontSize:11, color:C.textDim }}>صافي: {fmt(Math.round(amt - vatAmt))}₪</span>
                <span style={{ fontSize:11, color: deduct === 0 ? C.textDim : C.warning }}>{label}</span>
              </>
            })()}
          </div>
        )}

        <Input label="التصنيف" value={form.category} onChange={f('category')} options={expCats || EXP_CATS} required />

        {projects.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>المشروع</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id }))}
                  style={{ padding:'6px 12px', borderRadius:10, border:`1.5px solid ${form.project_id===p.id ? C.primary : C.border}`, background:form.project_id===p.id ? `${C.primary}20` : 'transparent', color:form.project_id===p.id ? C.primary : C.textDim, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input label="المحل / المورّد" value={form.vendor}         onChange={f('vendor')} />
        <Input label="طريقة الدفع"    value={form.payment_method} onChange={f('payment_method')} options={PAY_METHODS} />

        {/* رفع الفاتورة + AI scan */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <label style={{ fontSize:12, color:C.textDim, fontWeight:600 }}>📎 فاتورة / إثبات (اختياري)</label>
            {receiptFile && receiptFile.type.startsWith('image/') && (
              <button onClick={scanReceipt} disabled={scanning}
                style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${C.primary}55`, background:`${C.primary}15`, color:C.primary, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {scanning ? '⏳' : '🤖 AI مسح'}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={pickFile} />
          {preview
            ? <div style={{ position:'relative' }}>
                <img src={preview} alt="فاتورة" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12, border:`1px solid ${C.border}` }} />
                <button onClick={() => { setReceiptFile(null); setPreview(''); setScanMsg('') }}
                  style={{ position:'absolute', top:6, left:6, background:`${C.accent}dd`, border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
            : receiptFile
            ? <div style={{ padding:'10px 14px', background:`${C.border}33`, borderRadius:12, fontSize:12, color:C.text }}>📄 {receiptFile.name}</div>
            : <button onClick={() => fileRef.current.click()}
                style={{ width:'100%', padding:'14px', borderRadius:12, border:`2px dashed ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, cursor:'pointer' }}>
                📷 اضغط لرفع صورة الفاتورة
              </button>
          }
          {scanMsg && <div style={{ marginTop:6, fontSize:11, color: scanMsg.startsWith('✓') ? C.success : C.accent, fontWeight:600 }}>{scanMsg}</div>}
        </div>

        {formError && <div style={{ padding:'10px 12px', background:`${C.accent}18`, borderRadius:10, fontSize:12, color:C.accent, marginBottom:14, fontWeight:600 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving || !form.amount || !form.category}>
          {saving ? 'جاري الحفظ...' : '✓ أضف المصروف'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deleteExpense(confirmDel); setConfirmDel(null) }} message="حذف هالمصروف؟" />
    </div>
  )
}
