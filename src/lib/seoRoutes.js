// ─── مصدر واحد لبيانات SEO لكل المسارات ─────────────────────────────────────────
// وحدة نقيّة (بلا React) يستعملها كلٌّ من:
//   • src/lib/seo.js (useSeo) — تطبيق الميتا وقت التشغيل في المتصفح
//   • scripts/prerender.mjs — توليد HTML ثابت لكل مسار وقت البناء (للزواحف وواتساب)
// هيك ما يصير تكرار/انحراف بين النسختين.

import { CALC_CITIES } from './calcCities.js'
import { CITY_TRADE_PAGES, cityTradeFaqSchema } from './cityTradePages.js'

export const ORIGIN = 'https://app.linko.services'
// صورة مشاركة مخصّصة 1200×630 (بانر) — أفضل بكثير من الأيقونة المربّعة للمعاينات
export const OG_IMAGE = `${ORIGIN}/og-image.png`

export const DEFAULT_TITLE =
  'كبلان | تطبيق إدارة المقاولات للمقاول العربي في إسرائيل'
export const DEFAULT_DESC =
  'كبلان — التطبيق الأول للمقاول العربي في إسرائيل لإدارة المشاريع والعمّال وأيام العمل وحساب الرواتب والمصاريف والضرائب (מע"מ + ضريبة الدخل + ביטוח לאומי). كل أعمالك المحاسبية في جيبك.'

// نسخ عبرية/إنجليزية للعنوان والوصف الافتراضيَّين (تُطبَّق وقت التشغيل حسب اللغة
// عبر ?lang=he/en؛ الـprerender يبقى عربياً = النسخة المرجعية للزواحف وجوجل).
export const DEFAULT_TITLE_HE =
  'קבלאן | אפליקציה לניהול קבלנות בישראל'
export const DEFAULT_TITLE_EN =
  'Kabblan | Contractor management app in Israel'
export const DEFAULT_DESC_HE =
  'קבלאן — אפליקציה לניהול קבלנות בישראל: ניהול פרויקטים, עובדים וימי עבודה, חישוב שכר, הוצאות ומסים (מע"מ + מס הכנסה + ביטוח לאומי). כל הניהול החשבונאי בכיס שלך.'
export const DEFAULT_DESC_EN =
  'Kabblan — the app for contractors in Israel to manage projects, workers and workdays, payroll, expenses and taxes (VAT + income tax + national insurance). All your bookkeeping in your pocket.'

// يختار قيمة الحقل حسب اللغة (title_he/title_en...) مع رجوع للعربي الافتراضي.
// يُستعمل وقت التشغيل فقط (seo.js)؛ الـprerender يقرأ الحقل العربي مباشرة.
export function seoField(meta, key, lang) {
  if (!meta) return undefined
  if (lang === 'he' || lang === 'en') return meta[`${key}_${lang}`] || meta[key]
  return meta[key]
}
export function defaultTitleFor(lang) {
  return lang === 'he' ? DEFAULT_TITLE_HE : lang === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE
}
export function defaultDescFor(lang) {
  return lang === 'he' ? DEFAULT_DESC_HE : lang === 'en' ? DEFAULT_DESC_EN : DEFAULT_DESC
}

// أسئلة شائعة — مصدر الحقيقة (يُعرض في صفحة الهبوط ويغذّي FAQPage JSON-LD)
export const FAQ_ITEMS = [
  {
    q: 'ما هو تطبيق كبلان؟',
    a: 'كبلان تطبيق إدارة مقاولات مصمّم للمقاول العربي في إسرائيل: يدير المشاريع والعمّال وأيام العمل، يحسب الرواتب والمصاريف والمقبوضات، ويحسب الضرائب الإسرائيلية (מע"מ + ضريبة الدخل + ביטוח לאומי) — كله من هاتفك.',
  },
  {
    q: 'كيف يحسب التطبيق ضريبة القيمة المضافة (מע"מ) وضريبة الدخل والبيتواح ليئومي؟',
    a: 'يحسب מע"מ تلقائياً على المدخولات ويخصمها على المصاريف حسب الفئة، ويقدّر ضريبة الدخل بالشرائح الإسرائيلية التصاعدية، ويحسب ביטוח לאומי بشريحتين (لا نسبة مسطّحة). يدعم עוסק פטור و עוסק מורשה و חברה.',
  },
  {
    q: 'هل أقدر أحسب رواتب العمّال وأتابع أيام العمل؟',
    a: 'نعم. سجّل أيام العمل (مفرد أو جماعي أو لمدى تواريخ)، واحسب الرواتب مع الإضافي تلقائياً، وتابع السلف والدفعات، وأرسل كشف الحساب للعامل عبر واتساب.',
  },
  {
    q: 'هل التطبيق مناسب للعوسك باتور (עוסק פטור)؟',
    a: 'نعم، يدعم עוסק פטור بالكامل بدون מע"מ ، مع تنبيه عند الاقتراب من الحدّ السنوي (₪120,000)، كما يدعم עוסק מורשה و חברה بحساب מע"מ كامل.',
  },
  {
    q: 'هل في تجربة مجانية وكم سعر الاشتراك؟',
    a: 'نعم، تجربة مجانية 14 يوم بدون بطاقة ائتمان. بعدها الخطط: Starter بـ₪129 و Pro بـ₪249 و Business بـ₪499 شهرياً، مع خصم على الاشتراك السنوي.',
  },
  {
    q: 'هل يعمل على الآيفون والأندرويد؟',
    a: 'نعم، يعمل على الآيفون والأندرويد والكمبيوتر كتطبيق ويب (PWA) تثبّته على شاشتك الرئيسية ويعمل حتى بدون إنترنت مؤقتاً، بالعربي والعبري والإنجليزي.',
  },
  {
    q: 'هل في بوّابة خاصة للعمّال؟',
    a: 'نعم، لكل عامل بوّابة ذاتية يشوف فيها كشف حسابه، يسجّل أيام عمله ومصاريفه وبضاعته، ويطلب سلفة أو راتب — وأنت تتحكّم بصلاحياته بالكامل.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم، بياناتك محمية بتشفير ونظام صلاحيات دقيق، مع دخول بالبصمة (Passkey) وقفل الجلسة وسجلّ تدقيق لكل العمليات. كل مقاول يرى بياناته فقط.',
  },
]

// FAQPage schema — يُبنى من FAQ_ITEMS (للاستعمال في الهبوط ووقت الـprerender)
export const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

// صفحات الحاسبة حسب المدينة — تُولَّد تلقائياً من CALC_CITIES (SEO محلّي).
const CITY_CALC_SEO = Object.fromEntries(
  Object.entries(CALC_CITIES).map(([slug, c]) => [`/calculator/${slug}`, {
    title: `حاسبة راتب عامل في ${c.ar} | كبلان — مجاناً`,
    description: `احسب راتب عاملك في ${c.ar} (${c.he}) بالساعات الإضافية (125%/150%) حسب قانون العمل الإسرائيلي. حاسبة مجانية وبلا تسجيل للمقاول من كبلان.`,
    crumb: `حاسبة ${c.ar}`,
  }]),
)

// صفحات الحاسبة (مدينة × تخصّص) — تُولَّد من CITY_TRADE_PAGES (SEO محلّي + FAQ schema).
// كل صفحة تحمل schema=FAQPage فيظهرها prerender ووقت التشغيل (AEO + نتائج غنية).
const CITY_TRADE_SEO = Object.fromEntries(
  Object.entries(CITY_TRADE_PAGES).map(([key, p]) => [`/calculator/${key}`, {
    title: `حاسبة راتب عامل ${p.tradeAr} في ${p.cityAr} | كبلان — مجاناً`,
    description: `احسب راتب عامل ${p.tradeArFull} في ${p.cityAr} (${p.cityHe}) بالساعات الإضافية (125%/150%) حسب قانون العمل الإسرائيلي. أجرة الساعة غالباً ₪${p.lo}–₪${p.hi}. حاسبة مجانية بلا تسجيل من كبلان.`,
    crumb: `${p.tradeAr} ${p.cityAr}`,
    schema: cityTradeFaqSchema(p),
  }]),
)

// مسار → عنوان/وصف/علامات. الصفحات والـprerender يقرؤون من هون.
// breadcrumb: يُبنى تلقائياً (الرئيسية ← الصفحة) لكل ما عدا '/'.
export const ROUTE_SEO = {
  ...CITY_CALC_SEO,
  ...CITY_TRADE_SEO,
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    title_he: DEFAULT_TITLE_HE,
    title_en: DEFAULT_TITLE_EN,
    description_he: DEFAULT_DESC_HE,
    description_en: DEFAULT_DESC_EN,
    schema: FAQ_SCHEMA, // الهبوط يحمل FAQPage
  },
  '/pricing': {
    title: 'الأسعار والخطط | كبلان — تطبيق إدارة المقاولات',
    description:
      'خطط كبلان للمقاول العربي في إسرائيل: تجربة مجانية 14 يوم، ثم Starter ₪129 و Pro ₪249 و Business ₪499 شهرياً مع خصم سنوي. كل أدوات إدارة المشاريع والعمّال والرواتب والضرائب.',
    title_he: 'מחירים ותוכניות | קבלאן — אפליקציה לניהול קבלנות',
    description_he:
      'תוכניות קבלאן: ניסיון חינם 14 יום, ואז Starter ב-₪129, Pro ב-₪249 ו-Business ב-₪499 לחודש עם הנחה שנתית. כל הכלים לניהול פרויקטים, עובדים, שכר ומסים.',
    title_en: 'Pricing & Plans | Kabblan — Contractor management app',
    description_en:
      'Kabblan plans: a free 14-day trial, then Starter ₪129, Pro ₪249 and Business ₪499 per month with an annual discount. All the tools to manage projects, workers, payroll and taxes.',
    crumb: 'الأسعار',
  },
  '/calculator': {
    title: 'حاسبة راتب العامل بالساعات الإضافية | كبلان — مجاناً',
    description:
      'احسب راتب عاملك بثانية: الساعات الإضافية (125%/150%) محسوبة تلقائياً حسب قانون العمل الإسرائيلي. حاسبة مجانية للمقاول العربي في إسرائيل من كبلان.',
    title_he: 'מחשבון שכר עובד עם שעות נוספות | קבלאן — חינם',
    description_he:
      'חשבו את שכר העובד בשנייה: שעות נוספות (125%/150%) מחושבות אוטומטית לפי חוק העבודה בישראל. מחשבון חינם לקבלן מקבלאן.',
    title_en: 'Worker salary calculator with overtime | Kabblan — Free',
    description_en:
      'Calculate your worker’s salary in a second: overtime (125%/150%) computed automatically per Israeli labor law. A free calculator for contractors from Kabblan.',
    crumb: 'حاسبة الراتب',
  },
  '/vat-calculator': {
    title: 'حاسبة מע"מ 18% للمقاول | كبلان — مجاناً',
    description:
      'احسب מע"מ (18%) على أي مبلغ: أضِف المע"מ على مبلغ صافٍ أو استخرجه من مبلغ إجمالي. حاسبة مجانية وبلا تسجيل للمقاول العربي في إسرائيل من كبلان.',
    title_he: 'מחשבון מע"מ 18% לקבלן | קבלאן — חינם',
    description_he:
      'חשבו מע"מ (18%) על כל סכום: הוסיפו מע"מ לסכום נטו או חלצו אותו מסכום ברוטו. מחשבון חינם בלי הרשמה לקבלן מקבלאן.',
    title_en: 'VAT 18% calculator for contractors | Kabblan — Free',
    description_en:
      'Calculate VAT (18%) on any amount: add VAT to a net amount or extract it from a gross amount. A free, no-signup calculator for contractors from Kabblan.',
    crumb: 'حاسبة المע"מ',
  },
  '/blog': {
    title: 'المدوّنة | كبلان — نصائح إدارة المقاولات والضرائب',
    description:
      'مقالات ونصائح للمقاول العربي في إسرائيل: إدارة المشاريع والعمّال، حساب الرواتب، وفهم الضرائب (מע"מ + ضريبة الدخل + ביטוח לאומי).',
    title_he: 'הבלוג | קבלאן — טיפים לניהול קבלנות ומסים',
    description_he:
      'מאמרים וטיפים לקבלן בישראל: ניהול פרויקטים ועובדים, חישוב שכר, והבנת מסים (מע"מ + מס הכנסה + ביטוח לאומי).',
    title_en: 'Blog | Kabblan — Contracting & tax tips',
    description_en:
      'Articles and tips for contractors in Israel: managing projects and workers, calculating payroll, and understanding taxes (VAT + income tax + national insurance).',
    crumb: 'المدوّنة',
  },
  '/terms': {
    title: 'شروط الاستخدام | كبلان',
    description: 'شروط استخدام تطبيق كبلان لإدارة المقاولات.',
    title_he: 'תנאי שימוש | קבלאן',
    description_he: 'תנאי השימוש באפליקציית קבלאן לניהול קבלנות.',
    title_en: 'Terms of Use | Kabblan',
    description_en: 'Terms of use for the Kabblan contractor management app.',
    crumb: 'شروط الاستخدام',
  },
  '/privacy': {
    title: 'سياسة الخصوصية | كبلان',
    description: 'سياسة الخصوصية وحماية بيانات مستخدمي كبلان.',
    title_he: 'מדיניות פרטיות | קבלאן',
    description_he: 'מדיניות הפרטיות והגנת הנתונים של משתמשי קבלאן.',
    title_en: 'Privacy Policy | Kabblan',
    description_en: 'Privacy policy and data protection for Kabblan users.',
    crumb: 'سياسة الخصوصية',
  },
  '/refund': {
    title: 'سياسة الإلغاء والاسترجاع | كبلان',
    description: 'سياسة الإلغاء والاسترجاع لاشتراكات كبلان.',
    title_he: 'מדיניות ביטול והחזר | קבלאן',
    description_he: 'מדיניות הביטול וההחזר למנויי קבלאן.',
    title_en: 'Cancellation & Refund Policy | Kabblan',
    description_en: 'Cancellation and refund policy for Kabblan subscriptions.',
    crumb: 'الإلغاء والاسترجاع',
  },
  '/contact': {
    title: 'تواصل معنا | كبلان',
    description: 'تواصل مع فريق كبلان للدعم والاستفسارات.',
    title_he: 'צור קשר | קבלאן',
    description_he: 'צרו קשר עם צוות קבלאן לתמיכה ולשאלות.',
    title_en: 'Contact us | Kabblan',
    description_en: 'Contact the Kabblan team for support and questions.',
    crumb: 'تواصل معنا',
  },
  '/delete-account': {
    title: 'حذف الحساب والبيانات | كبلان',
    description: 'كيفية طلب حذف حسابك في كبلان وكل البيانات المرتبطة به نهائياً.',
    title_he: 'מחיקת חשבון ונתונים | קבלאן',
    description_he: 'איך לבקש מחיקה לצמיתות של החשבון וכל הנתונים שלך בקבלאן.',
    title_en: 'Delete account & data | Kabblan',
    description_en: 'How to request permanent deletion of your Kabblan account and all related data.',
    crumb: 'حذف الحساب',
  },
  '/login': {
    title: 'تسجيل الدخول | كبلان',
    description: 'سجّل دخولك إلى كبلان لإدارة مشاريع مقاولاتك وعمّالك ورواتبك.',
    title_he: 'התחברות | קבלאן',
    description_he: 'התחברו לקבלאן לניהול פרויקטים, עובדים ושכר.',
    title_en: 'Log in | Kabblan',
    description_en: 'Log in to Kabblan to manage your projects, workers and payroll.',
    crumb: 'تسجيل الدخول',
  },
  '/register': {
    title: 'إنشاء حساب | كبلان — جرّب مجاناً 14 يوم',
    description: 'أنشئ حسابك في كبلان وابدأ تجربة مجانية 14 يوم لإدارة مقاولاتك.',
    title_he: 'הרשמה | קבלאן — נסו חינם 14 יום',
    description_he: 'פתחו חשבון בקבלאן והתחילו ניסיון חינם של 14 יום לניהול הקבלנות שלכם.',
    title_en: 'Sign up | Kabblan — Try free for 14 days',
    description_en: 'Create your Kabblan account and start a free 14-day trial to manage your contracting business.',
    crumb: 'إنشاء حساب',
  },
  '/welcome': {
    title: 'أهلاً بك | كبلان',
    title_he: 'ברוכים הבאים | קבלאן',
    title_en: 'Welcome | Kabblan',
    noindex: true,
  },
  '/thankyou': {
    title: 'تم تفعيل اشتراكك | كبلان',
    title_he: 'המנוי הופעל | קבלאן',
    title_en: 'Subscription activated | Kabblan',
    noindex: true,
  },
}

// يبني breadcrumb JSON-LD لمسار (الرئيسية ← الصفحة)
export function breadcrumbFor(path) {
  const meta = ROUTE_SEO[path]
  if (!meta || !meta.crumb) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: meta.crumb, item: ORIGIN + path },
    ],
  }
}
