// ─── Amber Gold Dark Theme ────────────────────────────────────────────────────
export const C = {
  // Backgrounds
  bg:        '#07080C',
  surface:   '#0D0F18',
  card:      '#13151E',

  // Brand — Amber Gold
  primary:   '#F59E0B',
  secondary: '#F97316',

  // Status
  success:   '#22C55E',
  warning:   '#EAB308',
  accent:    '#EF4444',

  // Text
  text:      '#F8FAFC',
  textDim:   '#64748B',
  textMuted: '#1C2030',

  // Borders (amber-tinted)
  border:    'rgba(245,158,11,0.08)',
  borderMid: 'rgba(245,158,11,0.16)',

  // Extra
  blue:      '#3B82F6',
  purple:    '#8B5CF6',
  orange:    '#F97316',
  pink:      '#EC4899',
  cyan:      '#06B6D4',
}

export const GRAD = {
  brand:   'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EF4444 100%)',
  warm:    'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
  success: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)',
  danger:  'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
  purple:  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  blue:    'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
  dark:    'linear-gradient(180deg, #0D0F18 0%, #07080C 100%)',
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
  { id: 'dashboard',  icon: 'LayoutDashboard', label: 'الرئيسية' },
  { id: 'projects',   icon: 'Building2',        label: 'مشاريع'  },
  { id: 'workers',    icon: 'Users',             label: 'عمال'    },
  { id: 'finance',    icon: 'Wallet',            label: 'المالية' },
  { id: 'more',       icon: 'Grid3x3',           label: 'المزيد'  },
]

// Screens accessible from the "المزيد" tab
export const MORE_SCREENS = [
  { id: 'workdays',   icon: 'CalendarDays',  label: 'أيام العمل'  },
  { id: 'expenses',   icon: 'CreditCard',    label: 'المصاريف'    },
  { id: 'payments',   icon: 'Banknote',      label: 'الرواتب'     },
  { id: 'tracker',    icon: 'ClipboardList', label: 'تتبع الوحدات'},
  { id: 'materials',  icon: 'Package',       label: 'البضاعة'     },
  { id: 'accounting', icon: 'Calculator',    label: 'المحاسبة'    },
  { id: 'activity',   icon: 'Activity',      label: 'النشاط'      },
  { id: 'settings',   icon: 'Settings',      label: 'الإعدادات'   },
]
