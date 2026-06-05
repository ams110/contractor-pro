import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Layers, Wrench, Fuel, Building2, ClipboardList, Car, HardHat, Shield, Package, Plus, BarChart2, Search, X, Paperclip, Camera, Trash2, Check, Hourglass, FileText, Wallet, Receipt, Sparkles, AlertTriangle, Loader2 } from 'lucide-react'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT, PAY_METHODS, VAT } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateExpense } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, FilterChip, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportExpensesToExcel } from '../lib/export.js'
import { supabase } from '../lib/supabase.js'
import { useBusinessStore } from '../store/useBusinessStore.js'

const CAT_ICONS  = { 'بضاعة': ShoppingCart, 'مواد بناء / خامات': Layers, 'عدد وأدوات': Wrench, 'وقود وتنقلات': Fuel, 'إيجار معدات': Building2, 'خدمات مهنية': ClipboardList, 'صيانة مركبات': Car, 'رواتب عمال': HardHat, 'تأمين': Shield, 'أخرى': Package }
const CAT_COLORS = { 'بضاعة':C.pink, 'مواد بناء / خامات':C.orange, 'عدد وأدوات':C.blue, 'وقود وتنقلات':C.cyan, 'إيجار معدات':C.purple, 'خدمات مهنية':C.secondary, 'صيانة مركبات':C.warning, 'رواتب عمال':C.primary, 'تأمين':C.success, 'أخرى':C.textDim }
const FILTER_CATS = ['الكل', 'مواد', 'بضاعة', 'عدد', 'وقود', 'إيجار', 'خدمات', 'رواتب', 'تأمين', 'أخرى']

// ─── شريحة وسم صغيرة (مورّد / مشروع / عامل …) ─────────────────────────────────
function MetaTag({ icon: Icon, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 6, border: `1px solid ${color}33` }}>
      {Icon && <Icon size={9} color={color} strokeWidth={2.3} />}
      {label}
    </span>
  )
}

export default function ExpensesScreen({ expenses, projects, expCats, addExpense, deleteExpense, approveExpense, rejectExpense, employees, userId, permissions, showVatExpenses = true }) {
  // مصدر واحد لنوع المصلحة — business store (لكل مصلحة على حدة)
  const businessType = useBusinessStore(s => s.activeBusiness?.business_type) || 'osek_patur'
  const showVAT = businessType !== 'osek_patur' && showVatExpenses
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('الكل')
  const [search,      setSearch]      = useState('')
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
  const approvedExpenses = expenses.filter(e => e.status === 'approved')
  const total       = approvedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalVATIn  = Math.round(approvedExpenses.reduce((s, e) => {
    const rate   = (e.date || '') >= '2025-01-01' ? 0.18 : 0.17
    const deduct = EXP_CAT_VAT[e.category] ?? 1.00
    return s + (e.amount || 0) * deduct * (rate / (1 + rate))
  }, 0))
  const noVAT  = total - totalVATIn
  const filtered = approvedExpenses
    .filter(e => filter === 'الكل' || e.category?.includes(filter))
    .filter(e => !search.trim() || (e.vendor || '').includes(search.trim()) || (e.category || '').includes(search.trim()) || String(e.amount).includes(search.trim()))
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
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <IconChip icon={Receipt} color={C.accent} size={40} radius={12} />
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:C.text, letterSpacing:'-0.02em' }}>
              المصاريف
            </div>
            <div style={{ fontSize:11, color:C.textDim, marginTop:1 }}>{approvedExpenses.length} سجل</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {permissions?.isOwner && approvedExpenses.length > 0 && (
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => exportExpensesToExcel(approvedExpenses, projects)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, cursor:'pointer', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
              <BarChart2 size={15} strokeWidth={2} />
            </motion.button>
          )}
          {permissions?.addExpenses !== false && (
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => { setFormError(''); setShowForm(true) }}
              style={{ padding:'10px 18px', borderRadius:14, background:GRAD.brand, color:'#000', border:'none', cursor:'pointer', fontWeight:800, fontSize:13, boxShadow:'0 4px 16px rgba(245,158,11,0.3)', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
              <Plus size={14} strokeWidth={2.5} /> مصروف
            </motion.button>
          )}
        </div>
      </div>

      {/* ── إجماليات ── */}
      {approvedExpenses.length > 0 && (
        <PremiumCard tone="critical" radius={20} padding="14px 16px" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-around' }}>
            {showVAT ? (
              <>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>شامل الضريبة</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.accent, fontFamily:'monospace' }}>{fmt(total)}₪</div>
                </div>
                <div style={{ width:1, background:C.border }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>{'صافي بدون مع"מ'}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.text, fontFamily:'monospace' }}>{fmt(noVAT)}₪</div>
                </div>
                <div style={{ width:1, background:C.border }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>{'מס תשומות'}</div>
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
        </PremiumCard>
      )}

      {/* ── مصاريف معلقة ── */}
      {pendingExpenses.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <SectionLabel color={C.warning}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <Hourglass size={13} strokeWidth={2.3} /> بانتظار الموافقة ({pendingExpenses.length})
            </span>
          </SectionLabel>
          {pendingExpenses.map((ex, i) => {
            const worker = employees?.find(e => e.id === ex.employee_id)
            const proj   = projects.find(p => p.id === ex.project_id)
            return (
              <PremiumCard key={ex.id} tone="fair" radius={18} padding="12px 14px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom:10 }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{ex.category}</div>
                      {worker && <div style={{ fontSize:11, color:C.primary, fontWeight:600, marginTop:2, display:'flex', alignItems:'center', gap:4 }}><HardHat size={11} strokeWidth={2} /> {worker.name}</div>}
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
                          <Paperclip size={16} strokeWidth={1.8} style={{ color: C.primary }} />
                          <span style={{ fontSize:12, color:C.primary, fontWeight:600 }}>عرض الفاتورة (PDF)</span>
                        </a>
                      )}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => approveExpense(ex.id)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:GRAD.success, border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 2px 10px ${C.success}44`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontFamily:'inherit' }}>
                      <Check size={14} strokeWidth={2.5} /> موافقة
                    </button>
                    <button onClick={() => rejectExpense(ex.id)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:`${C.accent}20`, border:`1px solid ${C.accent}55`, color:C.accent, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontFamily:'inherit' }}>
                      <X size={14} strokeWidth={2.5} /> رفض
                    </button>
                  </div>
                </div>
              </PremiumCard>
            )
          })}
        </div>
      )}

      {/* ── بحث ── */}
      <div style={{ position:'relative', marginBottom:10 }}>
        <Search size={15} color={C.textDim} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', opacity:0.7 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالمورد أو التصنيف أو المبلغ..."
          style={{ width:'100%', padding:'9px 38px 9px 36px', borderRadius:12, border:`1px solid ${search ? C.primary+'66' : C.border}`, background:'rgba(255,255,255,0.04)', color:C.text, fontSize:12, outline:'none', boxSizing:'border-box', direction:'rtl' }} />
        {search && (
          <button onClick={() => setSearch('')} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.textDim, cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}><X size={14} strokeWidth={2.5} /></button>
        )}
      </div>

      {/* ── فلتر التصنيف ── */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:16, scrollbarWidth:'none' }}>
        {FILTER_CATS.map(cat => (
          <FilterChip key={cat} label={cat} active={filter === cat} onClick={() => setFilter(cat)}
            color={cat === 'الكل' ? C.primary : catColor(cat)} />
        ))}
      </div>

      {/* ── قائمة المصاريف ── */}
      {sorted.length === 0 && pendingExpenses.length === 0
        ? (
            <div style={{ textAlign:'center', padding:'44px 0', color:C.textDim }}>
              <IconChip icon={Wallet} color={C.accent} size={52} radius={16} iconSize={26} style={{ margin:'0 auto 12px' }} />
              <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:18 }}>ما في مصاريف</div>
              <Btn onClick={() => setShowForm(true)}>+ أضف مصروف</Btn>
            </div>
          )
        : sorted.length === 0 ? null
        : sorted.map((ex, i) => {
            const proj   = projects.find(p => p.id === ex.project_id)
            const worker = employees?.find(e => e.id === ex.employee_id)
            const col    = catColor(ex.category)
            const CatIcon = catIcon(ex.category)
            return (
              <PremiumCard key={ex.id} color={col} glow={false} radius={14} padding="12px 14px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* أيقونة ملونة */}
                  <IconChip icon={CatIcon} color={col} size={44} radius={14} iconSize={20} strokeWidth={1.8} />

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
                          <div style={{ fontSize:9, fontWeight:700, color:C.primary, background:`${C.primary}15`, padding:'2px 7px', borderRadius:6, border:`1px solid ${C.primary}33`, display:'flex', alignItems:'center', gap:3 }}>
                            <HardHat size={9} strokeWidth={2} /> {worker.name}
                          </div>
                        )}
                        {ex.approved_by && (
                          <div style={{ fontSize:9, fontWeight:700, color:C.success, background:`${C.success}15`, padding:'2px 7px', borderRadius:6, border:`1px solid ${C.success}33`, display:'flex', alignItems:'center', gap:3 }}>
                            <Check size={9} strokeWidth={2.5} /> {ex.approved_by}
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
                        <a href={ex.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:8, background:`${C.secondary}18`, border:`1px solid ${C.secondary}33`, color:C.secondary }} title="عرض الفاتورة"><Paperclip size={12} strokeWidth={2} /></a>
                      )}
                      <button onClick={() => setConfirmDel(ex.id)}
                        style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', color:C.accent, fontFamily:'inherit' }}><Trash2 size={12} strokeWidth={2} /></button>
                    </div>
                  </div>
                </div>
                {/* شريط لوني جانبي */}
                <div style={{ position:'absolute', top:0, right:0, width:3, height:'100%', background:col, borderRadius:'0 20px 20px 0' }} />
              </PremiumCard>
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
            <label style={{ fontSize:12, color:C.textDim, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}><Paperclip size={12} strokeWidth={2} /> فاتورة / إثبات (اختياري)</label>
            {receiptFile && receiptFile.type.startsWith('image/') && (
              <button onClick={scanReceipt} disabled={scanning}
                style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${C.primary}55`, background:`${C.primary}15`, color:C.primary, fontSize:11, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
                {scanning
                  ? <><Loader2 size={12} strokeWidth={2.5} style={{ animation:'spin .8s linear infinite' }} /> جاري المسح</>
                  : <><Sparkles size={12} strokeWidth={2.3} /> AI مسح</>}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={pickFile} />
          {preview
            ? <div style={{ position:'relative' }}>
                <img src={preview} alt="فاتورة" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12, border:`1px solid ${C.border}` }} />
                <button onClick={() => { setReceiptFile(null); setPreview(''); setScanMsg('') }}
                  style={{ position:'absolute', top:6, left:6, background:`${C.accent}dd`, border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} strokeWidth={2.5} /></button>
              </div>
            : receiptFile
            ? <div style={{ padding:'10px 14px', background:`${C.border}33`, borderRadius:12, fontSize:12, color:C.text, display:'flex', alignItems:'center', gap:6 }}><Paperclip size={13} strokeWidth={2} style={{ color: C.secondary }} /> {receiptFile.name}</div>
            : <button onClick={() => fileRef.current.click()}
                style={{ width:'100%', padding:'14px', borderRadius:12, border:`2px dashed ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
                <Camera size={16} strokeWidth={1.8} /> اضغط لرفع صورة الفاتورة
              </button>
          }
          {scanMsg && <div style={{ marginTop:6, fontSize:11, color: scanMsg.startsWith('✓') ? C.success : C.accent, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            {scanMsg.startsWith('✓') ? <Check size={12} strokeWidth={2.5} /> : <AlertTriangle size={12} strokeWidth={2.3} />}
            {scanMsg.replace(/^[✓⚠]\s*/, '')}
          </div>}
        </div>

        {formError && <div style={{ padding:'10px 12px', background:`${C.accent}18`, borderRadius:10, fontSize:12, color:C.accent, marginBottom:14, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={13} strokeWidth={2.3} /> {formError}</div>}
        <Btn onClick={save} full disabled={saving || !form.amount || !form.category}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, justifyContent:'center' }}>
            {saving ? <Loader2 size={14} strokeWidth={2.5} style={{ animation:'spin .8s linear infinite' }} /> : <Check size={14} strokeWidth={2.5} />}
            {saving ? 'جاري الحفظ...' : 'أضف المصروف'}
          </span>
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deleteExpense(confirmDel); setConfirmDel(null) }} message="حذف هالمصروف؟" />
    </div>
  )
}
