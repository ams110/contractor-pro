import { planHasFeature } from '../store/usePlanStore.js'
import { useAppStore } from '../store/useAppStore.js'
import { navigate } from '../Router.jsx'

/**
 * بوّابة ميزة التصدير (Excel/PDF) — ميزة مدفوعة بخطّة Pro فأعلى (كما هو موعود في صفحة الأسعار).
 *
 * تُستدعى داخل onClick قبل تنفيذ التصدير: ترجع true لو الخطة تسمح (Pro+ أو خلال التجربة
 * أو الدفع غير مُفعّل)، وإلا تعرض رسالة ترقية وتوجّه لصفحة الأسعار وترجع false.
 *
 * ⚠️ ملاحظة قانونية: النسخة الاحتياطية الكاملة (`exportAllDataJSON` في الإعدادات) تبقى
 * مجانية دائماً — فهي حقّ نقل البيانات الموعود في سياسة الخصوصية وصفحة حذف الحساب،
 * ولا تمرّ أبداً بهذه البوّابة.
 */
export function ensureExportAllowed(kind = 'Excel') {
  if (planHasFeature('pro')) return true
  try {
    useAppStore.getState().showToast?.(`📤 تصدير ${kind} ميزة بخطّة Pro — رقّي خطّتك للتصدير`, 'info')
  } catch { /* noop */ }
  try { navigate('/pricing') } catch { /* noop */ }
  return false
}
