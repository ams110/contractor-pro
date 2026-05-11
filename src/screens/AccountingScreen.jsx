import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, FileText, Wallet, HardHat, AlertTriangle, TrendingUp, TrendingDown, Check } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { fmt, todayStr } from '../lib/helpers.js'
import {
  calcAnnualTaxSummary, calcAllWorkersDeductions, calcVATReport,
  calcIncomeTaxAnnual, OSEK_PATUR_CAP,
} from '../hooks/useTaxEngine.js'

const BIZ = {
  osek_patur: { label: 'עוסק פטור', ar: 'عوسق פطור', icon: '🟡', color: '#EAB308', desc: 'معفي من מע"מ — حد ₪120,000/سنة' },
  osek_moreh: { label: 'עוסק מורשה', ar: 'عوסق מורשה', icon: '🟢', color: '#22C55E', desc: 'مرخص — يجمع ويدفع מע"מ 18%' },
  hevra:      { label: 'חברה בע"מ', ar: 'شركة محدودة', icon: '🔵', color: '#3B82F6', desc: 'شركة — ضريبة شركات 23%' },
}

const WORKER_LABELS = {
  israeli: 'إسرائيلي', foreign_res: 'أجنبي مقيم',
  foreign_non: 'أجنبي غير مقيم', palestinian: 'فلسطيني', self: 'مستقل',
}

const TABS = [
  { id: 'overview', Icon: LayoutGrid, label: 'ملخص' },
  { id: 'vat',      Icon: FileText,   label: 'מע"מ' },
  { id: 'taxes',    Icon: Wallet,     label: 'ضرائب' },
  { id: 'workers',  Icon: HardHat,    label: 'عمال' },
]

function Card({ children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '12px 14px', ...style }}>
      {children}
    </div>
  )
}

function StatMini({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', background: `${color}10`, border: `1px solid ${color}28`, borderRadius: 12, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: C.textDim, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, color }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
      {title}
    </div>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: `${C.border}66`, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 3, background: pct >= 100 ? C.success : color, transition: 'width .5s' }} />
    </div>
  )
}

function TaxAdvanceForm({ type, color, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ amount: '', date: todayStr(), period: '' })
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="المبلغ ₪"
          style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, outline: 'none' }} />
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, outline: 'none' }} />
      </div>
      <input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
        placeholder="الفترة (مثال: Q1 2025)"
        style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 8, borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 11, cursor: 'pointer' }}>إلغاء</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.amount}
          style={{ flex: 2, padding: 8, borderRadius: 9, border: 'none', background: color, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', opacity: (!form.amount || saving) ? 0.6 : 1 }}>
          {saving ? '...' : '✓ حفظ الدفعة'}
        </button>
      </div>
    </div>
  )
}

function getSmartTips(summary, businessType) {
  const tips = []
  if (summary.isOsekPatur) {
    const pct = Math.round((summary.revenue / OSEK_PATUR_CAP) * 100)
    if (pct >= 90) tips.push({ type: 'danger', icon: '🚨', msg: `خطر! وصلت ${pct}% من حد עוסק פטור — يجب التحويل لעוסק מורשה فوراً` })
    else if (pct >= 70) tips.push({ type: 'warning', icon: '⚠️', msg: `وصلت ${pct}% من حد ₪${fmt(OSEK_PATUR_CAP)} السنوي — راقب إيراداتك` })
    else tips.push({ type: 'ok', icon: '✅', msg: `إيراداتك ${pct}% من الحد السنوي — وضعك مريح` })
  }
  if (!summary.isOsekPatur && summary.vatReport.toPay > 0)
    tips.push({ type: 'info', icon: '🧾', msg: `مع"מ مستحق هذه السنة: ${fmt(summary.vatReport.toPay)}₪` })
  if (summary.itRemaining > 0)
    tips.push({ type: 'info', icon: '💰', msg: `متبقي מס הכנסה: ${fmt(summary.itRemaining)}₪` })
  if (summary.blRemaining > 0)
    tips.push({ type: 'info', icon: '🏥', msg: `متبقي ביטוח לאומי: ${fmt(summary.blRemaining)}₪` })
  if (summary.netProfit > 50000)
    tips.push({ type: 'tip', icon: '💡', msg: `ربحك ${fmt(summary.netProfit)}₪ — ادفع פנסיה لتوفير ضريبة` })
  return tips.slice(0, 3)
}

function getUpcomingDates() {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const items = []
  const next15 = new Date(y, m + 1, 15)
  const d15 = Math.ceil((next15 - today) / 86400000)
  if (d15 > 0) {
    items.push({ icon: '🧾', label: 'تقرير מע"מ', date: next15.toISOString().slice(0, 10), days: d15, urgent: d15 <= 7 })
    items.push({ icon: '💰', label: 'מקדמות מס הכנסה', date: next15.toISOString().slice(0, 10), days: d15, urgent: d15 <= 7 })
  }
  const apr30 = new Date(y, 3, 30)
  if (apr30 > today) {
    const dApr = Math.ceil((apr30 - today) / 86400000)
    if (dApr <= 120) items.push({ icon: '📄', label: 'דוח שנתי מס הכנסה', date: apr30.toISOString().slice(0, 10), days: dApr, urgent: dApr <= 30 })
  }
  return items
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ summary, businessType, monthRevenue, monthNet, dueDates, tips }) {
  const biz = BIZ[businessType] || BIZ.osek_moreh
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Personal Accountant Card */}
      <Card style={{ background: 'linear-gradient(135deg, rgba(0,221,179,0.08), rgba(99,102,241,0.08))', border: `1px solid ${C.primary}22` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TrendingUp size={20} strokeWidth={2} color="#000" /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>محاسبك الشخصي</div>
            <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي بناءً على بياناتك</div>
          </div>
        </div>
        {tips.length === 0 ? (
          <div style={{ fontSize: 11, color: C.textDim }}>أضف إيرادات ومصاريف لرؤية التحليل.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {tips.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 10,
                background: t.type === 'danger' ? `${C.accent}15` : t.type === 'warning' ? `${C.warning}12` : t.type === 'ok' ? `${C.success}12` : `${C.primary}0A`,
                border: `1px solid ${t.type === 'danger' ? C.accent : t.type === 'warning' ? C.warning : t.type === 'ok' ? C.success : C.primary}22`,
              }}>
                {t.type === 'danger' ? <AlertTriangle size={14} strokeWidth={2} style={{ color: C.accent, flexShrink: 0 }} /> : t.type === 'ok' ? <Check size={14} strokeWidth={2} style={{ color: C.success, flexShrink: 0 }} /> : t.type === 'warning' ? <AlertTriangle size={14} strokeWidth={2} style={{ color: C.warning, flexShrink: 0 }} /> : <TrendingUp size={14} strokeWidth={2} style={{ color: C.primary, flexShrink: 0 }} />}
                <span style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{t.msg}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Annual Quick Stats */}
      <div>
        <SectionHeader title={`ملخص ${summary.year}`} color={C.primary} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatMini label="إيرادات" value={`${fmt(Math.round(summary.revenue))}₪`} color={C.success} />
          <StatMini label="مصاريف" value={`${fmt(Math.round(summary.expTotal))}₪`} color={C.warning} />
          <StatMini label="رواتب" value={`${fmt(Math.round(summary.salaries))}₪`} color={C.secondary} />
          <StatMini label="صافي ربح" value={`${fmt(Math.round(summary.netProfit))}₪`} color={C.primary} />
        </div>
      </div>

      {/* This Month */}
      <div>
        <SectionHeader title="هذا الشهر" color={C.blue} />
        <div style={{ display: 'flex', gap: 6 }}>
          <StatMini label="إيرادات" value={`${fmt(Math.round(monthRevenue))}₪`} color={C.success} />
          <StatMini label="صافي" value={`${fmt(Math.round(monthNet))}₪`} color={monthNet >= 0 ? C.primary : C.accent} />
        </div>
      </div>

      {/* Tax Calendar */}
      {dueDates.length > 0 && (
        <div>
          <SectionHeader title="مواعيد استحقاق قريبة" color={C.warning} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {dueDates.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: C.card, borderRadius: 10, border: `1px solid ${d.urgent ? C.accent + '55' : C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} strokeWidth={1.8} style={{ color: d.urgent ? C.accent : C.primary, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.label}</div>
                    <div style={{ fontSize: 9, color: C.textDim }}>{d.date}</div>
                  </div>
                </div>
                <div style={{ padding: '3px 10px', borderRadius: 20, background: d.urgent ? `${C.accent}22` : `${C.primary}15`, border: `1px solid ${d.urgent ? C.accent + '44' : C.primary + '33'}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: d.urgent ? C.accent : C.primary }}>{d.days}י</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VAT Tab ─────────────────────────────────────────────────────────────────

function VatTab({ summary, clientReceipts, expenses, businessType }) {
  const year = new Date().getFullYear().toString()
  const quarters = [
    { label: 'Q1 يناير–مارس', from: `${year}-01-01`, to: `${year}-03-31` },
    { label: 'Q2 أبريل–يونيو', from: `${year}-04-01`, to: `${year}-06-30` },
    { label: 'Q3 يوليو–سبتمبر', from: `${year}-07-01`, to: `${year}-09-30` },
    { label: 'Q4 أكتوبر–ديسمبر', from: `${year}-10-01`, to: `${year}-12-31` },
  ]
  const qData = quarters.map(q => ({
    ...q,
    ...calcVATReport(clientReceipts, expenses, q.from, q.to),
  }))

  if (businessType === 'osek_patur') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🟡</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.warning, marginBottom: 6 }}>עוסק פטור</div>
          <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>
            أنت معفي من مع"מ — لا تجمع ولا تدفع VAT.<br />
            حد الإيرادات السنوي: <span style={{ color: C.warning, fontWeight: 700 }}>₪{fmt(OSEK_PATUR_CAP)}</span><br />
            الإيرادات الحالية: <span style={{ color: summary.overCap ? C.accent : C.success, fontWeight: 700 }}>₪{fmt(Math.round(summary.revenue))}</span>
          </div>
          {summary.overCap && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: `${C.accent}15`, borderRadius: 10, border: `1px solid ${C.accent}44`, fontSize: 11, color: C.accent, fontWeight: 700 }}>
              🚨 تجاوزت الحد! يجب التسجيل كـ עוסק מורשה فوراً
            </div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Annual Summary */}
      <Card>
        <SectionHeader title={`مع"מ ${year} — الإجمالي`} color={C.success} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <StatMini label={"מע\"מ محصّل"} value={`${fmt(summary.vatReport.vatOut)}₪`} color={C.success} />
          <StatMini label={"מע\"מ مدفوع"} value={`${fmt(summary.vatReport.vatIn)}₪`} color={C.primary} />
          <StatMini label="الصافي" value={`${fmt(Math.abs(summary.vatReport.net))}₪`} color={summary.vatReport.net > 0 ? C.accent : C.success} sub={summary.vatReport.net > 0 ? 'للدفع' : 'استرداد'} />
        </div>
        <div style={{ fontSize: 10, color: C.textDim, padding: '7px 10px', background: `${C.primary}0A`, borderRadius: 8 }}>
          معدل مع"מ 2025: <strong style={{ color: C.primary }}>18%</strong> &nbsp;|&nbsp; كل دفعة مقبوضة تشمل VAT مخفي يجب إعادته لمصلحة الضرائب
        </div>
      </Card>

      {/* Quarterly Breakdown */}
      <div>
        <SectionHeader title="تفصيل ربع سنوي" color={C.blue} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {qData.map((q, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{q.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: q.net > 0 ? C.accent : q.net < 0 ? C.success : C.textDim, fontFamily: 'monospace' }}>
                  {q.net > 0 ? `↑ ${fmt(q.toPay)}₪ للدفع` : q.net < 0 ? `↓ ${fmt(q.refund)}₪ استرداد` : '0₪'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatMini label="محصّل" value={`${fmt(q.vatOut)}₪`} color={C.success} />
                <StatMini label="مدفوع" value={`${fmt(q.vatIn)}₪`} color={C.primary} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Taxes Tab (מס הכנסה + ביטוח לאומי) ────────────────────────────────────

function TaxesTab({ summary, taxAdvances, addTaxAdvance, deleteTaxAdvance, pensionMonthly, setPensionMonthly }) {
  const [addingTax, setAddingTax] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pensEdit, setPensEdit] = useState(false)
  const [pensVal, setPensVal] = useState(String(pensionMonthly || ''))

  const itPct  = summary.incomeTax  > 0 ? Math.round((summary.itPaid  / summary.incomeTax)  * 100) : 0
  const blPct  = summary.bituachLeumi > 0 ? Math.round((summary.blPaid / summary.bituachLeumi) * 100) : 0

  const itRecords = taxAdvances.filter(a => a.type === 'income_tax')
  const blRecords = taxAdvances.filter(a => a.type === 'bituach_leumi')

  async function saveAdvance(type, form) {
    if (!form.amount || !addTaxAdvance) return
    setSaving(true)
    try {
      await addTaxAdvance({ type, amount: parseFloat(form.amount), date: form.date, period: form.period })
      setAddingTax(null)
    } finally { setSaving(false) }
  }

  const pensionSaving = useMemo(() => {
    const withPension    = calcIncomeTaxAnnual(summary.netProfit, 2.25, (pensionMonthly || 0) * 12)
    const withoutPension = calcIncomeTaxAnnual(summary.netProfit, 2.25, 0)
    return Math.max(0, withoutPension - withPension)
  }, [summary.netProfit, pensionMonthly])

  const year = summary.year

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* מס הכנסה */}
      <Card>
        <SectionHeader title={`💰 מס הכנסה ${year}`} color={C.purple} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <StatMini label="المتوقع" value={`${fmt(summary.incomeTax)}₪`} color={C.purple} />
          <StatMini label="مدفوع" value={`${fmt(summary.itPaid)}₪`} color={C.success} />
          <StatMini label="متبقي" value={`${fmt(summary.itRemaining)}₪`} color={summary.itRemaining > 0 ? C.accent : C.success} />
        </div>
        <ProgressBar pct={itPct} color={C.purple} />
        <div style={{ fontSize: 9, color: C.textDim, textAlign: 'center', marginTop: 4, marginBottom: 10 }}>{itPct}% مدفوع</div>

        {/* Records */}
        {itRecords.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {[...itRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: `${C.border}22`, borderRadius: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, fontFamily: 'monospace' }}>{fmt(r.amount)}₪</span>
                <span style={{ fontSize: 10, color: C.textDim }}>{r.period ? `${r.period} · ` : ''}{r.date}</span>
                {deleteTaxAdvance && <button onClick={() => deleteTaxAdvance(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.textDim }}>🗑️</button>}
              </div>
            ))}
          </div>
        )}

        {addTaxAdvance && (
          addingTax === 'income_tax'
            ? <TaxAdvanceForm type="income_tax" color={C.purple} saving={saving} onSave={f => saveAdvance('income_tax', f)} onCancel={() => setAddingTax(null)} />
            : <button onClick={() => setAddingTax('income_tax')} style={{ width: '100%', padding: 8, borderRadius: 9, border: `1px solid ${C.purple}44`, background: `${C.purple}10`, color: C.purple, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + تسجيل מקדמה
              </button>
        )}
      </Card>

      {/* ביטוח לאומי */}
      <Card>
        <SectionHeader title={`🏥 ביטוח לאומי ${year}`} color={C.blue} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <StatMini label="المتوقع" value={`${fmt(summary.bituachLeumi)}₪`} color={C.blue} />
          <StatMini label="مدفوع" value={`${fmt(summary.blPaid)}₪`} color={C.success} />
          <StatMini label="متبقي" value={`${fmt(summary.blRemaining)}₪`} color={summary.blRemaining > 0 ? C.accent : C.success} />
        </div>
        <ProgressBar pct={blPct} color={C.blue} />
        <div style={{ fontSize: 9, color: C.textDim, textAlign: 'center', marginTop: 4, marginBottom: 10 }}>{blPct}% مدفوع</div>

        {blRecords.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {[...blRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: `${C.border}22`, borderRadius: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: 'monospace' }}>{fmt(r.amount)}₪</span>
                <span style={{ fontSize: 10, color: C.textDim }}>{r.period ? `${r.period} · ` : ''}{r.date}</span>
                {deleteTaxAdvance && <button onClick={() => deleteTaxAdvance(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.textDim }}>🗑️</button>}
              </div>
            ))}
          </div>
        )}

        {addTaxAdvance && (
          addingTax === 'bituach_leumi'
            ? <TaxAdvanceForm type="bituach_leumi" color={C.blue} saving={saving} onSave={f => saveAdvance('bituach_leumi', f)} onCancel={() => setAddingTax(null)} />
            : <button onClick={() => setAddingTax('bituach_leumi')} style={{ width: '100%', padding: 8, borderRadius: 9, border: `1px solid ${C.blue}44`, background: `${C.blue}10`, color: C.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + تسجيل دفعة ב.לאומי
              </button>
        )}
      </Card>

      {/* Pension */}
      <Card>
        <SectionHeader title="🔵 פנסיה / קופת גמל" color={C.cyan} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.textDim }}>مساهمة شهرية</div>
          {pensEdit ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={pensVal} onChange={e => setPensVal(e.target.value)}
                style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
              <button onClick={() => { setPensionMonthly?.(pensVal); setPensEdit(false) }}
                style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: C.cyan, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>✓</button>
              <button onClick={() => setPensEdit(false)}
                style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setPensVal(String(pensionMonthly || '')); setPensEdit(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.cyan}44`, background: `${C.cyan}10`, color: C.cyan, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{fmt(pensionMonthly || 0)}₪/شهر</span>
              <span>✏️</span>
            </button>
          )}
        </div>
        {(pensionMonthly || 0) > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <StatMini label="سنوي" value={`${fmt((pensionMonthly || 0) * 12)}₪`} color={C.cyan} />
            <StatMini label="وفر ضريبي" value={`${fmt(pensionSaving)}₪`} color={C.success} sub="من مس הכנסה" />
          </div>
        )}
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, padding: '7px 10px', background: `${C.cyan}0A`, borderRadius: 8, lineHeight: 1.6 }}>
          💡 حتى 16% من صافي الدخل معفي ضريبياً عند دفعه لصندوق التقاعد
        </div>
      </Card>
    </div>
  )
}

// ─── Workers Tab ─────────────────────────────────────────────────────────────

function WorkersTab({ employees, payments }) {
  const workerDeds = useMemo(() => calcAllWorkersDeductions(employees, payments), [employees, payments])

  if (workerDeds.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👷</div>
          <div style={{ fontSize: 12, color: C.textDim }}>لا توجد رواتب مسجلة هذا الشهر</div>
        </div>
      </Card>
    )
  }

  const totals = workerDeds.reduce((s, r) => ({
    gross: s.gross + r.monthPay,
    tax:   s.tax   + r.incomeTax,
    bl:    s.bl    + r.bituachLeumi,
    net:   s.net   + r.net,
  }), { gross: 0, tax: 0, bl: 0, net: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      <Card>
        <SectionHeader title="ملخص الاستقطاعات — هذا الشهر" color={C.secondary} />
        <div style={{ display: 'flex', gap: 6 }}>
          <StatMini label="إجمالي رواتب" value={`${fmt(totals.gross)}₪`} color={C.text} />
          <StatMini label="مس הכנסה" value={`${fmt(totals.tax)}₪`} color={C.purple} />
          <StatMini label="ביטוח לאומי" value={`${fmt(totals.bl)}₪`} color={C.blue} />
          <StatMini label="صافي" value={`${fmt(totals.net)}₪`} color={C.success} />
        </div>
      </Card>

      {/* Per Worker */}
      <div>
        <SectionHeader title={`تفصيل العمال (${workerDeds.length})`} color={C.secondary} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workerDeds.map(({ emp, monthPay, incomeTax, bituachLeumi, net }) => (
            <Card key={emp.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{emp.name}</span>
                <span style={{ fontSize: 9, color: C.textDim, background: `${C.border}88`, borderRadius: 6, padding: '2px 7px' }}>
                  {WORKER_LABELS[emp.worker_tax_type || 'self']}
                </span>
              </div>
              {emp.worker_tax_type && emp.worker_tax_type !== 'self' ? (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[
                    { l: 'راتب',       v: `${fmt(monthPay)}₪`,    c: C.text },
                    { l: 'מס הכנסה',  v: `${fmt(incomeTax)}₪`,   c: C.purple },
                    { l: 'ב.לאומי',   v: `${fmt(bituachLeumi)}₪`, c: C.blue },
                    { l: 'صافي',      v: `${fmt(net)}₪`,          c: C.success },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ textAlign: 'center', padding: '5px 8px', background: `${c}10`, borderRadius: 8, border: `1px solid ${c}22` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v}</div>
                      <div style={{ fontSize: 8, color: C.textDim }}>{l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: C.textDim }}>راتب {fmt(monthPay)}₪ — حدد نوع العامل لحساب الاستقطاعات</div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AccountingScreen({
  employees = [], payments = [], clientReceipts = [], expenses = [],
  taxAdvances = [], addTaxAdvance, deleteTaxAdvance,
  pensionMonthly = 0, setPensionMonthly,
  businessType = 'osek_moreh', setBusinessType,
}) {
  const [tab, setTab] = useState(0)
  const [showBizPicker, setShowBizPicker] = useState(false)

  const summary = useMemo(() =>
    calcAnnualTaxSummary({ payments, clientReceipts, expenses, taxAdvances, businessType, pensionMonthly }),
    [payments, clientReceipts, expenses, taxAdvances, businessType, pensionMonthly]
  )

  const thisMonth   = new Date().toISOString().slice(0, 7)
  const monthRevenue  = clientReceipts.filter(r => (r.date||'').startsWith(thisMonth)).reduce((s, r) => s + (r.amount||0), 0)
  const monthExpenses = expenses.filter(e => e.status !== 'pending' && (e.date||'').startsWith(thisMonth)).reduce((s, e) => s + (e.amount||0), 0)
  const monthSalaries = payments.filter(p => (p.date||'').startsWith(thisMonth)).reduce((s, p) => s + (p.amount||0), 0)
  const monthNet      = monthRevenue - monthExpenses - monthSalaries

  const tips     = useMemo(() => getSmartTips(summary, businessType), [summary, businessType])
  const dueDates = useMemo(() => getUpcomingDates(), [])

  const biz = BIZ[businessType] || BIZ.osek_moreh

  return (
    <div style={{ padding: '16px 16px 0', direction: 'rtl' }}>

      {/* ── Business Type Banner ── */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setShowBizPicker(p => !p)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 14, border: `1px solid ${biz.color}44`, background: `${biz.color}0E`, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: biz.color, flexShrink: 0 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: biz.color }}>{biz.label} — {biz.ar}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{biz.desc}</div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: C.textDim }}>{showBizPicker ? '▲' : '▼'} تغيير</span>
        </button>

        {showBizPicker && (
          <div style={{ marginTop: 6, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.card }}>
            {Object.entries(BIZ).map(([key, b]) => (
              <button key={key} onClick={() => { setBusinessType?.(key); setShowBizPicker(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: businessType === key ? `${b.color}12` : 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', direction: 'rtl' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: businessType === key ? b.color : C.text }}>{b.label} — {b.ar}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{b.desc}</div>
                </div>
                {businessType === key && <span style={{ marginRight: 'auto', fontSize: 12, color: b.color }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
        {TABS.map((t, i) => (
          <motion.button whileTap={{ scale: 0.95 }} key={t.id} onClick={() => setTab(i)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 9, border: 'none', background: tab === i ? GRAD.brand : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'inherit' }}>
            <t.Icon size={14} strokeWidth={2} style={{ color: tab === i ? '#000' : C.textDim }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: tab === i ? '#000' : C.textDim }}>{t.label}</span>
          </motion.button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ paddingBottom: 16 }}>
        {tab === 0 && <OverviewTab summary={summary} businessType={businessType} monthRevenue={monthRevenue} monthNet={monthNet} dueDates={dueDates} tips={tips} />}
        {tab === 1 && <VatTab summary={summary} clientReceipts={clientReceipts} expenses={expenses} businessType={businessType} />}
        {tab === 2 && <TaxesTab summary={summary} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance} deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} />}
        {tab === 3 && <WorkersTab employees={employees} payments={payments} />}
      </div>
    </div>
  )
}
