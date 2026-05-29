import { create } from 'zustand'

// ─── مخزن بيانات الأعمال المشتركة ──────────────────────────────────────────────
// مرآة للبيانات المفلترة (حسب الصلاحيات) التي يحمّلها App عبر الـ hooks.
// الهدف: تقرأ المكوّنات البيانات من هنا مباشرةً بدل تمريرها يدوياً عبر props
// طبقة بعد طبقة (prop drilling) — وهو ما سبّب أخطاء مثل "advances is not defined".
//
// ملاحظة: هذا المخزن للقراءة فقط من جهة المكوّنات؛ المصدر الموثوق يبقى الـ hooks
// في App، وهي تزامن القيم هنا عبر setData. لا منطق تحميل/Supabase هنا.
export const useDataStore = create((set) => ({
  projects:       [],
  employees:      [],
  workDays:       [],
  expenses:       [],
  payments:       [],
  clientReceipts: [],
  advances:       [],

  // يستدعيها App عند تغيّر البيانات المفلترة (visible*)
  setData: (data) => set(data),
}))
