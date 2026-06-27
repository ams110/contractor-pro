# I18N Sweep Spec — translate hardcoded Arabic UI to trilingual (ar/he/en)

You are translating hardcoded Arabic UI strings in the Kabblan React app so the app
is **100% Hebrew** (and English) capable. The app is Arabic-first; Arabic stays the
default, we ADD Hebrew + English. Read this whole file before editing.

## 1. Helper API (already exists — import & use it, do not re-create)

`src/lib/labels.js` exports:
- `tl(language, ar, he, en)` → returns the correct string for the language. Use for ALL free-text UI strings. If you omit `en`, it falls back to `ar`, but **always provide all three**.
- `tEnum(value, language)` → translates a **DB enum value** (project status, expense category, payment method, day type, specialty) for **display only**. The stored value stays Arabic.

Import path = mirror how the file already imports from `../lib/` or `../../lib/`:
- `src/screens/*.jsx` → `import { tl, tEnum } from '../lib/labels.js'`
- `src/screens/<sub>/*.jsx` (finance, team, dashboard, workers, projects, settings, auth, onboarding) → `'../../lib/labels.js'`
- `src/components/*.jsx` → `'../lib/labels.js'`
- `src/components/sheets/*.jsx` → `'../../lib/labels.js'`

Import only what you use (`tl`, or `tl, tEnum`).

## 2. Sourcing the `language` variable

Each component needs `language`:
1. If the component ALREADY receives a `language` (or `lang`) prop → use it. If the existing name is `lang`, call `tl(lang, ...)` with that name. Many sub-components are passed `language` from their parent — check the props list first.
2. Otherwise add at the very top of the component body:
   `const language = useAppStore(s => s.language)`
   and ensure `useAppStore` is imported with the correct relative depth:
   - `src/screens/*.jsx` → `import { useAppStore } from '../store/useAppStore.js'`
   - `src/screens/<sub>/*.jsx` & `src/components/sheets/*.jsx` → `'../../store/useAppStore.js'`
   - `src/components/*.jsx` → `'../store/useAppStore.js'`
3. For a sub-component defined in the same file that does NOT get `language` as a prop and whose parent has it: prefer passing `language` down as a prop (matches the project's existing pattern), OR read it from the store in that sub-component. Either is fine — keep it simple and working.
4. For non-component `.js` helper modules that build label strings: convert their label data to functions/maps that take a `language` arg and return the right string, then update call sites that are **in your assigned files**. If a call site is NOT in your files, keep Arabic as the default so nothing breaks, and report it.

## 3. What to translate

EVERY Arabic string DISPLAYED to the user that is NOT already inside a language conditional:
JSX text between tags; `title`/`placeholder`/`label`/`aria-label`/`alt` attribute strings;
button text; toast / alert / confirm / `window.confirm` messages; `throw new Error('...')`
messages that surface to users; option labels; empty-state text; tab labels; section headings;
strings inside arrays/objects that are rendered.

Use `tl(language, '<arabic original>', '<hebrew>', '<english>')`.

### Enum values displayed from data
For values that come from the DB and are rendered — e.g. `{project.status}`, `{expense.category}`,
`{pay.method}`, `{day.type}`, `{emp.specialty}` — wrap the displayed value with `tEnum(value, language)`.
Recognize them by these Arabic value sets:
- status: عرض سعر · موافق عليه · نشط · مكتمل · ملغي · مؤرشف
- project type: مقاولة مغلقة · يومي
- day type: كامل · نص يوم · ساعات · مبلغ مسكر · عطلة
- pay method: كاش · تحويل بنكي · شيك · بت
- specialty list / expense-category list (see glossary).
Do **not** alter the stored value or any `=== 'arabicValue'` comparison — only the display.

## 4. Do NOT touch (leave exactly as-is)

- Code comments (Arabic comments stay).
- The `ar` branch of any EXISTING `tl(...)`, `L(...)`, `lbl(...)`, `language === 'he' ? … : …`, `tEnum(...)`. Already handled.
- Logic/data values & comparisons: `=== 'نشط'`, `status === 'pending'`, switch cases, filter/sort keys, object keys used as data.
- `console.log/warn/error` (developer-facing).
- User-entered data, demo data, names.
- Existing Hebrew/English strings.
- Styling, props, structure, imports unrelated to i18n.

## 5. 🔴 CRITICAL Hebrew rules (project rule §19.4)

- Hebrew strings = **100% pure Hebrew letters**. NEVER let an Arabic letter sneak into a Hebrew word. Look-alike traps: ي↔י, ر↔ר, و↔ו, ة↔ה, ن↔נ, م↔מ, پ↔פ, ك↔כ. Type genuine Hebrew.
- Israeli terms written in Hebrew exactly: `מע"מ` (VAT) · `ביטוח לאומי` · `מס הכנסה` (income tax) · `עוסק פטור` · `עוסק מורשה` · `חברה` · `פנסיה` (pension).
- A Hebrew string that contains a `"` (e.g. מע"מ) is fine as a normal JS string argument to `tl(...)`: `tl(language, '...', 'דוח מע"מ', '...')`. If you ever place such Hebrew as raw JSX text (not via `tl`), wrap it as `{'מע"מ'}`.
- **Self-check before finishing**: grep each file you touched for mixed-script — no word may contain BOTH `[֐-׿]` and `[؀-ۿ]`. Regex: `[֐-׿][؀-ۿ]|[؀-ۿ][֐-׿]` must return zero matches.

## 6. Glossary (ar → he → en) — be consistent

General:
- مشروع → פרויקט → Project · مشاريع → פרויקטים → Projects
- عامل → עובד · عمال → עובדים → Workers
- يوم عمل → יום עבודה · أيام العمل → ימי עבודה → Work days
- مصروف → הוצאה · مصاريف → הוצאות → Expenses
- مقبوض/إيراد → הכנסה · مقبوضات/مدخولات → הכנסות → Income/Revenue
- راتب → משכורת · رواتب → משכורות → Salaries · دفعة → תשלום · دفعات → תשלומים → Payments
- سلفة → מקדמה · سلف → מקדמות → Advances
- فاتورة → חשבונית · فواتير → חשבוניות → Invoices · إيصال → קבלה · إيصالات → קבלות → Receipts
- عميل → לקוח · عملاء → לקוחות → Clients · مورد → ספק
- موقع/مواقع (العمل) → אתר/אתרים → Site(s)
- بضاعة/مواد → חומרים → Materials · مواد بناء → חומרי בניין
- ربح → רווח → Profit · خسارة → הפסד → Loss · هامش → שולי רווח / מרווח → Margin
- إيراد → הכנסה · تكلفة → עלות · تكاليف → עלויות → Costs · رصيد → יתרה → Balance
- مستحق → לתשלום / זכאי · محصّل/تحصيل → נגבה / גבייה → Collected/Collection
- الفريق → צוות → Team · عضو → חבר → Member · صلاحيات → הרשאות → Permissions
- الإعدادات → הגדרות · الملف الشخصي → פרופיל · الإشعارات → התראות
- ضريبة → מס · ضرائب → מסים · ضريبة دخل → מס הכנסה · ضريبة القيمة المضافة → מע"מ
- الحالة → סטטוס · النوع → סוג · التاريخ → תאריך · المبلغ → סכום · الملاحظات → הערות · الاسم → שם · الهاتف → טלפון
- إضافة → הוספה · تعديل → עריכה · حذف → מחיקה · حفظ → שמירה · إلغاء → ביטול · تأكيد → אישור · إغلاق → סגירה
- بحث → חיפוש · تصفية → סינון · تصدير → ייצוא · فرز → מיון
- موافقة/موافق → אישור / מאושר · رفض/مرفوض → דחייה / נדחה · معلّق/قيد الانتظار → ממתין
- ساعة/ساعات → שעה/שעות → Hours · يوم → יום · شهر → חודש · أسبوع → שבוע
- تسجيل الدخول → כניסה · تسجيل الخروج → יציאה · كلمة السر → סיסמה

Enum values (status/types/day/pay) — use these (or rely on `tEnum`):
- عرض سعر→הצעת מחיר · موافق عليه→מאושר · نشط→פעיל · مكتمل→הושלם · ملغي→בוטל · مؤرشف→בארכיון
- مقاولة مغلقة→קבלנות סגורה · يومي→יומי
- كامل→יום מלא · نص يوم→חצי יום · ساعات→שעות · مبلغ مسكر→סכום קבוע · عطلة→חופשה
- كاش→מזומן · تحويل بنكي→העברה בנקאית · شيك→צ'ק · بت→ביט

Specialties:
- بناء / تشطيبات→בנייה / גמר · كهرباء→חשמל · سباكة→אינסטלציה · دهان / صبغ→צביעה · كاميرات وتوابعها→מצלמות ואבזרים · بلاط→ריצוף · ألمنيوم→אלומיניום · جبص→גבס · عزل→איטום

Expense categories:
- مواد بناء / خامات→חומרי בניין / גלם · بضاعة→סחורה · عدد وأدوات→כלי עבודה · إيجار معدات→השכרת ציוד · خدمات مهنية→שירותים מקצועיים · وقود وتنقلات→דלק ונסיעות · صيانة مركبات→תחזוקת רכב · رواتب عمال→שכר עובדים · تأمين→ביטוח · أخرى→אחר

If a term isn't in the glossary, translate naturally into correct modern Hebrew used in the Israeli construction/business domain.

## 7. Constraints

- Edit ONLY the files assigned to you. Do not touch any other file.
- Do NOT run build, tests, or git. Do NOT reformat unrelated code. Keep diffs surgical.
- Preserve all logic, styling, props, structure.
- Final report: per file → number of strings translated, whether you wrapped enum displays, how you sourced `language`, and any cross-file call sites you could not update.
