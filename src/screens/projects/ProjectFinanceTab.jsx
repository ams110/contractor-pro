import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Shield, ShieldCheck,
  Wallet, ReceiptText, RefreshCw, Plus,
  ArrowUpRight, ChevronDown, ChevronUp,
  Link2, Fingerprint, DollarSign,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'

// ─── Digital Link Signature ───────────────────────────────────────────────────
// توليد رمز توقيع رقمي فريد من UUID المشروع
function genLinkSig(projectId) {
  if (!projectId) return '????????'
  // نأخذ أول قسمين من UUID ونحولهم لـ Base36 مختصر
  const raw = projectId.replace(/-/g, '').substring(0, 12).toUpperCase()
  return raw.match(/.{1,4}/g)?.join('-') ?? raw
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: `${color}10`, border: `1px solid ${color}28`,
      borderRadius: 16, padding: '13px 10px', textAlign: 'center',
    }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
        ₪{fmt(value)}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ─── توقيع الربط الرقمي ───────────────────────────────────────────────────────
function LinkSigBadge({ projectId, count = 0 }) {
  const sig = genLinkSig(projectId)
  const verified = count > 0

  return (
    <div style={{
      background: verified ? `${C.success}10` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${verified ? C.success + '40' : C.border}`,
      borderRadius: 14, padding: '12px 14px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: verified ? `${C.success}18` : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${verified ? C.success + '35' : C.border}`,
        }}>
          {verified
            ? <ShieldCheck size={18} color={C.success} strokeWidth={2} />
            : <Shield size={18} color={C.textDim} strokeWidth={1.5} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: verified ? C.success : C.textDim }}>
              {verified ? 'الربط المالي موثّق' : 'لا توجد قيود مرتبطة بعد'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Fingerprint size={10} color={C.textDim} strokeWidth={1.5} />
            <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              {sig}
            </span>
            {verified && (
              <span style={{ fontSize: 9, color: C.success, fontWeight: 700, marginInlineStart: 4 }}>
                · {count} قيد مرتبط
              </span>
            )}
          </div>
        </div>
        <Link2 size={14} color={verified ? C.success : C.textDim} strokeWidth={1.8} />
      </div>
    </div>
  )
}

// ─── Income Entry Row ─────────────────────────────────────────────────────────
const SRC_LABELS = {
  client_payment:  'دفعة من عميل',
  project_payment: 'دفعة على مشروع',
  advance:         'دفعة مقدمة',
  other:           'أخرى',
}
const SRC_COLORS = {
  client_payment:  '#22C55E',
  project_payment: '#3B82F6',
  advance:         '#F59E0B',
  other:           '#94A3B8',
}

function IncomeRow({ entry, projectId }) {
  const sig = genLinkSig(projectId)
  const color = SRC_COLORS[entry.source] ?? '#94A3B8'

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '11px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.success }}>
              +₪{fmt(entry.amount)}
            </span>
            <span style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
              {SRC_LABELS[entry.source] ?? entry.source}
            </span>
            {entry.client_name && (
              <span style={{ fontSize: 9, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
                {entry.client_name}
              </span>
            )}
            {/* توقيع الربط */}
            <span style={{
              fontSize: 8, color: C.success, background: `${C.success}10`,
              border: `1px solid ${C.success}30`, padding: '1px 6px',
              borderRadius: 20, fontFamily: 'monospace', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <ShieldCheck size={8} strokeWidth={2} /> {sig}
            </span>
          </div>
          {entry.note && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{entry.note}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Expense Entry Row ────────────────────────────────────────────────────────
function ExpenseRow({ entry, projectId }) {
  const sig = genLinkSig(projectId)
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '11px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>
              -₪{fmt(entry.amount)}
            </span>
            <span style={{ fontSize: 10, color: C.textDim }}>{fmtDate(entry.date)}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
              {entry.category}
            </span>
            {entry.vendor_name && (
              <span style={{ fontSize: 9, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 20 }}>
                {entry.vendor_name}
              </span>
            )}
            {entry.vat_amount > 0 && (
              <span style={{ fontSize: 9, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '2px 7px', borderRadius: 20 }}>
                {'מע"מ'} ₪{fmt(entry.vat_amount)}
              </span>
            )}
            {/* توقيع الربط */}
            <span style={{
              fontSize: 8, color: C.success, background: `${C.success}10`,
              border: `1px solid ${C.success}30`, padding: '1px 6px',
              borderRadius: 20, fontFamily: 'monospace', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <ShieldCheck size={8} strokeWidth={2} /> {sig}
            </span>
          </div>
          {entry.note && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{entry.note}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectFinanceTab({ project }) {
  const { activeBusiness, businesses, initialized, load } = useBusinessStore()

  const [incomeEntries,  setIncomeEntries]  = useState([])
  const [expenseEntries, setExpenseEntries] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [section,  setSection]  = useState('both') // 'both' | 'income' | 'expense'
  const [expanded, setExpanded] = useState({ income: true, expense: true })

  const bizId = activeBusiness?.id
  const pid   = project?.id

  // ─── Load ─────────────────────────────────────────────────────────────
  async function loadData() {
    if (!pid) return
    setLoading(true)
    try {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase
          .from('income_entries')
          .select('*')
          .eq('project_id', pid)
          .order('date', { ascending: false }),
        supabase
          .from('expense_entries')
          .select('*')
          .eq('project_id', pid)
          .order('date', { ascending: false }),
      ])
      setIncomeEntries(inc ?? [])
      setExpenseEntries(exp ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialized) load()
  }, [])

  useEffect(() => {
    loadData()
  }, [pid])

  // ─── Calculations ──────────────────────────────────────────────────────
  const totalIncome   = useMemo(() => incomeEntries.reduce((s, e) => s + Number(e.amount), 0), [incomeEntries])
  const totalExpense  = useMemo(() => expenseEntries.reduce((s, e) => s + Number(e.amount), 0), [expenseEntries])
  const totalVat      = useMemo(() => expenseEntries.reduce((s, e) => s + Number(e.vat_amount || 0), 0), [expenseEntries])
  const netProfit     = totalIncome - totalExpense
  const totalEntries  = incomeEntries.length + expenseEntries.length
  const sig           = genLinkSig(pid)

  // ─── No business setup ────────────────────────────────────────────────
  if (initialized && businesses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Wallet size={36} color={C.textDim} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
          لا يوجد سجل تجاري مفعّل
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>
          أضف سجلك التجاري من تاب المحاسبة أولاً
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <RefreshCw size={20} color={C.textDim} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>تحميل البيانات المالية...</div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 20 }}>

      {/* ── توقيع الربط الرقمي ── */}
      <LinkSigBadge projectId={pid} count={totalEntries} />

      {/* ── ملخص أرقام ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <StatCard label="إجمالي المدخولات" value={totalIncome} color={C.success} icon={TrendingUp} />
        <StatCard label="إجمالي المصاريف"  value={totalExpense} color={C.accent}   icon={TrendingDown} />
      </div>

      {/* صافي الربح */}
      <div style={{
        background: netProfit >= 0 ? `${C.success}10` : `${C.accent}10`,
        border: `1px solid ${netProfit >= 0 ? C.success : C.accent}30`,
        borderRadius: 14, padding: '12px 16px', marginBottom: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 2 }}>
            صافي الربح من هذا المشروع
          </div>
          <div style={{ fontSize: 10, color: C.textDim }}>
            المدخولات − المصاريف المحاسبية
          </div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: netProfit >= 0 ? C.success : C.accent, fontFamily: 'monospace' }}>
            {netProfit >= 0 ? '+' : '-'}₪{fmt(Math.abs(netProfit))}
          </div>
          {totalVat > 0 && (
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
              {'מע"מ'} قابل للخصم: ₪{fmt(totalVat)}
            </div>
          )}
        </div>
      </div>

      {/* ── حالة السجل التجاري ── */}
      {activeBusiness && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '8px 12px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <DollarSign size={12} color={C.textDim} strokeWidth={1.8} />
          <span style={{ fontSize: 10, color: C.textDim }}>
            مرتبط بـ <strong style={{ color: C.text }}>{activeBusiness.name}</strong>
            {' · '}{activeBusiness.business_type === 'osek_patur' ? 'עוסק פטור' : activeBusiness.business_type === 'osek_moreh' ? 'עוסק מורשה' : 'חברה'}
          </span>
        </div>
      )}

      {/* ── المدخولات ── */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setExpanded(p => ({ ...p, income: !p.income }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '0 0 10px', marginBottom: 6, borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={13} color={C.success} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>المدخولات المرتبطة</span>
            <span style={{ fontSize: 9, color: C.success, background: `${C.success}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
              {incomeEntries.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>
              +₪{fmt(totalIncome)}
            </span>
            {expanded.income
              ? <ChevronUp size={14} color={C.textDim} />
              : <ChevronDown size={14} color={C.textDim} />
            }
          </div>
        </button>

        <AnimatePresence>
          {expanded.income && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {incomeEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.textDim, fontSize: 11 }}>
                  لا توجد مدخولات مرتبطة بهذا المشروع بعد
                </div>
              ) : (
                incomeEntries.map(e => (
                  <IncomeRow key={e.id} entry={e} projectId={pid} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── المصاريف ── */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setExpanded(p => ({ ...p, expense: !p.expense }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '0 0 10px', marginBottom: 6, borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={13} color={C.accent} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>المصاريف المرتبطة</span>
            <span style={{ fontSize: 9, color: C.accent, background: `${C.accent}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
              {expenseEntries.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: C.accent, fontFamily: 'monospace' }}>
              -₪{fmt(totalExpense)}
            </span>
            {expanded.expense
              ? <ChevronUp size={14} color={C.textDim} />
              : <ChevronDown size={14} color={C.textDim} />
            }
          </div>
        </button>

        <AnimatePresence>
          {expanded.expense && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {expenseEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.textDim, fontSize: 11 }}>
                  لا توجد مصاريف مرتبطة بهذا المشروع بعد
                </div>
              ) : (
                expenseEntries.map(e => (
                  <ExpenseRow key={e.id} entry={e} projectId={pid} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── كيف تربط قيد بالمشروع ── */}
      {totalEntries === 0 && (
        <div style={{
          background: `${C.primary}08`, border: `1px dashed ${C.primary}30`,
          borderRadius: 14, padding: '14px 16px', marginTop: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 6 }}>
            كيف تربط قيداً بهذا المشروع؟
          </div>
          <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.6 }}>
            {'اذهب إلى المحاسبة → مدخولات أو مصاريف → أضف قيداً جديداً → اختر «'}
            <strong style={{ color: C.text }}>{project.name}</strong>
            {'» من قائمة المشاريع'}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', background: `${C.success}08`, border: `1px solid ${C.success}25`, borderRadius: 10 }}>
            <ShieldCheck size={10} color={C.success} strokeWidth={2} />
            <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>
              رمز التوقيع: <strong style={{ color: C.success }}>{sig}</strong>
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
