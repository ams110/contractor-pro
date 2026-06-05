// ════════════════════════════════════════════════════════════════════════════
//  WorkerInsights.jsx — مكوّنات بصرية لميزات صفحة العمّال الذكية
//    AttendanceHeatmap · PerformanceRadar · AnomalyAlerts · WorkerTimeline · FleetLeaderboard
//  كل الحسابات في src/lib/workerInsights.js؛ هنا عرض فقط.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  Flame, Activity, AlertTriangle, Clock, Copy, TrendingUp, CreditCard, CalendarOff,
  ShieldCheck, Trophy, Medal, Award, Calendar, Banknote, Wallet, Star, Crown,
} from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'

const L = (lang, ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)
const HEAT = [C.card, `${C.primary}33`, `${C.primary}66`, `${C.primary}aa`, C.primary]
const ANOM_ICONS = { AlertTriangle, Clock, Copy, TrendingUp, CreditCard, CalendarOff }
const SEV = {
  high:   { color: C.accent,   bg: `${C.accent}12`,   bd: `${C.accent}30`,   label: { ar: 'خطر', he: 'סיכון', en: 'High' } },
  medium: { color: C.warning,  bg: `${C.warning}10`,  bd: `${C.warning}2e`,  label: { ar: 'تنبيه', he: 'אזהרה', en: 'Warn' } },
  low:    { color: C.cyan,     bg: `${C.cyan}10`,     bd: `${C.cyan}2a`,     label: { ar: 'ملاحظة', he: 'הערה', en: 'Note' } },
}

// رأس قسم صغير موحّد
function Head({ icon: Icon, color, title, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color={color} strokeWidth={2.3} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{title}</span>
      {extra && <span style={{ marginInlineStart: 'auto', fontSize: 10, fontWeight: 700, color: C.textDim }}>{extra}</span>}
    </div>
  )
}

function Wrap({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 12, ...style }}>{children}</div>
}

// ════════════════════════════════════════════════════════════════════════════
//  خريطة الحضور الحرارية
// ════════════════════════════════════════════════════════════════════════════
export function AttendanceHeatmap({ heatmap, lang = 'ar' }) {
  if (!heatmap) return null
  const { grid, totalActiveDays, longestStreak } = heatmap
  return (
    <Wrap>
      <Head icon={Flame} color={C.primary}
        title={L(lang, 'خريطة الحضور', 'מפת נוכחות', 'Attendance Map')}
        extra={L(lang, `${totalActiveDays} يوم · أطول تتابع ${longestStreak}`, `${totalActiveDays} ימים`, `${totalActiveDays} days · streak ${longestStreak}`)} />
      <div style={{ overflowX: 'auto', paddingBottom: 4 }} dir="ltr">
        <div style={{ display: 'flex', gap: 3, minWidth: 'min-content' }}>
          {grid.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {col.map((cell, ri) => (
                <motion.div key={ri}
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: cell.future ? 0.25 : 1, scale: 1 }}
                  transition={{ delay: (ci * 7 + ri) * 0.001 }}
                  title={`${cell.date}${cell.count ? ` · ₪${fmt(cell.amount)}${cell.dayType ? ' · ' + cell.dayType : ''}` : ''}`}
                  style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: cell.dayType === 'عطلة' ? `${C.gold}aa` : HEAT[cell.level],
                    border: cell.pending > 0 ? `1px solid ${C.warning}` : `1px solid ${cell.level === 0 ? C.border : 'transparent'}`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* مفتاح الألوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: C.textDim }}>{L(lang, 'أقل', 'פחות', 'less')}</span>
        {HEAT.map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c, border: i === 0 ? `1px solid ${C.border}` : 'none' }} />)}
        <span style={{ fontSize: 9, color: C.textDim }}>{L(lang, 'أكثر', 'יותר', 'more')}</span>
      </div>
    </Wrap>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  رادار الأداء مقابل الأسطول
// ════════════════════════════════════════════════════════════════════════════
export function PerformanceRadar({ data, lang = 'ar' }) {
  if (!data?.length) return null
  return (
    <Wrap>
      <Head icon={Activity} color={C.secondary} title={L(lang, 'رادار الأداء مقابل الأسطول', 'מכ"ם ביצועים', 'Performance Radar')} />
      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={C.border} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: C.textDim, fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="fleet" dataKey="fleet" stroke={C.textDim} fill={C.textDim} fillOpacity={0.12} strokeWidth={1} strokeDasharray="4 3" />
          <Radar name="worker" dataKey="worker" stroke={C.secondary} fill={C.secondary} fillOpacity={0.34} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 2 }}>
        <Legend color={C.secondary} text={L(lang, 'العامل', 'העובד', 'Worker')} />
        <Legend color={C.textDim} dashed text={L(lang, 'متوسّط الفريق', 'ממוצע צוות', 'Fleet avg')} />
      </div>
    </Wrap>
  )
}
function Legend({ color, text, dashed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 14, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{text}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  كشف الشذوذ الذكي
// ════════════════════════════════════════════════════════════════════════════
export function AnomalyAlerts({ anomalies = [], lang = 'ar' }) {
  if (!anomalies.length) {
    return (
      <Wrap style={{ background: `${C.success}0c`, border: `1px solid ${C.success}28` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <ShieldCheck size={17} color={C.success} strokeWidth={2.2} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.success }}>
            {L(lang, 'كل شي تمام — ما في أي ملاحظات على سجلّ هالعامل.', 'הכל תקין — אין חריגות.', 'All clear — no anomalies detected.')}
          </span>
        </div>
      </Wrap>
    )
  }
  return (
    <Wrap>
      <Head icon={AlertTriangle} color={C.accent}
        title={L(lang, 'كشف الشذوذ الذكي', 'זיהוי חריגות', 'Smart Anomaly Detection')}
        extra={`${anomalies.length}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {anomalies.map((a, i) => {
          const s = SEV[a.severity] || SEV.low
          const Icon = ANOM_ICONS[a.icon] || AlertTriangle
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 11 }}>
              <Icon size={15} color={s.color} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>{a.text}</span>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: s.color, background: `${s.color}1a`, border: `1px solid ${s.color}30`, borderRadius: 5, padding: '2px 5px', flexShrink: 0 }}>
                {s.label[lang] || s.label.ar}
              </span>
            </motion.div>
          )
        })}
      </div>
    </Wrap>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  الخطّ الزمني الموحّد
// ════════════════════════════════════════════════════════════════════════════
const TL_META = {
  workday: { color: C.secondary, icon: Calendar },
  payment: { color: C.success,   icon: Banknote },
  advance: { color: C.accent,    icon: CreditCard },
  expense: { color: C.gold,      icon: Wallet },
}
export function WorkerTimeline({ timeline = [], lang = 'ar' }) {
  if (!timeline.length) {
    return <div style={{ textAlign: 'center', padding: 40, color: C.textDim, fontSize: 13 }}>
      {L(lang, 'لا توجد أحداث بعد', 'אין אירועים', 'No events yet')}
    </div>
  }
  return (
    <div style={{ position: 'relative', paddingInlineStart: 6 }}>
      {/* الخط العمودي */}
      <div style={{ position: 'absolute', insetInlineStart: 16, top: 6, bottom: 6, width: 2, background: C.border }} />
      {timeline.map((e, i) => {
        const m = TL_META[e.kind] || TL_META.workday
        const Icon = m.icon
        return (
          <motion.div key={e.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.4) }}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.bg, border: `2px solid ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
              <Icon size={11} color={m.color} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 1 }}>
                  {fmtDate(e.date)}{e.sub ? ` · ${e.sub}` : ''}{e.status === 'pending' ? ` · ${L(lang, 'معلّق', 'ממתין', 'pending')}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: m.color, flexShrink: 0, direction: 'ltr' }}>
                {e.sign < 0 ? '−' : '+'}₪{fmt(e.amount)}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  لوحة شرف الأسطول
// ════════════════════════════════════════════════════════════════════════════
const MEDAL = {
  gold:   { color: C.gold,      icon: Trophy, glow: '0 4px 18px rgba(217,119,6,0.4)' },
  silver: { color: '#CBD5E1',   icon: Medal,  glow: '0 4px 14px rgba(203,213,225,0.25)' },
  bronze: { color: '#B45309',   icon: Award,  glow: '0 4px 14px rgba(180,83,9,0.25)' },
}
export function FleetLeaderboard({ rows = [], onSelect, lang = 'ar', max = 5 }) {
  if (rows.length < 2) return null
  const top = rows.slice(0, max)
  return (
    <div style={{ background: `linear-gradient(150deg, ${C.surface}, ${C.card})`, border: `1px solid ${C.gold}28`, borderRadius: 18, padding: 14, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, insetInlineEnd: -20, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}22, transparent 70%)` }} />
      <Head icon={Crown} color={C.gold} title={L(lang, 'لوحة شرف الأسطول', 'לוח הכבוד', 'Fleet Leaderboard')} extra={L(lang, `${rows.length} عامل`, '', `${rows.length}`)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
        {top.map((r, i) => {
          const md = r.medal ? MEDAL[r.medal] : null
          return (
            <motion.button key={r.id} onClick={() => onSelect?.(r.id)} whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
                background: md ? `${md.color}10` : 'rgba(255,255,255,0.03)', border: `1px solid ${md ? md.color + '33' : C.border}`, boxShadow: r.medal === 'gold' ? md.glow : 'none' }}>
              {/* رتبة / ميدالية */}
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: md ? `${md.color}1c` : 'transparent', border: md ? `1px solid ${md.color}45` : `1px solid ${C.border}` }}>
                {md ? <md.icon size={15} color={md.color} strokeWidth={2.2} />
                    : <span style={{ fontSize: 12, fontWeight: 900, color: C.textDim }}>{r.rank}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  {r.star && <Star size={11} color={C.gold} fill={C.gold} />}
                </div>
                {/* شريط النتيجة */}
                <div style={{ height: 4, borderRadius: 3, background: C.bg, marginTop: 5, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${r.score}%` }} transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
                    style={{ height: '100%', borderRadius: 3, background: md ? md.color : C.secondary }} />
                </div>
              </div>
              <div style={{ textAlign: 'end', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: md ? md.color : C.text }}>{r.score}</div>
                <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>₪{fmt(r.earned)}</div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
