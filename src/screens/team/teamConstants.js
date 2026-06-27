import { C } from '../../constants/index.js'
import { tl } from '../../lib/labels.js'

// كل تسمية صلاحية ثلاثية اللغة: { ar, he, en }. القيمة (المفتاح) تبقى ثابتة كبيانات.
export const PERM_LABELS = [
  ['can_view_projects',  { ar: 'مشاهدة المشاريع',     he: 'צפייה בפרויקטים',  en: 'View projects' }],
  ['can_edit_projects',  { ar: 'إضافة/تعديل المشاريع', he: 'הוספה/עריכת פרויקטים', en: 'Add/edit projects' }],
  ['can_view_workers',   { ar: 'مشاهدة العمال',       he: 'צפייה בעובדים',    en: 'View workers' }],
  ['can_edit_workers',   { ar: 'إضافة/تعديل العمال',   he: 'הוספה/עריכת עובדים', en: 'Add/edit workers' }],
  ['can_view_expenses',  { ar: 'مشاهدة المصاريف',     he: 'צפייה בהוצאות',    en: 'View expenses' }],
  ['can_add_expenses',   { ar: 'إضافة المصاريف',      he: 'הוספת הוצאות',     en: 'Add expenses' }],
  ['can_view_payments',  { ar: 'مشاهدة الرواتب',      he: 'צפייה במשכורות',   en: 'View salaries' }],
  ['can_add_payments',   { ar: 'إضافة الرواتب',       he: 'הוספת משכורות',    en: 'Add salaries' }],
  ['can_delete',         { ar: 'حذف السجلات',         he: 'מחיקת רשומות',     en: 'Delete records' }],
  ['can_manage_team',    { ar: 'إدارة الفريق',        he: 'ניהול צוות',       en: 'Manage team' }],
  ['can_view_amounts',   { ar: 'مشاهدة المبالغ',      he: 'צפייה בסכומים',    en: 'View amounts' }],
  ['can_view_activity',  { ar: 'سجل النشاط',          he: 'יומן פעילות',      en: 'Activity log' }],
]

// ترجمة تسمية صلاحية حسب اللغة (القيمة المخزّنة لا تتأثّر).
export function permLabel(label, language) {
  return tl(language, label.ar, label.he, label.en)
}

export const ROLE_PRESETS = {
  'مشرف': {
    can_view_projects: true,  can_edit_projects: true,
    can_view_workers:  true,  can_edit_workers:  true,
    can_view_expenses: true,  can_add_expenses:  true,
    can_view_payments: true,  can_add_payments:  true,
    can_delete:        true,  can_manage_team:   false,
    can_view_amounts:  true,  can_view_activity: true,
  },
  'محاسب': {
    can_view_projects: true,  can_edit_projects: false,
    can_view_workers:  true,  can_edit_workers:  false,
    can_view_expenses: true,  can_add_expenses:  true,
    can_view_payments: true,  can_add_payments:  true,
    can_delete:        false, can_manage_team:   false,
    can_view_amounts:  true,  can_view_activity: false,
  },
  'مساعد': {
    can_view_projects: true,  can_edit_projects: true,
    can_view_workers:  true,  can_edit_workers:  true,
    can_view_expenses: true,  can_add_expenses:  true,
    can_view_payments: true,  can_add_payments:  false,
    can_delete:        false, can_manage_team:   false,
    can_view_amounts:  false, can_view_activity: false,
  },
  'عضو': {
    can_view_projects: true,  can_edit_projects: false,
    can_view_workers:  true,  can_edit_workers:  false,
    can_view_expenses: true,  can_add_expenses:  false,
    can_view_payments: false, can_add_payments:  false,
    can_delete:        false, can_manage_team:   false,
    can_view_amounts:  false, can_view_activity: false,
  },
}

export const PRESET_ROLES = ['مشرف', 'محاسب', 'مساعد', 'عضو', 'مخصص']

// أسماء الأدوار المخزّنة (عربية canonical) → ترجمتها للعرض فقط.
export const ROLE_NAMES = {
  'مشرف':  { he: 'מפקח',    en: 'Supervisor' },
  'محاسب': { he: 'רואה חשבון', en: 'Accountant' },
  'مساعد': { he: 'עוזר',    en: 'Assistant' },
  'عضو':   { he: 'חבר',     en: 'Member' },
  'مخصص':  { he: 'מותאם אישית', en: 'Custom' },
}

// ترجمة اسم دور للعرض. القيمة المخزّنة تبقى عربية.
export function tRole(role, language) {
  if (!role || language === 'ar') return role
  const r = ROLE_NAMES[role]
  if (!r) return role
  return language === 'he' ? r.he : (r.en ?? role)
}

export const DEFAULT_PERMS = { ...ROLE_PRESETS['عضو'] }

// Detect which preset matches a given perms object (returns 'مخصص' if none match)
export function detectRole(perms) {
  for (const [role, preset] of Object.entries(ROLE_PRESETS)) {
    if (PERM_LABELS.every(([k]) => !!perms[k] === !!preset[k])) return role
  }
  return 'مخصص'
}

export const ACTION_MAP = {
  insert: { ar: 'أضاف', he: 'הוסיף', en: 'Added' },
  update: { ar: 'عدّل', he: 'עדכן',  en: 'Updated' },
  delete: { ar: 'حذف',  he: 'מחק',   en: 'Deleted' },
  view:   { ar: 'فتح',  he: 'פתח',   en: 'Opened' },
}

export const TABLE_MAP = {
  projects:        { ar: 'مشروع',      he: 'פרויקט',     en: 'Project' },
  employees:       { ar: 'عامل',       he: 'עובד',       en: 'Worker' },
  expenses:        { ar: 'مصروف',      he: 'הוצאה',      en: 'Expense' },
  payments:        { ar: 'دفعة',       he: 'תשלום',      en: 'Payment' },
  work_days:       { ar: 'يوم عمل',    he: 'יום עבודה',  en: 'Work day' },
  client_receipts: { ar: 'إيصال',      he: 'קבלה',       en: 'Receipt' },
  dashboard:       { ar: 'الرئيسية',   he: 'בית',        en: 'Home' },
  workers:         { ar: 'العمال',     he: 'עובדים',     en: 'Workers' },
  workdays:        { ar: 'أيام العمل', he: 'ימי עבודה',  en: 'Work days' },
  settings:        { ar: 'الإعدادات',  he: 'הגדרות',     en: 'Settings' },
  activity:        { ar: 'النشاط',     he: 'פעילות',     en: 'Activity' },
  team:            { ar: 'الفريق',     he: 'צוות',       en: 'Team' },
}

// ترجمة وصف العملية / اسم الجدول في سجلّ النشاط (قيمة غير معروفة تُرجَع كما هي).
export function tAction(action, language) {
  const a = ACTION_MAP[action]
  return a ? tl(language, a.ar, a.he, a.en) : action
}

export function tTable(tbl, language) {
  const t = TABLE_MAP[tbl]
  return t ? tl(language, t.ar, t.he, t.en) : tbl
}

export const ACTION_COLOR = {
  insert: C.success,
  update: C.warning,
  delete: C.accent,
  view:   C.blue,
}

export function fmtRelative(ts, language) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return tl(language, 'الآن', 'עכשיו', 'Now')
  if (min < 60) return tl(language, `منذ ${min} د`, `לפני ${min} ד׳`, `${min}m ago`)
  const hr = Math.floor(min / 60)
  if (hr  < 24) return tl(language, `منذ ${hr} س`, `לפני ${hr} ש׳`, `${hr}h ago`)
  const days = Math.floor(hr / 24)
  return tl(language, `منذ ${days} يوم`, `לפני ${days} ימים`, `${days}d ago`)
}
