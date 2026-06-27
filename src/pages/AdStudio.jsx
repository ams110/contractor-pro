import React, { useEffect, useRef, useState } from 'react'
import {
  Activity, Wallet, Clock, AlertTriangle, TrendingDown, TrendingUp,
  MessageCircle, CheckCircle2, Sparkles, Bell, Search, ScanLine, Receipt,
  Users, Users2, Building2, CalendarDays, Calculator, Percent, Landmark,
  ShieldCheck, Fingerprint, WifiOff, FileSpreadsheet, FileText, Package,
  ClipboardList, HardHat, Radar, Target, Crown, BadgeCheck, Banknote,
  HandCoins, PiggyBank, Smartphone, Camera, Check, ArrowLeft, Star,
  LayoutDashboard, Gauge as GaugeIcon, Layers, Coins, ScrollText,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip, InsightRow, useCountUp } from '../ui/Premium.jsx'
import { fmt } from '../lib/helpers.js'

// ═══════════════════════════════════════════════════════════════════════════
//  AD STUDIO — محرّك بوسترات تسويقية بهوية كبلان
//  30 فكرة × 3 مقاسات. يعيد استخدام kit الفخامة (PremiumCard/IconChip/...) +
//  ألوان C/GRAD، فالموكاب طالع مطابق للتطبيق الحقيقي.
//  المسار: /adstudio?idea=N&size=square|portrait|story
// ═══════════════════════════════════════════════════════════════════════════

const SIZES = {
  square:   { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  story:    { w: 1080, h: 1920 },
}

// نبرة لونية لكل بوستر — لون + تدرّج + توهّج
const TONE = {
  brand:   { c: C.primary,   grad: GRAD.primary, glow: 'rgba(249,115,22,0.45)' },
  success: { c: C.success,   grad: GRAD.success, glow: 'rgba(34,197,94,0.45)'  },
  cyan:    { c: C.cyan,      grad: GRAD.cyan,    glow: 'rgba(6,182,212,0.45)'  },
  premium: { c: C.secondary, grad: GRAD.purple,  glow: 'rgba(124,58,237,0.45)' },
  gold:    { c: C.gold,      grad: GRAD.gold,    glow: 'rgba(217,119,6,0.45)'  },
  danger:  { c: C.accent,    grad: GRAD.danger,  glow: 'rgba(239,68,68,0.45)'  },
}

// ─── الحساب التجريبي الموحّد (أرقام واقعية لمقاول تشطيبات) ─────────────────────
const DEMO = {
  owner:   'أبو محمد',
  biz:     'تشطيبات النجم',
  pulse:   88,
  cash:    142500,
  forecast: 306914,
  workerDue: 38200,
  clientDue: 214000,
  profit:   96400,
  revenue:  412000,
  vat:      18720,
  incomeTax: 23400,
  bituach:  4180,
  projects: 7,
  workers:  14,
}

// ═══════════════════════════════════════════════════════════════════════════
//  العدّاد الدائري — منسوخ من BusinessPulse ليطابق نبض المصلحة بالضبط
// ═══════════════════════════════════════════════════════════════════════════
function Gauge({ score = 88, color = C.success, grade = 'ممتاز', start, size = 168 }) {
  const R = 64, SW = 12, CX = size / 2
  const display = useCountUp(score, 1300, start)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <motion.div aria-hidden
        animate={start ? { scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: `radial-gradient(circle, ${color}73 0%, transparent 65%)` }} />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ad-gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.65} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        <motion.circle cx={CX} cy={CX} r={R} fill="none" stroke="url(#ad-gauge)" strokeWidth={SW}
          strokeLinecap="round" pathLength={100} strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: start ? 100 - score : 100 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}73)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, direction: 'ltr' }}>
          <span style={{ fontSize: 46, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
        <span style={{ padding: '3px 13px', borderRadius: 20, background: `${color}24`, border: `1px solid ${color}55`, fontSize: 11, fontWeight: 800, color }}>{grade}</span>
      </div>
    </div>
  )
}

function FactorBar({ label, score, delay, start }) {
  const color = score >= 70 ? C.success : score >= 50 ? C.warning : C.accent
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: start ? `${score}%` : 0 }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  )
}

// مبلغ بالشيكل بعدّاد تصاعدي
function MoneyCount({ v, color = C.text, size = 30, start }) {
  const display = useCountUp(Math.abs(v), 1300, start)
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', display: 'inline-block' }}>
      {v < 0 ? '−' : ''}₪{fmt(display)}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  بلوكات الشاشة داخل الموبايل
// ═══════════════════════════════════════════════════════════════════════════
function AppHeader({ title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>أم</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: C.textDim, fontWeight: 600 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={16} color={C.textDim} /></div>
        <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={16} color={C.textDim} />
          <span style={{ position: 'absolute', top: 7, insetInlineEnd: 8, width: 7, height: 7, borderRadius: 99, background: C.accent }} />
        </div>
      </div>
    </div>
  )
}

function HeroMoney({ icon, label, value, sub, tone, start, prefixGrad }) {
  const t = TONE[tone] || TONE.brand
  return (
    <PremiumCard tone={{ main: t.c, soft: `${t.c}24`, glow: t.glow }} radius={20} padding="16px" animate={false} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <IconChip icon={icon} color={t.c} size={30} radius={10} iconSize={16} />
        <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{label}</div>
      </div>
      <MoneyCount v={value} color={C.text} size={38} start={start} />
      {sub && <div style={{ fontSize: 11.5, color: t.c, fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={13} />{sub}</div>}
    </PremiumCard>
  )
}

function MiniStat({ icon, label, value, tone, money, start }) {
  const t = TONE[tone] || TONE.brand
  return (
    <PremiumCard tone={{ main: t.c, soft: `${t.c}24`, glow: t.glow }} radius={16} padding="13px" animate={false} glow={false} style={{ flex: 1 }}>
      <IconChip icon={icon} color={t.c} size={28} radius={9} iconSize={15} style={{ marginBottom: 9 }} />
      {money
        ? <MoneyCount v={value} size={19} start={start} />
        : <div style={{ fontSize: 19, fontWeight: 900, color: C.text }}>{value}</div>}
      <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginTop: 4 }}>{label}</div>
    </PremiumCard>
  )
}

function ListRow({ icon, name, meta, amount, tone, money = true, badge }) {
  const t = TONE[tone] || TONE.brand
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: `${t.c}1c`, border: `1px solid ${t.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.createElement(icon, { size: 17, color: t.c, strokeWidth: 2.3 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{name}</div>
        {meta && <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginTop: 2 }}>{meta}</div>}
      </div>
      {badge
        ? <span style={{ fontSize: 10, fontWeight: 800, color: t.c, background: `${t.c}1c`, border: `1px solid ${t.c}33`, padding: '4px 9px', borderRadius: 9 }}>{badge}</span>
        : <span style={{ fontSize: 13, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{money ? `₪${fmt(amount)}` : amount}</span>}
    </div>
  )
}

function AgingBars({ start }) {
  const buckets = [
    { label: 'الآن', v: 120000, c: C.success, p: 56 },
    { label: '30 يوم', v: 64000, c: C.warning, p: 30 },
    { label: '60 يوم', v: 22000, c: C.primary, p: 10 },
    { label: '90+ يوم', v: 8000, c: C.accent, p: 4 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {buckets.map((b, i) => (
        <div key={b.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textDim }}>{b.label}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: b.c, direction: 'ltr' }}>₪{fmt(b.v)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: start ? `${b.p}%` : 0 }} transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99, background: b.c, boxShadow: `0 0 8px ${b.c}66` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TaxBreak({ start }) {
  const rows = [
    { icon: Percent, label: 'מע"מ مستحق (18%)', v: DEMO.vat, c: C.primary },
    { icon: Landmark, label: 'ضريبة دخل متوقّعة', v: DEMO.incomeTax, c: C.secondary },
    { icon: ShieldCheck, label: 'ביטוח לאומי (شريحتين)', v: DEMO.bituach, c: C.cyan },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px', background: C.card, border: `1px solid ${r.c}26`, borderRadius: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${r.c}1c`, border: `1px solid ${r.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <r.icon size={16} color={r.c} />
          </div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text }}>{r.label}</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: C.text, direction: 'ltr' }}>₪{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  )
}

function ReceiptScan() {
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.primary}33`, background: C.card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <IconChip icon={ScanLine} color={C.primary} size={28} radius={9} iconSize={15} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>مسح الإيصال الذكي</span>
      </div>
      <div style={{ position: 'relative', height: 130, borderRadius: 12, background: 'linear-gradient(180deg,#1a1d33,#0d0f1c)', border: `1px dashed ${C.primary}44`, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ position: 'absolute', inset: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[80, 60, 90, 50, 70].map((w, i) => <div key={i} style={{ height: 7, width: `${w}%`, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />)}
        </div>
        <motion.div animate={{ top: ['8%', '88%', '8%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', insetInline: 0, height: 3, background: C.primary, boxShadow: `0 0 14px 3px ${C.primary}` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[['المبلغ', '₪1,240'], ['المورّد', 'مخزن البناء'], ['الفئة', 'مواد بناء']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.textDim, fontWeight: 600 }}>{k}</span>
            <span style={{ color: C.success, fontWeight: 800, direction: 'ltr', display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle2 size={13} />{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureGrid() {
  const items = [
    { icon: Building2, label: 'مشاريع', c: C.primary },
    { icon: Users, label: 'عمّال', c: C.cyan },
    { icon: Wallet, label: 'مالية', c: C.success },
    { icon: Calculator, label: 'ضرائب', c: C.secondary },
    { icon: Receipt, label: 'مصاريف', c: C.gold },
    { icon: HandCoins, label: 'رواتب', c: C.primary },
    { icon: Smartphone, label: 'بوّابة عامل', c: C.cyan },
    { icon: FileSpreadsheet, label: 'تقارير', c: C.success },
    { icon: ShieldCheck, label: 'أمان', c: C.secondary },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
      {items.map((it) => (
        <div key={it.label} style={{ background: C.card, border: `1px solid ${it.c}26`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${it.c}1c`, border: `1px solid ${it.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <it.icon size={18} color={it.c} strokeWidth={2.3} />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.text }}>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function WaBubble() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#075E54', borderRadius: '14px 14px 14px 4px', padding: '11px 13px' }}>
        <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, lineHeight: 1.6 }}>صباح الخير محمد، تم تحويل راتبك</div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 900, marginTop: 4, direction: 'ltr' }}>₪6,400</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>عن 24 يوم عمل · شهر 5</div>
      </div>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px 14px 14px 4px', padding: '11px 13px' }}>
        <div style={{ fontSize: 12, color: C.text, fontWeight: 600, lineHeight: 1.6 }}>تذكير: دفعة مستحقة لمشروع فيلا الياسمين</div>
      </div>
    </div>
  )
}

function BizSwitcher() {
  const list = [
    { name: 'تشطيبات النجم', type: 'עוסק מורשה', active: true, c: C.primary },
    { name: 'ورشة الألمنيوم', type: 'עוסק פטור', active: false, c: C.cyan },
    { name: 'النجم للمقاولات בע"מ', type: 'חברה', active: false, c: C.secondary },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {list.map((b) => (
        <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 12px', background: b.active ? `${b.c}14` : C.card, border: `1px solid ${b.active ? b.c + '55' : C.border}`, borderRadius: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${b.c}1c`, border: `1px solid ${b.c}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} color={b.c} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{b.name}</div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginTop: 2, direction: 'ltr', textAlign: 'right' }}>{b.type}</div>
          </div>
          {b.active && <CheckCircle2 size={19} color={b.c} />}
        </div>
      ))}
    </div>
  )
}

function ConfirmBadge({ icon, title, sub, tone }) {
  const t = TONE[tone] || TONE.success
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 14, textAlign: 'center' }}>
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ width: 86, height: 86, borderRadius: '50%', background: `${t.c}1c`, border: `2px solid ${t.c}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${t.glow}` }}>
        {React.createElement(icon, { size: 42, color: t.c, strokeWidth: 2.2 })}
      </motion.div>
      <div style={{ fontSize: 17, fontWeight: 900, color: C.text }}>{title}</div>
      <div style={{ fontSize: 12.5, color: C.textDim, fontWeight: 600, lineHeight: 1.6 }}>{sub}</div>
    </div>
  )
}

// مُوزّع البلوكات
function Block({ b, start }) {
  switch (b.type) {
    case 'header':      return <AppHeader title={b.title} sub={b.sub} />
    case 'gauge':       return (
      <PremiumCard tone={{ main: C.success, soft: `${C.success}24`, glow: TONE.success.glow }} radius={22} padding="16px" animate={false} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <IconChip icon={Activity} color={C.success} size={30} radius={10} iconSize={16} pulse />
          <div><div style={{ fontSize: 13.5, fontWeight: 900, color: C.text }}>نبض المصلحة</div><div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لصحّة مصلحتك</div></div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Gauge start={start} />
          <div style={{ flex: 1 }}>
            {[['سيولة', 92], ['ربحية', 86], ['تحصيل', 78], ['نمو', 90]].map(([l, s], i) =>
              <FactorBar key={l} label={l} score={s} delay={0.3 + i * 0.1} start={start} />)}
          </div>
        </div>
      </PremiumCard>
    )
    case 'heroMoney':   return <HeroMoney {...b} start={start} />
    case 'statRow':     return <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>{b.stats.map((s, i) => <MiniStat key={i} {...s} start={start} />)}</div>
    case 'insights':    return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>{b.rows.map((r, i) => <InsightRow key={i} icon={r.icon} color={r.color} text={r.text} inView delay={0} />)}</div>
    case 'list':        return <div>{b.items.map((it, i) => <ListRow key={i} {...it} />)}</div>
    case 'aging':       return <div style={{ marginTop: 4 }}><AgingBars start={start} /></div>
    case 'tax':         return <TaxBreak start={start} />
    case 'receipt':     return <ReceiptScan />
    case 'grid':        return <FeatureGrid />
    case 'wa':          return <WaBubble />
    case 'biz':         return <BizSwitcher />
    case 'confirm':     return <ConfirmBadge {...b} />
    case 'sectionTitle':return <div style={{ fontSize: 12.5, fontWeight: 900, color: C.text, margin: '4px 2px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>{b.icon && <b.icon size={16} color={b.color || C.primary} />}{b.text}</div>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  الموبايل (إطار + شاشة)
// ═══════════════════════════════════════════════════════════════════════════
function Phone({ screen = 'dashboard', focus, scale = 1, lang }) {
  const SCREEN_H = 668, BAR_H = 30
  const src = `/demoshot?screen=${screen}${focus ? `&focus=${encodeURIComponent(focus)}` : ''}${lang ? `&lang=${lang}` : ''}`
  return (
    <div style={{ width: 372, transform: `scale(${scale})`, transformOrigin: 'top center', filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.6))' }}>
      <div style={{ position: 'relative', borderRadius: 46, padding: 11, background: 'linear-gradient(160deg,#23262f,#0a0b12)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ position: 'relative', borderRadius: 36, overflow: 'hidden', background: C.bg, height: SCREEN_H }}>
          {/* notch */}
          <div style={{ position: 'absolute', top: 0, insetInline: 0, display: 'flex', justifyContent: 'center', zIndex: 5 }}>
            <div style={{ width: 120, height: 26, background: '#000', borderRadius: '0 0 16px 16px' }} />
          </div>
          {/* status bar */}
          <div style={{ position: 'relative', zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: BAR_H, padding: '11px 22px 0', fontSize: 12, color: C.text, fontWeight: 700, background: C.bg }}>
            <span style={{ direction: 'ltr' }}>9:41</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center', opacity: 0.85 }}>
              <span style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>{[5, 8, 11, 14].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 1, background: C.text }} />)}</span>
              <span style={{ width: 16, height: 9, border: `1.4px solid ${C.text}`, borderRadius: 3, position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', inset: 1.4, width: '70%', background: C.success, borderRadius: 1 }} /></span>
            </span>
          </div>
          {/* الشاشة الحقيقية عبر iframe */}
          <iframe title={screen} src={src} scrolling="no"
            style={{ display: 'block', width: 350, height: SCREEN_H - BAR_H, border: 0, background: C.bg }} />
          {/* تلاشي سفلي — يوحي بقابلية السكرول مثل التطبيق */}
          <div aria-hidden style={{ position: 'absolute', insetInline: 0, bottom: 0, height: 80, background: `linear-gradient(to top, ${C.bg}, transparent)`, pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  الـ 30 فكرة
// ═══════════════════════════════════════════════════════════════════════════
const IDEAS = [
  { tag: 'لوحة التحكم الذكية', tone: 'success', kw: 'كل أرقام مصلحتك', head: 'أمامك بثانية', sub: 'نبض المصلحة، التوقّع الذكي للسيولة، وصافي الربح — محسوبة لك تلقائياً.',
    blocks: [{ type: 'header', title: 'مساء الخير، أبو محمد', sub: 'تشطيبات النجم' }, { type: 'gauge' }, { type: 'heroMoney', icon: Wallet, label: 'التوقّع الذكي للسيولة', value: DEMO.forecast, tone: 'success', sub: '+18% هذا الشهر' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'وضعك المالي ممتاز هذا الشهر' }, { icon: TrendingUp, color: C.cyan, text: 'صافي الربح ارتفع 23% عن الشهر الماضي' }] }] },

  { tag: 'التوقّع الذكي', tone: 'cyan', kw: 'شوف سيولتك', head: 'قبل ما تصير', sub: 'مسار نقدي ذكي يتنبّأ بحالة خزينتك للأسابيع الجاية مع نطاق ثقة وعدّاد أمان.',
    blocks: [{ type: 'header', title: 'التوقّع الذكي للسيولة' }, { type: 'heroMoney', icon: TrendingUp, label: 'رصيد متوقّع خلال 30 يوم', value: DEMO.forecast, tone: 'cyan', sub: 'مدى أمان: 94 يوم' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'سيولتك ممتازة — تكفي 3 أشهر قدّام' }, { icon: AlertTriangle, color: C.cyan, text: 'دفعتان كبيرتان مستحقّتان الأسبوع الجاي' }] }] },

  { tag: 'كاش بجيبك', tone: 'success', kw: 'اعرف كم معك', head: 'هلّق بالضبط', sub: 'كل الكاش الفعلي بين إيدك — بعد كل المصاريف والسلف والرواتب.',
    blocks: [{ type: 'header', title: 'النقد المتوفّر' }, { type: 'heroMoney', icon: Banknote, label: 'نقد بالجيب', value: DEMO.cash, tone: 'success', sub: 'محدّث لحظياً' }, { type: 'statRow', stats: [{ icon: Building2, label: 'مشاريع نشطة', value: DEMO.projects, tone: 'brand' }, { icon: Users, label: 'عمّال', value: DEMO.workers, tone: 'cyan' }] }] },

  { tag: 'مستحقّات العمّال', tone: 'brand', kw: 'ما تنسى', head: 'ولا شيكل لعمّالك', sub: 'النظام بيحسب مستحق كل عامل من أيام عمله ناقص سلفه ودفعاته — تلقائياً.',
    blocks: [{ type: 'header', title: 'مستحقّات العمّال' }, { type: 'heroMoney', icon: HandCoins, label: 'إجمالي مستحق للعمّال', value: DEMO.workerDue, tone: 'brand' }, { type: 'list', items: [{ icon: HardHat, name: 'محمد العبد', meta: '24 يوم · شهر 5', amount: 6400, tone: 'brand' }, { icon: HardHat, name: 'سامر خليل', meta: '19 يوم · شهر 5', amount: 5100, tone: 'cyan' }, { icon: HardHat, name: 'أحمد ياسين', meta: '22 يوم · شهر 5', amount: 5900, tone: 'success' }] }] },

  { tag: 'رادار التحصيل', tone: 'gold', kw: 'حصّل فلوسك', head: 'قبل ما تتأخّر', sub: 'تقادم الذمم المدينة حسب العمر — تعرف مين متأخّر وكم لك عند كل عميل.',
    blocks: [{ type: 'header', title: 'رادار التحصيل' }, { type: 'heroMoney', icon: Radar, label: 'إجمالي مستحق من العملاء', value: DEMO.clientDue, tone: 'gold' }, { type: 'aging' }] },

  { tag: 'ربحية المشاريع', tone: 'success', kw: 'أي مشروع', head: 'بيربّحك فعلاً؟', sub: 'P&L مجمّع لكل مشروع: إيراد، مصاريف، عمالة، ربح، وهامش — بضغطة.',
    blocks: [{ type: 'header', title: 'ربحية المشاريع' }, { type: 'heroMoney', icon: TrendingUp, label: 'صافي ربح هذا الشهر', value: DEMO.profit, tone: 'success', sub: 'هامش 23%' }, { type: 'list', items: [{ icon: Building2, name: 'فيلا الياسمين', meta: 'هامش 31%', amount: 42000, tone: 'success' }, { icon: Building2, name: 'عمارة الورد', meta: 'هامش 19%', amount: 28400, tone: 'gold' }, { icon: Building2, name: 'محل النور', meta: 'هامش 12%', amount: 9800, tone: 'brand' }] }] },

  { tag: 'מע"מ تلقائي', tone: 'premium', kw: 'الضريبة', head: 'محسوبة لحالها', sub: 'מע"מ 18% على المدخولات وخصم ذكي على المصاريف حسب الفئة — بلا محاسب.',
    blocks: [{ type: 'header', title: 'ملخّص الضرائب' }, { type: 'heroMoney', icon: Percent, label: 'מע"מ مستحق للدفع', value: DEMO.vat, tone: 'premium' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'خصم מע"מ على المواد بنسبة 100%' }, { icon: Sparkles, color: C.cyan, text: 'وقود وصيانة: خصم 66.7% تلقائي' }] }] },

  { tag: 'كل الضرائب', tone: 'premium', kw: 'מע"מ + دخل', head: '+ ביטוח לאומי', sub: 'كل التزاماتك الضريبية الإسرائيلية محسوبة بدقّة — بشريحتين، مش نسبة مسطّحة.',
    blocks: [{ type: 'header', title: 'مدرج الضريبة' }, { type: 'sectionTitle', text: 'التزاماتك القادمة', icon: Calculator, color: C.secondary }, { type: 'tax' }] },

  { tag: 'ضريبة الدخل', tone: 'cyan', kw: 'اعرف ضريبتك', head: 'قبل التقرير', sub: 'شرائح ضريبة الدخل الإسرائيلية التصاعدية محسوبة على أرباحك الحقيقية.',
    blocks: [{ type: 'header', title: 'ضريبة الدخل المتوقّعة' }, { type: 'heroMoney', icon: Landmark, label: 'ضريبة دخل متوقّعة (السنة)', value: DEMO.incomeTax, tone: 'cyan' }, { type: 'insights', rows: [{ icon: TrendingUp, color: C.cyan, text: 'محسوبة على شرائح تصاعدية فعلية' }, { icon: CheckCircle2, color: C.success, text: 'تتحدّث مع كل مدخول جديد' }] }] },

  { tag: 'مدرج الضريبة', tone: 'gold', kw: 'متى تستحقّ', head: 'وكم بالضبط', sub: 'النظام بيقلّك متى يستحقّ كل التزام ضريبي وكم لازم تجهّز — بلا مفاجآت.',
    blocks: [{ type: 'header', title: 'مدرج الضريبة' }, { type: 'heroMoney', icon: Calculator, label: 'إجمالي مستحقّات ضريبية', value: DEMO.vat + DEMO.incomeTax + DEMO.bituach, tone: 'gold', sub: 'استحقاق خلال 21 يوم' }, { type: 'tax' }] },

  { tag: 'مسح الإيصال OCR', tone: 'brand', kw: 'صوّر الإيصال', head: 'وخلص', sub: 'صوّر أي فاتورة والذكاء الاصطناعي يستخرج المبلغ والمورّد والتاريخ والفئة فوراً.',
    blocks: [{ type: 'header', title: 'مصروف جديد' }, { type: 'receipt' }] },

  { tag: 'بوّابة العامل', tone: 'cyan', kw: 'كل عامل', head: 'يشوف حسابه بنفسه', sub: 'بوّابة ذاتية لكل عامل: كشف حساب، طلب سلفة، تسجيل بضاعة — بلا ما يزعجك.',
    blocks: [{ type: 'header', title: 'بوّابة العامل' }, { type: 'heroMoney', icon: Smartphone, label: 'رصيدك المستحق', value: 6400, tone: 'cyan', sub: 'محدّث لحظياً' }, { type: 'list', items: [{ icon: CalendarDays, name: 'أيام العمل', meta: 'هذا الشهر', amount: '24 يوم', money: false, tone: 'cyan' }, { icon: HandCoins, name: 'طلب سلفة', meta: 'بضغطة واحدة', badge: 'متاح', tone: 'success' }] }] },

  { tag: 'أيام العمل', tone: 'brand', kw: 'سجّل الورشة كلها', head: 'بنقرة وحدة', sub: 'تسجيل جماعي لكل العمّال، أنواع يوم، عطل، ومعاينة راتب فورية.',
    blocks: [{ type: 'header', title: 'أيام العمل' }, { type: 'sectionTitle', text: 'حضور اليوم — 12 عامل', icon: CalendarDays }, { type: 'list', items: [{ icon: CheckCircle2, name: 'محمد العبد', meta: 'يوم كامل', badge: 'حاضر', tone: 'success' }, { icon: CheckCircle2, name: 'سامر خليل', meta: 'يوم كامل', badge: 'حاضر', tone: 'success' }, { icon: Clock, name: 'أحمد ياسين', meta: 'نص يوم', badge: 'جزئي', tone: 'gold' }] }] },

  { tag: 'الرواتب', tone: 'success', kw: 'وزّع الرواتب', head: 'بطابور موافقات', sub: 'احسب، راجع، ووافق على الرواتب بأمان — مع تأكيد بصمة وإشعار واتساب.',
    blocks: [{ type: 'header', title: 'الرواتب' }, { type: 'heroMoney', icon: HandCoins, label: 'إجمالي رواتب الشهر', value: 68400, tone: 'success' }, { type: 'list', items: [{ icon: HardHat, name: 'محمد العبد', meta: 'بانتظار موافقتك', amount: 6400, tone: 'gold' }, { icon: BadgeCheck, name: 'سامر خليل', meta: 'تمّ الدفع', amount: 5100, tone: 'success' }] }] },

  { tag: 'سلف العمّال', tone: 'gold', kw: 'كل سلفة', head: 'محسوبة تلقائياً', sub: 'النظام يخصم السلف من المستحق ويبقّيك عارف رصيد كل عامل بدقّة.',
    blocks: [{ type: 'header', title: 'سلف العمّال' }, { type: 'heroMoney', icon: Coins, label: 'إجمالي السلف القائمة', value: 12300, tone: 'gold' }, { type: 'list', items: [{ icon: HardHat, name: 'أحمد ياسين', meta: 'سلفة شهر 5', amount: 1500, tone: 'gold' }, { icon: HardHat, name: 'خالد عمر', meta: 'سلفة شهر 5', amount: 2000, tone: 'brand' }] }] },

  { tag: 'بصمة العامل', tone: 'cyan', kw: 'اعرف عمّالك', head: 'مثل ما لازم', sub: 'تحليل ذكي لكل عامل: حضور، أداء، رادار، وخطّ زمني كامل.',
    blocks: [{ type: 'header', title: 'بصمة العامل — محمد' }, { type: 'statRow', stats: [{ icon: CalendarDays, label: 'أيام/شهر', value: 24, tone: 'cyan' }, { icon: Star, label: 'التقييم', value: 'A+', tone: 'success' }, { icon: TrendingUp, label: 'انتظام', value: '96%', tone: 'brand' }] }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'أعلى انتظام بين كل العمّال' }, { icon: Sparkles, color: C.cyan, text: 'إنتاجيّته ارتفعت 12% هالشهر' }] }] },

  { tag: 'الذمّة الصافية', tone: 'premium', kw: 'كم تساوي', head: 'مصلحتك فعلاً', sub: 'شلال ميزانية كامل: نقد + ذمم − التزامات = صافي ثروتك الحقيقي.',
    blocks: [{ type: 'header', title: 'الذمّة الصافية' }, { type: 'heroMoney', icon: PiggyBank, label: 'صافي الذمّة', value: 421000, tone: 'premium', sub: 'تغطية 3.2×' }, { type: 'list', items: [{ icon: Banknote, name: 'نقد', amount: 142500, tone: 'success' }, { icon: Radar, name: 'ذمم مدينة', amount: 214000, tone: 'cyan' }, { icon: TrendingDown, name: 'التزامات', amount: -38200, tone: 'danger' }] }] },

  { tag: 'مركز القيادة', tone: 'brand', kw: 'كل مصلحتك', head: 'بشاشة وحدة', sub: 'مركز ذكي يجمع كل الإشارات من كل المحرّكات في موجز موحّد تشوفه بلمحة.',
    blocks: [{ type: 'header', title: 'مركز القيادة' }, { type: 'statRow', stats: [{ icon: Wallet, label: 'سيولة', value: DEMO.cash, money: true, tone: 'success' }, { icon: TrendingUp, label: 'ربح', value: DEMO.profit, money: true, tone: 'brand' }] }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'الوضع المالي ممتاز هذا الشهر' }, { icon: AlertTriangle, color: C.warning, text: 'مشروع محل النور: هامش منخفض' }, { icon: MessageCircle, color: C.cyan, text: '3 دفعات بانتظار التحصيل' }] }] },

  { tag: 'صحّة المشروع', tone: 'success', kw: 'كل مشروع', head: 'تحت السيطرة', sub: 'تكلفة، هامش، تحصيل، وجدول — مؤشّر صحّة لكل مشروع يحذّرك مبكراً.',
    blocks: [{ type: 'header', title: 'فيلا الياسمين' }, { type: 'statRow', stats: [{ icon: TrendingUp, label: 'الهامش', value: '31%', tone: 'success' }, { icon: Wallet, label: 'محصّل', value: '78%', tone: 'cyan' }, { icon: Target, label: 'الجدول', value: '92%', tone: 'brand' }] }, { type: 'heroMoney', icon: Building2, label: 'صافي ربح المشروع', value: 42000, tone: 'success' }] },

  { tag: 'كشف الشذوذ', tone: 'danger', kw: 'أي مصروف', head: 'غريب؟ بننبّهك', sub: 'كشف ذكي لقفزات المصاريف والتكرار غير المعتاد — قبل ما يكبر.',
    blocks: [{ type: 'header', title: 'رادار المصاريف' }, { type: 'insights', rows: [{ icon: AlertTriangle, color: C.accent, text: 'وقود هذا الشهر أعلى 40% من المعتاد' }, { icon: TrendingUp, color: C.warning, text: 'تكرار مصروف "أدوات" 3 مرات بأسبوع' }, { icon: CheckCircle2, color: C.success, text: 'باقي الفئات ضمن الطبيعي' }] }, { type: 'statRow', stats: [{ icon: Receipt, label: 'مصاريف الشهر', value: 84200, money: true, tone: 'danger' }] }] },

  { tag: 'فريق بصلاحيات', tone: 'premium', kw: 'فريقك', head: 'كلٌّ يشوف حصّته', sub: 'أضف أعضاء بصلاحيات دقيقة، قيّدهم بمشاريع، واحظر/فعّل بضغطة.',
    blocks: [{ type: 'header', title: 'إدارة الفريق' }, { type: 'list', items: [{ icon: Users2, name: 'سامي — مدير', meta: 'كل الصلاحيات', badge: 'فعّال', tone: 'success' }, { icon: Users2, name: 'ليلى — محاسبة', meta: 'المالية فقط', badge: 'مقيّد', tone: 'cyan' }, { icon: Users2, name: 'رامي — مشرف', meta: 'مشروعان', badge: 'مقيّد', tone: 'premium' }] }] },

  { tag: 'تسجيل البضاعة', tone: 'gold', kw: 'كل قطعة', head: 'تدخل الورشة موثّقة', sub: 'العامل يسجّل البضاعة من البوّابة، وأنت تشوفها فوراً بلا أوراق.',
    blocks: [{ type: 'header', title: 'البضاعة' }, { type: 'list', items: [{ icon: Package, name: 'حديد تسليح', meta: 'سجّلها: محمد · اليوم', amount: '2 طن', money: false, tone: 'gold' }, { icon: Package, name: 'أكياس إسمنت', meta: 'سجّلها: سامر · أمس', amount: '40 كيس', money: false, tone: 'brand' }, { icon: Package, name: 'بلاط بورسلان', meta: 'سجّلها: أحمد', amount: '120 م²', money: false, tone: 'cyan' }] }] },

  { tag: 'تتبّع الوحدات', tone: 'cyan', kw: 'كل طابق وكل مهمّة', head: 'تحت عينك', sub: 'تتبّع إنشائي هرمي: قطع ← بيوت ← طوابق ← مهام، مع موافقة الإضافات.',
    blocks: [{ type: 'header', title: 'تتبّع الوحدات' }, { type: 'list', items: [{ icon: Layers, name: 'عمارة A — طابق 3', meta: '8 مهام', badge: '75%', tone: 'cyan' }, { icon: Layers, name: 'عمارة A — طابق 2', meta: '10 مهام', badge: '100%', tone: 'success' }, { icon: ClipboardList, name: 'إضافة: تمديد كهرباء', meta: 'بانتظار موافقتك', badge: 'جديد', tone: 'gold' }] }] },

  { tag: 'تقارير احترافية', tone: 'success', kw: 'تقاريرك', head: 'PDF و Excel بضغطة', sub: 'صدّر مصاريف، أيام، رواتب، تقرير مشروع كامل، وعقود عمل — جاهزة للطباعة.',
    blocks: [{ type: 'header', title: 'التقارير' }, { type: 'list', items: [{ icon: FileSpreadsheet, name: 'تقرير مالي شامل', meta: 'Excel', badge: 'تصدير', tone: 'success' }, { icon: FileText, name: 'عقد عمل عامل', meta: 'PDF', badge: 'تصدير', tone: 'cyan' }, { icon: FileText, name: 'تقرير مشروع', meta: 'PDF', badge: 'تصدير', tone: 'brand' }] }] },

  { tag: 'تذكير واتساب', tone: 'success', kw: 'بلّغ عمّالك', head: 'وعملاءك تلقائياً', sub: 'رواتب مدفوعة، كشوف حساب، وتذكير دفعات — رسائل واتساب جاهزة بضغطة.',
    blocks: [{ type: 'header', title: 'تذكير واتساب' }, { type: 'sectionTitle', text: 'رسائل جاهزة للإرسال', icon: MessageCircle, color: C.success }, { type: 'wa' }] },

  { tag: 'أمان بمستوى البنوك', tone: 'premium', kw: 'كل عملية حسّاسة', head: 'محميّة ببصمتك', sub: 'تأكيد بصمة/PIN للحذف والدفعات الكبيرة، قفل جلسة، وسجلّ تواقيع كامل.',
    blocks: [{ type: 'header', title: 'الأمان' }, { type: 'confirm', icon: Fingerprint, title: 'أكّد بصمتك', sub: 'دفعة بقيمة ₪6,400 لمحمد العبد\nتتطلّب تأكيد هويّتك', tone: 'premium' }] },

  { tag: 'يشتغل بلا نت', tone: 'cyan', kw: 'حتى بالورشة', head: 'بلا إنترنت', sub: 'تطبيق PWA كامل يخزّن بياناتك ويزامنها أوّل ما يرجع النت — ما يوقفك شي.',
    blocks: [{ type: 'header', title: 'وضع عدم الاتصال' }, { type: 'confirm', icon: WifiOff, title: 'تعمل بلا اتصال', sub: 'كل تسجيلاتك محفوظة محلياً\nوتتزامن تلقائياً عند عودة الشبكة', tone: 'cyan' }] },

  { tag: 'متعدّد المصالح', tone: 'brand', kw: 'كل مصالحك', head: 'بتطبيق واحد', sub: 'עוסק פטור ، עוסק מורשה ، و חברה — بدّل بين مصالحك وكلٌّ بضرائبه الخاصّة.',
    blocks: [{ type: 'header', title: 'مصالحي' }, { type: 'sectionTitle', text: 'بدّل المصلحة النشطة', icon: Building2 }, { type: 'biz' }] },

  { tag: 'جاهزية الحساب', tone: 'gold', kw: 'حسابك', head: 'جاهز 100%', sub: 'مؤشّر ذكي يرشدك لإكمال إعداد مصلحتك خطوة بخطوة حتى تستفيد من كل ميزة.',
    blocks: [{ type: 'header', title: 'جاهزية الحساب' }, { type: 'statRow', stats: [{ icon: BadgeCheck, label: 'اكتمال الإعداد', value: '86%', tone: 'gold' }, { icon: ClipboardList, label: 'خطوات باقية', value: 2, tone: 'cyan' }] }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'أضفت مشاريعك وعمّالك' }, { icon: AlertTriangle, color: C.gold, text: 'أكمل بيانات الضرائب لتفعيل التقارير' }] }] },

  { tag: 'كل شي بمكان واحد', tone: 'brand', kw: 'مقاولتك كلها', head: 'بجيبك', sub: 'مشاريع، عمّال، مالية، ضرائب، فريق، وبوّابة عامل — تطبيق واحد يدير كل شي.',
    blocks: [{ type: 'header', title: 'كبلان' }, { type: 'grid' }] },

  { tag: 'بطّل دفتر الورق', tone: 'brand', kw: 'انسى الدفتر', head: 'كل شي صار رقمي', sub: 'لا أوراق ضايعة ولا حسابات بالراس — كل عامل ومشروع ومصروف محفوظ ومرتّب.',
    blocks: [{ type: 'header', title: 'كل مصلحتك' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'ودّع دفتر الورق والحسابات اليدوية' }, { icon: Sparkles, color: C.cyan, text: 'كل أرقامك محفوظة ومتزامنة لحظياً' }] }, { type: 'statRow', stats: [{ icon: Building2, label: 'مشاريع', value: DEMO.projects, tone: 'brand' }, { icon: Users, label: 'عمّال', value: DEMO.workers, tone: 'cyan' }] }] },

  { tag: 'وفّر على المحاسب', tone: 'premium', kw: 'محاسبك', head: 'صار بجيبك', sub: 'מע"מ ، ضريبة دخل، و ביטוח לאומי محسوبين تلقائياً — وفّر آلاف الشواكل سنوياً.',
    blocks: [{ type: 'header', title: 'ملخّص الضرائب' }, { type: 'heroMoney', icon: Calculator, label: 'كل ضرائبك — محسوبة تلقائياً', value: DEMO.vat + DEMO.incomeTax + DEMO.bituach, tone: 'premium', sub: 'بلا محاسب' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'بشريحتين دقيقة — مش نسبة مسطّحة' }, { icon: PiggyBank, color: C.cyan, text: 'وفّر آلاف الشواكل أتعاب محاسبة' }] }] },

  { tag: 'نام وانت مرتاح', tone: 'success', kw: 'أرقامك مظبوطة', head: 'وانت نايم', sub: 'مؤشّر صحّة مالية يراقب مصلحتك على مدار الساعة ويحذّرك قبل أي مشكلة.',
    blocks: [{ type: 'header', title: 'نبض المصلحة' }, { type: 'gauge' }, { type: 'insights', rows: [{ icon: CheckCircle2, color: C.success, text: 'وضعك المالي تحت السيطرة الكاملة' }, { icon: ShieldCheck, color: C.cyan, text: 'تنبيهات ذكية قبل أي خطر' }] }] },

  { tag: 'ولا فاتورة تضيع', tone: 'cyan', kw: 'كل إيصال', head: 'محفوظ ومصنّف', sub: 'صوّر الفاتورة والذكاء الاصطناعي يقرأها ويصنّفها ويأرشفها — جاهزة وقت التقرير.',
    blocks: [{ type: 'header', title: 'مصروف جديد' }, { type: 'receipt' }] },

  { tag: 'ربحك الحقيقي', tone: 'success', kw: 'مش المدخول', head: 'ربحك الصافي', sub: 'الفرق بين المدخول والربح كبير — النظام يحسب صافي ربحك بعد كل تكلفة.',
    blocks: [{ type: 'header', title: 'ربحية المشاريع' }, { type: 'heroMoney', icon: TrendingUp, label: 'صافي الربح الحقيقي', value: DEMO.profit, tone: 'success', sub: 'بعد العمالة والمصاريف' }, { type: 'statRow', stats: [{ icon: Wallet, label: 'إيرادات', value: 508000, money: true, tone: 'cyan' }, { icon: TrendingDown, label: 'تكاليف', value: 89150, money: true, tone: 'danger' }] }] },

  { tag: 'موسم التقارير', tone: 'gold', kw: 'جاهز', head: 'لموسم الضرائب', sub: 'كل أرقامك مجهّزة ومصنّفة على مدار السنة — وقت التقرير تضغط زر وخلص.',
    blocks: [{ type: 'header', title: 'مدرج الضريبة' }, { type: 'sectionTitle', text: 'التزاماتك القادمة', icon: Calculator, color: C.gold }, { type: 'tax' }] },

  { tag: 'بلا خلافات', tone: 'cyan', kw: 'ولا خلاف', head: 'مع عمّالك', sub: 'كل عامل يشوف أيامه وسلفه ومستحقّه بنفسه — شفافية كاملة تنهي النقاش.',
    blocks: [{ type: 'header', title: 'بوّابة العامل' }, { type: 'list', items: [{ icon: CalendarDays, name: 'أيام العمل', meta: 'هذا الشهر', amount: '24 يوم', money: false, tone: 'cyan' }, { icon: HandCoins, name: 'المستحق', meta: 'محسوب تلقائياً', amount: 6400, tone: 'success' }, { icon: Coins, name: 'السلف', meta: 'مخصومة', amount: 1500, tone: 'gold' }] }] },

  { tag: 'جرّب مجاناً', tone: 'brand', kw: '14 يوم', head: 'مجاناً — بلا بطاقة', sub: 'كل الميزات مفتوحة 14 يوم — بلا التزام وبلا بطاقة ائتمان. ابدأ بدقيقة.',
    blocks: [{ type: 'header', title: 'كبلان' }, { type: 'grid' }] },
]

// ═══════════════════════════════════════════════════════════════════════════
//  IDEAS_HE — نسخة عبرية (سوق المقاولين الإسرائيلي) · زاوية «עובדים, לא חשבוניות»
//  مولّدة ومُتحقّق منها عداوياً (نقاء عبري 100% + مطابقة استراتيجية). تُعرض عبر:
//    /adstudio?lang=he&idea=0..2&size=story|square|portrait
//  كل فكرة تحمل screen خاصّها، والشاشة جوّا الموبايل تُرندَر بالعبري عبر demoshot?lang=he
// ═══════════════════════════════════════════════════════════════════════════
const IDEAS_HE = [
  // 0 · المواجهة المباشرة مع تطبيقات الفواتير (الزاوية الأقوى)
  { tag: 'ניהול עובדים', tone: 'brand', screen: 'workers',
    kw: 'החשבונית כבר מסודרת.', head: 'מי מסדר את העובדים?',
    sub: 'גרין אינבויס ו-iCount מנהלים לך את החשבוניות. כבלאן מנהל לך את העובדים, הפרויקטים והשכר.' },

  // 1 · بوّابة العامل (المالك بالعبري، العامل بالعربي)
  { tag: 'פורטל לעובד', tone: 'cyan', screen: 'workers',
    kw: 'כל עובד רואה', head: 'את החשבון שלו',
    sub: 'לכל עובד פורטל משלו בערבית: רואה כמה הרוויח ומבקש מקדמה לבד. נגמרו השאלות.' },

  // 2 · متابعة مستحقّات كل عامل
  { tag: 'מעקב חובות', tone: 'success', screen: 'workers',
    kw: 'כמה אתה חייב', head: 'לכל עובד?',
    sub: 'ימי עבודה פחות מקדמות, מחושב אוטומטית לכל עובד. תמיד יודע בדיוק כמה נשאר לשלם.' },
]

// ─── خريطة كل فكرة → شاشة حقيقية من التطبيق (تُعرض داخل الموبايل عبر iframe) ──
// الشاشات الشغّالة بلا باكند: dashboard · workdays · workers · projects · expenses · payments
const SCREEN_MAP = [
  { s: 'dashboard' },                      // 0  لوحة التحكم
  { s: 'dashboard', f: 'التوقّع' },        // 1  التوقّع الذكي
  { s: 'projects' },                        // 2  كاش بجيبك (إيرادات/ربح)
  { s: 'workers' },                         // 3  مستحقّات العمّال
  { s: 'dashboard', f: 'ذمّتك' },          // 4  رادار التحصيل
  { s: 'projects' },                        // 5  ربحية المشاريع
  { s: 'expenses' },                        // 6  מע"מ تلقائي
  { s: 'dashboard', f: 'نبض' },            // 7  كل الضرائب
  { s: 'dashboard', f: 'مدرج' },           // 8  ضريبة الدخل
  { s: 'dashboard', f: 'مدرج' },           // 9  مدرج الضريبة
  { s: 'expenses' },                        // 10 مسح الإيصال OCR
  { s: 'workers' },                         // 11 بوّابة العامل
  { s: 'workdays' },                        // 12 أيام العمل
  { s: 'payments' },                        // 13 الرواتب
  { s: 'payments' },                        // 14 السلف
  { s: 'workers', f: 'لوحة شرف' },         // 15 بصمة العامل
  { s: 'dashboard', f: 'ذمّتك' },          // 16 الذمّة الصافية
  { s: 'dashboard' },                       // 17 مركز القيادة
  { s: 'projects' },                        // 18 صحّة المشروع
  { s: 'expenses' },                        // 19 كشف الشذوذ
  { s: 'workers' },                         // 20 الفريق
  { s: 'expenses' },                        // 21 البضاعة (مواد)
  { s: 'projects' },                        // 22 تتبّع الوحدات
  { s: 'projects' },                        // 23 التقارير
  { s: 'workers' },                         // 24 واتساب
  { s: 'dashboard' },                       // 25 الأمان
  { s: 'workdays' },                        // 26 بلا نت
  { s: 'dashboard' },                       // 27 متعدّد المصالح
  { s: 'dashboard', f: 'نبض' },            // 28 جاهزية الحساب
  { s: 'dashboard' },                       // 29 كل شي بمكان واحد
  { s: 'dashboard', f: 'نبض' },            // 30 بطّل دفتر الورق
  { s: 'dashboard', f: 'ذمّتك' },          // 31 وفّر على المحاسب
  { s: 'dashboard' },                       // 32 نام وانت مرتاح
  { s: 'expenses' },                        // 33 ولا فاتورة تضيع
  { s: 'projects' },                        // 34 ربحك الحقيقي
  { s: 'dashboard', f: 'نبض' },            // 35 موسم التقارير
  { s: 'workers' },                         // 36 بلا خلافات مع عمّالك
  { s: 'dashboard', f: 'نبض' },            // 37 جرّب مجاناً
]
function Poster({ idea, ideaIndex, size, lang = 'ar' }) {
  const { w, h } = SIZES[size] || SIZES.portrait
  const [start, setStart] = useState(false)
  useEffect(() => { const t = setTimeout(() => setStart(true), 120); return () => clearTimeout(t) }, [])
  const t = TONE[idea.tone] || TONE.brand
  const he = lang === 'he'
  // الأفكار العبرية تحمل screen خاصّها؛ العربية تستعمل SCREEN_MAP حسب الفهرس
  const map = idea.screen ? { s: idea.screen, f: idea.focus } : (SCREEN_MAP[ideaIndex] || { s: 'dashboard' })
  const L = he
    ? { cta: 'נסה 14 יום חינם', tagline: 'ניהול קבלנות מהנייד', font: "'Heebo', system-ui, sans-serif" }
    : { cta: 'جرّب 14 يوم مجاناً', tagline: 'إدارة مقاولاتك من جيبك', font: "'Noto Sans Arabic', system-ui, sans-serif" }

  // مقياس الموبايل حسب المساحة المتاحة
  const phoneScale = size === 'story' ? 1.16 : size === 'square' ? 0.82 : 1.0
  const headSize = size === 'square' ? 48 : size === 'story' ? 62 : 58

  return (
    <div style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 80% at 80% -10%, ${t.c}24, transparent 55%), radial-gradient(100% 70% at -10% 110%, ${t.glow.replace('0.45', '0.18')}, transparent 50%), ${C.bg}`,
      fontFamily: L.font, direction: 'rtl', color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: size === 'story' ? '92px 72px 80px' : size === 'square' ? '54px 70px' : '72px 72px 64px',
    }}>
      {/* شبكة خفيفة بالخلفية */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: '54px 54px', maskImage: 'radial-gradient(circle at 50% 35%, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(circle at 50% 35%, #000 30%, transparent 75%)' }} />
      {/* بقعة توهّج خلف التلفون */}
      <div aria-hidden style={{ position: 'absolute', top: '34%', insetInline: 0, margin: 'auto', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 68%)`, opacity: 0.5, filter: 'blur(8px)' }} />

      {/* الشارة العلوية */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 18px', borderRadius: 99, background: `${t.c}1a`, border: `1px solid ${t.c}44`, marginBottom: 26 }}>
        <Sparkles size={17} color={t.c} />
        <span style={{ fontSize: 17, fontWeight: 800, color: t.c }}>{idea.tag}</span>
      </motion.div>

      {/* العنوان */}
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
        style={{ position: 'relative', textAlign: 'center', fontSize: headSize, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.03em', margin: 0, maxWidth: 880 }}>
        {idea.kw}{' '}
        <span style={{ background: t.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{idea.head}</span>
      </motion.h1>

      {/* السطر الفرعي */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
        style={{ position: 'relative', textAlign: 'center', fontSize: 21, lineHeight: 1.6, color: C.textDim, fontWeight: 500, margin: '22px 0 0', maxWidth: 740 }}>
        {idea.sub}
      </motion.p>

      {/* الموبايل — flex:1 + overflow hidden: ينقص بأناقة ويبقى الفوتر ظاهراً */}
      <motion.div initial={{ opacity: 0, y: 36, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: size === 'story' ? 'center' : 'flex-start', justifyContent: 'center', marginTop: size === 'square' ? 24 : 40, width: '100%' }}>
        <Phone screen={map.s} focus={map.f} scale={phoneScale} lang={he ? 'he' : undefined} />
      </motion.div>

      {/* الشريط السفلي */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 22px', borderRadius: 16, background: GRAD.success, boxShadow: `0 12px 30px ${C.success}44` }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#062b14' }}>{L.cta}</span>
          <ArrowLeft size={19} color="#062b14" strokeWidth={2.6} />
        </motion.div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text }}>
              {he ? <span>כבלאן</span> : <>Contractor <span style={{ color: C.primary }}>Pro</span></>}
            </div>
            <div style={{ fontSize: 12.5, color: C.textDim, fontWeight: 600 }}>{L.tagline}</div>
          </div>
          <div style={{ width: 50, height: 50, borderRadius: 15, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${C.primary}55` }}>
            <HardHat size={26} color="#fff" strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </div>
  )
}

// شبكة فهرس لكل الأفكار (للمعاينة) عند /adstudio بلا idea
function Index({ list = IDEAS, lang = 'ar' }) {
  const he = lang === 'he'
  const q = he ? '&lang=he' : ''
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: he ? "'Heebo', sans-serif" : "'Noto Sans Arabic', sans-serif", direction: 'rtl', padding: 30 }}>
      <h1 style={{ fontWeight: 900, marginBottom: 6 }}>Ad Studio {he ? '· עברית' : ''} — {list.length} {he ? 'רעיונות' : 'فكرة'}</h1>
      <p style={{ color: C.textDim, marginBottom: 20 }}>افتح <code>?idea=0..{list.length - 1}&size=square|portrait|story{q}</code></p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
        {list.map((it, i) => (
          <a key={i} href={`/adstudio?idea=${i}&size=portrait${q}`} style={{ display: 'block', padding: 14, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, textDecoration: 'none' }}>
            <div style={{ fontSize: 12, color: TONE[it.tone]?.c, fontWeight: 800 }}>#{i} · {it.tag}</div>
            <div style={{ fontWeight: 900, marginTop: 4 }}>{it.kw} {it.head}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function AdStudio() {
  const params = new URLSearchParams(window.location.search)
  const ideaParam = params.get('idea')
  const size = params.get('size') || 'portrait'
  const lang = params.get('lang') === 'he' ? 'he' : 'ar'
  const list = lang === 'he' ? IDEAS_HE : IDEAS
  if (ideaParam === null) return <Index list={list} lang={lang} />
  const i = Number(ideaParam)
  const idea = list[i] || list[0]
  return <Poster idea={idea} ideaIndex={i} size={size} lang={lang} />
}

export { IDEAS, IDEAS_HE, SIZES, SCREEN_MAP, Phone }
