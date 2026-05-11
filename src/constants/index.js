// ─── New Color System (Psychology-Based) ─────────────────────────────────────
export const C = {
  // Backgrounds
  bg:        '#07080F',
  surface:   '#0D0F1C',
  card:      '#12152A',

  // Brand
  primary:   '#F97316',   // orange  — energy + construction
  secondary: '#7C3AED',   // violet  — professionalism
  gold:      '#D97706',   // gold    — wealth + success
  cyan:      '#06B6D4',   // cyan    — technology

  // Status
  success:   '#22C55E',
  warning:   '#EAB308',
  accent:    '#EF4444',

  // Text
  text:      '#F8FAFC',
  textDim:   '#64748B',
  textMuted: '#1C2030',

  // Borders (orange-tinted)
  border:    'rgba(249,115,22,0.08)',
  borderMid: 'rgba(249,115,22,0.18)',

  // Legacy aliases (kept for backwards compat with existing screens)
  blue:      '#3B82F6',
  purple:    '#8B5CF6',
  orange:    '#F97316',
  pink:      '#EC4899',
}

export const GRAD = {
  primary: 'linear-gradient(135deg, #F97316, #DC2626)',
  premium: 'linear-gradient(135deg, #7C3AED, #2563EB)',
  gold:    'linear-gradient(135deg, #D97706, #F59E0B)',
  success: 'linear-gradient(135deg, #22C55E, #06B6D4)',
  danger:  'linear-gradient(135deg, #EF4444, #F97316)',
  cyan:    'linear-gradient(135deg, #06B6D4, #0EA5E9)',
  dark:    'linear-gradient(180deg, #0D0F1C 0%, #07080F 100%)',
  // brand kept as alias for primary
  brand:   'linear-gradient(135deg, #F97316, #DC2626)',
  warm:    'linear-gradient(135deg, #F97316, #F59E0B)',
  purple:  'linear-gradient(135deg, #7C3AED, #6366F1)',
  blue:    'linear-gradient(135deg, #3B82F6, #06B6D4)',
}

export const SPECS = [
  'بناء / تشطيبات',
  'كهرباء',
  'سباكة',
  'دهان / صبغ',
  'كاميرات وتوابعها',
  'بلاط',
  'ألمنيوم',
  'جبص',
  'عزل',
]

export const EXP_CATS = [
  'مواد بناء / خامات',
  'بضاعة',
  'عدد وأدوات',
  'إيجار معدات',
  'خدمات مهنية',
  'وقود وتنقلات',
  'صيانة مركبات',
  'رواتب عمال',
  'تأمين',
  'أخرى',
]

export const EXP_CAT_VAT = {
  'مواد بناء / خامات': 1.00,
  'بضاعة':             1.00,
  'عدد وأدوات':        1.00,
  'إيجار معدات':       1.00,
  'خدمات مهنية':       1.00,
  'وقود وتنقلات':      0.667,
  'صيانة مركبات':      0.667,
  'رواتب عمال':        0.00,
  'تأمين':             0.00,
  'أخرى':              1.00,
}

export const PAY_METHODS = ['كاش', 'تحويل بنكي', 'شيك', 'بت']
export const DAY_TYPES   = ['كامل', 'نص يوم', 'ساعات', 'مبلغ مسكر', 'عطلة']
export const PROJECT_TYPES  = ['مقاولة مغلقة', 'يومي']
export const PROJECT_STATUS = ['عرض سعر', 'موافق عليه', 'نشط', 'مكتمل', 'ملغي', 'مؤرشف']

export const VAT     = 0.18
export const VAT_OLD = 0.17

export const OSEK_PATUR_THRESHOLD = 120000
export const BITUACH_LEUMI_RATE   = 0.105

// ─── Navigation — 5 tabs ─────────────────────────────────────────────────────
export const NAV = [
  { id: 'dashboard', icon: 'LayoutDashboard', label: 'الرئيسية' },
  { id: 'projects',  icon: 'Building2',       label: 'مشاريع'  },
  { id: 'workers',   icon: 'Users',            label: 'عمال'    },
  { id: 'finance',   icon: 'Wallet',           label: 'المالية' },
  { id: 'settings',  icon: 'Settings',         label: 'الإعدادات'},
]

// Screens accessible from the settings / more tab
export const MORE_SCREENS = [
  { id: 'workdays',   icon: 'CalendarDays',  label: 'أيام العمل'  },
  { id: 'tracker',    icon: 'ClipboardList', label: 'تتبع الوحدات'},
  { id: 'materials',  icon: 'Package',       label: 'البضاعة'     },
  { id: 'accounting', icon: 'Calculator',    label: 'المحاسبة'    },
  { id: 'activity',   icon: 'Activity',      label: 'النشاط'      },
]

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const BP = {
  mobile:  430,
  tablet:  768,
  desktop: 1280,
}
