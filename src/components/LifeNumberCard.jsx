import React, { useMemo } from 'react'
import { Gauge, HandCoins, MessageCircle, ChevronLeft } from 'lucide-react'
import { C, OSEK_PATUR_THRESHOLD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tl } from '../lib/labels.js'
import { computeTaxRunway, computeCollectionAging } from '../lib/insights.js'
import { openWhatsApp, waMessages } from '../lib/whatsapp.js'
import { useAppStore } from '../store/useAppStore.js'
import { useBusinessStore } from '../store/useBusinessStore.js'
import { PremiumCard, IconChip, TONES } from '../ui/Premium.jsx'

// ─── بطاقة «رقم الحياة» — الرقم الواحد اللي بيمنع الكارثة، حسب شريحة المستخدم ─────
// עוסק פטור → عدّاد السقف السنوي + توقّع العبور (نفس مصدر IncomeTab: client_receipts
// المفلترة بالمصلحة النشطة — حتى ما يطلع رقمان مختلفان بين الرئيسية والمالية).
// غير פטור وعنده ذمم مفتوحة → بطاقة التحصيل: أعلى 3 متأخّرين + زر تذكير واتساب.

function CapBar({ pct, tone }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', background: 'rgba(127,127,127,0.16)' }}>
      <div style={{ flex: clamped, background: tone.main, borderRadius: 5, transition: 'flex 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      <div style={{ flex: 100 - clamped }} />
    </div>
  )
}

function PaturCapCard({ yearTotal, onNav, language }) {
  const runway = useMemo(() => computeTaxRunway({
    isOsekPatur: true, cap: OSEK_PATUR_THRESHOLD,
    yearIncome: yearTotal, monthsElapsed: new Date().getMonth() + 1, annualTax: 0,
  }, language), [yearTotal, language])

  const capPct    = runway?.capPct ?? 0
  const toneKey   = runway ? runway.tone : 'good'
  const tone      = TONES[toneKey] || TONES.good
  const remaining = Math.max(0, OSEK_PATUR_THRESHOLD - yearTotal)
  const insight   = runway?.insights?.[0]?.text
    || tl(language,
      'سجّل مدخولاتك ليتفعّل توقّع السقف السنوي.',
      'רשום את ההכנסות שלך כדי להפעיל את תחזית התקרה השנתית.',
      'Log your income to activate the annual-cap forecast.')

  return (
    <PremiumCard color={tone.main} radius={20} padding="15px 15px" onClick={() => onNav?.('finance')} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <IconChip icon={Gauge} color={tone.main} size={34} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>
            {tl(language, 'سقف עוסק פטור', 'תקרת עוסק פטור', 'עוסק פטור cap')}
          </div>
          <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>
            {tl(language, 'رقمك الأهم هالسنة — قدّامك دايماً', 'המספר החשוב שלך השנה — תמיד מולך', 'Your most important number this year')}
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 9, background: `${tone.main}16`, border: `1px solid ${tone.main}3a`, fontSize: 12, fontWeight: 900, color: tone.main, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {capPct}%
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          ₪{fmt(yearTotal)}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textDim }}> {tl(language, 'من', 'מתוך', 'of')} ₪{fmt(OSEK_PATUR_THRESHOLD)}</span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: tone.main, fontVariantNumeric: 'tabular-nums' }}>
          {tl(language, 'باقي', 'נותרו', 'left')} ₪{fmt(remaining)}
        </div>
      </div>

      <CapBar pct={capPct} tone={tone} />

      <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.55, marginTop: 9 }}>
        {insight}
      </div>
    </PremiumCard>
  )
}

function CollectionCard({ projects, clientReceipts, onNav, language }) {
  const aging = useMemo(
    () => computeCollectionAging({ projects, receipts: clientReceipts }, language),
    [projects, clientReceipts, language]
  )
  if (!aging.items.length) return null

  const tone = TONES[aging.tone] || TONES.fair
  const top = aging.items.slice(0, 3)

  return (
    <PremiumCard color={tone.main} radius={20} padding="15px 15px" onClick={() => onNav?.('projects')} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <IconChip icon={HandCoins} color={tone.main} size={34} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>
            {tl(language, 'مين ضلّ عليك مصاري', 'מי עוד חייב לך כסף', 'Who still owes you')}
          </div>
          <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>
            {tl(language, 'التحصيل قبل الرسمات — ذكّرهم بكبسة', 'הגבייה לפני הגרפים — הזכר להם בלחיצה', 'Collections first — remind with one tap')}
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 9, background: `${tone.main}16`, border: `1px solid ${tone.main}3a`, fontSize: 12, fontWeight: 900, color: tone.main, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          ₪{fmt(aging.totalOutstanding)}
        </div>
      </div>

      {top.map(it => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `1px solid ${tone.main}26`, borderRadius: 13, padding: '9px 11px', marginBottom: 7 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.client || it.name}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 1 }}>
              {it.daysSince > 0
                ? tl(language, `من ${it.daysSince} يوم`, `לפני ${it.daysSince} ימים`, `${it.daysSince} days ago`)
                : tl(language, 'حديث', 'עדכני', 'recent')}
              {it.client && it.name ? ` · ${it.name}` : ''}
            </div>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: tone.main, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            ₪{fmt(it.outstanding)}
          </div>
          {it.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                openWhatsApp(it.phone, waMessages.paymentReminder({ clientName: it.client || it.name, projectName: it.name, amount: it.outstanding }))
              }}
              aria-label={tl(language, 'تذكير واتساب', 'תזכורת וואטסאפ', 'WhatsApp reminder')}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <MessageCircle size={15} color={C.success} />
            </button>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: C.textDim, marginTop: 2 }}>
        {tl(language, 'كل المشاريع والذمم', 'כל הפרויקטים והחובות', 'All projects & receivables')}
        <ChevronLeft size={13} color={C.textDim} />
      </div>
    </PremiumCard>
  )
}

export default function LifeNumberCard({ projects = [], clientReceipts = [], onNav }) {
  const language = useAppStore(s => s.language)
  const businesses  = useBusinessStore(s => s.businesses)
  const activeBizId = useBusinessStore(s => s.activeBusinessId)
  const activeBiz = useMemo(
    () => businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null,
    [businesses, activeBizId]
  )

  const isPatur = activeBiz?.business_type === 'osek_patur'

  // نفس مصدر IncomeTab حرفياً: مقبوضات المصلحة النشطة لهذه السنة
  const yearTotal = useMemo(() => {
    if (!isPatur || !activeBiz) return 0
    const year = String(new Date().getFullYear())
    return clientReceipts
      .filter(r => r.business_id === activeBiz.id && r.date?.startsWith(year))
      .reduce((s, r) => s + Number(r.amount || 0), 0)
  }, [isPatur, activeBiz, clientReceipts])

  if (isPatur) return <PaturCapCard yearTotal={yearTotal} onNav={onNav} language={language} />
  return <CollectionCard projects={projects} clientReceipts={clientReceipts} onNav={onNav} language={language} />
}
