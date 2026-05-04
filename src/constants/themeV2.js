// ─── Obsidian Theme V2 ───────────────────────────────────────────────────────
export const T = {
  // Backgrounds
  bg:        '#08090E',
  surface:   '#10131C',
  card:      '#161B27',
  cardHover: '#1C2233',

  // Brand — Electric Blue + Coral
  primary:   '#4B9EFF',
  secondary: '#FF6B6B',

  // Status
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#F43F5E',
  info:      '#8B5CF6',

  // Text
  text:      '#F1F5F9',
  textSub:   '#94A3B8',
  textMuted: '#475569',

  // Borders
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.14)',

  // Extra palette
  teal:      '#14B8A6',
  amber:     '#F59E0B',
  violet:    '#7C3AED',
  lime:      '#84CC16',
}

export const G = {
  brand:   'linear-gradient(135deg, #4B9EFF 0%, #7B61FF 100%)',
  coral:   'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  danger:  'linear-gradient(135deg, #F43F5E 0%, #FF6B6B 100%)',
  warm:    'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  violet:  'linear-gradient(135deg, #7C3AED 0%, #4B9EFF 100%)',
  dark:    'linear-gradient(180deg, #10131C 0%, #08090E 100%)',
}

export const NAV_V2 = [
  { id: 'dashboard', icon: '⬡', label: 'الرئيسية' },
  { id: 'projects',  icon: '◈', label: 'المشاريع'  },
  { id: 'workers',   icon: '◉', label: 'العمال'    },
  { id: 'workdays',  icon: '◷', label: 'الأيام'    },
  { id: 'expenses',  icon: '◻', label: 'المصاريف'  },
  { id: 'payments',  icon: '◈', label: 'الرواتب'   },
  { id: 'materials', icon: '▣', label: 'البضاعة'   },
  { id: 'tracker',   icon: '◫', label: 'التتبع'    },
  { id: 'settings',  icon: '◎', label: 'الإعدادات' },
]
