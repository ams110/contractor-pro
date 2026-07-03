// ─── New Color System (Psychology-Based) ─────────────────────────────────────
// لوحتان: dark (الافتراضية) و site «وضع الورشة» — فاتحة بتباين عالٍ للشغل برا
// بالشمس (طلب إجماعي 12/12 بمحاكاة الواجهات). C كائن قابل للتبديل بالمكان عبر
// applyTheme — كل المكوّنات تقرأه وقت الرندر فتتلوّن تلقائياً بلا تعديلها.
const PALETTE_DARK = {
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

// «وضع الورشة»: أسطح فاتحة، نصوص غامقة سميكة، وtextDim أغمق بكثير من نظيره
// الغامق (جوهر شكوى «النص الرمادي بيختفي بالشمس») + ألوان حالة مغمّقة درجة
// لتحافظ على تباين مقروء على الأبيض.
const PALETTE_SITE = {
  bg:        '#F2F3F6',
  surface:   '#FFFFFF',
  card:      '#FFFFFF',

  primary:   '#EA6100',
  secondary: '#6D28D9',
  gold:      '#B45309',
  cyan:      '#0E7490',

  success:   '#15803D',
  warning:   '#A16207',
  accent:    '#DC2626',

  text:      '#0B1220',
  textDim:   '#3F4C63',
  textMuted: '#E4E7EE',

  border:    'rgba(234,97,0,0.18)',
  borderMid: 'rgba(234,97,0,0.34)',

  blue:      '#1D4ED8',
  purple:    '#6D28D9',
  orange:    '#EA6100',
  pink:      '#BE185D',
}

export const PALETTES = { dark: PALETTE_DARK, site: PALETTE_SITE }

export const C = { ...PALETTE_DARK }

// تبديل الثيم بالمكان: كل قراءات C وقت الرندر بتلقط القيم الجديدة، وApp بيعيد
// التركيب بـ key={theme}. بيحدّث كمان CSS vars (index.css) وmeta theme-color.
export function applyTheme(mode = 'dark') {
  const p = PALETTES[mode] || PALETTES.dark
  Object.assign(C, p)
  GRAD.dark = mode === 'site'
    ? 'linear-gradient(180deg, #FFFFFF 0%, #F2F3F6 100%)'
    : 'linear-gradient(180deg, #0D0F1C 0%, #07080F 100%)'
  if (typeof document !== 'undefined') {
    const r = document.documentElement
    r.dataset.theme = mode
    const vars = {
      '--c-bg': p.bg, '--c-surface': p.surface, '--c-card': p.card,
      '--c-primary': p.primary, '--c-secondary': p.secondary, '--c-gold': p.gold,
      '--c-cyan': p.cyan, '--c-success': p.success, '--c-warning': p.warning,
      '--c-danger': p.accent, '--c-text': p.text, '--c-text-dim': p.textDim,
      '--c-border': p.border, '--c-border-mid': p.borderMid,
    }
    for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, v)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', p.bg)
  }
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

export const OSEK_PATUR_THRESHOLD = 122833 // حدّ עוסק פטור السنوي 2026 (كان 120,000 في 2024–2025)
// ملاحظة: ביטוח לאומי للعمل الحر يُحسب بشريحتين (مخفّضة/كاملة) في helpers.calcBituachLeumiAnnual —
// لا تستعمل نسبة مسطّحة واحدة.

// ─── Navigation — 5 tabs ─────────────────────────────────────────────────────
// label = عربي (افتراضي) · label_he/label_en للترجمة (تُقرأ حسب اللغة في الـUI)
export const NAV = [
  { id: 'dashboard', icon: 'LayoutDashboard', label: 'الرئيسية', label_he: 'לוח בקרה', label_en: 'Home' },
  { id: 'projects',  icon: 'Building2',       label: 'مشاريع',   label_he: 'פרויקטים', label_en: 'Projects' },
  { id: 'workers',   icon: 'Users',           label: 'عمال',     label_he: 'עובדים',   label_en: 'Workers' },
  { id: 'finance',   icon: 'Wallet',          label: 'المالية',  label_he: 'כספים',    label_en: 'Finance' },
  { id: 'settings',  icon: 'Settings',        label: 'الإعدادات', label_he: 'הגדרות',  label_en: 'Settings' },
]

// Screens accessible from the settings / more tab
export const MORE_SCREENS = [
  { id: 'team',       icon: 'Users2',        label: 'إدارة الفريق', label_he: 'ניהול צוות',  label_en: 'Team' },
  { id: 'tracker',    icon: 'ClipboardList', label: 'تتبع الوحدات', label_he: 'מעקב יחידות', label_en: 'Unit tracker' },
  { id: 'materials',  icon: 'Package',       label: 'البضاعة',      label_he: 'חומרים',      label_en: 'Materials' },
  { id: 'activity',   icon: 'Activity',      label: 'النشاط',       label_he: 'פעילות',      label_en: 'Activity' },
]

// مساعد: نصّ عنصر تنقّل حسب اللغة (للاستعمال في شريط التنقّل/السايدبار/الدروار)
export function navLabel(item, lang) {
  if (!item) return ''
  return lang === 'he' ? (item.label_he || item.label) : lang === 'en' ? (item.label_en || item.label) : item.label
}

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const BP = {
  mobile:  430,
  tablet:  768,
  desktop: 1280,
}
