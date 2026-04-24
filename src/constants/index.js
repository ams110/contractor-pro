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

// نسبة استرداد מס תשומות حسب الفئة (2025)
// 1.00 = استرداد كامل | 0.667 = ثلثان (ركوب خاص) | 0 = معفى
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

export const DAY_TYPES = ['كامل', 'نص يوم', 'ساعات', 'مبلغ مسكر', 'عطلة']

export const PROJECT_TYPES = ['مقاولة مغلقة', 'يومي']

export const PROJECT_STATUS = ['عرض سعر', 'موافق عليه', 'نشط', 'مكتمل', 'ملغي']

export const VAT     = 0.18   // رُفع من 17% إلى 18% في 1 يناير 2025
export const VAT_OLD = 0.17   // للمعاملات قبل 2025

export const OSEK_PATUR_THRESHOLD = 120000
export const BITUACH_LEUMI_RATE   = 0.105

export const NAV = [
  { id: 'dashboard', icon: '📊', label: 'الرئيسية' },
  { id: 'projects',  icon: '🏗️', label: 'المشاريع' },
  { id: 'workers',   icon: '👷', label: 'العمال'   },
  { id: 'workdays',  icon: '📅', label: 'أيام'     },
  { id: 'expenses',  icon: '💸', label: 'المصاريف' },
  { id: 'payments',  icon: '💰', label: 'الرواتب'  },
  { id: 'activity',  icon: '📋', label: 'النشاط'   },
  { id: 'settings',  icon: '⚙️', label: 'إعدادات'  },
]
