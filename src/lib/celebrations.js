// ─── محرّك لحظات الاحتفال (نقيّ) ──────────────────────────────────────────────
// نكهات الاحتفال: كل نكهة لها لوحة ألوان من الهوية + كثافة جسيمات + أيقونة + مدّة
// + تدرّج للقشرة المركزيّة + نمط اهتزاز (haptic). نقيّ تماماً وقابل للاختبار بلا React
// (الأيقونة مُمثّلة كـ key سلسلة، والمكوّن يربطها بأيقونة Lucide).
import { C, GRAD } from '../constants/index.js'

export const CELEBRATION_VARIANTS = {
  // فوز كبير — إغلاق مشروع، إعداد أوّل، اشتراك جديد
  win: {
    icon:     'party',
    gradient: GRAD.primary,
    colors:   [C.primary, C.gold, C.secondary, C.success, C.cyan, '#FFFFFF'],
    count:    72,
    duration: 2600,
    gravity:  1,
    haptic:   [0, 40, 60, 40],
  },
  // مال داخل — قبض من عميل
  money: {
    icon:     'coins',
    gradient: GRAD.gold,
    colors:   [C.gold, C.success, C.primary, '#FFE08A', '#FFFFFF'],
    count:    56,
    duration: 2200,
    gravity:  1.15,
    haptic:   [0, 35, 50, 35],
  },
  // نجاح متوسّط — إضافة عنصر / موافقة
  success: {
    icon:     'check',
    gradient: GRAD.success,
    colors:   [C.success, C.cyan, C.primary, '#FFFFFF'],
    count:    38,
    duration: 1700,
    gravity:  1.1,
    haptic:   [0, 25],
  },
  // علامة فارقة — تحقيق هدف
  milestone: {
    icon:     'trophy',
    gradient: GRAD.purple,
    colors:   [C.gold, C.primary, C.secondary, '#FFE08A', '#FFFFFF'],
    count:    84,
    duration: 3000,
    gravity:  0.9,
    haptic:   [0, 50, 80, 50, 80],
  },
}

export const DEFAULT_VARIANT = 'win'

// يُرجِع إعداد النكهة، أو نكهة الفوز الافتراضيّة لأي قيمة غير معروفة.
export function celebrationConfig(variant) {
  return CELEBRATION_VARIANTS[variant] || CELEBRATION_VARIANTS[DEFAULT_VARIANT]
}
