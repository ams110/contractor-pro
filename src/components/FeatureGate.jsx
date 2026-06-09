import React from 'react'
import { Lock, Sparkles, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { useHasFeature } from '../store/usePlanStore.js'
import { navigate } from '../Router.jsx'

const PLAN_LABEL = { starter: 'Starter', pro: 'Pro', business: 'Business' }

/**
 * يلفّ ميزة مدفوعة. إذا الخطة الحالية تكفي (أو خلال التجربة / الدفع غير مُفعّل)
 * يعرض المحتوى؛ وإلا يعرض بطاقة ترقية أنيقة بدل كسر الشاشة.
 *
 *   <FeatureGate requiredPlan="pro" title="إدارة الفريق">
 *     <TeamScreen ... />
 *   </FeatureGate>
 */
export default function FeatureGate({ requiredPlan = 'pro', title, description, children }) {
  const allowed = useHasFeature(requiredPlan)
  if (allowed) return children

  const planName = PLAN_LABEL[requiredPlan] || 'Pro'

  return (
    <div style={{ padding: '24px 16px', direction: 'rtl' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{
          position: 'relative', overflow: 'hidden', maxWidth: 460, margin: '32px auto',
          background: `linear-gradient(135deg, ${C.secondary}14, ${C.surface} 70%)`,
          border: `1px solid ${C.secondary}33`, borderRadius: 22, padding: '28px 22px', textAlign: 'center',
        }}>
        <div style={{ position: 'absolute', insetInlineEnd: -40, top: -40, width: 170, height: 170, background: `radial-gradient(circle, ${C.secondary}45, transparent 70%)`, opacity: 0.35, pointerEvents: 'none' }} />

        <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.secondary}1c`, border: `1px solid ${C.secondary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Lock size={28} color={C.secondary} strokeWidth={2} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.secondary}16`, border: `1px solid ${C.secondary}3a`, borderRadius: 9, padding: '4px 11px', marginBottom: 14 }}>
          <Sparkles size={12} color={C.secondary} />
          <span style={{ fontSize: 11, fontWeight: 800, color: C.secondary }}>ميزة خطة {planName}</span>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>
          {title || 'هذه الميزة بحاجة لترقية'}
        </h3>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, marginBottom: 22 }}>
          {description || `رقِّ خطتك إلى ${planName} لفتح هذه الميزة والاستفادة منها بالكامل.`}
        </p>

        <button onClick={() => navigate('/pricing')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px 28px', borderRadius: 14, boxShadow: `0 8px 28px ${C.secondary}40` }}>
          عرض الخطط والترقية
          <ArrowLeft size={17} strokeWidth={2.5} />
        </button>
      </motion.div>
    </div>
  )
}
