export const C = {
  // Backgrounds
  bg:        '#07090D',
  surface:   '#0D1117',
  card:      '#131920',

  // Brand
  primary:   '#00DDB3',
  secondary: '#6366F1',

  // Status
  success:   '#22C55E',
  warning:   '#EAB308',
  accent:    '#F43F5E',

  // Text
  text:      '#F8FAFC',
  textDim:   '#64748B',
  textMuted: '#1E293B',

  // Borders
  border:    'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.12)',

  // Extra
  blue:      '#3B82F6',
  purple:    '#8B5CF6',
  orange:    '#F97316',
  pink:      '#EC4899',
  cyan:      '#06B6D4',
}

export const GRAD = {
  brand:   'linear-gradient(135deg, #00DDB3 0%, #6366F1 100%)',
  success: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)',
  danger:  'linear-gradient(135deg, #F43F5E 0%, #F97316 100%)',
  warm:    'linear-gradient(135deg, #EAB308 0%, #F97316 100%)',
  purple:  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  blue:    'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
  dark:    'linear-gradient(180deg, #0D1117 0%, #07090D 100%)',
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
  'عدد وأدوات',
  'وقود وتنقلات',
  'إيجار معدات',
  'تأمين',
  'أخرى',
]

export const PAY_METHODS = ['كاش', 'تحويل بنكي', 'شيك', 'بت']

export const DAY_TYPES = ['كامل', 'نص يوم', 'ساعات']

export const PROJECT_TYPES = ['مقاولة مغلقة', 'يومي']

export const PROJECT_STATUS = ['عرض سعر', 'موافق عليه', 'نشط', 'مكتمل', 'ملغي']

export const VAT = 0.17

export const OSEK_PATUR_THRESHOLD = 120000
export const BITUACH_LEUMI_RATE   = 0.105

export const NAV = [
  { id: 'dashboard', icon: '📊', label: 'الرئيسية' },
  { id: 'projects',  icon: '🏗️', label: 'المشاريع' },
  { id: 'workers',   icon: '👷', label: 'العمال'   },
  { id: 'workdays',  icon: '📅', label: 'أيام'     },
  { id: 'expenses',  icon: '💸', label: 'المصاريف' },
  { id: 'payments',  icon: '💰', label: 'الرواتب'  },
  { id: 'settings',  icon: '⚙️', label: 'إعدادات'  },
]
