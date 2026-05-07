export const C = {
  // Backgrounds
  bg:        '#050810',
  surface:   '#090D1A',
  card:      '#0D1424',

  // Brand
  primary:   '#00E5FF',
  secondary: '#7C3AED',

  // Status
  success:   '#00D68F',
  warning:   '#FFB700',
  accent:    '#FF2D6B',

  // Text
  text:      '#EEF2FF',
  textDim:   '#4A5580',
  textMuted: '#141B30',

  // Borders
  border:    'rgba(255,255,255,0.06)',
  borderMid: 'rgba(255,255,255,0.11)',

  // Extra
  blue:      '#3B82F6',
  purple:    '#7C3AED',
  orange:    '#FF6B35',
  pink:      '#FF2D6B',
  cyan:      '#00E5FF',

  // 2026 glass
  glass:     'rgba(255,255,255,0.03)',
  glassHover:'rgba(255,255,255,0.06)',
}

export const GRAD = {
  brand:   'linear-gradient(135deg, #00E5FF 0%, #7C3AED 100%)',
  success: 'linear-gradient(135deg, #00D68F 0%, #00E5FF 100%)',
  danger:  'linear-gradient(135deg, #FF2D6B 0%, #FF6B35 100%)',
  warm:    'linear-gradient(135deg, #FFB700 0%, #FF6B35 100%)',
  purple:  'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
  blue:    'linear-gradient(135deg, #3B82F6 0%, #00E5FF 100%)',
  dark:    'linear-gradient(180deg, #090D1A 0%, #050810 100%)',
  aurora:  'linear-gradient(135deg, #00E5FF22 0%, #7C3AED22 50%, #FF2D6B11 100%)',
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

export const PROJECT_STATUS = ['عرض سعر', 'موافق عليه', 'نشط', 'مكتمل', 'ملغي', 'مؤرشف']

export const VAT     = 0.18   // رُفع من 17% إلى 18% في 1 يناير 2025
export const VAT_OLD = 0.17   // للمعاملات قبل 2025

export const OSEK_PATUR_THRESHOLD = 120000
export const BITUACH_LEUMI_RATE   = 0.105

export const NAV = [
  { id: 'dashboard',  icon: '📊', label: 'الرئيسية' },
  { id: 'projects',   icon: '🏗️', label: 'مشاريع'  },
  { id: 'workers',    icon: '👷', label: 'عمال'     },
  { id: 'workdays',   icon: '📅', label: 'أيام'     },
  { id: 'expenses',   icon: '💸', label: 'مصاريف'  },
  { id: 'payments',   icon: '💰', label: 'رواتب'   },
  { id: 'tracker',    icon: '📋', label: 'تتبع'     },
  { id: 'materials',  icon: '🪵', label: 'بضاعة'   },
  { id: 'accounting', icon: '🧮', label: 'محاسبة'  },
  { id: 'settings',   icon: '⚙️', label: 'إعدادات' },
]
