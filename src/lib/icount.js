import { supabase } from './supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// iCount payment gateway (بوّابة دفع إسرائيلية — فيزا/ماستركارد + הוראת קבע)
//
// نمط العمل مرآة لـ paddle.js لكن iCount يعتمد **إعادة توجيه** لصفحة دفع مستضافة
// (مش overlay). كل الأسرار (cid/user/pass، المبالغ، توقيع الـIPN) تعيش **خادمياً**
// في الـ edge function `icount-billing` — الواجهة فقط تطلب الرابط وتعيد التوجيه.
//
// خامل افتراضياً: لا يعمل إلا إذا ضُبط `VITE_PAYMENT_PROVIDER=icount`
// و`VITE_ICOUNT_ENABLED=true` + أسرار الـ edge functions.
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_PLANS = ['starter', 'pro', 'business']

/** هل بوّابة iCount مُفعّلة ومُهيّأة لهذه الخطة/الدورة؟ */
export function isCheckoutConfigured(cycle, plan) {
  if (import.meta.env.VITE_ICOUNT_ENABLED !== 'true') return false
  return KNOWN_PLANS.includes(plan)
}

/**
 * يفتح صفحة دفع iCount المستضافة لخطة معيّنة (إعادة توجيه المتصفح).
 * المبلغ + إعداد التكرار (הוראת קבע) يُحسبان خادمياً — الواجهة لا تمرّر مبالغ.
 *
 * ملاحظة: هوية المستخدم تؤخذ خادمياً من الجلسة (لا تُمرَّر هنا) — يبقى البارامتر
 * `user` في التوقيع لتماثل واجهة paddle.openCheckout فقط.
 *
 * @param {object} opts
 * @param {'starter'|'pro'|'business'} opts.plan
 * @param {{ id: string }} opts.org
 * @param {'month'|'year'} [opts.cycle]
 */
export async function openCheckout({ plan, org, cycle = 'month' }) {
  if (!isCheckoutConfigured(cycle, plan)) {
    throw new Error('بوّابة الدفع (iCount) غير مفعّلة بعد — تواصل معنا.')
  }
  if (!org?.id) throw new Error('خطأ في تحميل بيانات الحساب — أعد تحميل الصفحة.')

  const { data, error } = await supabase.functions.invoke('icount-billing', {
    body: { action: 'checkout', plan, cycle, org_id: org.id },
  })

  if (error) throw new Error(error.message || 'تعذّر فتح صفحة الدفع.')
  if (!data?.url) throw new Error(data?.error || 'تعذّر إنشاء رابط الدفع.')

  if (typeof window !== 'undefined') window.location.href = data.url
  return data.url
}

/**
 * إدارة/إلغاء الاشتراك. iCount ما عندو بوّابة عميل ذاتية مثل Paddle، فبنلغي
 * أمر التكرار (הוראת קבע) خادمياً عبر `icount-billing` بعد تأكيد المستخدم.
 */
export async function manageSubscription(subscription) {
  const ok = typeof window !== 'undefined'
    ? window.confirm('هل تريد إلغاء اشتراكك؟ سيبقى نشطاً حتى نهاية الفترة المدفوعة الحالية.')
    : true
  if (!ok) return

  const { data, error } = await supabase.functions.invoke('icount-billing', {
    body: { action: 'cancel', sub_id: subscription?.icount_sub_id },
  })

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'تعذّر إلغاء الاشتراك — تواصل معنا.')
  }
  if (typeof window !== 'undefined') {
    alert('تمّ تسجيل طلب الإلغاء. سيبقى اشتراكك نشطاً حتى نهاية الفترة الحالية.')
  }
}
