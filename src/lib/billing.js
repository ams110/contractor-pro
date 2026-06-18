import * as paddle from './paddle.js'
import * as icount from './icount.js'

// ─────────────────────────────────────────────────────────────────────────────
// مبدّل بوّابة الدفع — مصدر واحد لكل الشاشات (PricingPage / SettingsScreen).
//
// اختر المزوّد بمتغيّر بيئة وقت البناء:
//   VITE_PAYMENT_PROVIDER = 'paddle'  (افتراضي — لا يغيّر شيئاً)
//   VITE_PAYMENT_PROVIDER = 'icount'  (بوّابة إسرائيلية — فيزا + הוראת קבע)
//
// هيك نضيف/نبدّل بوّابة دفع بسطر env واحد بدون لمس كود الشاشات.
// ─────────────────────────────────────────────────────────────────────────────

export const PROVIDER = (import.meta.env.VITE_PAYMENT_PROVIDER || 'paddle').toLowerCase()

const impl = PROVIDER === 'icount' ? icount : paddle

/** يفتح صفحة الدفع للخطة المختارة (overlay لـ Paddle · إعادة توجيه لـ iCount) */
export function openCheckout(opts) {
  return impl.openCheckout(opts)
}

/** هل رابط الدفع مُهيّأ لهذه الدورة/الخطة عند المزوّد النشط؟ */
export function isCheckoutConfigured(cycle, plan) {
  return impl.isCheckoutConfigured(cycle, plan)
}

/** إدارة/إلغاء الاشتراك (بوّابة عميل Paddle · إلغاء הוראת קבע لـ iCount) */
export function manageSubscription(subscription) {
  return impl.manageSubscription(subscription)
}
