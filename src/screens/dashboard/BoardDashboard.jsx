// «برو» — الواجهة العملية الاحترافية (النمط الرابع، id تاريخي: board):
// نفس معلومات الداشبورد الافتراضي لكن بانضباط لوني صارم بطابع fintech:
// أسطح محايدة بحدود شعرية، اللون للدلالة فقط (أخضر داخل/أحمر خارج/accent واحد)،
// هرمية تايبوغرافي واضحة، صفر زخرفة. نفس دوال الحساب النقيّة = نفس الأرقام.
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HardHat, Wallet, TrendingUp, Users, HandCoins, Clock,
  CalendarPlus, ArrowDownToLine, ArrowUpFromLine, ChevronLeft,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDateFull, todayStr } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useCountUp } from '../../ui/Premium.jsx'
import { calcEarned, calcRevenue, calcPaid, calcAdvances, calcMutabqi, calcProjectStats } from '../../lib/calculations.js'

const NUM = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.05 }
const EASE = [0.32, 0.72, 0, 1]

const skinFor = (light) => light ? {
  card: '#FFFFFF', border: 'rgba(11,18,32,0.1)', divider: 'rgba(11,18,32,0.07)',
  shadow: '0 1px 2px rgba(11,18,32,0.05), 0 8px 24px -12px rgba(11,18,32,0.12)',
  chip: 'rgba(11,18,32,0.045)',
} : {
  card: C.surface, border: 'rgba(255,255,255,0.07)', divider: 'rgba(255,255,255,0.06)',
  shadow: '0 1px 2px rgba(0,0,0,0.3), 0 10px 28px -14px rgba(0,0,0,0.5)',
  chip: 'rgba(255,255,255,0.04)',
}

function Card({ children, onClick, delay = 0, style = {}, skin }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      style={{ background: skin.card, border: `1px solid ${skin.border}`, borderRadius: 16, boxShadow: skin.shadow, cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </motion.div>
  )
}

function Count({ v, color, size = 22, show }) {
  const n = useCountUp(Math.abs(v), 1100, true)
  if (!show) return <span style={{ fontSize: size, fontWeight: 800, color, ...NUM }}>•••</span>
  return <span dir="ltr" style={{ fontSize: size, fontWeight: 800, color, ...NUM }}>{v < 0 ? '−' : ''}₪{fmt(n)}</span>
}

export default function BoardDashboard({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], advances = [], clientReceipts = [], onNav, permissions, soloMode = false,
}) {
  const { language } = useAppStore()
  const theme = useAppStore(s => s.theme)
  const setPendingAction = useAppStore(s => s.setPendingAction)
  const showAmounts = permissions?.viewAmounts !== false
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const skin = skinFor(theme === 'site')

  const stats = useMemo(() => {
    const workerCosts   = calcEarned(workDays.filter(w => w.status === 'approved'))
    const totalRevenue  = calcRevenue(clientReceipts)
    const totalExpenses = expenses.filter(e => !e.employee_id && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
    const totalWasel    = calcPaid(payments) + calcAdvances(advances)
    const netProfit     = totalRevenue - totalExpenses - workerCosts
    const cashOnHand    = totalRevenue - totalExpenses - totalWasel
    const owedToWorkers = employees.reduce((s, emp) => {
      const wds  = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
      const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
      return s + Math.max(0, calcMutabqi(wds, wExp, payments.filter(p => p.employee_id === emp.id), advances.filter(a => a.employee_id === emp.id)))
    }, 0)
    const owedByClients = projects.reduce((s, p) => {
      const st = calcProjectStats(p.id, workDays, expenses, clientReceipts)
      return s + Math.max(0, (p.budget || 0) - st.revenue)
    }, 0)
    const top = projects
      .map(p => ({ p, profit: calcProjectStats(p.id, workDays, expenses, clientReceipts).profit }))
      .sort((a, b) => b.profit - a.profit).slice(0, 4)
    return {
      cashOnHand, netProfit, owedToWorkers, owedByClients, totalRevenue, totalExpenses, top,
      activeCount: projects.filter(p => p.status === 'نشط').length,
      pendingWD: workDays.filter(w => w.status === 'pending').length,
    }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  const hour = new Date().getHours()
  const greet = hour < 12 ? tl(language, 'صباح الخير', 'בוקר טוב', 'Good morning') : tl(language, 'مساء الخير', 'ערב טוב', 'Good evening')

  // خلايا الشبكة: بطاقة محايدة، اللون بالرقم فقط (دلالة) — انضباط fintech
  const cells = [
    { icon: TrendingUp, label: tl(language, 'صافي الربح', 'רווח נקי', 'Net profit'), v: stats.netProfit, color: stats.netProfit >= 0 ? C.success : C.accent, go: () => onNav?.('finance') },
    ...(soloMode ? [] : [{ icon: Users, label: tl(language, 'مستحق للعمال', 'מגיע לעובדים', 'Owed to workers'), v: stats.owedToWorkers, color: stats.owedToWorkers > 0 ? C.warning : C.text, go: () => onNav?.('workers') }]),
    { icon: HandCoins, label: tl(language, 'باقي عند العملاء', 'אצל לקוחות', 'Owed by clients'), v: stats.owedByClients, color: C.text, go: () => onNav?.('finance') },
    { icon: Clock, label: tl(language, 'أيام بانتظار موافقة', 'ימים ממתינים', 'Pending days'), raw: stats.pendingWD, color: stats.pendingWD ? C.warning : C.text, go: () => onNav?.('workers') },
  ]

  const actions = [
    { icon: CalendarPlus, label: tl(language, 'سجّل يوم', 'רישום יום', 'Log day'), primary: true, go: () => onNav?.('workers') },
    { icon: ArrowDownToLine, label: tl(language, 'قبضة', 'תקבול', 'Receipt'), go: () => { setPendingAction?.({ type: 'add_receipt' }); onNav?.('finance') } },
    { icon: ArrowUpFromLine, label: tl(language, 'مصروف', 'הוצאה', 'Expense'), go: () => { setPendingAction?.({ type: 'add_expense' }); onNav?.('finance') } },
  ]

  return (
    <div dir={dir} style={{ padding: '18px 16px 96px', maxWidth: 520, margin: '0 auto' }}>

      {/* الرأس: تحية + تاريخ + لوغو صغير — هادئ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{greet}</div>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginTop: 3 }}>{fmtDateFull(todayStr(), language)}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HardHat size={19} color="#fff" strokeWidth={2} />
        </div>
      </motion.div>

      {/* بطاقة النقد الرئيسية: محايدة + خط accent رفيع فوق — الرقم هو البطل */}
      <Card skin={skin} delay={0.05} onClick={() => onNav?.('finance')} style={{ overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: 3, background: GRAD.primary }} />
        <div style={{ padding: '16px 18px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textDim, marginBottom: 9 }}>{tl(language, 'نقد بالجيب الآن', 'מזומן בכיס', 'Cash on hand')}</div>
            <Count v={stats.cashOnHand} color={stats.cashOnHand >= 0 ? C.success : C.accent} size={36} show={showAmounts} />
            <div style={{ fontSize: 10.5, color: C.textDim, fontWeight: 600, marginTop: 9, display: 'flex', gap: 12 }}>
              <span>{tl(language, 'داخل', 'נכנס', 'In')} <b dir="ltr" style={{ color: C.success, ...NUM }}>{showAmounts ? `₪${fmt(stats.totalRevenue)}` : '•••'}</b></span>
              <span>{tl(language, 'خارج', 'יוצא', 'Out')} <b dir="ltr" style={{ color: C.accent, ...NUM }}>{showAmounts ? `₪${fmt(stats.totalExpenses)}` : '•••'}</b></span>
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: skin.chip, border: `1px solid ${skin.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={20} color={C.primary} strokeWidth={1.8} />
          </div>
        </div>
      </Card>

      {/* أزرار الإدخال: أساسي واحد ممتلئ + اثنان هادئان */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
        style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 9, marginBottom: 12 }}>
        {actions.map(({ icon: Icon, label, primary, go }) => (
          <motion.button key={label} onClick={go} whileTap={{ scale: 0.97 }} style={{
            fontFamily: 'inherit', cursor: 'pointer', borderRadius: 13, padding: '13px 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: primary ? GRAD.primary : skin.card,
            border: primary ? '1px solid transparent' : `1px solid ${skin.border}`,
            boxShadow: primary ? '0 6px 18px color-mix(in srgb, var(--c-primary) 35%, transparent)' : skin.shadow,
            color: primary ? '#fff' : C.text, fontSize: 12.5, fontWeight: 800,
          }}>
            <Icon size={15} strokeWidth={2} color={primary ? '#fff' : C.primary} />{label}
          </motion.button>
        ))}
      </motion.div>

      {/* شبكة الخلايا: بطاقات محايدة متطابقة — اللون بالأرقام فقط */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
        {cells.map(({ icon: Icon, label, v, raw, color, go }, i) => (
          <Card key={label} skin={skin} delay={0.15 + i * 0.05} onClick={go} style={{ padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Icon size={13.5} color={C.textDim} strokeWidth={2} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textDim }}>{label}</span>
            </div>
            {raw !== undefined
              ? <span dir="ltr" style={{ fontSize: 22, fontWeight: 800, color, ...NUM }}>{raw}</span>
              : <Count v={v} color={color} show={showAmounts} />}
          </Card>
        ))}
      </div>

      {/* أفضل المشاريع: قائمة نظيفة بفواصل — بلا زخرفة */}
      <Card skin={skin} delay={0.35} style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px 8px' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{tl(language, 'أفضل المشاريع', 'הפרויקטים המובילים', 'Top projects')}</span>
          <button onClick={() => onNav?.('projects')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10.5, fontWeight: 700, color: C.primary, padding: 4 }}>
            {tl(language, 'الكل', 'הכול', 'All')} ({stats.activeCount})
          </button>
        </div>
        {stats.top.length === 0 && (
          <div style={{ padding: '6px 16px 14px', fontSize: 11.5, color: C.textDim }}>{tl(language, 'لسّا ما في مشاريع — ابدأ بواحد', 'אין עדיין פרויקטים', 'No projects yet')}</div>
        )}
        {stats.top.map(({ p, profit }, i) => (
          <div key={p.id} onClick={() => onNav?.('projects')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', borderTop: `1px solid ${skin.divider}`, cursor: 'pointer' }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: skin.chip, border: `1px solid ${skin.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: C.textDim, flexShrink: 0, ...NUM }} dir="ltr">{i + 1}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            <span dir="ltr" style={{ fontSize: 13, fontWeight: 800, color: profit >= 0 ? C.success : C.accent, ...NUM }}>
              {showAmounts ? `${profit < 0 ? '−' : ''}₪${fmt(Math.abs(profit))}` : '•••'}
            </span>
            <ChevronLeft size={14} color={C.textDim} strokeWidth={2} style={{ transform: dir === 'ltr' ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
          </div>
        ))}
      </Card>
    </div>
  )
}
