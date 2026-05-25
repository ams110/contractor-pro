import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, TrendingUp, AlertTriangle,
  Banknote, Smartphone, CreditCard, Building,
  Trash2, Image, Calendar, FolderOpen,
} from 'lucide-react'
import { C, GRAD, OSEK_PATUR_THRESHOLD } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'

const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]
function methodLabel(m) { return METHODS.find(x => x.id === m)?.label ?? m }

const inp = (focus, key) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `${color}0F`, border: `1px solid ${color}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(value)}</div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function EntryRow({ entry, projectName, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>₪{fmt(entry.amount)}</div>
              {entry.ref_number && (
                <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {entry.ref_number}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
            {projectName && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}15`, padding: '2px 7px', borderRadius: 20 }}>{projectName}</span>
            )}
            {entry.payment_method && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>{methodLabel(entry.payment_method)}</span>
            )}
            {entry.payer_name && (
              <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>{entry.payer_name}</span>
            )}
          </div>
          {entry.notes && <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic' }}>{entry.notes}</div>}
          {entry.receipt_url && (
            <a href={entry.receipt_url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: C.primary, textDecoration: 'none' }}>
              <Image size={10} /> عرض الإيصال
            </a>
          )}
        </div>
        <div>
          {!delConfirm
            ? <button onClick={() => setDelConfirm(true)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}><Trash2 size={13} /></button>
            : <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setDelConfirm(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '3px 7px', fontSize: 10 }}>لا</button>
                <button onClick={() => onDelete(entry.id)} style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>احذف</button>
              </div>
          }
        </div>
      </div>
    </motion.div>
  )
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────
function AddIncomeSheet({ open, onClose, onSave, allProjects, userId }) {
  const [form, setForm] = useState({ amount: '', date: todayStr(), payment_method: 'cash', payer_name: '', project_id: '', notes: '', ref_number: '' })
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState('')
  const fileRef = useRef()

  function reset() {
    setForm({ amount: '', date: todayStr(), payment_method: 'cash', payer_name: '', project_id: '', notes: '', ref_number: '' })
    setProofFile(null); setProofPreview(null); setSaving(false)
  }
  function handleClose() { reset(); onClose() }
  function pickFile(e) {
    const f = e.target.files?.[0]; if (!f) return
    setProofFile(f); setProofPreview(URL.createObjectURL(f))
  }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    try {
      let receipt_url = null
      if (proofFile && userId) receipt_url = await uploadReceipt(userId, proofFile)
      await onSave({
        user_id: userId,
        project_id: form.project_id || null,
        amount: Number(form.amount),
        date: form.date,
        payment_method: form.payment_method,
        payer_name: form.payer_name.trim() || null,
        notes: form.notes.trim() || null,
        ref_number: form.ref_number.trim() || null,
        receipt_url,
      })
      handleClose()
    } catch (e) { console.error(e); setSaving(false) }
  }

  const canSave = form.amount && Number(form.amount) > 0 && !saving

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: C.card, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>

            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>تسجيل قبضة</div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><X size={18} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
              {/* المبلغ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>المبلغ (₪) <span style={{ color: C.accent }}>*</span></div>
                <input type="number" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)}
                  placeholder="0.00" onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                  style={{ ...inp(focus, 'amount'), direction: 'ltr', textAlign: 'right' }} />
              </div>

              {/* المشروع — اختياري */}
              {allProjects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>المشروع (اختياري)</div>
                  <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">— بدون مشروع —</option>
                    {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* التاريخ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>التاريخ</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ ...inp(focus, 'date'), direction: 'ltr' }} />
              </div>

              {/* طريقة الدفع */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {METHODS.map(m => {
                    const active = form.payment_method === m.id
                    return (
                      <button key={m.id} onClick={() => set('payment_method', m.id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: active ? `${C.success}15` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? C.success : C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <m.Icon size={14} color={active ? C.success : C.textDim} />
                        <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? C.success : C.textDim }}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* اسم الدافع */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>اسم الدافع (اختياري)</div>
                <input value={form.payer_name} onChange={e => set('payer_name', e.target.value)}
                  placeholder="اسم العميل / الجهة الدافعة"
                  onFocus={() => setFocus('payer')} onBlur={() => setFocus('')} style={inp(focus, 'payer')} />
              </div>

              {/* رقم مرجعي */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>رقم مرجعي / شيك (اختياري)</div>
                <input value={form.ref_number} onChange={e => set('ref_number', e.target.value)}
                  placeholder="رقم الشيك أو المرجع"
                  onFocus={() => setFocus('ref')} onBlur={() => setFocus('')} style={{ ...inp(focus, 'ref'), direction: 'ltr' }} />
              </div>

              {/* ملاحظة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="أي تفاصيل إضافية..."
                  onFocus={() => setFocus('notes')} onBlur={() => setFocus('')} style={inp(focus, 'notes')} />
              </div>

              {/* صورة الإيصال */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>صورة الإيصال (اختياري)</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
                {proofPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={proofPreview} alt="receipt" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                    <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                      style={{ position: 'absolute', top: -6, insetInlineEnd: -6, background: C.accent, border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.textDim, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Image size={14} /> رفع صورة إيصال
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={handleSave} disabled={!canSave}
                style={{ width: '100%', padding: '13px', background: canSave ? GRAD.success : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: canSave ? '#fff' : C.textDim, fontSize: 14, fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ تسجيل القبضة'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IncomeTab({ userId }) {
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()

  const [entries,     setEntries]     = useState([])
  const [allProjects, setAllProjects] = useState([])   // مشاريع المستخدم — مجلوبة مباشرة
  const [loading,     setLoading]     = useState(true)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterProj,  setFilterProj]  = useState('')

  // projectMap للعرض السريع
  const projectMap = useMemo(() => {
    const m = {}
    allProjects.forEach(p => { m[p.id] = p.name })
    return m
  }, [allProjects])

  // ─── جلب كل client_receipts + مشاريع المستخدم مباشرة ────────────────────
  async function load() {
    if (!userId) return
    setLoading(true)
    try {
      const [receiptsRes, projectsRes] = await Promise.all([
        supabase
          .from('client_receipts')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ])
      if (receiptsRes.error) throw receiptsRes.error
      if (projectsRes.error) throw projectsRes.error
      setEntries(receiptsRes.data ?? [])
      setAllProjects(projectsRes.data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line

  // ─── Stats ────────────────────────────────────────────────────────────────
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisYear = now.getFullYear()

  const totalMonth = useMemo(() =>
    entries.filter(e => e.date?.startsWith(thisMonthKey)).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisMonthKey])

  const totalYear = useMemo(() =>
    entries.filter(e => e.date?.startsWith(String(thisYear))).reduce((s, e) => s + Number(e.amount), 0)
  , [entries, thisYear])

  const isOsekPatur = activeBusiness?.business_type === 'osek_patur'
  const paturPct    = isOsekPatur ? (totalYear / OSEK_PATUR_THRESHOLD) * 100 : 0
  const showPaturWarning = isOsekPatur && paturPct >= 70

  // ─── Filtered ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterProj)  res = res.filter(e => e.project_id === filterProj)
    return res
  }, [entries, filterMonth, filterProj])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase.from('client_receipts').insert(fields).select().single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    showToast('✅ تم تسجيل القبضة')
  }

  async function handleDelete(id) {
    await supabase.from('client_receipts').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.success} icon={TrendingUp} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#3B82F6" />
        {isOsekPatur && (
          <StatCard label="متبقي من السقف" value={OSEK_PATUR_THRESHOLD - totalYear}
            color={paturPct >= 90 ? C.accent : paturPct >= 70 ? '#F59E0B' : C.textDim} sub={`${paturPct.toFixed(0)}%`} />
        )}
      </div>

      {/* تحذير עוסק פטור */}
      <AnimatePresence>
        {showPaturWarning && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: paturPct >= 90 ? `${C.accent}12` : `${C.warning}12`, border: `1px solid ${paturPct >= 90 ? C.accent : C.warning}30`, borderRadius: 14, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={14} color={paturPct >= 90 ? C.accent : C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: paturPct >= 90 ? C.accent : C.warning }}>
                {paturPct >= 90 ? 'تجاوزت 90% من سقف עוסק פטור' : 'تنبيه: وصلت 70% من سقف עוסק פטור'}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                ₪{fmt(totalYear)} من أصل ₪{fmt(OSEK_PATUR_THRESHOLD)} — تبقّى ₪{fmt(OSEK_PATUR_THRESHOLD - totalYear)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} color={C.textDim} />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">كل الفترات</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {allProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderOpen size={11} color={C.textDim} />
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterProj ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 140 }}>
              <option value="">كل المشاريع</option>
              {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {(filterMonth || filterProj) && (
            <span style={{ marginRight: 6, color: C.success }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingUp size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterMonth || filterProj ? 'لا توجد قبضات لهذا الفلتر' : 'لا توجد قبضات بعد'}
          </div>
          {!filterMonth && !filterProj && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>اضغط + لتسجيل أول قبضة</div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow key={entry.id} entry={entry} projectName={projectMap[entry.project_id]} onDelete={handleDelete} />
          ))}
        </AnimatePresence>
      )}

      {/* FAB */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom,0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setAddOpen(true)}
          style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: GRAD.success, border: 'none', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${C.success}44` }}>
          <Plus size={16} strokeWidth={2.5} />
          تسجيل قبضة
        </motion.button>
      </div>

      <AddIncomeSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} allProjects={allProjects} userId={userId} />
    </div>
  )
}
