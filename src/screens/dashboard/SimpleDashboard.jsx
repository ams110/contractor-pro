// ════════════════════════════════════════════════════════════════════════════
//  SimpleDashboard.jsx — «الواضح الكبير»
//  لوحة بديلة كاملة، هادئة وعملاقة، لمقاولين أكبر بالعمر (50–65) — نظّارات قراءة
//  وأصابع كبيرة. لا رسمات، لا محرّكات رؤى، لا عدّادات متحرّكة — أرقام ضخمة فقط.
//  نفس دوال الحساب النقيّة تبع DashboardScreen حتى تطابق الأرقام تماماً.
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, HandCoins, TrendingUp, HardHat, Banknote, ReceiptText, Building2, ChevronLeft } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { calcEarned, calcPaid, calcAdvances, calcRevenue, calcMutabqi } from '../../lib/calculations.js'

// ─── عرض مبلغ ضخم: إشارة سالب صريحة + tabular-nums + قناع «•••» عند حجب المبالغ ──
function BigMoney({ value, color, show }) {
  if (!show) return <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>•••</span>
  const neg = value < 0
  return (
    <span dir="ltr" style={{ color, fontVariantNumeric: 'tabular-nums', display: 'inline-block' }}>
      {neg ? '−' : ''}₪{fmt(Math.abs(Math.round(value)))}
    </span>
  )
}

// ─── بطاقة عملاقة: أيقونة 52×52 + عنوان كبير + رقم 44/900 + جملة قصيرة ──────────
function GiantCard({ icon: Icon, color, title, value, subtitle, show }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18,
      minHeight: 120, padding: '24px 26px', borderRadius: 22, marginBottom: 14,
      background: `${color}12`, border: `1.5px solid ${color}30`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}18`, border: `1.5px solid ${color}28`,
      }}>
        <Icon size={28} color={color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.6 }}>{title}</div>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '2px 0' }}>
          <BigMoney value={value} color={color} show={show} />
        </div>
        <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
    </div>
  )
}

export default function SimpleDashboard({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], advances = [], clientReceipts = [], onNav, permissions, soloMode = false,
}) {
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const L = (ar, he, en) => tl(language, ar, he, en)
  const showAmounts = permissions?.viewAmounts !== false

  // ── نفس معادلات DashboardScreen بالضبط (دوال نقيّة من calculations.js) ────────
  const stats = useMemo(() => {
    const workerCosts   = calcEarned(workDays.filter(w => w.status === 'approved'))
    const totalRevenue  = calcRevenue(clientReceipts)
    const totalExpenses = expenses.filter(e => !e.employee_id && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
    const totalPayments = calcPaid(payments)
    const totalAdvances = calcAdvances(advances)
    const cashOnHand    = totalRevenue - totalExpenses - (totalPayments + totalAdvances)
    const netProfit     = totalRevenue - totalExpenses - workerCosts

    const owedToWorkers = employees.reduce((s, emp) => {
      const wds  = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
      const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
      const pays = payments.filter(p => p.employee_id === emp.id)
      const advs = advances.filter(a => a.employee_id === emp.id)
      return s + Math.max(0, calcMutabqi(wds, wExp, pays, advs))
    }, 0)

    const activeCount = projects.filter(p => p.status === 'نشط').length
    const pendingWD   = workDays.filter(w => w.status === 'pending').length
    return { cashOnHand, netProfit, owedToWorkers, activeCount, pendingWD }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  // ── التحية حسب الساعة + التاريخ ─────────────────────────────────────────────
  const hour = new Date().getHours()
  const greeting = hour < 12
    ? L('صباح الخير', 'בוקר טוב', 'Good morning')
    : L('مساء الخير', 'ערב טוב', 'Good evening')
  const dateStr = new Date().toLocaleDateString(
    language === 'he' ? 'he-IL' : language === 'en' ? 'en-GB' : 'ar-EG',
    { weekday: 'long', day: 'numeric', month: 'long' },
  )

  const cashColor = stats.cashOnHand >= 0 ? C.success : C.accent
  const profitColor = stats.netProfit >= 0 ? C.success : C.accent

  return (
    <motion.div dir={dir} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}
      style={{ padding: '18px 16px 32px', maxWidth: 620, margin: '0 auto' }}>

      {/* ── التحية الكبيرة ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
          {greeting}
        </div>
        <div style={{ fontSize: 15, color: C.textDim, marginTop: 4, lineHeight: 1.6 }}>{dateStr}</div>
      </div>

      {/* ── البطاقات الثلاث العملاقة ── */}
      <GiantCard icon={Wallet} color={cashColor} show={showAmounts}
        title={L('المصاري بالجيب', 'הכסף בכיס', 'Cash on hand')}
        value={stats.cashOnHand}
        subtitle={stats.cashOnHand >= 0
          ? L('كل اللي قبضته ناقص كل اللي دفعته.', 'כל מה שקיבלת פחות כל מה ששילמת.', 'Everything received minus everything paid.')
          : L('دفعت أكثر مما قبضت — انتبه.', 'שילמת יותר ממה שקיבלת — שים לב.', 'You paid more than you received — watch out.')} />

      {!soloMode && (
        <GiantCard icon={HandCoins} color={C.warning} show={showAmounts}
          title={L('لازم تدفع للعمال', 'צריך לשלם לעובדים', 'Owed to workers')}
          value={stats.owedToWorkers}
          subtitle={L('هذا المبلغ باقي للعمال عندك.', 'זה הסכום שנשאר לעובדים אצלך.', 'This amount is still due to your workers.')} />
      )}

      <GiantCard icon={TrendingUp} color={profitColor} show={showAmounts}
        title={L('ربحك الصافي', 'הרווח הנקי שלך', 'Your net profit')}
        value={stats.netProfit}
        subtitle={stats.netProfit >= 0
          ? L('اللي بيظل إلك بعد المصاريف والعمال.', 'מה שנשאר לך אחרי ההוצאות והעובדים.', 'What is left after expenses and labor.')
          : L('المصاريف أكثر من المدخول هالفترة.', 'ההוצאות גבוהות מההכנסות בתקופה הזו.', 'Expenses exceed income this period.')} />

      {/* ── زرّان عملاقان ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 6, marginBottom: 14 }}>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onNav?.('workers')}
          style={{
            height: 92, borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: GRAD.primary, color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em',
            boxShadow: `0 8px 24px color-mix(in srgb, var(--c-primary) 30%, transparent)`,
          }}>
          <HardHat size={28} strokeWidth={2.2} />
          {L('سجّل يوم عمل', 'רשום יום עבודה', 'Log a work day')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onNav?.('finance')}
          style={{
            height: 92, borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
            background: C.card, border: `2px solid ${C.success}`, color: C.success,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em',
          }}>
          <Banknote size={28} strokeWidth={2.2} />
          {L('سجّل قبضة', 'רשום תקבול', 'Log a receipt')}
        </motion.button>
      </div>

      {/* ── زر مصروف أخفّ بعرض كامل ── */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => onNav?.('finance')}
        style={{
          width: '100%', height: 64, borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
          background: C.surface, border: `1.5px solid ${C.borderMid}`, color: C.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 18, fontWeight: 800, marginBottom: 18,
        }}>
        <ReceiptText size={24} color={C.textDim} strokeWidth={2.2} />
        {L('سجّل مصروف', 'רשום הוצאה', 'Log an expense')}
      </motion.button>

      {/* ── سطر الحالة البسيط ── */}
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => onNav?.('projects')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start',
          padding: '18px 18px', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
          background: C.card, border: `1px solid ${C.border}`,
        }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${C.cyan}18`, border: `1.5px solid ${C.cyan}28`,
        }}>
          <Building2 size={23} color={C.cyan} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>
          {L(
            `عندك ${stats.activeCount} مشاريع شغّالة و ${stats.pendingWD} يوم عمل بانتظار موافقتك`,
            `יש לך ${stats.activeCount} פרויקטים פעילים ו־${stats.pendingWD} ימי עבודה שממתינים לאישור שלך`,
            `You have ${stats.activeCount} active projects and ${stats.pendingWD} work days awaiting your approval`,
          )}
        </div>
        <ChevronLeft size={20} color={C.textDim} style={{ flexShrink: 0, transform: dir === 'ltr' ? 'rotate(180deg)' : 'none' }} />
      </motion.button>
    </motion.div>
  )
}
