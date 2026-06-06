import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TrendingDown, Trash2,
  Calendar, FolderOpen, Receipt,
  Banknote, Smartphone, CreditCard, Building,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { C, GRAD, EXP_CATS, EXP_CAT_VAT } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'
import { AddExpenseSheet } from '../../components/sheets/index.js'
import ReceiptCard from '../../components/ReceiptCard.jsx'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { detectExpenseAnomalies } from '../../lib/insights.js'
import ExpenseRadar from '../../components/ExpenseRadar.jsx'

// ─── Constants ────────────────────────────────────────────────────────────────
const METHODS = [
  { id: 'cash',     label: 'كاش',            Icon: Banknote   },
  { id: 'transfer', label: 'تحويل بنكي',     Icon: Building   },
  { id: 'check',    label: 'شيك',             Icon: CreditCard },
  { id: 'app',      label: 'בנקאות סלולרית', Icon: Smartphone },
]
function methodLabel(m) { return METHODS.find(x => x.id === m)?.label ?? m }

const CAT_COLORS = [
  '#F59E0B','#22C55E','#3B82F6','#8B5CF6','#EC4899',
  '#06B6D4','#F97316','#EF4444','#84CC16','#94A3B8',
]
function catColor(cat) {
  const i = EXP_CATS.indexOf(cat)
  return CAT_COLORS[i % CAT_COLORS.length] ?? '#94A3B8'
}
function vatDeductRate(cat) { return EXP_CAT_VAT?.[cat] ?? 1.0 }

const inp = (focus, key) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `${color}0F`, border: `1px solid ${color}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
        ₪{fmt(value)}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ─── VAT Hint Badge ───────────────────────────────────────────────────────────
function VatHint({ category }) {
  const rate = vatDeductRate(category)
  if (rate >= 1.0) return (
    <span style={{ fontSize: 9, background: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} قابل للخصم 100%
    </span>
  )
  if (rate >= 0.6) return (
    <span style={{ fontSize: 9, background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B30', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} قابل للخصم 67%
    </span>
  )
  return (
    <span style={{ fontSize: 9, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444430', borderRadius: 8, padding: '2px 7px', fontWeight: 700 }}>
      {'מע"מ'} غير قابل للخصم
    </span>
  )
}

// ─── Entry Row ────────────────────────────────────────────────────────────────
function EntryRow({ entry, showVat, projectName, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const color = catColor(entry.category)
  const deductible = Number(entry.vat_amount ?? 0) * vatDeductRate(entry.category)
  const method = entry.payment_method || entry.method
  const note = entry.note || entry.notes

  const title = entry.vendor || entry.category || 'مصروف'
  const chips = []
  if (entry.category && entry.category !== title) chips.push({ label: entry.category, color })
  if (method) chips.push({ label: methodLabel(method), color: C.cyan })
  if (projectName) chips.push({ label: projectName, color: C.primary })

  const actions = !delConfirm
    ? <button onClick={() => setDelConfirm(true)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}><Trash2 size={13} /></button>
    : <span style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setDelConfirm(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontFamily: 'inherit' }}>لا</button>
        <button onClick={() => onDelete(entry.id)} style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}>احذف</button>
      </span>

  return (
    <ReceiptCard
      accent={C.accent}
      direction="out"
      amountLabel="صُرف"
      refNumber={entry.ref_number}
      date={fmtDate(entry.date)}
      title={title}
      subtitle={note}
      amount={entry.amount}
      chips={chips}
      onView={entry.receipt_url ? () => window.open(entry.receipt_url, '_blank', 'noopener') : undefined}
      actions={actions}
    >
      {showVat && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 7 }}>
          <VatHint category={entry.category} />
          {deductible > 0 && <span style={{ fontSize: 10, color: C.success, fontWeight: 700 }}>خصم {'מע"מ'} ₪{fmt(deductible)}</span>}
        </div>
      )}
    </ReceiptCard>
  )
}


// ─── MAIN: ExpenseTab ─────────────────────────────────────────────────────────
// linkedProjects:   المشاريع المربوطة بالمصلحة النشطة (من FinanceScreen)
// onGoToProjects:   فتح صفحة المشاريع (لما ما في مشاريع بعد)
// autoOpen:         لما يكون true تُفتح الـ sheet تلقائياً (من pendingAction)
// defaultProjectId: لقفل المشروع على مشروع محدد (من ProjectDetail)
// onSheetClose:     إشعار للأب لإفراغ حالة pendingAction
export default function ExpenseTab({
  userId, linkedProjects = [], onGoToProjects,
  autoOpen = false, defaultProjectId = null, onSheetClose,
  onMutate,
}) {
  // ─── اقرأ businesses و activeBusinessId مباشرةً من الـ store ───────────
  const businesses    = useBusinessStore(s => s.businesses)
  const activeBizId   = useBusinessStore(s => s.activeBusinessId)
  const activeBusiness = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )
  const { showToast } = useAppStore()
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)   // false — لا نبدأ بـ "تحميل"
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCat,   setFilterCat]   = useState('')
  const [filterProj,  setFilterProj]  = useState('')

  const bizId   = activeBusiness?.id
  const bizType = activeBusiness?.business_type ?? 'osek_patur'
  const showVat = bizType === 'osek_moreh' || bizType === 'hevra'

  const projectMap = useMemo(() => {
    const m = {}
    linkedProjects.forEach(p => { m[p.id] = p.name })
    return m
  }, [linkedProjects])

  // ─── جلب expenses الخاصة بالمصلحة النشطة ────────────────────────────────
  async function load() {
    if (!userId || !bizId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId, bizId]) // eslint-disable-line

  // فتح تلقائي للـ sheet لما يجي pendingAction من شاشة أخرى
  useEffect(() => {
    if (autoOpen) setAddOpen(true)
  }, [autoOpen])

  function handleSheetClose() {
    setAddOpen(false)
    onSheetClose?.()
  }

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

  const totalVatDeductible = useMemo(() =>
    entries
      .filter(e => e.date?.startsWith(thisMonthKey))
      .reduce((s, e) => s + Number(e.vat_amount ?? 0) * vatDeductRate(e.category), 0)
  , [entries, thisMonthKey])

  // كاشف التسريب — مسح ذكي للمصاريف الشاذّة هذا الشهر
  const expenseRadar = useMemo(() =>
    detectExpenseAnomalies({ entries, monthKey: thisMonthKey })
  , [entries, thisMonthKey])

  // رسم بياني بالفئات (الشهر الحالي)
  const catChartData = useMemo(() => {
    const map = {}
    entries.filter(e => e.date?.startsWith(thisMonthKey)).forEach(e => {
      if (e.category) map[e.category] = (map[e.category] ?? 0) + Number(e.amount)
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.split('/')[0].trim(), value, full: name }))
  }, [entries, thisMonthKey])

  // ─── Filtered ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterCat)   res = res.filter(e => e.category === filterCat)
    if (filterProj)  res = res.filter(e => e.project_id === filterProj)
    return res
  }, [entries, filterMonth, filterCat, filterProj])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  const usedCats = useMemo(() => {
    const seen = new Set(entries.map(e => e.category).filter(Boolean))
    return EXP_CATS.filter(c => seen.has(c))
  }, [entries])

  // ─── Actions ──────────────────────────────────────────────────────────────
  // الـ shared AddExpenseSheet بترسل payload جاهز مع business_id و vat_amount و is_general
  async function handleSave(payload) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select().single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    onMutate?.()
    showToast('تم تسجيل المصروف')
  }

  async function handleDelete(id) {
    const entry = entries.find(e => e.id === id)
    const sig = await bioConfirm(`حذف مصروف: ₪${Number(entry?.amount || 0).toLocaleString()} — ${entry?.category || ''}`, 'expenses')
    if (!sig) return
    await supabase.from('expenses').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    onMutate?.()
    showToast('تم الحذف')
  }

  const anyFilter = filterMonth || filterCat || filterProj

  return (
    <div>
      {/* ─── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="هذا الشهر" value={totalMonth} color={C.accent} icon={TrendingDown} />
        <StatCard label={`سنة ${thisYear}`} value={totalYear} color="#8B5CF6" />
        {showVat && (
          <StatCard label={'מע"מ مخصوم'} value={totalVatDeductible} color="#22C55E" sub="هذا الشهر" />
        )}
      </div>

      {/* ─── كاشف التسريب — مسح ذكي للمصاريف الشاذّة ──────────────────────────── */}
      <ExpenseRadar radar={expenseRadar} monthKey={thisMonthKey} />

      {/* ─── Chart ──────────────────────────────────────────────────────────── */}
      {catChartData.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 8px 4px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 8, paddingRight: 8 }}>
            توزيع المصاريف — {thisMonthKey}
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={catChartData} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: C.textDim }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11 }}
                formatter={(v, n, props) => [`₪${fmt(v)}`, props.payload.full]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {catChartData.map((entry, i) => (
                  <Cell key={i} fill={catColor(entry.full)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} color={C.textDim} />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">كل الفترات</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterCat ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الفئات</option>
          {usedCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {linkedProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderOpen size={11} color={C.textDim} />
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterProj ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 140 }}>
              <option value="">كل المشاريع</option>
              {linkedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} سجل
          {anyFilter && (
            <span style={{ marginRight: 6, color: C.accent }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* ─── List ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingDown size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {anyFilter ? 'لا توجد مصاريف لهذا الفلتر' : 'لا توجد مصاريف بعد'}
          </div>
          {!anyFilter && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>اضغط + لتسجيل أول مصروف</div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              showVat={showVat}
              projectName={projectMap[entry.project_id]}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      )}

      {/* ─── FAB ────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom,0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAddOpen(true)}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', background: GRAD.danger,
            border: 'none', borderRadius: 50,
            color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${C.accent}44`,
          }}>
          <Plus size={16} strokeWidth={2.5} />
          تسجيل مصروف
        </motion.button>
      </div>

      {/* ─── Add Sheet ──────────────────────────────────────────────────────── */}
      <AddExpenseSheet
        open={addOpen}
        onClose={handleSheetClose}
        onSave={handleSave}
        userId={userId}
        businessId={bizId}
        businessType={bizType}
        projects={linkedProjects}
        defaultProjectId={defaultProjectId}
        onGoToProjects={onGoToProjects}
      />
    </div>
  )
}
