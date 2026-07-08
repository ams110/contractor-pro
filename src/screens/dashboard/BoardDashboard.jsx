// BoardDashboard — واجهة «لوحة الهوية»: نفس طابع لوحة الـbrand board المعتمدة
// (docs/brand/brand-board.png): بانلات مرقّمة على شبكة بمزاريب واضحة، حدود رفيعة،
// تايبوغرافي متقشّف، رقم كبير واحد لكل بانل، وشريط تاغلاين — لكن عمليّة ببيانات حيّة.
// نفس دوال الحساب النقيّة = نفس الأرقام بكل الواجهات.
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HardHat, Wallet, TrendingUp, Users, HandCoins, ArrowDownToLine,
  ArrowUpFromLine, Building2, CalendarPlus, ChevronLeft,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDateFull, todayStr } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { calcEarned, calcRevenue, calcPaid, calcAdvances, calcMutabqi, calcProjectStats } from '../../lib/calculations.js'

const NUM_FONT = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }

// بانل اللوحة: رقم تسلسلي صغير + عنوان خافت + محتوى — DNA اللوحة المعتمدة
function Panel({ no, label, span = 1, onClick, children, style = {} }) {
  return (
    <div onClick={onClick} style={{
      gridColumn: span === 2 ? '1 / -1' : 'auto',
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '12px 14px', position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, opacity: 0.55, ...NUM_FONT }} dir="ltr">{no}</span>
      </div>
      {children}
    </div>
  )
}

export default function BoardDashboard({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], advances = [], clientReceipts = [], onNav, permissions, soloMode = false,
}) {
  const { language } = useAppStore()
  const setPendingAction = useAppStore(s => s.setPendingAction)
  const showAmounts = permissions?.viewAmounts !== false
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const stats = useMemo(() => {
    const approvedWD    = workDays.filter(w => w.status === 'approved')
    const workerCosts   = calcEarned(approvedWD)
    const totalRevenue  = calcRevenue(clientReceipts)
    const totalExpenses = expenses.filter(e => !e.employee_id && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
    const totalWasel    = calcPaid(payments) + calcAdvances(advances)
    const netProfit     = totalRevenue - totalExpenses - workerCosts
    const cashOnHand    = totalRevenue - totalExpenses - totalWasel
    const owedToWorkers = employees.reduce((s, emp) => {
      const wds  = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
      const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
      const pays = payments.filter(p => p.employee_id === emp.id)
      const advs = advances.filter(a => a.employee_id === emp.id)
      return s + Math.max(0, calcMutabqi(wds, wExp, pays, advs))
    }, 0)
    const owedByClients = projects.reduce((s, p) => {
      const st = calcProjectStats(p.id, workDays, expenses, clientReceipts)
      return s + Math.max(0, (p.budget || 0) - st.revenue)
    }, 0)
    const top = projects
      .map(p => ({ p, profit: calcProjectStats(p.id, workDays, expenses, clientReceipts).profit }))
      .sort((a, b) => b.profit - a.profit).slice(0, 3)
    const maxProfit = Math.max(1, ...top.map(t => Math.abs(t.profit)))
    return {
      cashOnHand, netProfit, owedToWorkers, owedByClients,
      totalRevenue, totalExpenses,
      activeCount: projects.filter(p => p.status === 'نشط').length,
      pendingWD: workDays.filter(w => w.status === 'pending').length,
      top, maxProfit,
    }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  const money = (v, color) => (
    <span dir="ltr" style={{ fontSize: 26, fontWeight: 900, color, ...NUM_FONT }}>
      {showAmounts ? `${v < 0 ? '−' : ''}₪${fmt(Math.abs(v))}` : '•••'}
    </span>
  )

  const quick = [
    { icon: CalendarPlus, label: tl(language, 'سجّل يوم', 'רישום יום', 'Log day'), hot: true, go: () => onNav?.('workers') },
    { icon: ArrowDownToLine, label: tl(language, 'قبضة', 'תקבול', 'Receipt'), go: () => { setPendingAction?.({ type: 'add_receipt' }); onNav?.('finance') } },
    { icon: ArrowUpFromLine, label: tl(language, 'مصروف', 'הוצאה', 'Expense'), go: () => { setPendingAction?.({ type: 'add_expense' }); onNav?.('finance') } },
    { icon: Building2, label: tl(language, 'مشاريع', 'פרויקטים', 'Projects'), go: () => onNav?.('projects') },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      dir={dir} style={{ padding: '16px 14px 90px', maxWidth: 520, margin: '0 auto' }}>

      {/* رأس اللوحة: بلاطة اللوغو + الاسم + وسم الورقة (طابع sheet label) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 22px color-mix(in srgb, var(--c-primary) 35%, transparent)` }}>
          <HardHat size={22} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{tl(language, 'كبلان', 'כבלאן', 'Kabblan')}</div>
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700 }}>{fmtDateFull(todayStr(), language)}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 7, padding: '3px 8px', ...NUM_FONT }} dir="ltr">CP-01</span>
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.borderMid}, transparent)`, margin: '10px 0 14px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* 01 — النقد: بانل البطل (رقم واحد كبير — DNA اللوحة) */}
        <Panel no="01" label={tl(language, 'نقد بالجيب الآن', 'מזומן בכיס', 'Cash on hand')} span={2}
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--c-primary) 7%, transparent), ${C.surface} 65%)` }}>
          <span dir="ltr" style={{ fontSize: 38, fontWeight: 900, color: stats.cashOnHand >= 0 ? C.success : C.accent, ...NUM_FONT }}>
            {showAmounts ? `${stats.cashOnHand < 0 ? '−' : ''}₪${fmt(Math.abs(stats.cashOnHand))}` : '•••'}
          </span>
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginTop: 4 }}>
            {tl(language, 'كل المقبوض ناقص كل المدفوع فعلياً', 'כל התקבולים פחות כל התשלומים', 'All received minus all paid out')}
          </div>
          <div style={{ position: 'absolute', top: -50, insetInlineEnd: -50, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--c-primary) 18%, transparent), transparent 70%)', pointerEvents: 'none' }} />
        </Panel>

        {/* 02 — الربح */}
        <Panel no="02" label={tl(language, 'صافي الربح', 'רווח נקי', 'Net profit')}>
          {money(stats.netProfit, stats.netProfit >= 0 ? C.text : C.accent)}
        </Panel>

        {/* 03 — للعمال / أيام معلّقة بوضع solo */}
        {soloMode ? (
          <Panel no="03" label={tl(language, 'أيام بانتظار موافقة', 'ימים ממתינים', 'Pending days')} onClick={() => onNav?.('workers')}>
            <span style={{ fontSize: 26, fontWeight: 900, color: stats.pendingWD ? C.warning : C.text, ...NUM_FONT }} dir="ltr">{stats.pendingWD}</span>
          </Panel>
        ) : (
          <Panel no="03" label={tl(language, 'مستحق للعمال', 'מגיע לעובדים', 'Owed to workers')} onClick={() => onNav?.('workers')}>
            {money(stats.owedToWorkers, stats.owedToWorkers > 0 ? C.gold : C.text)}
          </Panel>
        )}

        {/* 04 — عند العملاء */}
        <Panel no="04" label={tl(language, 'باقي عند العملاء', 'נשאר אצל לקוחות', 'Owed by clients')} onClick={() => onNav?.('finance')}>
          {money(stats.owedByClients, C.cyan)}
        </Panel>

        {/* 05 — الإيرادات/المصاريف بسطرين رفيعين */}
        <Panel no="05" label={tl(language, 'الحركة الكلية', 'תנועה כוללת', 'Totals')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              [tl(language, 'إيرادات', 'הכנסות', 'Revenue'), stats.totalRevenue, C.success],
              [tl(language, 'مصاريف', 'הוצאות', 'Expenses'), stats.totalExpenses, C.accent],
            ].map(([l, v, col]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{l}</span>
                <span dir="ltr" style={{ fontSize: 14, fontWeight: 900, color: col, ...NUM_FONT }}>{showAmounts ? `₪${fmt(v)}` : '•••'}</span>
              </div>
            ))}
            <div style={{ height: 1, background: C.border }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{tl(language, 'مشاريع نشطة', 'פרויקטים פעילים', 'Active projects')}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: C.text, ...NUM_FONT }} dir="ltr">{stats.activeCount}</span>
            </div>
          </div>
        </Panel>

        {/* 06 — أفضل المشاريع بأشرطة هندسية (طابع مخطط اللوحة) */}
        <Panel no="06" label={tl(language, 'أفضل المشاريع', 'הפרויקטים המובילים', 'Top projects')} span={2} onClick={() => onNav?.('projects')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {stats.top.length === 0 && (
              <span style={{ fontSize: 11, color: C.textDim }}>{tl(language, 'لسّا ما في مشاريع — ابدأ بواحد', 'אין עדיין פרויקטים', 'No projects yet')}</span>
            )}
            {stats.top.map(({ p, profit }, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.textDim, width: 14, ...NUM_FONT }} dir="ltr">{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.text, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <span style={{ display: 'block', height: 4, borderRadius: 2, background: C.card, marginTop: 4, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.max(6, Math.round(Math.abs(profit) / stats.maxProfit * 100))}%`, background: profit >= 0 ? GRAD.primary : C.accent, borderRadius: 2 }} />
                  </span>
                </span>
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 900, color: profit >= 0 ? C.success : C.accent, ...NUM_FONT }}>
                  {showAmounts ? `${profit < 0 ? '−' : ''}₪${fmt(Math.abs(profit))}` : '•••'}
                </span>
                <ChevronLeft size={13} color={C.textDim} style={{ transform: dir === 'ltr' ? 'rotate(180deg)' : 'none' }} />
              </div>
            ))}
          </div>
        </Panel>

        {/* 07 — صف الإجراءات (طابع صف الأيقونات باللوحة: chip واحد متوهّج) */}
        <Panel no="07" label={tl(language, 'إجراءات سريعة', 'פעולות מהירות', 'Quick actions')} span={2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {quick.map(({ icon: Icon, label, hot, go }) => (
              <button key={label} onClick={go} style={{
                fontFamily: 'inherit', cursor: 'pointer', borderRadius: 12, padding: '10px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: hot ? GRAD.primary : C.card,
                border: `1px solid ${hot ? 'transparent' : C.border}`,
                boxShadow: hot ? '0 6px 20px color-mix(in srgb, var(--c-primary) 40%, transparent)' : 'none',
              }}>
                <Icon size={17} color={hot ? '#fff' : C.textDim} strokeWidth={2.2} />
                <span style={{ fontSize: 10, fontWeight: 800, color: hot ? '#fff' : C.textDim }}>{label}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* 08 — شريط التاغلاين (DNA اللوحة: سطر هادئ متباعد الأحرف) */}
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '10px 0 2px' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.2em' }}>
            {tl(language, 'مصلحتك كلها. بجيبك.', 'כל העסק שלך. בכיס.', 'YOUR WHOLE BUSINESS. IN YOUR POCKET.')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
