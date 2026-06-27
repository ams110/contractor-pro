import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Landmark, Wallet, DollarSign, Users, Clock,
  AlertTriangle, CheckCircle2, ShieldCheck, Scale,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'
import { PremiumCard, IconChip, InsightRow, INSIGHT_TONE, TONES, useCountUp, Money } from '../ui/Premium.jsx'

const ICONS = { Wallet, DollarSign, Users, Clock, Landmark, AlertTriangle, CheckCircle2, ShieldCheck }

// لون شريحة الشلال: ذمم/نقد موجب = داخل، التزامات = خارج، الصافي = نبرة المركز
function segColor(seg, t) {
  if (seg.key === 'net')  return t.main
  if (seg.key === 'cash') return seg.delta >= 0 ? C.cyan : C.accent
  return seg.delta >= 0 ? C.primary : C.accent
}

export default function NetWorth({ netWorth, onNav }) {
  const language = useAppStore(s => s.language)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  // الـ hook يُستدعى قبل أي return مبكّر (قاعدة React Hooks)
  const netDisplay = useCountUp(netWorth?.netWorth ?? 0, 1300, inView)
  if (!netWorth || !netWorth.hasData) return null

  const t = TONES[netWorth.tone] || TONES.fair
  const { netWorth: net, coverage, liabilities, segments, insights } = netWorth

  // ── مقياس الشلال: نطاق يشمل كل البدايات/النهايات والصفر ──
  const bounds = segments.flatMap(s => [s.start, s.end]).concat(0)
  const top    = Math.max(...bounds)
  const bottom = Math.min(...bounds)
  const range  = Math.max(1, top - bottom)
  const pct    = v => ((v - bottom) / range) * 100   // موضع القيمة من أسفل المخطّط (%)
  const zeroPct = pct(0)

  return (
    <PremiumCard tone={t} radius={22} padding="18px 16px" style={{ marginBottom: 12 }}>
      <div ref={ref}>
        {/* العنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, position: 'relative' }}>
          <motion.div animate={inView ? { rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
            <IconChip icon={Landmark} color={t.main} size={30} radius={10} iconSize={16} strokeWidth={2.5} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{tl(language, 'ذمّتك الصافية', 'ההון הנקי שלך', 'Your Net Worth')}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{tl(language, 'لو صفّيت كل حساباتك اليوم', 'אם תסגור את כל החשבונות שלך היום', 'If you settled all your accounts today')}</div>
          </div>
          {/* شارة التغطية / الحالة */}
          {liabilities > 0 && coverage != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 9, background: `${t.main}16`, border: `1px solid ${t.main}3a` }}>
              <Scale size={12} color={t.main} strokeWidth={2.3} />
              <span style={{ fontSize: 11, fontWeight: 800, color: t.main, fontVariantNumeric: 'tabular-nums' }}>
                ×{coverage >= 9.5 ? '+9' : coverage.toFixed(1)}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 9, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)' }}>
              <ShieldCheck size={12} color={C.success} strokeWidth={2.3} />
              <span style={{ fontSize: 11, fontWeight: 800, color: C.success }}>{tl(language, 'بلا ديون', 'ללא חובות', 'Debt-free')}</span>
            </div>
          )}
        </div>

        {/* الرقم المركزي */}
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 5 }}>{tl(language, 'صافي مركزك الآن', 'המאזן הנקי שלך כעת', 'Your net position now')}</div>
          <Money v={netDisplay} color={t.main} size={36} />
        </div>

        {/* ── شلال البناء ── */}
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 7, height: 132, position: 'relative' }}>
            {/* خط الصفر */}
            <div aria-hidden style={{ position: 'absolute', insetInline: 0, bottom: `${zeroPct}%`, height: 1, background: C.borderMid, pointerEvents: 'none' }} />

            {segments.map((seg, i) => {
              const color  = segColor(seg, t)
              const barTop = Math.max(seg.start, seg.end)
              const barBot = Math.min(seg.start, seg.end)
              const hPct   = Math.max(2.5, pct(barTop) - pct(barBot))  // حدّ أدنى للظهور
              const botPct = pct(barBot)
              const clickable = !!seg.screen
              const isNet  = seg.key === 'net'
              return (
                <motion.div key={seg.key}
                  onClick={clickable ? () => onNav?.(seg.screen) : undefined}
                  whileTap={clickable ? { scale: 0.96 } : {}}
                  style={{ flex: 1, position: 'relative', cursor: clickable ? 'pointer' : 'default', minWidth: 0 }}>
                  {/* قيمة البند فوق العمود */}
                  <div style={{ position: 'absolute', insetInline: 0, bottom: `calc(${botPct + hPct}% + 3px)`, textAlign: 'center', fontSize: 9.5, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {seg.delta < 0 ? '−' : isNet ? '' : '+'}₪{fmt(Math.abs(seg.delta) >= 1000 ? Math.round(Math.abs(seg.delta) / 1000) + 'k' : Math.abs(seg.delta))}
                  </div>
                  {/* العمود */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: inView ? `${hPct}%` : 0 }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: 'easeOut' }}
                    style={{
                      position: 'absolute', insetInline: 0, bottom: `${botPct}%`,
                      borderRadius: 6,
                      background: isNet
                        ? `linear-gradient(180deg, ${color}, ${color}bb)`
                        : `${color}d0`,
                      border: `1px solid ${color}`,
                      boxShadow: isNet ? `0 0 16px ${color}55` : `0 0 8px ${color}40`,
                    }} />
                </motion.div>
              )
            })}
          </div>

          {/* تسميات الأعمدة */}
          <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
            {segments.map(seg => {
              const Icon  = ICONS[seg.icon] || Wallet
              const color = segColor(seg, t)
              return (
                <div key={seg.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <Icon size={13} color={color} strokeWidth={2.2} />
                  <span style={{ fontSize: 8.5, color: C.textDim, fontWeight: 600, textAlign: 'center', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{seg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* الرؤى الذكية */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((ins, i) => {
            const clickable = ins.tone === 'warn' || ins.text.includes('رادار التحصيل')
            const target = ins.text.includes('رادار التحصيل') ? 'finance' : 'projects'
            return (
              <InsightRow
                key={i}
                icon={ICONS[ins.icon] || Landmark}
                color={INSIGHT_TONE[ins.tone] || C.cyan}
                text={ins.text}
                inView={inView}
                delay={0.5 + i * 0.1}
                onClick={clickable ? () => onNav?.(target) : undefined}
              />
            )
          })}
        </div>
      </div>
    </PremiumCard>
  )
}
