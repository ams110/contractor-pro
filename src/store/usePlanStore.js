import { create } from 'zustand'

// ترتيب الخطط للمقارنة الهرمية
const ORDER = { free: 0, starter: 1, pro: 2, business: 3 }

/**
 * مخزن خفيف لمعلومات خطة المالك — يكتبه App.jsx ويقرأه أي شاشة تحتاج
 * تقييد ميزة حسب الخطة، بدون prop-drilling.
 *
 * - paddleEnabled=false → الدفع غير مُفعّل بعد، فكل الميزات مفتوحة.
 * - trialActive=true    → خلال التجربة المجانية يحصل المستخدم على وصول كامل (أعلى خطة).
 */
export const usePlanStore = create((set) => ({
  plan:          'free',
  trialActive:   false,
  paddleEnabled: false,
  setPlanInfo:   (info) => set(info),
}))

/** تحديث معلومات الخطة من خارج المكوّنات (يستدعيها App.jsx) */
export function setPlanInfo(info) {
  usePlanStore.getState().setPlanInfo(info)
}

/** هل الخطة الحالية تفتح ميزة تتطلّب خطة معيّنة؟ (نسخة غير تفاعلية للاستدعاء داخل دوال) */
export function planHasFeature(requiredPlan) {
  const { plan, trialActive, paddleEnabled } = usePlanStore.getState()
  if (!paddleEnabled) return true
  if (trialActive) return true
  return (ORDER[plan] ?? 0) >= (ORDER[requiredPlan] ?? 0)
}

/** نسخة تفاعلية (hook) — يعيد الرسم عند تغيّر الخطة */
export function useHasFeature(requiredPlan) {
  return usePlanStore((s) => {
    if (!s.paddleEnabled) return true
    if (s.trialActive) return true
    return (ORDER[s.plan] ?? 0) >= (ORDER[requiredPlan] ?? 0)
  })
}
