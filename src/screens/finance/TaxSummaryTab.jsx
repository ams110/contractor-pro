import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator, TrendingUp, TrendingDown, Wallet,
  AlertTriangle, CheckCircle2, ChevronDown, Info,
  BarChart3, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell, Legend,
} from 'recharts'
import {
  C, GRAD,
  VAT, EXP_CAT_VAT,
  OSEK_PATUR_THRESHOLD,
  BITUACH_LEUMI_RATE,
} from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'

// ─── Israeli income-tax brackets 2024 (individual / self-employed) ─────────────
const IL_TAX_BRACKETS = [
  { upTo:  81_480, rate: 0.10 },
  { upTo: 116_760, rate: 0.14 },
  { upTo: 187_440, rate: 0.20 },
  { upTo: 260_520, rate: 0.31 },
  { upTo: 542_160, rate: 0.35 },
  { upTo: Infinity, rate: 0.47 },
]

function calcIncomeTax(income) {
  let tax = 0, prev = 0
  for (const b of IL_TAX_BRACKETS) {
    if (income <= prev) break
    const slice = Math.min(income, b.upTo) - prev
    tax += slice * b.rate
    prev = b.upTo
  }
  return Math.max(0, tax)
}

// ─── Period helpers ────────────────────────────────────────────────────────────
const now = new Date()

const PERIODS = [
  { id: 'month',   label: 'هذا الشهر' },
  { id: 'quarter', label: 'هذا الربع' },
  { id: 'year',    label: `سنة ${now.getFullYear()}` },
  { id: 'all',     label: 'كل الفترات' },
]

function periodRange(pid) {
  const y  = now.getFullYear()
  const m  = now.getMonth() // 0-based
  const q  = Math.floor(m / 3)
  switch (pid) {
    case 'month':
      return {
        start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        end:   `${y}-${String(m + 1).padStart(2, '0')}-31`,
      }
    case 'quarter':
      return {
        start: `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`,
        end:   `${y}-${String(q * 3 + 3).padStart(2, '0')}-31`,
      }
    case 'year':
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    default:
      return { start: '2000-01-01', end: '2100-12-31' }
  }
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function Card({ label, value, color, sub, note, icon: Icon, pct }) {
  return (
    <div style={{ background: `${color}0C`, border: `1px solid ${color}22`, borderRadius: 16, padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{label}</div>
        {Icon && <Icon size={14} color={color} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.03em' }}>
        ₪{fmt(value)}
      </div>
      {pct != null && (
        <div style={{ marginTop: 4, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 2, transition: 'width .6s' }} />
        </div>
      )}
      {sub  && <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>{sub}</div>}
      {note && <div style={{ fontSize: 9,  color, marginTop: 3, fontWeight: 600 }}>{note}</div>}
    </div>
  )
}

// ─── Tax row ───────────────────────────────────────────────────────────────────
function TaxRow({ label, value, color = C.text, sub, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, color: C.textDim }}>{label}{sub && <span style={{ fontSize: 9, marginRight: 5 }}>{sub}</span>}</div>
      <div style={{ fontSize: bold ? 15 : 12, fontWeight: bold ? 900 : 700, color, fontFamily: 'monospace' }}>
        {value < 0 ? '−' : ''}₪{fmt(Math.abs(value))}
      </div>
    </div>
  )
}

// ─── Monthly chart data ────────────────────────────────────────────────────────
function buildMonthlyChart(income, expenses, year) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    const inc = income.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0)
    const exp = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0)
    return {
      name: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i].slice(0,3),
      مدخولات: inc,
      مصاريف:  exp,
      ربح:     Math.max(0, inc - exp),
    }
  })
  return months
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function TaxSummaryTab() {
  const businesses  = useBusinessStore(s => s.businesses)
  const activeBizId = useBusinessStore(s => s.activeBusinessId)
  const activeBusiness = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )

  const [income,   setIncome]   = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [period,   setPeriod]   = useState('year')
  const [chartTab, setChartTab] = useState('bar') // 'bar' | 'line'

  const bizId   = activeBusiness?.id
  const bizType = activeBusiness?.business_type ?? 'osek_patur'
  const showVat = bizType === 'osek_moreh' || bizType === 'hevra'

  // ─── Load ──────────────────────────────────────────────────────────────
  // يقرأ من client_receipts و expenses (المصدر الفعلي للبيانات المُدخلة)
  async function load() {
    if (!bizId) return
    setLoading(true)
    const [{ data: inc }, { data: exp }] = await Promise.all([
      supabase
        .from('client_receipts')
        .select('amount,date')
        .eq('business_id', bizId),
      supabase
        .from('expenses')
        .select('amount,vat_amount,date,category')
        .eq('business_id', bizId),
    ])
    setIncome(inc ?? [])
    setExpenses(exp ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [bizId])

  // ─── Period filter ─────────────────────────────────────────────────────
  const { start, end } = periodRange(period)

  const filteredIncome = useMemo(() =>
    income.filter(e => e.date >= start && e.date <= end)
  , [income, start, end])

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => e.date >= start && e.date <= end)
  , [expenses, start, end])

  // ─── Core numbers ──────────────────────────────────────────────────────
  const totalIncome   = useMemo(() => filteredIncome.reduce((s, e) => s + Number(e.amount), 0), [filteredIncome])
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0), [filteredExpenses])
  const grossProfit   = totalIncome - totalExpenses

  // ─── VAT calculations ──────────────────────────────────────────────────
  const vatCollected = showVat ? totalIncome * VAT : 0

  const vatDeductible = useMemo(() => {
    if (!showVat) return 0
    return filteredExpenses.reduce((s, e) => {
      const rate = EXP_CAT_VAT[e.category] ?? 1.0
      return s + Number(e.vat_amount || 0) * rate
    }, 0)
  }, [filteredExpenses, showVat])

  const vatToPay = Math.max(0, vatCollected - vatDeductible)

  // ─── Income tax ────────────────────────────────────────────────────────
  // For annual period use full-year data; for sub-year periods, annualise
  const yearIncome   = useMemo(() => income.filter(e => e.date?.startsWith(String(now.getFullYear()))).reduce((s, e) => s + Number(e.amount), 0), [income])
  const yearExpenses = useMemo(() => expenses.filter(e => e.date?.startsWith(String(now.getFullYear()))).reduce((s, e) => s + Number(e.amount), 0), [expenses])
  const yearProfit   = Math.max(0, yearIncome - yearExpenses)

  const incomeTax = bizType === 'hevra'
    ? yearProfit * 0.23                  // ضريبة شركات 23%
    : calcIncomeTax(yearProfit)          // شرائح ضريبة دخل فردية

  const bituachLeumi = bizType !== 'hevra'
    ? Math.max(0, yearProfit) * BITUACH_LEUMI_RATE
    : 0

  const totalTax = incomeTax + bituachLeumi + (period === 'year' ? 0 : 0) // VAT shown separately
  const netProfit = yearProfit - incomeTax - bituachLeumi

  // ─── Osek patur threshold ──────────────────────────────────────────────
  const yearIncomeAllTime = useMemo(() =>
    income.filter(e => e.date?.startsWith(String(now.getFullYear()))).reduce((s, e) => s + Number(e.amount), 0)
  , [income])
  const paturPct = (yearIncomeAllTime / OSEK_PATUR_THRESHOLD) * 100

  // ─── Chart data ────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    buildMonthlyChart(income, expenses, now.getFullYear())
  , [income, expenses])

  // ─── Margin ────────────────────────────────────────────────────────────
  const margin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

  if (!activeBusiness) return null

  return (
    <div>

      {/* ─── Period selector ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 14, border: `1px solid ${C.border}` }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ flex: 1, padding: '7px 4px', background: period === p.id ? C.primary : 'transparent', border: 'none', borderRadius: 10, color: period === p.id ? '#fff' : C.textDim, fontSize: 10, fontWeight: period === p.id ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.textDim, fontSize: 12 }}>
          <RefreshCw size={20} color={C.textDim} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>تحميل البيانات...</div>
        </div>
      ) : (
        <>
          {/* ─── Core stats 2×2 ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <Card label="إجمالي المدخولات" value={totalIncome} color="#22C55E" icon={TrendingUp} />
            <Card label="إجمالي المصاريف"  value={totalExpenses} color={C.accent} icon={TrendingDown} />
            <Card
              label="الربح الإجمالي"
              value={grossProfit}
              color={grossProfit >= 0 ? C.primary : C.accent}
              icon={Wallet}
              sub={`هامش الربح ${margin.toFixed(1)}%`}
            />
            <Card
              label="صافي الربح (السنة)"
              value={netProfit}
              color={netProfit >= 0 ? '#8B5CF6' : C.accent}
              sub={`بعد ضرائب ₪${fmt(incomeTax + bituachLeumi)}`}
            />
          </div>

          {/* ─── Osek Patur threshold bar ─────────────────────────────── */}
          {bizType === 'osek_patur' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: paturPct >= 90 ? `${C.accent}10` : paturPct >= 70 ? `${C.warning}10` : `${C.primary}08`, border: `1px solid ${paturPct >= 90 ? C.accent : paturPct >= 70 ? C.warning : C.primary}30`, borderRadius: 16, padding: '14px', marginBottom: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: paturPct >= 90 ? C.accent : paturPct >= 70 ? C.warning : C.text }}>
                  {paturPct >= 90 ? '🔴 تجاوزت 90% من السقف!' : paturPct >= 70 ? '⚠️ اقتربت من السقف' : '✓ عوסק פטור — ضمن الحد'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>
                  {paturPct.toFixed(1)}%
                </div>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, paturPct)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: paturPct >= 90 ? C.accent : paturPct >= 70 ? C.warning : C.primary, borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim }}>
                <span>₪{fmt(yearIncomeAllTime)} مدخول</span>
                <span>الحد ₪{fmt(OSEK_PATUR_THRESHOLD)}</span>
              </div>
            </motion.div>
          )}

          {/* ─── VAT section (osek_moreh / hevra) ────────────────────── */}
          {showVat && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Calculator size={14} color={C.primary} />
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{'מע"מ — ضريبة القيمة المضافة'}</div>
              </div>
              <TaxRow label={'מע"מ محصّل على المدخولات'} sub="(18%)" value={vatCollected} color="#22C55E" />
              <TaxRow label={'מע"מ قابل للخصم (المصاريف)'} value={-vatDeductible} color="#22C55E" />
              <div style={{ paddingTop: 4 }}>
                <TaxRow
                  label={'صافي מע"מ واجب الدفع'}
                  value={vatToPay}
                  color={vatToPay > 0 ? C.accent : '#22C55E'}
                  bold
                />
              </div>
              {vatToPay > 0 && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: `${C.accent}10`, borderRadius: 10, fontSize: 10, color: C.accent }}>
                  يجب تحويل ₪{fmt(vatToPay)} لمصلحة الضرائب
                </div>
              )}
            </div>
          )}

          {/* ─── Income tax section ───────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <BarChart3 size={14} color="#8B5CF6" />
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>
                {bizType === 'hevra' ? 'ضريبة الشركات 23%' : 'ضريبة الدخل — מס הכנסה'}
              </div>
            </div>
            <TaxRow label={`مدخولات سنة ${now.getFullYear()}`} value={yearIncome} color="#22C55E" />
            <TaxRow label="مصاريف السنة"   value={-yearExpenses} color={C.textDim} />
            <TaxRow label="الربح الخاضع للضريبة" value={yearProfit} bold />
            <div style={{ height: 8, margin: '10px 0', borderTop: `1px dashed ${C.border}` }} />
            <TaxRow
              label={bizType === 'hevra' ? 'ضريبة الشركات (23%)' : 'ضريبة الدخل المقدرة'}
              value={incomeTax}
              color="#8B5CF6"
            />
            {bizType !== 'hevra' && (
              <TaxRow
                label="ביטוח לאומי (10.5%)"
                value={bituachLeumi}
                color="#3B82F6"
              />
            )}
            <div style={{ paddingTop: 4 }}>
              <TaxRow
                label="إجمالي الضرائب المقدرة"
                value={incomeTax + bituachLeumi}
                color={C.accent}
                bold
              />
            </div>
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#8B5CF610', border: '1px solid #8B5CF630', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>صافي الربح بعد الضرائب</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: netProfit >= 0 ? '#8B5CF6' : C.accent, fontFamily: 'monospace' }}>
                  ₪{fmt(Math.abs(netProfit))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: C.textDim, lineHeight: 1.5, textAlign: 'center' }}>
              * الأرقام تقديرية — استشر محاسبك للحصول على الحساب الدقيق
            </div>
          </div>

          {/* ─── Monthly chart ────────────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 10px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingRight: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>
                مدخولات ومصاريف {now.getFullYear()}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['bar', 'line'].map(t => (
                  <button key={t} onClick={() => setChartTab(t)}
                    style={{ padding: '4px 10px', background: chartTab === t ? `${C.primary}20` : 'transparent', border: `1px solid ${chartTab === t ? C.primary : C.border}`, borderRadius: 8, color: chartTab === t ? C.primary : C.textDim, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t === 'bar' ? 'أعمدة' : 'خطي'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={140}>
              {chartTab === 'bar' ? (
                <BarChart data={chartData} barSize={8} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 10 }}
                    formatter={(v, n) => [`₪${fmt(v)}`, n]}
                  />
                  <Bar dataKey="مدخولات" fill="#22C55E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="مصاريف"  fill={C.accent}  radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ربح"     fill={C.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 10 }}
                    formatter={(v, n) => [`₪${fmt(v)}`, n]}
                  />
                  <Line type="monotone" dataKey="مدخولات" stroke="#22C55E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="مصاريف"  stroke={C.accent}  strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ربح"     stroke={C.primary} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              )}
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8 }}>
              {[['مدخولات','#22C55E'],['مصاريف',C.accent],['ربح',C.primary]].map(([label,color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 9, color: C.textDim }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Quarterly breakdown ──────────────────────────────────── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 10 }}>
              ملخص ربعي {now.getFullYear()}
            </div>
            {[0, 1, 2, 3].map(q => {
              const qStart = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`
              const qEnd   = `${now.getFullYear()}-${String(q * 3 + 3).padStart(2, '0')}-31`
              const qInc = income.filter(e => e.date >= qStart && e.date <= qEnd).reduce((s,e)=>s+Number(e.amount),0)
              const qExp = expenses.filter(e => e.date >= qStart && e.date <= qEnd).reduce((s,e)=>s+Number(e.amount),0)
              const qProfit = qInc - qExp
              const isCurrent = q === Math.floor(now.getMonth() / 3)
              return (
                <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: isCurrent ? `${C.primary}0A` : 'transparent', borderRadius: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? C.primary : C.textDim, width: 48, flexShrink: 0 }}>
                    ق{q + 1} {isCurrent && '←'}
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: '#22C55E' }}>↑₪{fmt(qInc)}</span>
                    <span style={{ fontSize: 10, color: C.accent }}>↓₪{fmt(qExp)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: qProfit >= 0 ? C.primary : C.accent }}>
                      {qProfit >= 0 ? '+' : ''}₪{fmt(qProfit)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ─── Disclaimer ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 8 }}>
            <Info size={13} color={C.textDim} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.6 }}>
              الأرقام الضريبية مبنية على شرائح ضريبة الدخل الإسرائيلية لعام 2024 وهي تقديرية.
              يُنصح بمراجعة محاسب معتمد للحصول على الحساب الرسمي الدقيق.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
