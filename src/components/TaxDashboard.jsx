import React, { useState } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import {
  calcAnnualTaxSummary, calcAllWorkersDeductions,
  calcIncomeTaxAnnual, OSEK_PATUR_CAP,
} from '../hooks/useTaxEngine.js'

const WORKER_TYPE_LABELS = {
  israeli:     'إسرائيلي / مقيم',
  foreign_res: 'أجنبي مقيم',
  foreign_non: 'أجنبي غير مقيم',
  palestinian: 'فلسطيني',
  self:        'مستقل (לא שכיר)',
}

function Toggle({ label, icon, on, onToggle, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:`1px solid ${C.border}` }}>
      <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{icon} {label}</span>
      <button onClick={onToggle}
        style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', position:'relative', background: on ? (color || C.primary) : C.surface, transition:'background .2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:2, left: on ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }} />
      </button>
    </div>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'12px 8px', background:`${color}12`, border:`1px solid ${color}30`, borderRadius:14, flex:1, minWidth:0 }}>
      <div style={{ fontSize:15, fontWeight:900, color, fontFamily:'monospace' }}>{value}</div>
      <div style={{ fontSize:9, color:C.textDim, marginTop:2, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:8, color:C.textDim, marginTop:1 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom:12, borderRadius:14, border:`1px solid ${color}33`, overflow:'hidden', background:'rgba(255,255,255,0.02)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', background:`${color}10`, border:'none', cursor:'pointer' }}>
        <span style={{ fontSize:13, fontWeight:800, color }}>{title}</span>
        <span style={{ fontSize:11, color:C.textDim }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding:'12px 14px' }}>{children}</div>}
    </div>
  )
}

export default function TaxDashboard({
  employees = [], payments = [], clientReceipts = [], expenses = [],
  taxAdvances = [], addTaxAdvance, deleteTaxAdvance,
  pensionMonthly = 0, setPensionMonthly,
  businessType = 'osek_moreh',
  taxModules = {},
  compact = false,
}) {
  const summary    = calcAnnualTaxSummary({ payments, clientReceipts, expenses, taxAdvances, businessType, pensionMonthly })
  const workerDeds = calcAllWorkersDeductions(employees, payments)
  const [addingTax, setAddingTax] = useState(null)
  const [taxForm,   setTaxForm]   = useState({ amount: '', date: new Date().toISOString().split('T')[0], period: '', notes: '' })
  const [saving,    setSaving]    = useState(false)
  const [pensEdit,  setPensEdit]  = useState(false)
  const [pensVal,   setPensVal]   = useState(String(pensionMonthly || ''))

  const mods = { vat: true, incomeTax: true, bituachLeumi: true, workerDeductions: true, pensionCalc: true, annualSummary: true, ...taxModules }

  async function saveAdvance() {
    if (!taxForm.amount || !addTaxAdvance) return
    setSaving(true)
    try {
      await addTaxAdvance({ type: addingTax, amount: parseFloat(taxForm.amount), date: taxForm.date, period: taxForm.period, notes: taxForm.notes })
      setAddingTax(null); setTaxForm({ amount: '', date: new Date().toISOString().split('T')[0], period: '', notes: '' })
    } finally { setSaving(false) }
  }

  const year = summary.year

  return (
    <div>

      {/* ── تحذير عوסק פטور ── */}
      {summary.isOsekPatur && summary.overCap && (
        <div style={{ padding:'10px 14px', background:`${C.accent}18`, border:`1px solid ${C.accent}44`, borderRadius:12, marginBottom:12, fontSize:11, color:C.accent, fontWeight:700 }}>
          ⚠️ تجاوزت تقرير عוסק פטור! الإيرادات {fmt(Math.round(summary.revenue))}₪ تتخطى الحد {fmt(OSEK_PATUR_CAP)}₪ — استشر محاسباً
        </div>
      )}

      {/* ── ملخص سنوي ── */}
      {mods.annualSummary && (
        <Section title={`📊 ملخص ${year} — إيرادات ${fmt(Math.round(summary.revenue))}₪`} color={C.primary} defaultOpen={!compact}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            <StatCard label="إيرادات" value={`${fmt(Math.round(summary.revenue))}₪`} color={C.success} />
            <StatCard label="مصاريف" value={`${fmt(Math.round(summary.expTotal))}₪`} color={C.warning} />
            <StatCard label="رواتب" value={`${fmt(Math.round(summary.salaries))}₪`} color={C.secondary} />
            <StatCard label="صافي ربح" value={`${fmt(Math.round(summary.netProfit))}₪`} color={C.primary} />
          </div>
        </Section>
      )}

      {/* ── VAT ── */}
      {mods.vat && !summary.isOsekPatur && (
        <Section title={`🧾 مع"מ — الصافي المستحق ${summary.vatReport.net > 0 ? fmt(summary.vatReport.toPay)+'₪ للدفع' : fmt(summary.vatReport.refund)+'₪ استرداد'}`} color={C.success}>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <StatCard label='VAT محصّل' value={`${fmt(summary.vatReport.vatOut)}₪`} color={C.success} />
            <StatCard label='VAT مدفوع' value={`${fmt(summary.vatReport.vatIn)}₪`} color={C.primary} />
            <StatCard label='الصافي' value={`${fmt(Math.abs(summary.vatReport.net))}₪`} color={summary.vatReport.net > 0 ? C.accent : C.success} sub={summary.vatReport.net > 0 ? 'للدفع' : 'استرداد'} />
          </div>
          <div style={{ fontSize:10, color:C.textDim }}>⚡ الحساب بناءً على إيصالات العملاء والمصاريف المعتمدة للسنة الحالية</div>
        </Section>
      )}

      {/* ── מס הכנסה ── */}
      {mods.incomeTax && (
        <Section title={`💰 מס הכנסה — متبقي ${fmt(summary.itRemaining)}₪`} color={C.purple}>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <StatCard label='المتوقع' value={`${fmt(summary.incomeTax)}₪`} color={C.purple} />
            <StatCard label='مدفوع' value={`${fmt(summary.itPaid)}₪`} color={C.success} />
            <StatCard label='متبقي' value={`${fmt(summary.itRemaining)}₪`} color={summary.itRemaining > 0 ? C.accent : C.success} />
          </div>
          {addTaxAdvance && (
            addingTax === 'income_tax' ? (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:10 }}>
                <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                  <input type="number" value={taxForm.amount} onChange={e => setTaxForm(f => ({ ...f, amount: e.target.value }))} placeholder="المبلغ ₪"
                    style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none' }} />
                  <input type="date" value={taxForm.date} onChange={e => setTaxForm(f => ({ ...f, date: e.target.value }))}
                    style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none' }} />
                </div>
                <input value={taxForm.period} onChange={e => setTaxForm(f => ({ ...f, period: e.target.value }))} placeholder="الفترة (مثال: Q1 2025)"
                  style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none', boxSizing:'border-box', marginBottom:6 }} />
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setAddingTax(null)} style={{ flex:1, padding:'8px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer' }}>إلغاء</button>
                  <button onClick={saveAdvance} disabled={saving} style={{ flex:2, padding:'8px', borderRadius:9, border:'none', background:C.purple, color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>{saving ? '...' : 'حفظ الدفعة'}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingTax('income_tax')}
                style={{ width:'100%', padding:'8px', borderRadius:9, border:`1px solid ${C.purple}44`, background:`${C.purple}10`, color:C.purple, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                + تسجيل دفعة מס הכנסה
              </button>
            )
          )}
        </Section>
      )}

      {/* ── ביטוח לאומי ── */}
      {mods.bituachLeumi && (
        <Section title={`🏥 ביטוח לאומי — متبقي ${fmt(summary.blRemaining)}₪`} color={C.blue}>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <StatCard label='المتوقع' value={`${fmt(summary.bituachLeumi)}₪`} color={C.blue} />
            <StatCard label='مدفوع' value={`${fmt(summary.blPaid)}₪`} color={C.success} />
            <StatCard label='متبقي' value={`${fmt(summary.blRemaining)}₪`} color={summary.blRemaining > 0 ? C.accent : C.success} />
          </div>
          {addTaxAdvance && (
            addingTax === 'bituach_leumi' ? (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:10 }}>
                <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                  <input type="number" value={taxForm.amount} onChange={e => setTaxForm(f => ({ ...f, amount: e.target.value }))} placeholder="المبلغ ₪"
                    style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none' }} />
                  <input type="date" value={taxForm.date} onChange={e => setTaxForm(f => ({ ...f, date: e.target.value }))}
                    style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none' }} />
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setAddingTax(null)} style={{ flex:1, padding:'8px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer' }}>إلغاء</button>
                  <button onClick={saveAdvance} disabled={saving} style={{ flex:2, padding:'8px', borderRadius:9, border:'none', background:C.blue, color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>{saving ? '...' : 'حفظ الدفعة'}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingTax('bituach_leumi')}
                style={{ width:'100%', padding:'8px', borderRadius:9, border:`1px solid ${C.blue}44`, background:`${C.blue}10`, color:C.blue, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                + تسجيل دفعة ביטוח לאומי
              </button>
            )
          )}
        </Section>
      )}

      {/* ── استقطاعات العمال ── */}
      {mods.workerDeductions && workerDeds.length > 0 && (
        <Section title={`👷 استقطاعات العمال هذا الشهر (${workerDeds.length} عمال)`} color={C.secondary}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {workerDeds.map(({ emp, monthPay, incomeTax, bituachLeumi, total, net }) => (
              <div key={emp.id} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{emp.name}</span>
                  <span style={{ fontSize:10, color:C.textDim, background:`${C.border}80`, borderRadius:6, padding:'2px 6px' }}>
                    {WORKER_TYPE_LABELS[emp.worker_tax_type || 'self']}
                  </span>
                </div>
                {emp.worker_tax_type && emp.worker_tax_type !== 'self' ? (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {[
                      { l:'راتب', v:`${fmt(monthPay)}₪`, c:C.text },
                      { l:'מס הכנסה', v:`${fmt(incomeTax)}₪`, c:C.accent },
                      { l:'ביטוח לאומי', v:`${fmt(bituachLeumi)}₪`, c:C.warning },
                      { l:'صافي', v:`${fmt(net)}₪`, c:C.success },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ textAlign:'center', padding:'4px 8px', background:`${c}10`, borderRadius:8, border:`1px solid ${c}22` }}>
                        <div style={{ fontSize:11, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
                        <div style={{ fontSize:8, color:C.textDim }}>{l}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:10, color:C.textDim }}>راتب {fmt(monthPay)}₪ — حدد نوع العامل للحساب</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Pension / קופת גמל ── */}
      {mods.pensionCalc && (
        <Section title={`🔵 חיסכון פנסיוני — وفر ضريبي ${fmt(Math.max(0, summary.incomeTax - calcAnnualTaxSummaryWithPension(summary.netProfit, pensionMonthly)))}₪`} color={C.blue}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:11, color:C.textDim }}>مساهمة شهرية في قوپت גמל/פנסיה</div>
            {pensEdit ? (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input type="number" value={pensVal} onChange={e => setPensVal(e.target.value)}
                  style={{ width:80, padding:'6px 8px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:12, outline:'none', textAlign:'center' }} />
                <button onClick={() => { setPensionMonthly?.(pensVal); setPensEdit(false) }}
                  style={{ padding:'6px 10px', borderRadius:8, border:'none', background:C.blue, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}><Check size={12} strokeWidth={2.5} /></button>
                <button onClick={() => setPensEdit(false)} style={{ padding:'6px 8px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, cursor:'pointer', display:'flex', alignItems:'center' }}><X size={12} strokeWidth={2.5} /></button>
              </div>
            ) : (
              <button onClick={() => { setPensVal(String(pensionMonthly || '')); setPensEdit(true) }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:`1px solid ${C.blue}44`, background:`${C.blue}10`, color:C.blue, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <span style={{ fontFamily:'monospace', fontWeight:900 }}>{fmt(pensionMonthly || 0)}₪/شهر</span>
                <Pencil size={11} strokeWidth={2} />
              </button>
            )}
          </div>
          {(pensionMonthly || 0) > 0 && (
            <div style={{ display:'flex', gap:6 }}>
              <StatCard label='قسط سنوي' value={`${fmt((pensionMonthly || 0) * 12)}₪`} color={C.blue} />
              <StatCard label='وفر ضريبي' value={`${fmt(Math.max(0, summary.incomeTax - calcAnnualTaxSummaryWithPension(summary.netProfit, pensionMonthly)))}₪`} color={C.success} sub='من مس הכנסה' />
            </div>
          )}
        </Section>
      )}

    </div>
  )
}

function calcAnnualTaxSummaryWithPension(netProfit, pensionMonthly) {
  return calcIncomeTaxAnnual(netProfit, 2.25, (pensionMonthly || 0) * 12)
}
