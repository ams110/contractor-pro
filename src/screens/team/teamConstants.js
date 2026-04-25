import { C } from '../../constants/index.js'

export const PERM_LABELS = [
  ['can_view_projects',  'مشاهدة المشاريع'],
  ['can_edit_projects',  'إضافة/تعديل المشاريع'],
  ['can_view_workers',   'مشاهدة العمال'],
  ['can_edit_workers',   'إضافة/تعديل العمال'],
  ['can_view_expenses',  'مشاهدة المصاريف'],
  ['can_add_expenses',   'إضافة المصاريف'],
  ['can_view_payments',  'مشاهدة الرواتب'],
  ['can_add_payments',   'إضافة الرواتب'],
  ['can_delete',         'حذف السجلات'],
  ['can_manage_team',    'إدارة الفريق'],
  ['can_view_amounts',   'مشاهدة المبالغ'],
  ['can_view_activity',  'سجل النشاط'],
]

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

export const DEFAULT_PERMS = { ...ROLE_PRESETS['عضو'] }

// Detect which preset matches a given perms object (returns 'مخصص' if none match)
export function detectRole(perms) {
  for (const [role, preset] of Object.entries(ROLE_PRESETS)) {
    if (PERM_LABELS.every(([k]) => !!perms[k] === !!preset[k])) return role
  }
  return 'مخصص'
}

export const ACTION_MAP = {
  insert: 'أضاف',
  update: 'عدّل',
  delete: 'حذف',
  view:   'فتح',
}

export const TABLE_MAP = {
  projects:        'مشروع',
  employees:       'عامل',
  expenses:        'مصروف',
  payments:        'دفعة',
  work_days:       'يوم عمل',
  client_receipts: 'إيصال',
  dashboard:       'الرئيسية',
  workers:         'العمال',
  workdays:        'أيام العمل',
  settings:        'الإعدادات',
  activity:        'النشاط',
  team:            'الفريق',
}

export const ACTION_COLOR = {
  insert: C.success,
  update: C.warning,
  delete: C.accent,
  view:   C.blue,
}

export function fmtRelative(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'الآن'
  if (min < 60) return `منذ ${min} د`
  const hr = Math.floor(min / 60)
  if (hr  < 24) return `منذ ${hr} س`
  return `منذ ${Math.floor(hr / 24)} يوم`
}
