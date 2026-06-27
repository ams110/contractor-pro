import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TrendingUp, AlertTriangle,
  Banknote, Smartphone, CreditCard, Building,
  Trash2, Image, Calendar, FolderOpen,
} from 'lucide-react'
import { C, GRAD, OSEK_PATUR_THRESHOLD } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'
import { openSignedUrl } from '../../lib/storage.js'
import { AddReceiptSheet } from '../../components/sheets/index.js'
import ReceiptCard from '../../components/ReceiptCard.jsx'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { computeCollectionAging } from '../../lib/insights.js'
import CollectionAging from '../../components/CollectionAging.jsx'
import { tl, tEnum } from '../../lib/labels.js'

const METHODS = [
  { id: 'cash',     ar: 'كاش',        he: 'מזומן',            en: 'Cash',          Icon: Banknote   },
  { id: 'transfer', ar: 'تحويل بنكي', he: 'העברה בנקאית',     en: 'Bank transfer', Icon: Building   },
  { id: 'check',    ar: 'شيك',        he: "צ'ק",              en: 'Cheque',        Icon: CreditCard },
  { id: 'app',      ar: 'تطبيق',      he: 'בנקאות סלולרית',   en: 'Mobile banking', Icon: Smartphone },
]
function methodLabel(m, language) {
  const x = METHODS.find(x => x.id === m)
  return x ? tl(language, x.ar, x.he, x.en) : m
}

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
  const language = useAppStore(s => s.language)
  const chips = []
  if (entry.payment_method) chips.push({ label: methodLabel(entry.payment_method, language), color: C.cyan })
  if (entry.payer_name && projectName) chips.push({ label: entry.payer_name, color: C.textDim })
  const actions = !delConfirm
    ? <button onClick={() => setDelConfirm(true)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 2, display: 'flex' }}><Trash2 size={13} /></button>
    : <span style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setDelConfirm(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontFamily: 'inherit' }}>{tl(language, 'لا', 'לא', 'No')}</button>
        <button onClick={() => onDelete(entry.id)} style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}>{tl(language, 'احذف', 'מחק', 'Delete')}</button>
      </span>
  return (
    <ReceiptCard
      accent={C.success}
      direction="in"
      amountLabel={tl(language, 'قُبض', 'נגבה', 'Received')}
      refNumber={entry.ref_number}
      date={fmtDate(entry.date)}
      title={projectName || entry.payer_name || tl(language, 'مقبوض', 'הכנסה', 'Income')}
      subtitle={entry.notes}
      amount={entry.amount}
      chips={chips}
      onView={entry.receipt_url ? () => openSignedUrl(entry.receipt_url) : undefined}
      actions={actions}
    />
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// linkedProjects: المشاريع المربوطة بالمصلحة النشطة (من FinanceScreen)
// onGoToProjects: callback لفتح صفحة المشاريع (يُمرَّر من FinanceScreen أو App)
// autoOpen:       لما يكون true تُفتح الـ sheet تلقائياً (من pendingAction)
// defaultProjectId: لقفل اختيار المشروع على مشروع محدد (لما نجي من ProjectDetail)
// onSheetClose:   إشعار للأب أن الـ sheet أُغلقت (لإفراغ حالة pendingAction)
export default function IncomeTab({
  userId, linkedProjects = [], onGoToProjects,
  autoOpen = false, defaultProjectId = null, onSheetClose,
  onMutate,
}) {
  const businesses    = useBusinessStore(s => s.businesses)
  const activeBizId   = useBusinessStore(s => s.activeBusinessId)
  const activeBusiness = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )
  const { showToast, celebrate } = useAppStore()
  const language = useAppStore(s => s.language)
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterProj,  setFilterProj]  = useState('')

  const projectMap = useMemo(() => {
    const m = {}
    linkedProjects.forEach(p => { m[p.id] = p.name })
    return m
  }, [linkedProjects])

  const bizId = activeBusiness?.id

  async function load() {
    if (!userId || !bizId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('client_receipts')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) {
      console.error('IncomeTab load error:', e)
      setEntries([])
    }
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

  // رادار التحصيل — أعمار ذمم العملاء + أولوية الاتصال
  const aging = useMemo(() =>
    computeCollectionAging({ projects: linkedProjects, receipts: entries }, language)
  , [linkedProjects, entries, language])

  const orphanCount = useMemo(() => entries.filter(e => !e.project_id).length, [entries])
  const filtered = useMemo(() => {
    let res = entries
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (filterProj === '__orphan__') res = res.filter(e => !e.project_id)
    else if (filterProj) res = res.filter(e => e.project_id === filterProj)
    return res
  }, [entries, filterMonth, filterProj])

  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  async function handleSave(payload) {
    const { error, data } = await supabase
      .from('client_receipts')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    onMutate?.()
    showToast(tl(language, 'تم تسجيل القبضة', 'ההכנסה נרשמה', 'Income recorded'))
    celebrate('money')
  }

  async function handleDelete(id) {
    const entry = entries.find(e => e.id === id)
    const sig = await bioConfirm(tl(language, `حذف قبضة: ₪${Number(entry?.amount || 0).toLocaleString()}`, `מחיקת הכנסה: ₪${Number(entry?.amount || 0).toLocaleString()}`, `Delete income: ₪${Number(entry?.amount || 0).toLocaleString()}`), 'client_receipts')
    if (!sig) return
    await supabase.from('client_receipts').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    onMutate?.()
    showToast(tl(language, 'تم الحذف', 'נמחק', 'Deleted'))
  }

  return (
    <div>
      {/* تحذير القبضات اليتيمة (بلا مشروع — غالباً بعد حذف مشروع) */}
      {orphanCount > 0 && (
        <button onClick={() => setFilterProj(f => f === '__orphan__' ? '' : '__orphan__')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 12, borderRadius: 12, background: `${C.secondary}14`, border: `1px solid ${C.secondary}3a`, color: C.text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
          <AlertTriangle size={15} color={C.secondary} strokeWidth={2.2} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{tl(language, `${orphanCount} قبضة بلا مشروع مرتبط`, `${orphanCount} הכנסות ללא פרויקט משויך`, `${orphanCount} income without a linked project`)}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.secondary }}>{filterProj === '__orphan__' ? tl(language, 'إخفاء', 'הסתר', 'Hide') : tl(language, 'عرضها', 'הצג', 'Show')}</span>
        </button>
      )}
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label={tl(language, 'هذا الشهر', 'החודש', 'This month')} value={totalMonth} color={C.success} icon={TrendingUp} />
        <StatCard label={tl(language, `سنة ${thisYear}`, `שנת ${thisYear}`, `Year ${thisYear}`)} value={totalYear} color="#3B82F6" />
        {isOsekPatur && (
          <StatCard label={tl(language, 'متبقي من السقف', 'נותר עד התקרה', 'Remaining to cap')} value={OSEK_PATUR_THRESHOLD - totalYear}
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
                {paturPct >= 90
                  ? tl(language, 'تجاوزت 90% من سقف עוסק פטור', 'עברת 90% מתקרת עוסק פטור', 'Exceeded 90% of the עוסק פטור cap')
                  : tl(language, 'تنبيه: وصلت 70% من سقف עוסק פטור', 'שים לב: הגעת ל-70% מתקרת עוסק פטור', 'Notice: reached 70% of the עוסק פטור cap')}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                {tl(language,
                  `₪${fmt(totalYear)} من أصل ₪${fmt(OSEK_PATUR_THRESHOLD)} — تبقّى ₪${fmt(OSEK_PATUR_THRESHOLD - totalYear)}`,
                  `₪${fmt(totalYear)} מתוך ₪${fmt(OSEK_PATUR_THRESHOLD)} — נותרו ₪${fmt(OSEK_PATUR_THRESHOLD - totalYear)}`,
                  `₪${fmt(totalYear)} of ₪${fmt(OSEK_PATUR_THRESHOLD)} — ₪${fmt(OSEK_PATUR_THRESHOLD - totalYear)} left`)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── رادار التحصيل — أعمار الذمم + أولوية الاتصال ─────────────────────── */}
      <CollectionAging aging={aging} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} color={C.textDim} />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">{tl(language, 'كل الفترات', 'כל התקופות', 'All periods')}</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {linkedProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FolderOpen size={11} color={C.textDim} />
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterProj ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 140 }}>
              <option value="">{tl(language, 'كل المشاريع', 'כל הפרויקטים', 'All projects')}</option>
              {linkedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {tl(language, `${filtered.length} سجل`, `${filtered.length} רשומות`, `${filtered.length} records`)}
          {(filterMonth || filterProj) && (
            <span style={{ marginRight: 6, color: C.success }}>
              · ₪{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>{tl(language, 'تحميل...', 'טוען...', 'Loading...')}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrendingUp size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterMonth || filterProj
              ? tl(language, 'لا توجد قبضات لهذا الفلتر', 'אין הכנסות לסינון זה', 'No income for this filter')
              : tl(language, 'لا توجد قبضات بعد', 'אין הכנסות עדיין', 'No income yet')}
          </div>
          {!filterMonth && !filterProj && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>{tl(language, 'اضغط + لتسجيل أول قبضة', 'לחץ + לרישום ההכנסה הראשונה', 'Tap + to add your first income')}</div>
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
          {tl(language, 'تسجيل قبضة', 'רישום הכנסה', 'Add income')}
        </motion.button>
      </div>

      <AddReceiptSheet
        open={addOpen}
        onClose={handleSheetClose}
        onSave={handleSave}
        userId={userId}
        businessId={bizId}
        projects={linkedProjects}
        defaultProjectId={defaultProjectId}
        onGoToProjects={onGoToProjects}
      />
    </div>
  )
}
