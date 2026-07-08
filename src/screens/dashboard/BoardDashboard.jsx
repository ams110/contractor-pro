// BoardDashboard v2 — واجهة «لوحة الهوية» بمستوى SaaS 2026:
// زجاج غامق فوق mesh متوهّج، بانلات Double-Bezel (غلاف hairline + قلب بإضاءة داخلية)،
// عدّادات تصاعدية، لمعة هولوغرافية، ودخول متدرّج بفيزياء spring — مع DNA اللوحة
// المعتمدة (docs/brand/brand-board.png): ترقيم البانلات، المزاريب، وشريط التاغلاين بلونين.
// نفس دوال الحساب النقيّة = نفس الأرقام بكل الواجهات.
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HardHat, ArrowDownToLine, ArrowUpFromLine, Building2, CalendarPlus,
  ChevronLeft, Wallet, TrendingUp, Users, HandCoins, Landmark,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDateFull, todayStr } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { IconChip, HolographicSheen, useCountUp } from '../../ui/Premium.jsx'
import { calcEarned, calcRevenue, calcPaid, calcAdvances, calcMutabqi, calcProjectStats } from '../../lib/calculations.js'

const NUM = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }
const EASE = [0.32, 0.72, 0, 1]

// خطوط شعرية وظلال حسب فتحة الثيم — «وضع الورشة» الفاتح يحتاج حبر داكن بدل الأبيض
const skinFor = (light) => light ? {
  shellBg: 'rgba(11,18,32,0.035)', shellBorder: 'rgba(11,18,32,0.1)',
  coreShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 12px 26px -14px rgba(11,18,32,0.22)',
  hairline: 'rgba(11,18,32,0.1)', chipBg: 'rgba(11,18,32,0.05)', chipBorder: 'rgba(11,18,32,0.12)',
  track: 'rgba(11,18,32,0.08)',
} : {
  shellBg: 'rgba(255,255,255,0.028)', shellBorder: 'rgba(255,255,255,0.07)',
  coreShadow: 'inset 0 1px 1px rgba(255,255,255,0.07), 0 18px 40px -18px rgba(0,0,0,0.7)',
  hairline: 'rgba(255,255,255,0.06)', chipBg: 'rgba(255,255,255,0.035)', chipBorder: 'rgba(255,255,255,0.08)',
  track: 'rgba(255,255,255,0.05)',
}

// ─── Double-Bezel: غلاف hairline خارجي + قلب داخلي بإضاءة علوية (حرفة 2026) ────
function Bezel({ no, label, span = 1, delay = 0, onClick, glow, children, coreStyle = {}, skin }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={{
        gridColumn: span === 2 ? '1 / -1' : 'auto',
        padding: 5, borderRadius: 26,
        background: skin.shellBg,
        border: `1px solid ${skin.shellBorder}`,
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 21, height: '100%',
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 130%)`,
        boxShadow: skin.coreShadow,
        padding: '14px 16px', ...coreStyle,
      }}>
        {glow && (
          <div style={{ position: 'absolute', top: -70, insetInlineEnd: -70, width: 210, height: 210, borderRadius: '50%', pointerEvents: 'none', background: `radial-gradient(circle, color-mix(in srgb, ${glow} 26%, transparent), transparent 70%)` }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: C.textDim, letterSpacing: '0.14em' }}>{label}</span>
          <span dir="ltr" style={{ fontSize: 9, fontWeight: 700, color: C.textDim, opacity: 0.5, ...NUM }}>{no}</span>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

// رقم مالي بعدّاد تصاعدي — القلب النابض لكل بانل
function CountMoney({ v, color, size = 27, show }) {
  const n = useCountUp(Math.abs(v), 1300, true)
  if (!show) return <span style={{ fontSize: size, fontWeight: 900, color, ...NUM }}>•••</span>
  return (
    <span dir="ltr" style={{ fontSize: size, fontWeight: 900, color, ...NUM }}>
      {v < 0 ? '−' : ''}₪{fmt(n)}
    </span>
  )
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
      .sort((a, b) => b.profit - a.profit).slice(0, 3)
    return {
      cashOnHand, netProfit, owedToWorkers, owedByClients, totalRevenue, totalExpenses,
      activeCount: projects.filter(p => p.status === 'نشط').length,
      pendingWD: workDays.filter(w => w.status === 'pending').length,
      top, maxProfit: Math.max(1, ...top.map(t => Math.abs(t.profit))),
    }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  const quick = [
    { icon: CalendarPlus, label: tl(language, 'سجّل يوم', 'רישום יום', 'Log day'), hot: true, go: () => onNav?.('workers') },
    { icon: ArrowDownToLine, label: tl(language, 'قبضة', 'תקבול', 'Receipt'), go: () => { setPendingAction?.({ type: 'add_receipt' }); onNav?.('finance') } },
    { icon: ArrowUpFromLine, label: tl(language, 'مصروف', 'הוצאה', 'Expense'), go: () => { setPendingAction?.({ type: 'add_expense' }); onNav?.('finance') } },
    { icon: Building2, label: tl(language, 'مشاريع', 'פרויקטים', 'Projects'), go: () => onNav?.('projects') },
  ]

  return (
    <div dir={dir} style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* mesh متوهّج ثابت — عمق OLED (طابع Ethereal Glass) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `
        radial-gradient(52% 38% at 82% -6%, color-mix(in srgb, var(--c-primary) 15%, transparent), transparent 70%),
        radial-gradient(44% 34% at -8% 34%, color-mix(in srgb, ${C.secondary} 9%, transparent), transparent 72%),
        radial-gradient(40% 30% at 55% 108%, color-mix(in srgb, var(--c-primary) 7%, transparent), transparent 70%)` }} />

      <div style={{ position: 'relative', padding: '18px 14px 96px', maxWidth: 520, margin: '0 auto' }}>

        {/* رأس اللوحة — بلاطة اللوغو النابضة + وسم الورقة */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 46, height: 46, borderRadius: 14, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px color-mix(in srgb, var(--c-primary) 45%, transparent), inset 0 1px 1px rgba(255,255,255,0.3)' }}>
            <HardHat size={23} color="#fff" strokeWidth={1.8} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.text, letterSpacing: '-0.03em' }}>{tl(language, 'كبلان', 'כבלאן', 'Kabblan')}</div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginTop: 2 }}>{fmtDateFull(todayStr(), language)}</div>
          </div>
          <span dir="ltr" style={{ fontSize: 9, fontWeight: 800, color: C.textDim, letterSpacing: '0.18em', border: `1px solid ${skin.chipBorder}`, background: skin.chipBg, borderRadius: 999, padding: '5px 11px', ...NUM }}>CP-01</span>
        </motion.div>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          style={{ height: 1, background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-primary) 35%, transparent), transparent)`, margin: '12px 0 16px', transformOrigin: 'center' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* 01 — بانل البطل: النقد بعدّاد ضخم + لمعة هولوغرافية */}
          <Bezel skin={skin} no="01" span={2} delay={0.05} glow="var(--c-primary)"
            label={tl(language, 'نقد بالجيب الآن', 'מזומן בכיס', 'CASH ON HAND')}
            coreStyle={{ padding: '18px 18px 20px', background: `linear-gradient(150deg, color-mix(in srgb, var(--c-primary) 10%, ${C.surface}) 0%, ${C.bg} 120%)` }}>
            <HolographicSheen />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <CountMoney v={stats.cashOnHand} color={stats.cashOnHand >= 0 ? C.success : C.accent} size={44} show={showAmounts} />
                <div style={{ fontSize: 10.5, color: C.textDim, fontWeight: 700, marginTop: 9, lineHeight: 1.5 }}>
                  {tl(language, 'كل المقبوض ناقص كل المدفوع فعلياً', 'כל התקבולים פחות כל התשלומים', 'All received minus all paid out')}
                </div>
              </div>
              <IconChip icon={Wallet} color={stats.cashOnHand >= 0 ? C.success : C.accent} size={46} radius={15} pulse strokeWidth={1.7} />
            </div>
          </Bezel>

          {/* 02 — الربح */}
          <Bezel skin={skin} no="02" delay={0.14} label={tl(language, 'صافي الربح', 'רווח נקי', 'NET PROFIT')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <IconChip icon={TrendingUp} color={C.cyan} size={30} radius={10} strokeWidth={1.8} />
              <CountMoney v={stats.netProfit} color={stats.netProfit >= 0 ? C.text : C.accent} show={showAmounts} />
            </div>
          </Bezel>

          {/* 03 — للعمال / أيام معلّقة */}
          {soloMode ? (
            <Bezel skin={skin} no="03" delay={0.2} onClick={() => onNav?.('workers')} label={tl(language, 'بانتظار موافقة', 'ממתינים', 'PENDING DAYS')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <IconChip icon={CalendarPlus} color={C.warning} size={30} radius={10} strokeWidth={1.8} />
                <span dir="ltr" style={{ fontSize: 27, fontWeight: 900, color: stats.pendingWD ? C.warning : C.text, ...NUM }}>{stats.pendingWD}</span>
              </div>
            </Bezel>
          ) : (
            <Bezel skin={skin} no="03" delay={0.2} onClick={() => onNav?.('workers')} label={tl(language, 'مستحق للعمال', 'מגיע לעובדים', 'OWED TO WORKERS')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <IconChip icon={Users} color={C.gold} size={30} radius={10} strokeWidth={1.8} />
                <CountMoney v={stats.owedToWorkers} color={stats.owedToWorkers > 0 ? C.gold : C.text} show={showAmounts} />
              </div>
            </Bezel>
          )}

          {/* 04 — عند العملاء */}
          <Bezel skin={skin} no="04" delay={0.26} onClick={() => onNav?.('finance')} label={tl(language, 'باقي عند العملاء', 'אצל לקוחות', 'OWED BY CLIENTS')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <IconChip icon={HandCoins} color={C.cyan} size={30} radius={10} strokeWidth={1.8} />
              <CountMoney v={stats.owedByClients} color={C.cyan} show={showAmounts} />
            </div>
          </Bezel>

          {/* 05 — الحركة الكلية */}
          <Bezel skin={skin} no="05" delay={0.32} label={tl(language, 'الحركة الكلية', 'תנועה כוללת', 'TOTALS')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                [tl(language, 'إيرادات', 'הכנסות', 'Revenue'), stats.totalRevenue, C.success],
                [tl(language, 'مصاريف', 'הוצאות', 'Expenses'), stats.totalExpenses, C.accent],
              ].map(([l, v, col]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{l}</span>
                  <span dir="ltr" style={{ fontSize: 14.5, fontWeight: 900, color: col, ...NUM }}>{showAmounts ? `₪${fmt(v)}` : '•••'}</span>
                </div>
              ))}
              <div style={{ height: 1, background: skin.hairline }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{tl(language, 'مشاريع نشطة', 'פרויקטים פעילים', 'Active')}</span>
                <span dir="ltr" style={{ fontSize: 14.5, fontWeight: 900, color: C.text, ...NUM }}>{stats.activeCount}</span>
              </div>
            </div>
          </Bezel>

          {/* 06 — أفضل المشاريع بأشرطة تنمو بفيزياء spring */}
          <Bezel skin={skin} no="06" span={2} delay={0.38} onClick={() => onNav?.('projects')} glow={C.secondary}
            label={tl(language, 'أفضل المشاريع', 'הפרויקטים המובילים', 'TOP PROJECTS')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.top.length === 0 && (
                <span style={{ fontSize: 11.5, color: C.textDim }}>{tl(language, 'لسّا ما في مشاريع — ابدأ بواحد', 'אין עדיין פרויקטים', 'No projects yet')}</span>
              )}
              {stats.top.map(({ p, profit }, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span dir="ltr" style={{ fontSize: 9, fontWeight: 800, color: C.textDim, width: 15, opacity: 0.6, ...NUM }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.text, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span style={{ display: 'block', height: 5, borderRadius: 3, background: skin.track, marginTop: 5, overflow: 'hidden' }}>
                      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: 0.55 + i * 0.12, ease: EASE }}
                        style={{ display: 'block', height: '100%', transformOrigin: dir === 'rtl' ? 'right' : 'left', width: `${Math.max(7, Math.round(Math.abs(profit) / stats.maxProfit * 100))}%`, background: profit >= 0 ? GRAD.primary : C.accent, borderRadius: 3, boxShadow: '0 0 12px color-mix(in srgb, var(--c-primary) 45%, transparent)' }} />
                    </span>
                  </span>
                  <span dir="ltr" style={{ fontSize: 13.5, fontWeight: 900, color: profit >= 0 ? C.success : C.accent, ...NUM }}>
                    {showAmounts ? `${profit < 0 ? '−' : ''}₪${fmt(Math.abs(profit))}` : '•••'}
                  </span>
                  <ChevronLeft size={13} color={C.textDim} strokeWidth={1.8} style={{ transform: dir === 'ltr' ? 'rotate(180deg)' : 'none' }} />
                </div>
              ))}
            </div>
          </Bezel>

          {/* 07 — الإجراءات: أزرار جزيرة بأيقونة داخل دائرتها (button-in-button) */}
          <Bezel skin={skin} no="07" span={2} delay={0.46} label={tl(language, 'إجراءات سريعة', 'פעולות מהירות', 'QUICK ACTIONS')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
              {quick.map(({ icon: Icon, label, hot, go }) => (
                <motion.button key={label} onClick={go} whileTap={{ scale: 0.94 }}
                  style={{
                    fontFamily: 'inherit', cursor: 'pointer', borderRadius: 16, padding: '11px 4px 10px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                    background: hot ? GRAD.primary : skin.chipBg,
                    border: hot ? '1px solid transparent' : `1px solid ${skin.chipBorder}`,
                    boxShadow: hot ? '0 10px 26px color-mix(in srgb, var(--c-primary) 45%, transparent), inset 0 1px 1px rgba(255,255,255,0.3)' : 'none',
                  }}>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hot ? 'rgba(255,255,255,0.22)' : 'color-mix(in srgb, var(--c-primary) 14%, transparent)' }}>
                    <Icon size={15} color={hot ? '#fff' : C.primary} strokeWidth={1.9} />
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: hot ? '#fff' : C.textDim }}>{label}</span>
                </motion.button>
              ))}
            </div>
          </Bezel>
        </div>

        {/* 08 — التاغلاين بلونين (بانل 04 باللوحة) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.75 }}
          style={{ textAlign: 'center', padding: '20px 0 4px' }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.01em' }}>
            <span style={{ color: C.text }}>{tl(language, 'مصلحتك كلها. ', 'כל העסק שלך. ', 'Your whole business. ')}</span>
            <span style={{ color: C.primary, textShadow: '0 0 26px color-mix(in srgb, var(--c-primary) 55%, transparent)' }}>{tl(language, 'بجيبك.', 'בכיס.', 'In your pocket.')}</span>
          </span>
        </motion.div>
      </div>
    </div>
  )
}
