// ─── مشاركة عبر WhatsApp ────────────────────────────────────────────────────────
// أدوات مركزية لتطبيع أرقام الهاتف وبناء روابط wa.me وقوالب الرسائل.
// الجمهور إسرائيلي بالأساس — أرقام محلية (05x) تُحوّل تلقائياً للصيغة الدولية (9725x).

import { fmt, fmtDate } from './helpers.js'

/**
 * تطبيع رقم الهاتف لصيغة دولية بدون رموز (مناسبة لـ wa.me).
 * أمثلة: "050-123 4567" → "972501234567" · "+972 50 123" → "97250123"
 * @param {string} raw - الرقم كما أدخله المستخدم
 * @returns {string|null} أرقام فقط بصيغة دولية، أو null إذا فارغ/غير صالح
 */
export function normalizePhone(raw) {
  if (!raw) return null
  const hadPlus = String(raw).trim().startsWith('+')
  const digits  = String(raw).replace(/\D/g, '')
  if (!digits) return null

  if (hadPlus)                 return digits            // دولي صريح (+972..., +1...)
  if (digits.startsWith('00')) return digits.slice(2)   // بادئة دولية 00972...
  if (digits.startsWith('972'))return digits            // إسرائيلي بصيغة دولية أصلاً
  if (digits.startsWith('0'))  return '972' + digits.slice(1) // محلي 05x → 9725x
  if (digits.length === 9 && digits.startsWith('5')) return '972' + digits // 5xxxxxxxx
  return digits
}

/**
 * بناء رابط wa.me — بدون رقم يفتح واتساب لاختيار المستلم.
 * @param {string} [phone] - رقم الهاتف (اختياري)
 * @param {string} [text]  - نص الرسالة (اختياري)
 */
export function waUrl(phone, text = '') {
  const normalized = normalizePhone(phone)
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/'
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/**
 * فتح محادثة واتساب في تبويب جديد.
 * @returns {boolean} نجاح فتح النافذة
 */
export function openWhatsApp(phone, text = '') {
  const win = window.open(waUrl(phone, text), '_blank', 'noopener,noreferrer')
  return !!win
}

// ─── قوالب الرسائل ──────────────────────────────────────────────────────────────
// رسائل عربية مهنية بدون إيموجي. كل قالب يرجّع نصاً جاهزاً للإرسال.
export const waMessages = {
  /** دعوة العامل لبوابته الخاصة مع الرابط (وبيانات الدخول اختيارياً) */
  portalInvite: ({ workerName = '', url, username, password } = {}) =>
    `مرحبا ${workerName}،\n` +
    `هذا رابط بوابتك الخاصة — تقدر تتابع أيام عملك ورواتبك وتطلب سلفة:\n${url}` +
    (username ? `\n\nاسم المستخدم: ${username}` : '') +
    (password ? `\nكلمة المرور: ${password}` : ''),

  /** إشعار صرف راتب */
  salaryPaid: ({ workerName = '', amount = 0, date } = {}) =>
    `مرحبا ${workerName}،\n` +
    `تم صرف راتبك بمبلغ ₪${fmt(amount)}` +
    (date ? ` بتاريخ ${fmtDate(date)}` : '') + `.\nشكراً لك.`,

  /** كشف حساب العامل (مستحق / مدفوع / سلف / المتبقي) */
  workerStatement: ({ workerName = '', earned = 0, paid = 0, advances = 0, balance = 0 } = {}) =>
    `كشف حساب — ${workerName}\n` +
    `إجمالي المستحق: ₪${fmt(earned)}\n` +
    `المدفوع: ₪${fmt(paid)}\n` +
    `السلف: ₪${fmt(advances)}\n` +
    `${balance >= 0 ? 'المتبقي لك' : 'دفعت زيادة'}: ₪${fmt(Math.abs(balance))}`,

  /** تذكير العميل بمبلغ متبقٍ للتحصيل */
  paymentReminder: ({ clientName = '', projectName = '', amount = 0 } = {}) =>
    `مرحبا ${clientName},\n`.replace('مرحبا ,', 'مرحبا،') +
    `تذكير بخصوص مشروع "${projectName}".\n` +
    `المبلغ المتبقي للتحصيل: ₪${fmt(amount)}.\n` +
    `نشكر تعاونكم.`,
}
