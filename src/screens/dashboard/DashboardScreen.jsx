import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import {
  TrendingUp, TrendingDown, Building2, Users, Wallet,
  AlertTriangle, ArrowUpRight, Zap, Trophy, Clock,
  DollarSign, CreditCard, BarChart3, Activity,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, isPaymentOverdue } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'
import { calcEarned, calcPaid, calcAdvances, calcRevenue, calcProjectStats, calcMutabqi } from '../../lib/calculations.js'
import { computeBusinessPulse, computeCashForecast } from '../../lib/insights.js'
import BusinessPulse from '../../components/BusinessPulse.jsx'
import CashForecast from '../../components/CashForecast.jsx'

// ─── Bento Card ───────────────────────────────────────────────────────────────
function BentoCard({ children, style = {}, gradient, onClick }) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.015, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{
        background: gradient ? 'transparent' : C.surface,
        backgroundImage: gradient || 'none',
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: '18px 16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, gradient, trend, onClick }) {
  const isPositive = trend >= 0
  return (
    <BentoCard gradient={gradient} onClick={onClick}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 20% 20%, ${color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8, background: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${isPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
            {isPositive ? <TrendingUp size={10} color={C.success} /> : <TrendingDown size={10} color={C.accent} />}
            <span style={{ fontSize: 10, fontWeight: 700, color: isPositive ? C.success : C.accent }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
        ₪{fmt(value)}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: color, marginTop: 4, fontWeight: 700 }}>{sub}</div>}
    </BentoCard>
  )
}

// ─── Mini Chart ───────────────────────────────────────────────────────────────
function MiniChart({ data, color }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#grad-${color.replace('#', '')})`} dot={false} />
        <Tooltip
          contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }}
          formatter={v => [`₪${fmt(v)}`, '']}
          labelFormatter={() => ''}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Project Row ──────────────────────────────────────────────────────────────
function ProjectRow({ project, revenue, expenses, onClick }) {
  const profit = revenue - expenses
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(0) : null
  const isGood = profit >= 0
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: `${C.primary}18`, border: `1px solid ${C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Building2 size={16} color={C.primary} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{project.status || 'نشط'}</div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isGood ? C.success : C.accent }}>
          {isGood ? '+' : ''}₪{fmt(profit)}
        </div>
        {margin !== null && (
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{margin}%</div>
        )}
      </div>
      <ArrowUpRight size={13} color={C.textDim} />
    </motion.div>
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
    // نقد بالجيب = كل المقبوض − كل المدفوع فعلياً (مصاريف مدفوعة + رواتب + سلف)
    const cashIn      = totalRevenue
    const cashOut     = totalExpenses + totalWasel
    const cashOnHand  = cashIn - cashOut

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

    return { totalRevenue, totalExpenses, totalPayments, totalAdvances, totalWasel, netProfit, activeCount, pendingWD, workerCosts, monthlyData, cashOnHand, owedToWorkers, owedByClients, overdueCount }
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
  }), [stats])

  // التوقّع الذكي للسيولة — مسار النقد للأشهر القادمة + عدّاد الأمان
  const forecast = useMemo(() => computeCashForecast({
    cashOnHand:   stats.cashOnHand,
    totalRevenue: stats.totalRevenue,
    monthlyData:  stats.monthlyData,
  }), [stats])

  const hasData = projects.length > 0 || employees.length > 0

  const cardAnim = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px', maxWidth: 900, margin: '0 auto' }}>

      {/* ─── Header ─── */}
      <motion.div {...cardAnim} transition={{ delay: 0 }} style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
          {t('dashboard.title')}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 3 }}>
          {language === 'he' ? 'סיכום כל הפעילות שלך' : language === 'en' ? 'Overview of all your activity' : 'نظرة شاملة على نشاطك'}
        </div>
      </motion.div>

      {/* ─── نبض المصلحة (مؤشّر الصحّة الذكي) ─── */}
      {hasData && <BusinessPulse pulse={pulse} onNav={onNav} />}

      {/* ─── التوقّع الذكي للسيولة (المسار + عدّاد الأمان) ─── */}
      {hasData && forecast && <CashForecast forecast={forecast} onNav={onNav} />}

      {/* ─── Cash on Hand (السيولة الحقيقية) ─── */}
      <motion.div {...cardAnim} transition={{ delay: 0.04 }} style={{ marginBottom: 12 }}>
        <BentoCard style={{ background: stats.cashOnHand >= 0 ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(6,182,212,0.06))' : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.06))', borderColor: stats.cashOnHand >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)' }} onClick={() => onNav?.('finance')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Wallet size={16} color={stats.cashOnHand >= 0 ? C.success : C.accent} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDim }}>
              {language === 'he' ? 'מזומן ביד עכשיו' : language === 'en' ? 'Cash on hand now' : 'نقد بالجيب الآن'}
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: stats.cashOnHand >= 0 ? C.success : C.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {stats.cashOnHand < 0 ? '−' : ''}₪{fmt(Math.abs(stats.cashOnHand))}
          </div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 5 }}>
            {language === 'he' ? 'כל מה שנכנס פחות כל מה ששולם בפועל' : language === 'en' ? 'All received minus all actually paid out' : 'كل المقبوض ناقص كل المدفوع فعلياً'}
          </div>
        </BentoCard>
      </motion.div>

      {/* ─── مستحق للعمال + باقي لك عند العملاء ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <motion.div {...cardAnim} transition={{ delay: 0.06 }}>
          <BentoCard onClick={() => onNav?.('payments')}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.warning}18`, border: `1px solid ${C.warning}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Users size={15} color={C.warning} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: stats.owedToWorkers > 0 ? C.warning : C.text, letterSpacing: '-0.02em' }}>₪{fmt(stats.owedToWorkers)}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
              {language === 'he' ? 'חוב לעובדים' : language === 'en' ? 'Owed to workers' : 'مستحق للعمال'}
            </div>
          </BentoCard>
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.08 }}>
          <BentoCard onClick={() => onNav?.('projects')}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.primary}18`, border: `1px solid ${C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <DollarSign size={15} color={C.primary} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: stats.owedByClients > 0 ? C.primary : C.text, letterSpacing: '-0.02em' }}>₪{fmt(stats.owedByClients)}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
              {language === 'he' ? 'נותר לגבות מלקוחות' : language === 'en' ? 'Owed by clients' : 'باقي لك عند العملاء'}
            </div>
            {stats.overdueCount > 0 && (
              <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, marginTop: 3 }}>
                {stats.overdueCount} {language === 'he' ? 'באיחור' : language === 'en' ? 'overdue' : 'متأخّر'}
              </div>
            )}
          </BentoCard>
        </motion.div>
      </div>

      {/* ─── Primary Stats Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <motion.div {...cardAnim} transition={{ delay: 0.05 }} style={{ gridColumn: '1 / -1' }}>
          <StatCard
            label={t('dashboard.netProfit')}
            value={stats.netProfit}
            icon={TrendingUp}
            color={stats.netProfit >= 0 ? C.success : C.accent}
            sub={language === 'he' ? 'הכנסות פחות הוצאות' : language === 'en' ? 'Revenue minus expenses' : 'الإيرادات ناقص المصاريف'}
            style={{ minHeight: 90 }}
          />
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.08 }}>
          <StatCard label={t('dashboard.totalRevenue')} value={stats.totalRevenue} icon={DollarSign} color={C.primary} />
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.1 }}>
          <StatCard label={t('dashboard.totalExpenses')} value={stats.totalExpenses + stats.workerCosts} icon={CreditCard} color={C.accent} />
        </motion.div>
      </div>

      {/* ─── Chart + Quick Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
        <motion.div {...cardAnim} transition={{ delay: 0.12 }}>
          <BentoCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {language === 'he' ? 'ביצועים חודשיים' : language === 'en' ? 'Monthly Performance' : 'الأداء الشهري'}
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {language === 'he' ? '6 חודשים אחרונים' : language === 'en' ? 'Last 6 months' : 'آخر 6 أشهر'}
                </div>
              </div>
              <div style={{ padding: '4px 10px', background: `${C.primary}18`, border: `1px solid ${C.primary}28`, borderRadius: 8, fontSize: 10, fontWeight: 800, color: C.primary }}>
                <BarChart3 size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                P&L
              </div>
            </div>
            <MiniChart data={stats.monthlyData} color={stats.netProfit >= 0 ? C.success : C.accent} />
          </BentoCard>
        </motion.div>
      </div>

      {/* ─── Quick Numbers ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: t('dashboard.activeProjects'), value: stats.activeCount, icon: Building2, color: C.primary, screen: 'projects' },
          { label: t('dashboard.totalWorkers'),   value: employees.length,  icon: Users,     color: C.secondary, screen: 'workers' },
          { label: t('dashboard.pendingDays'),    value: stats.pendingWD,   icon: Clock,     color: stats.pendingWD > 0 ? C.warning : C.textDim, screen: 'workdays' },
        ].map((item, i) => (
          <motion.div key={item.label} {...cardAnim} transition={{ delay: 0.14 + i * 0.03 }}>
            <BentoCard onClick={() => onNav?.(item.screen)}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <item.icon size={15} color={item.color} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{item.value}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, lineHeight: 1.3 }}>{item.label}</div>
            </BentoCard>
          </motion.div>
        ))}
      </div>

      {/* ─── Smart Insights ─── */}
      {stats.pendingWD > 0 && (
        <motion.div {...cardAnim} transition={{ delay: 0.22 }} style={{ marginBottom: 12 }}>
          <BentoCard style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.2)' }} onClick={() => onNav?.('workdays')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color={C.warning} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {stats.pendingWD} {language === 'he' ? 'ימי עבודה ממתינים לאישור' : language === 'en' ? 'work days pending approval' : 'يوم عمل بانتظار الموافقة'}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                  {language === 'he' ? 'לחץ לאישור' : language === 'en' ? 'Tap to review' : 'اضغط للمراجعة'}
                </div>
              </div>
              <ArrowUpRight size={16} color={C.warning} />
            </div>
          </BentoCard>
        </motion.div>
      )}

      {/* ─── Top Projects ─── */}
      {topProjects.length > 0 && (
        <motion.div {...cardAnim} transition={{ delay: 0.25 }} style={{ marginBottom: 12 }}>
          <BentoCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={15} color={C.gold} strokeWidth={2} />
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                  {language === 'he' ? 'פרויקטים מובילים' : language === 'en' ? 'Top Projects' : 'أفضل المشاريع'}
                </span>
              </div>
              <button onClick={() => onNav?.('projects')}
                style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}25`, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: C.primary, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل'}
              </button>
            </div>
            {topProjects.map(({ project, revenue, expenses: exp, profit }) => (
              <ProjectRow key={project.id} project={project} revenue={revenue} expenses={exp} onClick={() => onNav?.('projects')} />
            ))}
          </BentoCard>
        </motion.div>
      )}

      {/* ─── Empty state ─── */}
      {projects.length === 0 && employees.length === 0 && (
        <motion.div {...cardAnim} transition={{ delay: 0.2 }}>
          <BentoCard style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 32px rgba(249,115,22,0.3)' }}>
              <Zap size={32} color="#fff" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 8 }}>
              {language === 'he' ? 'ברוכים הבאים!' : language === 'en' ? 'Welcome!' : 'أهلاً بك!'}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20, lineHeight: 1.6 }}>
              {language === 'he' ? 'הוסף את הפרויקט הראשון שלך להתחלה.' : language === 'en' ? 'Add your first project to get started.' : 'أضف مشروعك الأول للبدء.'}
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => onNav?.('projects')}
              style={{ padding: '12px 28px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
              {language === 'he' ? 'הוסף פרויקט' : language === 'en' ? 'Add Project' : 'إضافة مشروع'}
            </motion.button>
          </BentoCard>
        </motion.div>
      )}
    </div>
  )
}
