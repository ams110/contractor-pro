import React, { useMemo, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ComposedChart, Area, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Building2, Users, Wallet,
  AlertTriangle, Trophy, Clock, ChevronLeft,
  DollarSign, CreditCard, BarChart3, Crown, Sparkles, Lock,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDateFull, isPaymentOverdue } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'
import { usePlanStore } from '../../store/usePlanStore.js'
import { navigate } from '../../Router.jsx'
import { calcEarned, calcPaid, calcAdvances, calcRevenue, calcProjectStats, calcMutabqi } from '../../lib/calculations.js'
import { computeBusinessPulse, computeCashForecast, computeCommandCenter, computeNetWorth } from '../../lib/insights.js'
import BusinessPulse from '../../components/BusinessPulse.jsx'
import CashForecast from '../../components/CashForecast.jsx'
import CommandCenter from '../../components/CommandCenter.jsx'
import NetWorth from '../../components/NetWorth.jsx'
import { PremiumCard, IconChip as KitIconChip, useCountUp, Money } from '../../ui/Premium.jsx'
import { tEnum } from '../../lib/labels.js'

// شارة اتّجاه صغيرة (شهر مقابل شهر)
function TrendChip({ trend }) {
  if (trend == null) return null
  const up = trend >= 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8, background: up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${up ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
      {up ? <TrendingUp size={10} color={C.success} /> : <TrendingDown size={10} color={C.accent} />}
      <span style={{ fontSize: 10, fontWeight: 800, color: up ? C.success : C.accent, fontVariantNumeric: 'tabular-nums' }}>{Math.abs(trend)}%</span>
    </div>
  )
}

// ─── القشرة الفخمة = نفس kit الفخامة (ui/Premium · PremiumCard) ────────────────────
// محوّل رفيع: يحافظ على تسمية props الخاصّة بالداشبورد (accent) ويمرّرها للـkit،
// فيصير كل توهّج/تدرّج/دخول البطاقات الصغيرة مطابقاً للبطاقات الكبيرة (المعيار الموحّد).
function PremiumShell({ children, accent = C.primary, glowSide = 'end', radius = 20, padding = '16px 14px', onClick, delay = 0, style }) {
  return (
    <PremiumCard color={accent} glowSide={glowSide} radius={radius} padding={padding} onClick={onClick} delay={delay} style={style}>
      {children}
    </PremiumCard>
  )
}

// شريحة أيقونة = kit IconChip (accent→color، r→radius)
function IconChip({ icon, accent, size = 36, r = 11 }) {
  return <KitIconChip icon={icon} color={accent} size={size} radius={r} />
}

// ─── بطاقة إحصائيّة فخمة (نقد/مستحقّات/ربح/إيراد/مصاريف/أرقام) ─────────────────────
function StatTile({ icon, accent, value, label, sub, money = true, trend, onClick, delay = 0, big = false, glowSide = 'end' }) {
  const v = useCountUp(value, 1100, true)
  return (
    <PremiumShell accent={accent} onClick={onClick} delay={delay} glowSide={glowSide} padding={big ? '16px 16px' : '14px 13px'} radius={big ? 20 : 18}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: big ? 12 : 10 }}>
        <IconChip icon={icon} accent={accent} size={big ? 38 : 34} />
        {trend !== undefined && <TrendChip trend={trend} />}
      </div>
      <div style={{ lineHeight: 1 }}>
        {money
          ? <Money v={v} color={value < 0 ? C.accent : (big ? accent : C.text)} size={big ? 28 : 20} />
          : <span style={{ fontSize: big ? 28 : 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{v}</span>}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginTop: 5, lineHeight: 1.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: accent, marginTop: 4, fontWeight: 800 }}>{sub}</div>}
    </PremiumShell>
  )
}

// ─── تلميح مخطّط الأداء ──────────────────────────────────────────────────────────
function ChartTip({ active, payload, lang }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  const net = p.v
  const L = lang === 'he'
    ? { rev: 'הכנסות', exp: 'הוצאות', net: 'נטו' }
    : lang === 'en'
      ? { rev: 'Revenue', exp: 'Expenses', net: 'Net' }
      : { rev: 'إيراد', exp: 'مصاريف', net: 'صافي' }
  const Row = ({ k, val, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11 }}>
      <span style={{ color: C.textDim }}>{k}</span>
      <span style={{ color, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{val < 0 ? '−' : ''}₪{fmt(Math.abs(val))}</span>
    </div>
  )
  return (
    <div style={{ background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 11, padding: '9px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      <Row k={L.rev} val={p.rev} color={C.primary} />
      <Row k={L.exp} val={-p.exp} color={C.accent} />
      <div style={{ height: 1, background: C.borderMid, margin: '2px 0' }} />
      <Row k={L.net} val={net} color={net >= 0 ? C.success : C.accent} />
    </div>
  )
}

// رقم مصغّر لرأس المخطّط
function MiniTotal({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value < 0 ? '−' : ''}₪{fmt(Math.abs(value))}
      </div>
      <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ─── مخطّط الأداء الشهري (محاور + نطاق + تلميح + إجماليات) ─────────────────────────
function PerformanceCard({ data, totals, lang, delay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const accent = totals.net >= 0 ? C.success : C.accent
  const gid = `perf-${totals.net >= 0 ? 'pos' : 'neg'}`
  const L = lang === 'he'
    ? { title: 'ביצועים חודשיים', sub: '6 חודשים אחרונים', rev: 'הכנסות', exp: 'הוצאות', net: 'נטו' }
    : lang === 'en'
      ? { title: 'Monthly Performance', sub: 'Last 6 months', rev: 'Revenue', exp: 'Expenses', net: 'Net' }
      : { title: 'الأداء الشهري', sub: 'آخر 6 أشهر', rev: 'إيراد', exp: 'مصاريف', net: 'صافي' }
  return (
    <div ref={ref}>
      <PremiumShell accent={accent} delay={delay} padding="16px 14px" radius={22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <motion.div animate={inView ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <IconChip icon={BarChart3} accent={accent} size={30} r={10} />
            </motion.div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{L.title}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{L.sub}</div>
            </div>
          </div>
          <div style={{ padding: '4px 10px', background: `${accent}1f`, border: `1px solid ${accent}3a`, borderRadius: 9, fontSize: 10, fontWeight: 900, color: accent, display: 'flex', alignItems: 'center', gap: 4 }}>
            <BarChart3 size={12} /> P&L
          </div>
        </div>

        {/* إجماليات الفترة */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <MiniTotal label={L.rev} value={totals.rev} color={C.primary} />
          <div style={{ width: 1, background: C.borderMid }} />
          <MiniTotal label={L.exp} value={-totals.exp} color={C.accent} />
          <div style={{ width: 1, background: C.borderMid }} />
          <MiniTotal label={L.net} value={totals.net} color={accent} />
        </div>

        {/* المخطّط */}
        <div style={{ marginInline: -6, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} interval={0} height={16} />
              <YAxis hide domain={['auto', 'auto']} />
              <ReferenceLine y={0} stroke={C.borderMid} strokeWidth={1} />
              <Tooltip content={<ChartTip lang={lang} />} cursor={{ stroke: accent, strokeOpacity: 0.25, strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="v" stroke={accent} strokeWidth={2.5}
                fill={`url(#${gid}-fill)`} dot={false}
                isAnimationActive={inView} animationDuration={1100}
                activeDot={{ r: 4, fill: accent, stroke: C.surface, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </PremiumShell>
    </div>
  )
}

// ─── صفّ مشروع فخم (شريط هامش + حالة ملوّنة) ──────────────────────────────────────
function ProjectRow({ project, revenue, expenses, rank, onClick, lang }) {
  const profit = revenue - expenses
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null
  const isGood = profit >= 0
  const accent = isGood ? C.success : C.accent
  const status = project.status || (lang === 'he' ? 'פעיל' : lang === 'en' ? 'Active' : 'نشط')
  const statusColor = status === 'مكتمل' ? C.cyan : status === 'نشط' ? C.success : C.textDim
  return (
    <motion.div whileTap={{ scale: 0.985 }} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', background: C.card, border: `1px solid ${accent}22`, borderRadius: 14, cursor: 'pointer', marginBottom: 8 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <IconChip icon={Building2} accent={accent} size={38} r={12} />
        {rank <= 3 && (
          <div style={{ position: 'absolute', top: -5, insetInlineStart: -5, width: 17, height: 17, borderRadius: '50%', background: rank === 1 ? C.gold : C.surface, border: `1px solid ${rank === 1 ? C.gold : C.borderMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: rank === 1 ? '#fff' : C.textDim }}>
            {rank}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}30`, borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>{tEnum(status, lang)}</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, margin ?? 0))}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: accent, boxShadow: `0 0 8px ${accent}66` }}
          />
        </div>
      </div>
      <div style={{ textAlign: 'end', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          {isGood ? '+' : '−'}₪{fmt(Math.abs(profit))}
        </div>
        {margin !== null && <div style={{ fontSize: 9, color: C.textDim, marginTop: 2, fontWeight: 700 }}>{margin}%</div>}
      </div>
      <ChevronLeft size={15} color={C.textDim} style={{ flexShrink: 0 }} />
    </motion.div>
  )
}

// ── شارة الخطة في رأس الشاشة — لمسة فخمة + اختصار للترقية ──
const PLAN_META = {
  free:     { ar: 'مجانية',  he: 'חינם',     en: 'Free',     color: C.textDim },
  starter:  { ar: 'Starter', he: 'Starter',  en: 'Starter',  color: C.primary },
  pro:      { ar: 'Pro',     he: 'Pro',      en: 'Pro',      color: C.secondary },
  business: { ar: 'Business', he: 'Business', en: 'Business', color: C.gold },
}
function PlanBadge({ lang }) {
  const plan = usePlanStore(s => s.plan)
  const trialActive = usePlanStore(s => s.trialActive)
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)
  const m = PLAN_META[plan] || PLAN_META.free
  const color = trialActive ? C.cyan : m.color
  const Icon = trialActive ? Sparkles : Crown
  const label = trialActive ? L('تجربة مجانية', 'ניסיון חינם', 'Free trial') : L(m.ar, m.he, m.en)
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={() => navigate('/pricing')}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.18 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
        background: `${color}16`, border: `1px solid ${color}3a`, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
      <Icon size={13} color={color} strokeWidth={2.4} />
      <span style={{ fontSize: 11.5, fontWeight: 900, color, letterSpacing: '-0.01em' }}>{label}</span>
    </motion.button>
  )
}

export default function DashboardScreen({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], advances = [], clientReceipts = [], onNav, permissions,
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const workerCosts   = calcEarned(workDays.filter(w => w.status === 'approved'))
    const totalRevenue  = calcRevenue(clientReceipts)
    const totalExpenses = expenses.filter(e => !e.employee_id && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
    const totalPayments = calcPaid(payments)
    const totalAdvances = calcAdvances(advances)
    const totalWasel    = totalPayments + totalAdvances
    const netProfit     = totalRevenue - totalExpenses - workerCosts
    const activeCount   = projects.filter(p => p.status === 'نشط').length
    const pendingWD     = workDays.filter(w => w.status === 'pending').length

    // ── السيولة الحقيقية (تدفّق نقدي فعلي، مش ربح دفتري) ──────────────────────
    const cashIn      = totalRevenue
    const cashOut     = totalExpenses + totalWasel
    const cashOnHand  = cashIn - cashOut

    // مصاريف معلّقة (بانتظار الاعتماد) — التزام مؤجّل لم يدخل النقد بعد
    const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0)

    // مستحق للعمال = مجموع المتبقّي لكل عامل (لا يقل عن صفر)
    const owedToWorkers = employees.reduce((s, emp) => {
      const wds  = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
      const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
      const pays = payments.filter(p => p.employee_id === emp.id)
      const advs = advances.filter(a => a.employee_id === emp.id)
      return s + Math.max(0, calcMutabqi(wds, wExp, pays, advs))
    }, 0)

    // باقي لك عند العملاء = مجموع (قيمة العقد − المقبوض) للمشاريع التي لها سعر
    let owedByClients = 0
    let overdueCount  = 0
    projects.forEach(p => {
      const price = parseFloat(p.price) || 0
      if (price <= 0) return
      const received = clientReceipts.filter(r => r.project_id === p.id).reduce((s, r) => s + (r.amount || 0), 0)
      const balance  = price - received
      if (balance > 0) owedByClients += balance
      if (isPaymentOverdue(p, clientReceipts)) overdueCount += 1
    })

    const now = new Date()
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const rev    = calcRevenue(clientReceipts.filter(r => r.date?.startsWith(key)))
      const exp    = expenses.filter(e => !e.employee_id && e.status === 'approved' && e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
      const labor  = calcEarned(workDays.filter(w => w.status === 'approved' && w.date?.startsWith(key)))
      return { month: key.slice(5), v: rev - exp - labor, rev, exp: exp + labor }
    })

    // إجماليات الفترة + اتّجاه شهر-مقابل-شهر للصافي
    const periodTotals = monthlyData.reduce((a, m) => ({ rev: a.rev + m.rev, exp: a.exp + m.exp, net: a.net + m.v }), { rev: 0, exp: 0, net: 0 })
    const lm = monthlyData[5]?.v ?? 0
    const pm = monthlyData[4]?.v ?? 0
    const netTrend = pm !== 0 ? Math.round(((lm - pm) / Math.abs(pm)) * 100) : null

    return { totalRevenue, totalExpenses, totalPayments, totalAdvances, totalWasel, netProfit, activeCount, pendingWD, workerCosts, monthlyData, periodTotals, netTrend, cashOnHand, owedToWorkers, owedByClients, overdueCount, pendingExpenses }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  // Top projects by profit
  const topProjects = useMemo(() => {
    return projects
      .filter(p => p.status === 'نشط' || p.status === 'مكتمل')
      .map(p => {
        const s = calcProjectStats(p.id, workDays, expenses, clientReceipts)
        return { project: p, revenue: s.revenue, expenses: s.cost - s.wdCost, profit: s.profit }
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 4)
  }, [projects, clientReceipts, expenses])

  // نبض المصلحة — مؤشّر الصحّة المالية الذكي
  const pulse = useMemo(() => computeBusinessPulse({
    cashOnHand:    stats.cashOnHand,
    netProfit:     stats.netProfit,
    totalRevenue:  stats.totalRevenue,
    owedToWorkers: stats.owedToWorkers,
    owedByClients: stats.owedByClients,
    overdueCount:  stats.overdueCount,
    monthlyData:   stats.monthlyData,
  }, language), [stats, language])

  // التوقّع الذكي للسيولة — مسار النقد للأشهر القادمة + عدّاد الأمان
  const forecast = useMemo(() => computeCashForecast({
    cashOnHand:   stats.cashOnHand,
    totalRevenue: stats.totalRevenue,
    monthlyData:  stats.monthlyData,
  }, language), [stats, language])

  // الذمّة الصافية — عدسة الميزانية
  const netWorth = useMemo(() => computeNetWorth({
    cashOnHand:      stats.cashOnHand,
    owedByClients:   stats.owedByClients,
    owedToWorkers:   stats.owedToWorkers,
    pendingExpenses: stats.pendingExpenses,
  }, language), [stats, language])

  // مركز القيادة الذكي
  const now2 = new Date()
  const monthKey = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`
  const commandCenter = useMemo(() => computeCommandCenter({
    projects, employees, workDays, expenses, payments, advances, clientReceipts,
    monthKey, isOwner: !!permissions?.isOwner,
  }, language), [projects, employees, workDays, expenses, payments, advances, clientReceipts, monthKey, permissions?.isOwner, language])

  const hasData = projects.length > 0 || employees.length > 0
  const showAmounts = permissions?.viewAmounts !== false   // عضو فريق بلا صلاحية «مشاهدة المبالغ» → تُخفى الأرقام المالية
  const cashPositive = stats.cashOnHand >= 0
  const cashAccent = cashPositive ? C.success : C.accent

  // تحية سياقية حسب وقت اليوم + تاريخ اليوم (محتوى حيّ بدل سطر عام)
  const { greeting, todayLabel } = useMemo(() => {
    const h = new Date().getHours()
    const g = language === 'he'
      ? (h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב')
      : language === 'en'
        ? (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
        : (h < 12 ? 'صباح الخير' : h < 17 ? 'مساء النور' : 'مساء الخير')
    const loc = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'ar'
    let label = ''
    try { label = new Date().toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }) }
    catch { label = fmtDateFull(new Date().toISOString().slice(0, 10)) }
    return { greeting: g, todayLabel: label }
  }, [language])

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px', maxWidth: 900, margin: '0 auto' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.primary, letterSpacing: '-0.01em' }}>{greeting}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, opacity: 0.55, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: C.textDim, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{todayLabel}</span>
          </div>
          <div style={{ fontSize: 'clamp(22px, 6.5vw, 27px)', fontWeight: 900, color: C.text, letterSpacing: '-0.025em', lineHeight: 1.05, textWrap: 'balance' }}>
            {t('dashboard.title')}
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
            {language === 'he' ? 'סיכום כל הפעילות שלך' : language === 'en' ? 'Overview of all your activity' : 'نظرة شاملة على نشاطك'}
          </div>
        </div>
        {permissions?.isOwner && <PlanBadge lang={language} />}
      </motion.div>

      {/* ─── تفعيل المرحلة 2: عنده عامل بلا أيام عمل → وجّهه لتسجيل أول يوم (لحظة «شفت الفلوس») ─── */}
      {employees.length > 0 && workDays.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 14 }}>
          <PremiumShell accent={C.cyan} radius={20} padding="15px 15px"
            onClick={() => { try { sessionStorage.setItem('kbl_intent_log_workday', '1') } catch {}; onNav?.('workers') }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconChip icon={Clock} accent={C.cyan} size={40} r={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>
                  {language === 'he' ? 'שלב הבא — סמן יום עבודה ראשון' : language === 'en' ? 'Next — log your first work day' : 'الخطوة الجاية — سجّل أول يوم شغل'}
                </div>
                <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.5 }}>
                  {language === 'he' ? 'סמן יום עבודה ותראה כמה מגיע לעובד — אוטומטית.' : language === 'en' ? 'Log a day and see exactly what the worker is owed — automatically.' : 'سجّل يوم وشوف كم صار مستحقّ لعاملك — تلقائياً.'}
                </div>
              </div>
              <ChevronLeft size={18} color={C.cyan} style={{ flexShrink: 0 }} />
            </div>
          </PremiumShell>
        </motion.div>
      )}

      {!showAmounts && (
        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 14, background: `${C.secondary}10`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={16} color={C.secondary} />
          <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{language === 'he' ? 'הנתונים הכספיים מוסתרים מהחשבון שלך — פנה לבעל העסק.' : language === 'en' ? 'Financial figures are hidden from your account — contact the business owner.' : 'الأرقام المالية مخفيّة عن حسابك — تواصل مع صاحب العمل.'}</div>
        </div>
      )}

      {showAmounts && (<>
      {/* ─── مركز القيادة الذكي ─── */}
      {hasData && <CommandCenter cc={commandCenter} onNav={onNav} />}

      {/* ─── نبض المصلحة ─── */}
      {hasData && <BusinessPulse pulse={pulse} onNav={onNav} />}

      {/* ─── التوقّع الذكي للسيولة ─── */}
      {hasData && forecast && <CashForecast forecast={forecast} onNav={onNav} />}

      {/* ─── الذمّة الصافية ─── */}
      {hasData && <NetWorth netWorth={netWorth} onNav={onNav} />}

      {/* ─── Cash on Hand (السيولة الحقيقية) — بطاقة بطل فخمة ─── */}
      <div style={{ marginBottom: 12 }}>
        <PremiumShell accent={cashAccent} radius={22} padding="18px 16px" delay={0.04} onClick={() => onNav?.('finance')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <IconChip icon={Wallet} accent={cashAccent} size={32} r={10} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                {language === 'he' ? 'מזומן ביד עכשיו' : language === 'en' ? 'Cash on hand now' : 'نقد بالجيب الآن'}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                {language === 'he' ? 'תזרים בפועל, לא רווח על הנייר' : language === 'en' ? 'Real cash flow, not paper profit' : 'تدفّق نقدي فعلي، مش ربح دفتري'}
              </div>
            </div>
            {stats.netTrend != null && <TrendChip trend={stats.netTrend} />}
          </div>
          <CashHero value={stats.cashOnHand} accent={cashAccent} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 7 }}>
            {language === 'he' ? 'כל מה שנכנס פחות כל מה ששולם בפועל' : language === 'en' ? 'All received minus all actually paid out' : 'كل المقبوض ناقص كل المدفوع فعلياً'}
          </div>
        </PremiumShell>
      </div>

      {/* ─── مستحق للعمال + باقي لك عند العملاء ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <StatTile
          icon={Users} accent={C.warning} value={stats.owedToWorkers} delay={0.06} glowSide="start"
          label={language === 'he' ? 'חוב לעובדים' : language === 'en' ? 'Owed to workers' : 'مستحق للعمال'}
          onClick={() => onNav?.('payments')}
        />
        <StatTile
          icon={DollarSign} accent={C.primary} value={stats.owedByClients} delay={0.08}
          label={language === 'he' ? 'נותר לגבות מלקוחות' : language === 'en' ? 'Owed by clients' : 'باقي لك عند العملاء'}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} ${language === 'he' ? 'באיחור' : language === 'en' ? 'overdue' : 'متأخّر'}` : undefined}
          onClick={() => onNav?.('projects')}
        />
      </div>

      {/* ─── صافي الربح (عريض) ─── */}
      <div style={{ marginBottom: 12 }}>
        <StatTile
          icon={TrendingUp} accent={stats.netProfit >= 0 ? C.success : C.accent} value={stats.netProfit} big delay={0.05}
          trend={stats.netTrend}
          label={t('dashboard.netProfit')}
          sub={language === 'he' ? 'הכנסות פחות הוצאות' : language === 'en' ? 'Revenue minus expenses' : 'الإيرادات ناقص المصاريف'}
        />
      </div>

      {/* ─── الإيرادات + المصاريف ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <StatTile icon={DollarSign} accent={C.primary} value={stats.totalRevenue} delay={0.08} glowSide="start"
          label={t('dashboard.totalRevenue')} onClick={() => onNav?.('finance')} />
        <StatTile icon={CreditCard} accent={C.accent} value={stats.totalExpenses + stats.workerCosts} delay={0.1}
          label={t('dashboard.totalExpenses')} onClick={() => onNav?.('finance')} />
      </div>

      {/* ─── مخطّط الأداء الشهري ─── */}
      <div style={{ marginBottom: 12 }}>
        <PerformanceCard data={stats.monthlyData} totals={stats.periodTotals} lang={language} delay={0.12} />
      </div>
      </>)}

      {/* ─── الأرقام السريعة ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <StatTile icon={Building2} accent={C.primary} value={stats.activeCount} money={false} delay={0.14}
          label={t('dashboard.activeProjects')} onClick={() => onNav?.('projects')} />
        <StatTile icon={Users} accent={C.secondary} value={employees.length} money={false} delay={0.17} glowSide="start"
          label={t('dashboard.totalWorkers')} onClick={() => onNav?.('workers')} />
        <StatTile icon={Clock} accent={stats.pendingWD > 0 ? C.warning : C.textDim} value={stats.pendingWD} money={false} delay={0.2}
          label={t('dashboard.pendingDays')} onClick={() => onNav?.('workdays')} />
      </div>

      {/* ─── تنبيه ذكي: أيام بانتظار الموافقة ─── */}
      {stats.pendingWD > 0 && (
        <div style={{ marginBottom: 12 }}>
          <PremiumShell accent={C.warning} radius={16} padding="12px 13px" delay={0.22} onClick={() => onNav?.('workdays')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <IconChip icon={AlertTriangle} accent={C.warning} size={36} r={11} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {stats.pendingWD} {language === 'he' ? 'ימי עבודה ממתינים לאישור' : language === 'en' ? 'work days pending approval' : 'يوم عمل بانتظار الموافقة'}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                  {language === 'he' ? 'לחץ לאישור' : language === 'en' ? 'Tap to review' : 'اضغط للمراجعة'}
                </div>
              </div>
              <ChevronLeft size={16} color={C.warning} />
            </div>
          </PremiumShell>
        </div>
      )}

      {/* ─── أفضل المشاريع ─── */}
      {showAmounts && topProjects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <PremiumShell accent={C.gold} radius={22} padding="16px 14px" delay={0.25}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <IconChip icon={Trophy} accent={C.gold} size={30} r={10} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>
                    {language === 'he' ? 'פרויקטים מובילים' : language === 'en' ? 'Top Projects' : 'أفضل المشاريع'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                    {language === 'he' ? 'לפי רווח' : language === 'en' ? 'By profit' : 'حسب الربح'}
                  </div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onNav?.('projects') }}
                style={{ background: `${C.gold}1f`, border: `1px solid ${C.gold}3a`, borderRadius: 9, padding: '5px 12px', fontSize: 11, fontWeight: 800, color: C.gold, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل'}
              </button>
            </div>
            {topProjects.map(({ project, revenue, expenses: exp }, i) => (
              <ProjectRow key={project.id} project={project} revenue={revenue} expenses={exp} rank={i + 1} lang={language} onClick={() => onNav?.('projects')} />
            ))}
          </PremiumShell>
        </div>
      )}

      {/* ─── Empty state — تفعيل: وجّه لأول عامل (لحظة القيمة الحقيقية، مش لوحة فاضية) ─── */}
      {projects.length === 0 && employees.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <PremiumShell accent={C.primary} radius={22} padding="32px 22px" style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 32px rgba(249,115,22,0.3)' }}>
              <Users size={32} color="#fff" strokeWidth={1.7} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>
              {language === 'he' ? 'בוא נתחיל — הוסף עובד ראשון' : language === 'en' ? "Let's start — add your first worker" : 'يلا نبدأ — أضف أول عامل'}
            </div>
            <div style={{ fontSize: 12.5, color: C.textDim, marginBottom: 22, lineHeight: 1.7, maxWidth: 300, marginInline: 'auto' }}>
              {language === 'he'
                ? 'הוסף עובד וסמן ימי עבודה — האפליקציה תחשב שכר, שעות נוספות וכמה אתה חייב לו, אוטומטית.'
                : language === 'en'
                  ? 'Add a worker and log work days — the app calculates salary, overtime and how much you owe, automatically.'
                  : 'ضيف عامل وسجّل أيام شغله — التطبيق بيحسبلك الراتب والساعات الإضافية وكم باقي إله تلقائياً.'}
            </div>
            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => { try { sessionStorage.setItem('kbl_intent_add_worker', '1') } catch {}; onNav?.('workers') }}
              style={{ width: '100%', maxWidth: 320, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 28px', borderRadius: 15, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
              <Users size={18} strokeWidth={2.2} />
              {language === 'he' ? 'הוסף עובד ראשון' : language === 'en' ? 'Add first worker' : 'أضف أول عامل'}
            </motion.button>
            <button onClick={() => onNav?.('projects')}
              style={{ marginTop: 12, background: 'none', border: 'none', color: C.textDim, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {language === 'he' ? 'או הוסף פרויקט' : language === 'en' ? 'or add a project' : 'أو أضف مشروع'}
            </button>
          </PremiumShell>
        </motion.div>
      )}
    </div>
  )
}

// رقم البطل لبطاقة النقد (عدّاد كبير)
function CashHero({ value, accent }) {
  const v = useCountUp(value, 1300, true)
  return <Money v={v} color={accent} size={34} />
}
