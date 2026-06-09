import React from 'react'
import {
  HardHat, Sparkles, CalendarDays, Wallet, Receipt, ArrowLeft,
  TrendingUp, CircleDot, CheckCircle2, Clock, PackagePlus, HandCoins,
} from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import {
  computeBusinessPulse, computeCashForecast,
  computeWorkerDNA, computeProjectHealth, computeTaxRunway,
} from '../lib/insights.js'
import BusinessPulse from '../components/BusinessPulse.jsx'
import CashForecast from '../components/CashForecast.jsx'
import WorkerCard from '../components/WorkerCard.jsx'
import WorkerDNA from '../components/WorkerDNA.jsx'
import ProjectHealth from '../components/ProjectHealth.jsx'
import TaxRunway from '../components/TaxRunway.jsx'

// ════════════════════════════════════════════════════════════════════════════
// منصّة لقطات الدعاية — تُرندر شاشات التطبيق الحقيقية ببيانات نموذجية داخل إطار
// هاتف بنصّ دعائي، بحجم سوشال ميديا 1080×1350. تُفتح عبر ?promo=1..4 (أداة دعاية فقط).
// ════════════════════════════════════════════════════════════════════════════

const months = [
  { month: 'ينا', v: 52000 }, { month: 'فبر', v: 61000 }, { month: 'مار', v: 58000 },
  { month: 'أبر', v: 72000 }, { month: 'ماي', v: 79000 }, { month: 'يون', v: 88000 },
]
const stats = {
  cashOnHand: 84200, netProfit: 126500, totalRevenue: 410000,
  owedToWorkers: 18400, owedByClients: 63000, overdueCount: 2,
  pendingExpenses: 9200, monthlyData: months,
}
const pulse    = computeBusinessPulse(stats)
const forecast = computeCashForecast({ cashOnHand: stats.cashOnHand, totalRevenue: stats.totalRevenue, monthlyData: months })

const worker      = { id: '1', name: 'محمود عبد الله', specialty: 'بنّاء', phone: '0501234567', daily_rate: 450 }
const workerStats = { balance: 4200, days: 22, earned: 9900, paid: 5700, pending: 3 }
const workerDna   = computeWorkerDNA({ name: 'محمود عبد الله', earned: 9900, advances: 1200, avgPerDay: 470, fleetAvgPerDay: 400, approvedDays: 20, pendingDays: 2, rejectedDays: 0, daysPerMonth: [18, 20, 22, 21, 22, 22], tenureMonths: 14 })

const health  = computeProjectHealth({ name: 'فيلا رهط', price: 120000, revenue: 78000, cost: 41000, ownerCash: 25000, profit: 37000, overdue: false })
const runway  = computeTaxRunway({ isOsekPatur: false, cap: 120000, yearIncome: 268000, monthsElapsed: 6, annualTax: 34000 })

// ─── إطار الهاتف ───────────────────────────────────────────────────────────────
function PhoneFrame({ title, sub, children }) {
  return (
    <div style={{ width: 452, background: C.surface, borderRadius: 52, border: `2px solid rgba(249,115,22,0.18)`, overflow: 'hidden', boxShadow: '0 50px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(249,115,22,0.06)' }}>
      {/* Notch */}
      <div style={{ height: 38, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 110, height: 11, background: C.card, borderRadius: 6 }} />
      </div>
      {/* App header */}
      <div style={{ background: C.bg, padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.text }}>{title}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HardHat size={19} color="#fff" strokeWidth={2.5} />
        </div>
      </div>
      {/* Content */}
      <div style={{ background: C.bg, padding: '16px 14px 26px', direction: 'rtl', minHeight: 720 }}>
        {children}
      </div>
    </div>
  )
}

// ─── مقاسات سوشال ميديا ─────────────────────────────────────────────────────────
const FMT = {
  story:  { w: 1080, h: 1920, scale: 1.16, pad: '124px 90px 0', title: 76, sub: 32, badge: 23, gap: 70 },
  post:   { w: 1080, h: 1350, scale: 1.0,  pad: '60px 80px 0',  title: 64, sub: 26, badge: 19, gap: 40 },
  square: { w: 1080, h: 1080, scale: 0.84, pad: '42px 70px 0',  title: 50, sub: 23, badge: 18, gap: 20 },
  wide:   { w: 1200, h: 630,  scale: 0.62, title: 46, sub: 22, badge: 17 },
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 26px rgba(249,115,22,0.45)' }}>
        <HardHat size={28} color="#fff" strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>Contractor Pro</div>
        <div style={{ fontSize: 16, color: C.textDim }}>إدارة مقاولات — للمقاول العربي</div>
      </div>
    </div>
  )
}
function CTA() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: GRAD.brand, borderRadius: 16, padding: '16px 26px', fontSize: 22, fontWeight: 800, color: '#fff', boxShadow: '0 10px 30px rgba(249,115,22,0.45)', whiteSpace: 'nowrap' }}>
      جرّب 14 يوم مجاناً <ArrowLeft size={22} strokeWidth={2.5} />
    </div>
  )
}

// ─── إطار البوست — يتكيّف مع المقاس (عمودي يتكدّس · عريض أفقي) ────────────────────
function Creative({ badge, title, accent, sub, fmt = 'post', children }) {
  const F = FMT[fmt] || FMT.post
  const isWide = fmt === 'wide'

  const orbs = (
    <>
      <div style={{ position: 'absolute', top: -160, insetInlineEnd: -120, width: 720, height: 720, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, insetInlineStart: -160, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
    </>
  )
  const badgeEl = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: `${accent}1a`, border: `1px solid ${accent}45`, borderRadius: 100, padding: '9px 20px', marginBottom: 24, fontSize: F.badge, color: accent, fontWeight: 800 }}>
      <CircleDot size={14} strokeWidth={3} /> {badge}
    </div>
  )
  const titleEl = <h1 style={{ fontSize: F.title, fontWeight: 900, color: C.text, lineHeight: 1.12, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
  const subEl   = <p style={{ fontSize: F.sub, color: C.textDim, lineHeight: 1.5, marginTop: 18, maxWidth: 760 }}>{sub}</p>

  const canvas = { width: F.w, height: F.h, position: 'relative', overflow: 'hidden', background: C.bg, fontFamily: "'Noto Sans Arabic', system-ui, sans-serif", direction: 'rtl' }

  // ── تخطيط عريض (أفقي): نصّ على جهة، هاتف على الجهة الأخرى ──
  if (isWide) {
    return (
      <div style={{ ...canvas, display: 'flex' }}>
        {orbs}
        <div style={{ position: 'relative', width: '44%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ transform: `scale(${F.scale})`, transformOrigin: 'top center', marginTop: 26 }}>{children}</div>
          <div style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 90, background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
        </div>
        <div style={{ position: 'relative', width: '56%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px', textAlign: 'start' }}>
          {badgeEl}
          {titleEl}
          {subEl}
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
            <Brand />
            <CTA />
          </div>
        </div>
      </div>
    )
  }

  // ── تخطيط عمودي (ستوري/بوست/مربّع) ──
  return (
    <div style={{ ...canvas, display: 'flex', flexDirection: 'column' }}>
      {orbs}
      <div style={{ position: 'relative', textAlign: 'center', padding: F.pad }}>
        {badgeEl}
        {titleEl}
        <div style={{ display: 'flex', justifyContent: 'center' }}>{subEl}</div>
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${F.scale})`, transformOrigin: 'top center', marginTop: F.gap }}>{children}</div>
        <div style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 170, background: `linear-gradient(to top, ${C.bg} 12%, transparent)`, pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, padding: '0 70px 46px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand />
        <CTA />
      </div>
    </div>
  )
}

// ─── بوّابة العامل (مركّبة من primitives بنفس لغة التطبيق) ────────────────────────
function PortalContent() {
  const recent = [
    { date: 'الأحد 7/6',    label: 'يوم كامل', amount: '₪450', ok: true  },
    { date: 'السبت 6/6',    label: 'يوم كامل', amount: '₪450', ok: true  },
    { date: 'الخميس 4/6',   label: 'نص يوم',   amount: '₪225', ok: false },
  ]
  return (
    <>
      <PremiumCard color={C.success} radius={18} padding="18px" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.textDim, fontWeight: 700, marginBottom: 6 }}>رصيدك الحالي</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>₪4,200</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: `${C.success}1c`, border: `1px solid ${C.success}3a`, borderRadius: 9, padding: '4px 11px' }}>
          <TrendingUp size={13} color={C.success} strokeWidth={2.5} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.success }}>محدّث اليوم</span>
        </div>
      </PremiumCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 14 }}>
        {[
          { l: 'أيام الشهر', v: '22',     c: C.primary   },
          { l: 'المقبوض',    v: '₪5,700', c: C.cyan      },
          { l: 'معلّق',      v: '3',      c: C.warning    },
        ].map((k, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 13, padding: '13px 8px', textAlign: 'center', border: `1px solid ${k.c}24` }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: k.c, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 5 }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: C.textDim, fontWeight: 800, margin: '4px 2px 9px' }}>آخر أيام العمل</div>
      {recent.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: '12px 13px', marginBottom: 8 }}>
          <IconChip icon={r.ok ? CheckCircle2 : Clock} color={r.ok ? C.success : C.warning} size={36} radius={11} iconSize={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{r.date}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{r.label}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{r.amount}</div>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: GRAD.brand, borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 800, color: '#fff' }}>
          <HandCoins size={18} strokeWidth={2.4} /> اطلب سلفة
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: `${C.cyan}18`, border: `1px solid ${C.cyan}40`, borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 800, color: C.cyan }}>
          <PackagePlus size={18} strokeWidth={2.4} /> سجّل بضاعة
        </div>
      </div>
    </>
  )
}

// ─── الشاشات الأربع ──────────────────────────────────────────────────────────────
function ShotDashboard({ fmt }) {
  return (
    <Creative fmt={fmt} badge="لوحة التحكّم الذكية" accent={C.primary}
      title={<>كل أرقام مصلحتك<br />أمامك بثانية</>}
      sub="نبض المصلحة، التوقّع الذكي للسيولة، وصافي الربح — محسوبة لك تلقائياً.">
      <PhoneFrame title="الرئيسية" sub="نظرة تنفيذية على مصلحتك">
        <BusinessPulse pulse={pulse} />
        <CashForecast forecast={forecast} />
      </PhoneFrame>
    </Creative>
  )
}
function ShotWorkers({ fmt }) {
  return (
    <Creative fmt={fmt} badge="إدارة العمّال" accent={C.secondary}
      title={<>كل عامل، كل يوم،<br />كل سلفة — موثّق</>}
      sub="روستر العمّال، الرواتب والسلف، وبصمة أداء ذكية لكل عامل.">
      <PhoneFrame title="العمّال" sub="الروستر وبصمة الأداء">
        <WorkerCard worker={worker} stats={workerStats} dna={workerDna} portalEnabled lang="ar" />
        <div style={{ marginTop: 12 }}><WorkerDNA dna={workerDna} /></div>
      </PhoneFrame>
    </Creative>
  )
}
function ShotFinance({ fmt }) {
  return (
    <Creative fmt={fmt} badge="المالية والضرائب" accent={C.cyan}
      title={<>الضريبة محسوبة<br />إلك مسبقاً</>}
      sub="ضريبة القيمة المضافة، مدرج الضريبة، وصحّة كل مشروع — بدون حاسبة.">
      <PhoneFrame title="المالية" sub={'الضرائب وصحّة المشاريع'}>
        <TaxRunway runway={runway} />
        <div style={{ marginTop: 12 }}><ProjectHealth health={health} /></div>
      </PhoneFrame>
    </Creative>
  )
}
function ShotPortal({ fmt }) {
  return (
    <Creative fmt={fmt} badge="بوّابة العامل" accent={C.gold}
      title={<>العامل بيشوف<br />حسابه بنفسه</>}
      sub="كشف حساب ذاتي، طلب سلفة، وتسجيل بضاعة — من جيب العامل مباشرة.">
      <PhoneFrame title="بوّابة العامل" sub="محمود عبد الله · بنّاء">
        <PortalContent />
      </PhoneFrame>
    </Creative>
  )
}

export default function PromoShots() {
  const q = new URLSearchParams(window.location.search)
  const n = q.get('promo')
  const fmt = q.get('fmt') || 'post'   // story | post | square | wide
  const map = { '1': ShotDashboard, '2': ShotWorkers, '3': ShotFinance, '4': ShotPortal }
  const Shot = map[n] || ShotDashboard
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <Shot fmt={fmt} />
    </>
  )
}
