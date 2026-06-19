import React from 'react'
import { CalendarDays, Users, TrendingUp, FolderOpen, Receipt, Banknote } from 'lucide-react'
import { C } from '../constants/index.js'
import { BlueprintEmpty, BlueprintFrame } from '../ui/Blueprint.jsx'

// ⚠️ صفحة معاينة مؤقّتة (مكشوفة بلا تسجيل) لاستعراض «الطابع الهندسي» على الشاشات
// الفاضية مباشرةً على Vercel. تُحذف بعد اعتماد التصميم. المسار: /bpdemo
export default function BpDemo() {
  const items = [
    { icon: Users,        text: 'لا يوجد أعضاء فريق بعد — أضف أول عضو الآن', label: 'الفريق — CP-00' },
    { icon: CalendarDays, text: 'لا توجد أيام عمل مسجّلة لهذا الشهر',         label: 'أيام العمل — CP-00' },
    { icon: TrendingUp,   text: 'لا توجد قبضات لهذا المشروع',                 label: 'المدخولات — CP-00' },
    { icon: Receipt,      text: 'لا توجد مصاريف لهذا المشروع',                label: 'المصاريف — CP-00' },
    { icon: Banknote,     text: 'لا توجد رواتب مرتبطة بهذا المشروع',          label: 'الرواتب — CP-00' },
    { icon: FolderOpen,   text: 'لا توجد مشاريع',                            label: 'المشاريع — CP-00' },
  ]
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, direction: 'rtl', fontFamily: "'Noto Sans Arabic', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${C.cyan}12`, border: `1px solid ${C.cyan}40`, borderRadius: 10, padding: '6px 14px', fontSize: 11, fontWeight: 800, color: C.cyan, letterSpacing: '0.06em', marginBottom: 14 }}>
            معاينة مؤقّتة — الطابع الهندسي على الشاشات الفاضية
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            أكسسوارات «دفتر المخططات» داخل التطبيق
          </h1>
          <p style={{ fontSize: 14, color: C.textDim, marginTop: 10, lineHeight: 1.7, maxWidth: 560, margin: '10px auto 0' }}>
            هيك بتطلع الشاشات الفاضية جوّا التطبيق (الفريق، أيام العمل، المالية…) — ورقة مخطط
            خفيفة بدون ما نلمس البطاقات والجداول اليومية.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
          {items.map((it, i) => (
            <BlueprintEmpty key={i} icon={<it.icon size={28} color={C.cyan} strokeWidth={1.9} />} text={it.text} label={it.label} />
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <BlueprintFrame label="الإطار العام — BlueprintFrame" padding="48px 22px 36px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
              نفس الإطار قابل لإعادة الاستعمال لاحقاً لشاشة الترحيب والإعداد لأول مرة —
              لو حابب نوسّعه.
            </div>
          </BlueprintFrame>
        </div>
      </div>
    </div>
  )
}
