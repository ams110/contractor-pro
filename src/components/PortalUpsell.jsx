import React from 'react'
import { Lock, Sparkles, ArrowLeft } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { navigate } from '../Router.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة ترقية مدمجة لبوّابة العامل — تظهر بدل أدوات المشاركة/QR عندما
//  تكون خطة المالك أقل من Pro. مطابقة لوعد صفحة التسعير (ميزة Pro).
//  بصرية بحتة: تُستعمل داخل بطاقات الهوية (المقاول/العامل) وتفاصيل العامل.
// ════════════════════════════════════════════════════════════════════════
export default function PortalUpsell({ lang = 'ar', style }) {
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minWidth: 0, ...style }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: `${C.secondary}1c`, border: `1px solid ${C.secondary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Lock size={20} color={C.secondary} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{L('بوّابة العامل', 'פורטל העובד', 'Worker Portal')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: `${C.secondary}16`, border: `1px solid ${C.secondary}3a`, borderRadius: 7, padding: '2px 7px' }}>
            <Sparkles size={9} color={C.secondary} />
            <span style={{ fontSize: 9, fontWeight: 800, color: C.secondary }}>Pro</span>
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: C.textDim, lineHeight: 1.5, marginBottom: 8 }}>
          {/* «اللحظتان الساحرتان» من محاكاة العمال: كشف مطابق قدام الورشة + سلفة من عالسلم */}
          {L('عاملك بيشوف كشفه مظبوط شيكل بشيكل، وبيطلب سلفة من عالسقالة بلا ما يوقّفك — ولا هوشة آخر الشهر.',
             'העובד רואה דוח מדויק שקל בשקל ומבקש מקדמה מהפיגום בלי לעצור אותך — בלי ויכוחים בסוף החודש.',
             'Your worker sees an exact statement and requests an advance from the scaffold — no end-of-month fights.')}
        </div>
        <button onClick={(e) => { e.stopPropagation(); navigate('/pricing') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '7px 14px', borderRadius: 10, fontFamily: 'inherit' }}>
          {L('ترقية', 'שדרג', 'Upgrade')}
          <ArrowLeft size={13} strokeWidth={2.5} style={{ transform: lang === 'en' ? 'scaleX(-1)' : 'none' }} />
        </button>
      </div>
    </div>
  )
}
