// BoardDashboard v3 — «لوحة الهوية» كنسخة حرفية من اللوحة المعتمدة
// (docs/brand/brand-board.png): كولاج 9 بلاطات مرقّمة بطابع تحريري — لوغو، رسم
// هندسي للخوذة، رقم متوهّج، تايبوغرافي بلونين، أعمدة قيم (طابع أعمدة الباليتة)،
// وردمارك ضخم، خوذة المنتج، غروب الورشة، وصف أيقونات بواحدة متوهّجة —
// لكن كل بلاطة حيّة ببيانات حقيقية. نفس دوال الحساب النقيّة = نفس الأرقام.
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HardHat, Building2, Wallet, Users, BarChart3, TrendingUp,
  CalendarPlus, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDateFull, todayStr } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useCountUp } from '../../ui/Premium.jsx'
import { calcEarned, calcRevenue, calcPaid, calcAdvances, calcMutabqi, calcProjectStats } from '../../lib/calculations.js'

const NUM = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }
const EASE = [0.32, 0.72, 0, 1]

const skinFor = (light) => light ? {
  frame: '#E7E9EF', tile: '#FFFFFF', tileBorder: 'rgba(11,18,32,0.1)',
  blueprint: 'rgba(11,18,32,0.14)', ink: '#0B1220',
} : {
  frame: '#040507', tile: '#0B0D16', tileBorder: 'rgba(255,255,255,0.055)',
  blueprint: 'rgba(255,255,255,0.13)', ink: '#F8FAFC',
}

// بلاطة اللوحة: رقم صغير بالزاوية (يسار-فوق زي اللوحة الأصلية) + محتوى حر
function Tile({ no, span = 1, delay = 0, onClick, children, style = {}, skin }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, filter: 'blur(5px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      style={{
        gridColumn: span === 2 ? '1 / -1' : 'auto',
        position: 'relative', overflow: 'hidden', borderRadius: 4,
        background: skin.tile, border: `1px solid ${skin.tileBorder}`,
        minHeight: 148, padding: '30px 14px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}>
      <span dir="ltr" style={{ position: 'absolute', top: 9, left: 11, fontSize: 9.5, fontWeight: 700, color: C.textDim, opacity: 0.75, ...NUM }}>{no}</span>
      {children}
    </motion.div>
  )
}

function Count({ v, color, size = 30, show }) {
  const n = useCountUp(Math.abs(v), 1300, true)
  if (!show) return <span style={{ fontSize: size, fontWeight: 900, color, ...NUM }}>•••</span>
  return <span dir="ltr" style={{ fontSize: size, fontWeight: 900, color, ...NUM }}>{v < 0 ? '−' : ''}₪{fmt(n)}</span>
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
    const best = projects
      .map(p => ({ p, profit: calcProjectStats(p.id, workDays, expenses, clientReceipts).profit }))
      .sort((a, b) => b.profit - a.profit)[0]
    return {
      cashOnHand, netProfit, owedToWorkers, totalRevenue, totalExpenses, best,
      activeCount: projects.filter(p => p.status === 'نشط').length,
      pendingWD: workDays.filter(w => w.status === 'pending').length,
    }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  // بلاطة 05 — أعمدة القيم بطابع أعمدة الباليتة باللوحة (لون لكل قيمة)
  const bars = [
    { v: stats.totalRevenue, c: C.success, l: tl(language, 'إيراد', 'הכנסה', 'In') },
    { v: stats.cashOnHand, c: C.primary, l: tl(language, 'نقد', 'מזומן', 'Cash') },
    { v: stats.netProfit, c: C.secondary, l: tl(language, 'ربح', 'רווח', 'Net') },
    { v: stats.totalExpenses, c: C.accent, l: tl(language, 'صرف', 'הוצאה', 'Out') },
    { v: stats.owedToWorkers, c: C.gold, l: tl(language, 'عمال', 'עובדים', 'Crew') },
  ]
  const maxBar = Math.max(1, ...bars.map(b => Math.abs(b.v)))

  const quick = [
    { icon: HardHat, hot: true, go: () => onNav?.('workers') },
    { icon: Wallet, go: () => { setPendingAction?.({ type: 'add_receipt' }); onNav?.('finance') } },
    { icon: BarChart3, go: () => onNav?.('finance') },
    { icon: Users, go: () => onNav?.('workers') },
  ]

  return (
    <div dir={dir} style={{ minHeight: '100dvh', background: skin.frame, padding: '14px 10px 96px' }}>
      {/* رأس رفيع فوق اللوحة */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 6px 12px' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: skin.ink, letterSpacing: '-0.02em' }}>{tl(language, 'كبلان — اللوحة', 'כבלאן — הלוח', 'Kabblan — Board')}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: C.textDim }}>{fmtDateFull(todayStr(), language)}</span>
      </motion.div>

      {/* الكولاج: 9 بلاطات بمزاريب رفيعة — نسخة اللوحة الحرفية */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>

        {/* 01 — بلاطة اللوغو (زي اللوحة تماماً) */}
        <Tile no="01" skin={skin} delay={0.03}>
          <div style={{ width: 58, height: 58, borderRadius: 15, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px color-mix(in srgb, var(--c-primary) 40%, transparent)' }}>
            <HardHat size={30} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: skin.ink, marginTop: 12, letterSpacing: '0.04em' }}>KABBLAN</div>
        </Tile>

        {/* 02 — الرسم الهندسي للخوذة على شبكة مخطط + عدّاد المشاريع */}
        <Tile no="02" skin={skin} delay={0.08} onClick={() => onNav?.('projects')}
          style={{ backgroundImage: `linear-gradient(${skin.blueprint} 0.5px, transparent 0.5px), linear-gradient(90deg, ${skin.blueprint} 0.5px, transparent 0.5px)`, backgroundSize: '22px 22px' }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', border: `1px dashed ${skin.blueprint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={46} color={skin.ink} strokeWidth={1} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, marginTop: 8 }}>
            <span dir="ltr" style={{ color: C.primary, fontWeight: 900, ...NUM }}>{stats.activeCount}</span> {tl(language, 'مشاريع نشطة', 'פרויקטים פעילים', 'active projects')}
          </div>
        </Tile>

        {/* 03 — الرقم البطل بشريحة متوهّجة (طابع chip المخطط باللوحة) */}
        <Tile no="03" skin={skin} delay={0.13} span={2} onClick={() => onNav?.('finance')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 58, height: 58, borderRadius: 16, background: 'color-mix(in srgb, var(--c-primary) 14%, transparent)', border: '1.5px solid color-mix(in srgb, var(--c-primary) 55%, transparent)', boxShadow: '0 0 26px color-mix(in srgb, var(--c-primary) 40%, transparent), inset 0 0 14px color-mix(in srgb, var(--c-primary) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={26} color={C.primary} strokeWidth={1.6} />
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: C.textDim, letterSpacing: '0.16em', marginBottom: 8 }}>{tl(language, 'نقد بالجيب الآن', 'מזומן בכיס', 'CASH ON HAND')}</div>
              <Count v={stats.cashOnHand} color={stats.cashOnHand >= 0 ? C.success : C.accent} size={40} show={showAmounts} />
            </div>
          </div>
        </Tile>

        {/* 04 — التايبوغرافي بلونين (زي «Built to run the site.») */}
        <Tile no="04" skin={skin} delay={0.18} style={{ alignItems: 'flex-start', textAlign: 'start' }}>
          <div style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35, letterSpacing: '-0.02em' }}>
            <span style={{ color: skin.ink }}>{tl(language, 'مصلحتك', 'העסק שלך', 'Built to')}<br />{tl(language, 'كلها. ', 'כולו. ', 'run ')}</span>
            <span style={{ color: C.primary }}>{tl(language, 'بجيبك.', 'בכיס.', 'the site.')}</span>
          </div>
        </Tile>

        {/* 05 — أعمدة القيم (طابع أعمدة الباليتة حرفياً — عمود ملوّن لكل قيمة) */}
        <Tile no="05" skin={skin} delay={0.23} onClick={() => onNav?.('finance')} style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 74 }}>
            {bars.map((b, i) => (
              <motion.span key={b.l} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: 0.35 + i * 0.08, ease: EASE }}
                style={{ width: 17, borderRadius: 4, transformOrigin: 'bottom', background: b.c, height: `${Math.max(14, Math.round(Math.abs(b.v) / maxBar * 100))}%`, boxShadow: `0 0 10px ${b.c}55` }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
            {bars.map(b => <span key={b.l} style={{ width: 17, fontSize: 6.5, fontWeight: 700, color: C.textDim, textAlign: 'center' }}>{b.l}</span>)}
          </div>
        </Tile>

        {/* 06 — الوردمارك الضخم بسطرين (KAB / BLAN) + مسطرة رفيعة */}
        <Tile no="06" skin={skin} delay={0.28}>
          <div dir="ltr" style={{ fontSize: 34, fontWeight: 900, color: skin.ink, lineHeight: 0.95, letterSpacing: '-0.02em', textAlign: 'left' }}>KAB<br />BLAN</div>
          <div style={{ width: '78%', height: 2, marginTop: 10, background: `linear-gradient(90deg, ${C.primary}, transparent)` }} />
        </Tile>

        {/* 07 — بلاطة الخوذة (المنتج) → مستحق للعمال / أيام معلّقة */}
        <Tile no="07" skin={skin} delay={0.33} onClick={() => onNav?.('workers')}>
          <div style={{ position: 'relative' }}>
            <HardHat size={54} color={skin.ink} strokeWidth={1.4} />
            <span style={{ position: 'absolute', bottom: 2, insetInlineEnd: -7, width: 17, height: 17, borderRadius: 5, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardHat size={9} color="#fff" strokeWidth={2.4} />
            </span>
          </div>
          {soloMode ? (
            <>
              <span dir="ltr" style={{ fontSize: 24, fontWeight: 900, color: stats.pendingWD ? C.warning : skin.ink, marginTop: 10, ...NUM }}>{stats.pendingWD}</span>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.textDim, marginTop: 4 }}>{tl(language, 'أيام بانتظار موافقة', 'ימים ממתינים', 'pending days')}</div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 10 }}><Count v={stats.owedToWorkers} color={stats.owedToWorkers > 0 ? C.gold : skin.ink} size={22} show={showAmounts} /></div>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.textDim, marginTop: 4 }}>{tl(language, 'مستحق للعمال', 'מגיע לעובדים', 'owed to workers')}</div>
            </>
          )}
        </Tile>

        {/* 08 — غروب الورشة بانوراما (CSS خالص) → أفضل مشروع */}
        <Tile no="08" skin={skin} delay={0.38} span={2} onClick={() => onNav?.('projects')}
          style={{ background: 'linear-gradient(180deg, #120a04 0%, #3d1e0a 42%, #a4551b 78%, #e08a3c 100%)', border: '1px solid rgba(255,255,255,0.06)', justifyContent: 'flex-end', alignItems: 'stretch', padding: 0 }}>
          <div style={{ position: 'absolute', bottom: 0, insetInline: 0, height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', opacity: 0.9 }}>
            <span style={{ width: 22, height: 34, background: '#0d0703' }} />
            <span style={{ width: 16, height: 42, background: '#0d0703' }} />
            <span style={{ width: 26, height: 26, background: '#0d0703' }} />
            <span style={{ width: 14, height: 38, background: '#0d0703' }} />
          </div>
          <div style={{ position: 'relative', padding: '0 12px 12px', textAlign: 'start' }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,235,210,0.75)', letterSpacing: '0.14em', marginBottom: 4 }}>{tl(language, 'أفضل مشروع', 'הפרויקט המוביל', 'TOP PROJECT')}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF7ED', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.best?.p?.name || tl(language, 'لسّا ما في', 'אין עדיין', 'None yet')}</div>
            {stats.best && <span dir="ltr" style={{ fontSize: 15, fontWeight: 900, color: '#FDE68A', ...NUM }}>{showAmounts ? `₪${fmt(Math.abs(stats.best.profit))}` : '•••'}</span>}
          </div>
        </Tile>

        {/* 09 — صف الأيقونات بواحدة متوهّجة (زي اللوحة حرفياً) */}
        <Tile no="09" skin={skin} delay={0.43} span={2} style={{ minHeight: 96, flexDirection: 'row', gap: 12 }}>
          {quick.map(({ icon: Icon, hot, go }, i) => (
            <motion.button key={i} onClick={go} whileTap={{ scale: 0.92 }} style={{
              width: 54, height: 54, borderRadius: 14, cursor: 'pointer',
              background: hot ? 'color-mix(in srgb, var(--c-primary) 15%, transparent)' : 'transparent',
              border: hot ? '1.5px solid color-mix(in srgb, var(--c-primary) 60%, transparent)' : `1.5px solid ${skin.tileBorder}`,
              boxShadow: hot ? '0 0 22px color-mix(in srgb, var(--c-primary) 40%, transparent)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color={hot ? C.primary : C.textDim} strokeWidth={1.5} />
            </motion.button>
          ))}
        </Tile>
      </div>
    </div>
  )
}
