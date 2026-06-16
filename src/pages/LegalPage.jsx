import React, { useEffect } from 'react'
import { HardHat, ArrowRight, Mail, MessageCircle, Shield, FileText, RotateCcw } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'


// ─── Design Tokens (محلية — مطابقة لصفحة الهبوط) ───────────────────────────────
const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', secondary: '#7C3AED', gold: '#D97706', cyan: '#06B6D4',
  text: '#F8FAFC', textDim: '#64748B',
  border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316, #DC2626)' }

// ─── إعدادات قابلة للتعديل ──────────────────────────────────────────────────────
// عدّل هاي القيم لتطابق بياناتك القانونية الفعلية.
export const LEGAL_INFO = {
  product:      'Contractor Pro',
  company:      'Linko',                       // ← الاسم القانوني للمشغّل
  domain:       'app.linko.services',
  supportEmail: 'contractor.pro.linko@gmail.com', // ← بريد الدعم الرسمي
  whatsapp:     '',                            // ← رقم واتساب بصيغة دولية (مثلاً 972500000000) — اتركه فارغاً لإخفاء الزر
  jurisdiction: 'دولة إسرائيل',
  updated:      '2026-06-09',
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Noto Sans Arabic', system-ui, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; }
  .lg-btn { transition: transform .15s ease, opacity .15s ease !important; }
  .lg-btn:hover { opacity: .9; }
  .lg-btn:active { transform: scale(0.97) !important; }
`

// ─── محتوى المستندات ────────────────────────────────────────────────────────────
const E = LEGAL_INFO

const DOCS = {
  terms: {
    icon: FileText, title: 'شروط الاستخدام',
    sections: [
      { h: '1. قبول الشروط', p: [
        `باستخدامك تطبيق ${E.product} (المُشغّل من قِبل ${E.company}، عبر ${E.domain}) فإنك توافق على هذه الشروط بالكامل. إذا كنت لا توافق، يُرجى عدم استخدام التطبيق.`,
      ]},
      { h: '2. وصف الخدمة', p: [
        `${E.product} خدمة برمجية كخدمة (SaaS) لإدارة أعمال المقاولات: المشاريع، العمّال، أيام العمل، الرواتب، المصاريف، المقبوضات، والحسابات الضريبية.`,
        'الحسابات الضريبية والمالية التي يوفّرها التطبيق هي أدوات مساعدة تقديرية، ولا تُعدّ استشارة محاسبية أو قانونية رسمية. تبقى مسؤولية التحقّق من الأرقام وتقديم الإقرارات الضريبية على عاتق المستخدم.',
      ]},
      { h: '3. الحساب والاشتراك', p: [
        'تتوفّر فترة تجربة مجانية مدّتها 14 يوماً. بعد انتهائها، يتطلّب الاستمرار اشتراكاً مدفوعاً بإحدى الخطط المتاحة.',
        'تُدار عمليات الدفع والفوترة عبر شريكنا Paddle.com بصفته بائع التجزئة المسجّل (Merchant of Record). تُجدَّد الاشتراكات تلقائياً في نهاية كل دورة فوترة ما لم يتم إلغاؤها.',
        'أنت مسؤول عن الحفاظ على سرّية بيانات الدخول الخاصّة بك وعن كل النشاط الذي يجري عبر حسابك.',
      ]},
      { h: '4. الاستخدام المقبول', p: [
        'تتعهّد بعدم إساءة استخدام الخدمة، أو محاولة الوصول غير المصرّح به، أو إدخال بيانات مخالفة للقانون، أو استخدام التطبيق لأي غرض غير مشروع.',
      ]},
      { h: '5. الملكية الفكرية', p: [
        `يبقى التطبيق وكل محتوياته وشيفرته وعلاماته التجارية ملكاً حصرياً لـ ${E.company}. تبقى البيانات التي تُدخلها أنت ملكاً لك.`,
      ]},
      { h: '6. حدود المسؤولية', p: [
        'تُقدَّم الخدمة "كما هي". لا نتحمّل المسؤولية عن أي خسائر مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق أو الاعتماد على حساباته، إلى الحدّ الذي يسمح به القانون.',
      ]},
      { h: '7. الإنهاء', p: [
        'يحقّ لنا تعليق أو إنهاء أي حساب يخالف هذه الشروط. يمكنك إنهاء اشتراكك في أي وقت من إعدادات الحساب.',
      ]},
      { h: '8. القانون الحاكم', p: [
        `تخضع هذه الشروط لقوانين ${E.jurisdiction}، وتُحلّ أي نزاعات أمام المحاكم المختصّة فيها.`,
      ]},
      { h: '9. التواصل', p: [
        `لأي استفسار حول هذه الشروط، تواصل معنا عبر ${E.supportEmail}.`,
      ]},
    ],
  },
  privacy: {
    icon: Shield, title: 'سياسة الخصوصية',
    sections: [
      { h: '1. مقدّمة', p: [
        `تشرح هذه السياسة كيف يجمع ${E.product} بياناتك ويستخدمها ويحميها. خصوصيتك أولوية لدينا.`,
      ]},
      { h: '2. البيانات التي نجمعها', p: [
        'بيانات الحساب: الاسم، البريد الإلكتروني، رقم المقاول (اختياري).',
        'بيانات العمل التي تُدخلها: المشاريع، العمّال، أيام العمل، المصاريف، المقبوضات، والرواتب.',
        'بيانات تقنية: نوع الجهاز، ونشاط الجلسة لأغراض الأمان وتحسين الأداء.',
        'لا نجمع بيانات بطاقتك البنكية إطلاقاً — تُعالَج مدفوعاتك بالكامل عبر Paddle.',
      ]},
      { h: '3. كيف نستخدم بياناتك', p: [
        'لتشغيل التطبيق وتقديم الخدمات التي طلبتها، ولحساب الرواتب والضرائب، ولإرسال إشعارات متعلّقة بحسابك، ولتحسين الخدمة وحمايتها.',
      ]},
      { h: '4. التخزين والأمان', p: [
        'تُخزَّن بياناتك بشكل آمن عبر بنية Supabase مع تشفير أثناء النقل، وعزل صارم على مستوى الصفوف (RLS) بحيث لا يصل أحد لبياناتك سواك ومن تمنحه الصلاحية.',
      ]},
      { h: '5. مشاركة البيانات مع أطراف ثالثة', p: [
        'لا نبيع بياناتك. نشاركها فقط مع مزوّدي الخدمة الضروريين لتشغيل التطبيق: Paddle (الفوترة)، Supabase (الاستضافة وقاعدة البيانات)، وGoogle Analytics (إحصاءات استخدام مجهّلة للموقع — اختيارية وتُفعَّل بموافقتك فقط).',
      ]},
      { h: '6. حقوقك', p: [
        'يحقّ لك الوصول إلى بياناتك وتصحيحها وتصديرها وحذفها. يوفّر التطبيق تصدير نسخة احتياطية كاملة من بياناتك في أي وقت.',
        `لطلب حذف حسابك وبياناتك نهائياً، تواصل معنا عبر ${E.supportEmail}.`,
      ]},
      { h: '7. ملفّات تعريف الارتباط (Cookies)', p: [
        'نستخدم تخزيناً محلياً وملفّات ضرورية لتشغيل الجلسة وتذكّر تفضيلاتك (اللغة، الإعدادات). لا نستخدم تتبّعاً إعلانياً.',
'نستخدم Google Analytics لقياس استخدام الموقع وتحسينه (مع إخفاء عنوان الـIP). نعتمد وضع الموافقة (Consent Mode): لا تُفعَّل كوكيز التحليلات إلا بعد ضغطك «موافق» على لافتة الكوكيز، وإذا رفضت لا تُحفظ أي كوكيز تحليلات. لا يؤثّر اختيارك على عمل التطبيق.',
      ]},
      { h: '8. التواصل', p: [
        `لأي سؤال حول خصوصيتك، راسلنا على ${E.supportEmail}.`,
      ]},
    ],
  },
  refund: {
    icon: RotateCcw, title: 'سياسة الإلغاء والاسترجاع',
    sections: [
      { h: '1. التجربة المجانية', p: [
        'تبدأ كل الخطط بتجربة مجانية مدّتها 14 يوماً دون الحاجة لبطاقة ائتمان. لن تُحاسَب إلا بعد اختيارك خطّة مدفوعة.',
      ]},
      { h: '2. الإلغاء', p: [
        'يمكنك إلغاء اشتراكك في أي وقت من إعدادات الحساب أو من بوّابة العميل. بعد الإلغاء، يبقى الوصول متاحاً حتى نهاية الدورة المدفوعة الحالية، ثم لا يتجدّد.',
      ]},
      { h: '3. الاسترجاع', p: [
        'إذا لم تكن راضياً، يمكنك طلب استرجاع خلال 14 يوماً من أول عملية دفع. تُعالَج طلبات الاسترجاع عبر شريك الفوترة Paddle.',
        `لطلب استرجاع، راسلنا على ${E.supportEmail} مع بريد حسابك، أو تواصل مع Paddle مباشرة عبر الإيصال الذي وصلك.`,
      ]},
      { h: '4. تجديد الاشتراك', p: [
        'تُجدَّد الاشتراكات تلقائياً. نوصي بالإلغاء قبل تاريخ التجديد إذا لم ترغب بالاستمرار، إذ لا تُسترَجع رسوم دورة بدأت بالفعل إلا ضمن نافذة الاسترجاع المذكورة أعلاه.',
      ]},
    ],
  },
  contact: {
    icon: Mail, title: 'تواصل معنا',
    sections: [
      { h: 'نحن هنا لمساعدتك', p: [
        'عندك سؤال، مشكلة تقنية، أو اقتراح؟ فريق الدعم جاهز. اختر الطريقة الأنسب إلك:',
      ]},
    ],
  },
}

// ─── شريط علوي ──────────────────────────────────────────────────────────────────
function TopBar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(7,8,15,0.96)', backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${C.borderMid}`, padding: '0 24px',
    }}>
      <div style={{ maxWidth: 820, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={19} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Contractor Pro</span>
        </div>
        <button onClick={() => navigate('/')} className="lg-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 16px', borderRadius: 12 }}>
          الرئيسية
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  )
}

// ─── بطاقات التواصل ─────────────────────────────────────────────────────────────
function ContactCards() {
  const cards = [
    { icon: Mail, label: 'البريد الإلكتروني', value: E.supportEmail, href: `mailto:${E.supportEmail}`, color: C.primary },
    E.whatsapp && { icon: MessageCircle, label: 'واتساب', value: 'تواصل عبر واتساب', href: `https://wa.me/${E.whatsapp}`, color: C.cyan },
  ].filter(Boolean)

  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <a key={i} href={c.href} target="_blank" rel="noopener noreferrer" className="lg-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.card, border: `1px solid ${c.color}30`, borderRadius: 16, padding: '18px 20px', textDecoration: 'none' }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `${c.color}18`, border: `1px solid ${c.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={c.color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.value}</div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// ─── الصفحة ─────────────────────────────────────────────────────────────────────
export default function LegalPage({ type = 'terms' }) {
  const doc = DOCS[type] || DOCS.terms
  const Icon = doc.icon

  useRouteSeo(`/${type}`)

  useEffect(() => { window.scrollTo(0, 0) }, [type])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <style>{css}</style>
      <TopBar />

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px', direction: 'rtl' }}>
        {/* رأس */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={26} color={C.primary} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,34px)', fontWeight: 900 }}>{doc.title}</h1>
        </div>
        {type !== 'contact' && <p style={{ fontSize: 12, color: C.textDim, marginBottom: 36 }}>آخر تحديث: {E.updated}</p>}

        {/* الأقسام */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {doc.sections.map((s, i) => (
            <section key={i}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 10 }}>{s.h}</h2>
              {s.p.map((para, j) => (
                <p key={j} style={{ fontSize: 14, color: C.textDim, lineHeight: 1.9, marginBottom: 8 }}>{para}</p>
              ))}
            </section>
          ))}
        </div>

        {type === 'contact' && <ContactCards />}
      </main>
    </div>
  )
}
