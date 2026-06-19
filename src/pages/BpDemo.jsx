import React from 'react'
import {
  HardHat, Search, Bell, Users, CalendarDays, TrendingUp, Receipt,
  LayoutDashboard, Building2, Wallet, Settings,
} from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { BlueprintEmpty } from '../ui/Blueprint.jsx'

// ⚠️ صفحة معاينة مؤقّتة (مكشوفة بلا تسجيل) لاستعراض «الطابع الهندسي» على الشاشات
// الفاضية **داخل هيكل التطبيق الحقيقي** مباشرةً على Vercel — الشاشات الحقيقية خلف
// تسجيل الدخول. تُحذف بعد اعتماد التصميم. المسار: /bpdemo

// إطار يحاكي شكل التطبيق (هيدر + شريط عنوان + تبويبات سفلية) — نفس البطانة البصرية
function AppFrame({ title, sub, navActive = 2, children }) {
  const navIcons = [LayoutDashboard, Building2, Users, Wallet, Settings]
  return (
    <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: C.bg, borderRadius: 26, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
      {/* هيدر التطبيق */}
      <div style={{ background: C.surface, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Contractor Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[Search, Bell].map((Ic, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic size={14} color={C.textDim} />
            </div>
          ))}
        </div>
      </div>
      {/* شريط العنوان */}
      <div style={{ padding: '16px 16px 6px' }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 3 }}>{sub}</div>}
      </div>
      {/* الجسم — الشاشة الفاضية */}
      <div style={{ padding: '8px 14px 16px', minHeight: 240 }}>
        {children}
      </div>
      {/* التبويبات السفلية */}
      <div style={{ background: `${C.surface}`, padding: '8px 6px 12px', display: 'flex', justifyContent: 'space-around', borderTop: `1px solid ${C.border}` }}>
        {navIcons.map((Ic, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Ic size={i === navActive ? 19 : 17} color={i === navActive ? C.primary : C.textDim} strokeWidth={i === navActive ? 2.5 : 1.9} />
            {i === navActive && <div style={{ width: 14, height: 2.5, borderRadius: 2, background: GRAD.brand }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BpDemo() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, direction: 'rtl', fontFamily: "'Noto Sans Arabic', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${C.cyan}12`, border: `1px solid ${C.cyan}40`, borderRadius: 10, padding: '6px 14px', fontSize: 11, fontWeight: 800, color: C.cyan, letterSpacing: '0.06em', marginBottom: 14 }}>
            معاينة مؤقّتة — هيك بتطلع الشاشات الفاضية جوّا التطبيق
          </div>
          <h1 style={{ fontSize: 'clamp(21px,4vw,32px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            الطابع الهندسي داخل التطبيق
          </h1>
          <p style={{ fontSize: 13.5, color: C.textDim, marginTop: 10, lineHeight: 1.7, maxWidth: 560, margin: '10px auto 0' }}>
            نفس مكوّن الشاشة الفاضية الحقيقي اللي بيستعمله التطبيق — معروض داخل هيكل التطبيق
            (هيدر + تبويبات) لأنّ الشاشات الفعلية خلف تسجيل الدخول.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
          <AppFrame title="إدارة الفريق" sub="أعضاء فريقك وصلاحياتهم" navActive={2}>
            <BlueprintEmpty icon={<Users size={28} color={C.cyan} strokeWidth={1.9} />} text="لا يوجد أعضاء فريق بعد — أضف أول عضو الآن" label="الفريق — CP-00" />
          </AppFrame>

          <AppFrame title="أيام العمل" sub="تسجيل وموافقة أيام العمل" navActive={2}>
            <BlueprintEmpty icon={<CalendarDays size={28} color={C.cyan} strokeWidth={1.9} />} text="لا توجد أيام عمل مسجّلة لهذا الشهر" label="أيام العمل — CP-00" />
          </AppFrame>

          <AppFrame title="المالية — المدخولات" sub="قبضات العملاء" navActive={3}>
            <BlueprintEmpty icon={<TrendingUp size={28} color={C.cyan} strokeWidth={1.9} />} text="لا توجد قبضات لهذا المشروع" label="المدخولات — CP-00" />
          </AppFrame>

          <AppFrame title="المالية — المصاريف" sub="مصاريف المشروع" navActive={3}>
            <BlueprintEmpty icon={<Receipt size={28} color={C.cyan} strokeWidth={1.9} />} text="لا توجد مصاريف لهذا المشروع" label="المصاريف — CP-00" />
          </AppFrame>
        </div>
      </div>
    </div>
  )
}
