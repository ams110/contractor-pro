import React, { useState } from 'react'
import { Calculator, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { computeSalaryPreview } from '../lib/salaryPreview.js'
import { fmt } from '../lib/helpers.js'
import { useAppStore } from '../store/useAppStore.js'
import { tl } from '../lib/labels.js'

// حاسبة راتب عامل قابلة لإعادة الاستخدام:
//  mode='public'     → صفحة /calculator (اكتساب)؛ CTA يسجّل المستخدم.
//  mode='onboarding' → الإعداد الأول؛ CTA يحفظ القيم كأول عامل حقيقي.
// onCta يستلم { dailyWage, hoursPerDay, days } (أرقام) ويقرّر المضيف ما يعمل.
export default function SalaryCalculator({ mode = 'public', onCta, ctaLabel, busy = false, initialValues = null }) {
  const language = useAppStore(s => s.language)
  // جسر القيمة: لو إجت قيم من الحاسبة العامة (قبل التسجيل) نعبّيها بدل الافتراضي
  const [dailyWage, setDailyWage]     = useState(() => initialValues?.dailyWage   ? String(initialValues.dailyWage)   : '400')
  const [hoursPerDay, setHoursPerDay] = useState(() => initialValues?.hoursPerDay ? String(initialValues.hoursPerDay) : '10')
  const [days, setDays]               = useState(() => initialValues?.days        ? String(initialValues.days)        : '22')

  const r = computeSalaryPreview({ dailyWage, hoursPerDay, days })

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12, background: C.surface,
    border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 16, fontWeight: 700,
    fontFamily: 'inherit', textAlign: 'center', outline: 'none',
  }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 6, display: 'block' }

  return (
    <div dir="rtl" style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
      {/* المدخلات */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>{tl(language, 'الأجر اليومي (₪)', 'שכר יומי (₪)', 'Daily wage (₪)')}</label>
          <input type="number" inputMode="numeric" min="0" value={dailyWage}
            onChange={e => setDailyWage(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{tl(language, 'ساعات اليوم', 'שעות ביום', 'Hours per day')}</label>
          <input type="number" inputMode="numeric" min="0" max="24" value={hoursPerDay}
            onChange={e => setHoursPerDay(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{tl(language, 'عدد الأيام', 'מספר ימים', 'Number of days')}</label>
          <input type="number" inputMode="numeric" min="0" max="31" value={days}
            onChange={e => setDays(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* النتيجة */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${C.primary}14, ${C.surface} 70%)`,
        border: `1px solid ${C.primary}33`, borderRadius: 20, padding: 18, marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 4 }}>{tl(language, 'راتب الشهر التقديري', 'משכורת חודשית משוערת', 'Estimated monthly salary')}</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          ₪{fmt(r.monthTotal)}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{tl(language, 'راتب اليوم الواحد', 'שכר ליום', 'Pay per day')}: ₪{fmt(r.dayPay)}</div>

        {r.hasOvertime && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: C.card, borderRadius: 12, border: `1px solid ${C.primary}26` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 6 }}>
              <Clock size={14} strokeWidth={2.4} /> {tl(language, 'الساعات الإضافية محسوبة تلقائياً', 'שעות נוספות מחושבות אוטומטית', 'Overtime calculated automatically')}
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              {r.regularHours} {tl(language, 'ساعات عادية', 'שעות רגילות', 'regular hours')}
              {r.ot125Hours > 0 && <> · {r.ot125Hours} {tl(language, 'ساعة', 'שעות', 'hours')} ×125%</>}
              {r.ot150Hours > 0 && <> · {r.ot150Hours} {tl(language, 'ساعة', 'שעות', 'hours')} ×150%</>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          {tl(language, '+ الخصومات والضرائب تُحسب تلقائياً داخل التطبيق.', '+ הניכויים והמסים מחושבים אוטומטית בתוך האפליקציה.', '+ Deductions and taxes are calculated automatically in the app.')}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onCta?.({ dailyWage: Number(dailyWage) || 0, hoursPerDay: Number(hoursPerDay) || 0, days: Number(days) || 0 })}
        disabled={busy}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
          background: busy ? `${C.primary}40` : GRAD.brand, color: '#fff',
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 28px rgba(249,115,22,0.4)',
        }}>
        {mode === 'onboarding' ? <Sparkles size={18} strokeWidth={2.2} /> : <Calculator size={18} strokeWidth={2.2} />}
        {ctaLabel || (mode === 'onboarding'
          ? tl(language, 'احفظ كعامل حقيقي وابدأ', 'שמור כעובד אמיתי והתחל', 'Save as real worker and start')
          : tl(language, 'سجّل مجاناً واحفظ عمّالك', 'הירשם בחינם ושמור את העובדים שלך', 'Sign up free and save your workers'))}
        <ArrowLeft size={18} strokeWidth={2.5} />
      </button>

      {/* تنويه: الحاسبة المجانية أداة إرشادية، ليست استشارة محاسبية */}
      <div style={{ marginTop: 10, fontSize: 10, color: C.textDim, textAlign: 'center', lineHeight: 1.5 }}>
        {tl(language,
          'النتيجة تقديرية للإرشاد فقط، وليست استشارة محاسبية رسمية.',
          'התוצאה משוערת להכוונה בלבד ואינה ייעוץ חשבונאי רשמי.',
          'Result is an estimate for guidance only, not formal accounting advice.')}
      </div>
    </div>
  )
}
