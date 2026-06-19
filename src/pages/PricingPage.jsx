import React, { useState, useEffect } from 'react'
import { HardHat, Star, Check, X, CheckCircle2, AlertTriangle, Lightbulb, ArrowLeft } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useOrganization } from '../hooks/useOrganization.js'
import { openCheckout, PLAN_META, pricesFor } from '../lib/paddle.js'
import { useRouteSeo, faqLd } from '../lib/seo.js'
import { trackViewPricing } from '../lib/track.js'

const C = {
  bg:        '#07080F',
  surface:   '#0D0F1C',
  card:      '#12152A',
  primary:   '#F97316',
  secondary: '#7C3AED',
  accent:    '#EF4444',
  success:   '#22C55E',
  warning:   '#D97706',
  text:      '#F8FAFC',
  textDim:   '#64748B',
  border:    'rgba(249,115,22,0.08)',
  borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)' }

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .lp-btn { transition: transform .15s ease, box-shadow .15s ease !important; }
  .lp-btn:active { transform: scale(0.96) !important; }
  .grad-text { background: linear-gradient(135deg,#F97316,#D97706); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  details > summary { list-style: none; cursor: pointer; }
  details > summary::-webkit-details-marker { display: none; }
  details[open] .faq-icon { transform: rotate(45deg); }
  .faq-icon { transition: transform .2s ease; display: inline-block; }
`

function Navbar() {
  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,9,13,0.92)', backdropFilter:'blur(24px)', borderBottom:`1px solid ${C.border}`, padding:'0 24px' }}>
      <div style={{ maxWidth:1120, margin:'0 auto', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', direction:'rtl' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width:40, height:40, borderRadius:13, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center' }}><HardHat size={21} color="#fff" strokeWidth={2} /></div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:C.text }}>Contractor Pro</div>
            <div style={{ fontSize:10, color:C.textDim }}>קבלן פרו</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => navigate('/')} className="lp-btn"
            style={{ background:'transparent', border:'none', color:C.textDim, fontSize:13, fontWeight:600, cursor:'pointer', padding:'8px 14px', borderRadius:10 }}>
            الرئيسية
          </button>
          <button onClick={() => navigate('/login')} className="lp-btn"
            style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.borderMid}`, color:C.text, fontSize:13, fontWeight:700, cursor:'pointer', padding:'8px 18px', borderRadius:12 }}>
            تسجيل الدخول
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Pricing cards ────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'starter',
    name: 'المبتدئ',
    nameEn: 'Starter',
    price: 129,
    period: 'شهر',
    desc: 'للمقاول الفرد الذي يريد نظاماً بسيطاً.',
    color: C.primary,
    features: [
      'مشاريع غير محدودة',
      'حتى 10 عمال',
      'تسجيل أيام العمل والمصاريف',
      'تقارير أساسية',
      'دعم بريد إلكتروني',
    ],
    missing: ['أعضاء الفريق', 'تصدير PDF/Excel', 'استرداد ضريبة القيمة المضافة'],
  },
  {
    key: 'pro',
    name: 'المحترف',
    nameEn: 'Pro',
    price: 249,
    period: 'شهر',
    desc: 'الأكثر شعبية — للمقاول النشط والمشاريع المتعددة.',
    color: C.secondary,
    popular: true,
    features: [
      'عمال غير محدودون',
      'مشاريع غير محدودة',
      'تصدير PDF و Excel',
      'استرداد ضريبة القيمة المضافة',
      'أعضاء الفريق (3 مستخدمين)',
      'بوابة العمال للحضور الذاتي',
      'دعم أولوية',
    ],
    missing: ['API access', 'مدير حساب مخصص'],
  },
  {
    key: 'business',
    name: 'الأعمال',
    nameEn: 'Business',
    price: 499,
    period: 'شهر',
    desc: 'لشركات المقاولات الكبيرة ومتعددي المشاريع.',
    color: C.warning,
    features: [
      'كل مزايا المحترف',
      'أعضاء فريق غير محدودون',
      'API access للتكاملات',
      'مدير حساب مخصص',
      'تكاملات مخصصة',
      'SLA مضمون 99.9%',
    ],
    missing: [],
  },
]

function PricingCard({ plan, onSubscribe, currentPlan, loading, cycle }) {
  const isCurrent = currentPlan === plan.key
  const borderColor = plan.popular ? plan.color : C.border
  const isYear      = cycle === 'year'
  const annual      = plan.price * 10                 // خصم شهرين
  const effMonthly  = Math.round(annual / 12)
  const displayPrice = isYear ? effMonthly : plan.price

  return (
    <div style={{
      background: plan.popular ? `linear-gradient(160deg, ${C.surface} 0%, rgba(99,102,241,0.06) 100%)` : C.surface,
      borderRadius: 24,
      padding: 28,
      border: `1px solid ${plan.popular ? plan.color + '55' : C.border}`,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: plan.popular ? `0 24px 60px ${plan.color}22` : 'none',
      transition: 'transform .2s',
    }}>
      {/* Popular badge */}
      {plan.popular && (
        <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${plan.color},#8B5CF6)`, borderRadius:100, padding:'4px 16px', fontSize:11, fontWeight:800, color:'#fff', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4 }}>
          <Star size={12} fill="#fff" strokeWidth={0} /> الأكثر شعبية
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:18, fontWeight:800, color:C.text }}>{plan.name}</span>
          {isCurrent && (
            <span style={{ fontSize:10, background:`${C.success}22`, border:`1px solid ${C.success}44`, color:C.success, borderRadius:100, padding:'3px 10px', fontWeight:700 }}>
              خطتك الحالية
            </span>
          )}
        </div>
        <p style={{ fontSize:12, color:C.textDim, lineHeight:1.5, marginBottom:16 }}>{plan.desc}</p>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontSize:40, fontWeight:900, color:plan.color }}>₪{displayPrice}</span>
          <span style={{ fontSize:13, color:C.textDim }}>/ شهر</span>
        </div>
        {isYear ? (
          <div style={{ fontSize:12, color:C.success, fontWeight:700, marginTop:6 }}>
            يُدفع ₪{annual} سنوياً · وفّر ₪{plan.price * 2}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.textDim, marginTop:6, opacity:0.7 }}>
            أو ₪{effMonthly}/شهر بالاشتراك السنوي
          </div>
        )}
      </div>

      {/* CTA button */}
      <button onClick={() => onSubscribe(plan.key)} disabled={loading || isCurrent} className="lp-btn"
        style={{
          width:'100%', padding:'14px', borderRadius:14, border:'none', cursor: isCurrent ? 'default' : 'pointer',
          background: isCurrent ? `${C.success}18` : (plan.popular ? `linear-gradient(135deg,${plan.color},#8B5CF6)` : `${plan.color}18`),
          color: isCurrent ? C.success : (plan.popular ? '#fff' : plan.color),
          fontSize:14, fontWeight:800, marginBottom:24,
          boxShadow: (!isCurrent && plan.popular) ? `0 8px 24px ${plan.color}44` : 'none',
          opacity: loading ? 0.6 : 1,
        }}>
        {loading ? 'جاري التحميل...' :
          isCurrent ? <><Check size={15} strokeWidth={2.6} style={{ verticalAlign:'-3px', marginInlineEnd:5 }} />خطتك الحالية</> :
          'اشترك الآن — جرّب مجاناً 14 يوم'}
      </button>

      {/* Features */}
      <div style={{ flex:1 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
            <div style={{ width:18, height:18, borderRadius:5, background:`${plan.color}22`, display:'flex', alignItems:'center', justifyContent:'center', color:plan.color, flexShrink:0, marginTop:1 }}><Check size={11} strokeWidth={3} /></div>
            <span style={{ fontSize:13, color:C.textDim, lineHeight:1.5 }}>{f}</span>
          </div>
        ))}
        {plan.missing.map((f, i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start', opacity:0.35 }}>
            <div style={{ width:18, height:18, borderRadius:5, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', color:C.textDim, flexShrink:0, marginTop:1 }}><X size={11} strokeWidth={3} /></div>
            <span style={{ fontSize:13, color:C.textDim, lineHeight:1.5 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'هل يمكنني الإلغاء في أي وقت؟',
    a: 'نعم، بالكامل. يمكنك إلغاء اشتراكك في أي لحظة من إعدادات حسابك. ستستمر في الوصول للتطبيق حتى نهاية دورة الفاتورة الحالية.',
  },
  {
    q: 'هل فترة التجربة المجانية تتطلب بطاقة ائتمان؟',
    a: 'لا. تجربتك المجانية لمدة 14 يوماً لا تتطلب أي معلومات دفع. فقط سجّل وابدأ — ستطلب منك الدفع فقط عند انتهاء الفترة التجريبية.',
  },
  {
    q: 'كيف يتم حساب ضريبة القيمة المضافة (مع עוסק מורשה)?',
    a: 'التطبيق يعرف أي الفئات تستحق استرداد مس תשומות: مواد البناء 100%، المواصلات والمركبات الخاصة 66.7%، الرواتب 0%. يحسب كل شي تلقائياً ويولّد تقرير شهري للمحاسب.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'بياناتك محفوظة في Supabase مع تشفير كامل وعزل تام. كل مستخدم يرى فقط بياناته الخاصة. نستخدم Row Level Security على قاعدة البيانات لضمان الخصوصية الكاملة.',
  },
  {
    q: 'هل التطبيق يعمل بدون إنترنت؟',
    a: 'التطبيق يعمل كـ PWA — يمكن تثبيته على الجوال مثل تطبيق عادي. البيانات المحملة مسبقاً تبقى متاحة عند انقطاع الإنترنت، وتتزامن تلقائياً عند عودة الاتصال.',
  },
  {
    q: 'هل يدعم التطبيق عملة الشيقل وضريبة إسرائيل؟',
    a: 'نعم — التطبيق مصمم خصيصاً للمقاول في إسرائيل. يدعم الشيقل (₪)، ضريبة القيمة المضافة 18%، البيتواح ليئومي، وضريبة الدخل حسب الشرائح الإسرائيلية لعام 2024.',
  },
]

function FAQ() {
  return (
    <section style={{ padding:'80px 24px', direction:'rtl' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <h2 style={{ fontSize:'clamp(22px,4vw,34px)', fontWeight:900, color:C.text, textAlign:'center', marginBottom:8 }}>
          أسئلة شائعة
        </h2>
        <p style={{ textAlign:'center', color:C.textDim, fontSize:14, marginBottom:48 }}>لم تجد جوابك؟ تواصل معنا مباشرة.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {FAQS.map((faq, i) => (
            <details key={i} style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <summary style={{ padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:14, fontWeight:700, color:C.text, gap:12 }}>
                <span>{faq.q}</span>
                <span className="faq-icon" style={{ fontSize:18, color:C.textDim, flexShrink:0 }}>+</span>
              </summary>
              <div style={{ padding:'0 22px 18px', fontSize:13, color:C.textDim, lineHeight:1.8 }}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PricingPage() {
  // ميتا المسار من seoRoutes (عنوان/وصف/breadcrumb تلقائي) + FAQPage من أسئلة الصفحة
  useRouteSeo('/pricing', faqLd(FAQS))
  const { user } = useAuth()
  const { org }  = useOrganization(user?.id)
  const [cycle, setCycle] = useState('month')   // 'month' | 'year'
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError,   setCheckoutError]   = useState('')
  const [checkoutSuccess, setCheckoutSuccess] = useState(
    new URLSearchParams(window.location.search).get('checkout') === 'success'
  )

  // عرض صفحة الأسعار على القناتين (GA4 view_item_list + TikTok ViewContent) —
  // إشارة قمع وسطى يحتاجها الخوارزم للتعلّم.
  useEffect(() => {
    trackViewPricing(cycle)
  }, [])

  async function handleSubscribe(plan) {
    setCheckoutError('')

    if (!user) {
      // Not logged in → go to register (starts free trial, then plan selection after login)
      sessionStorage.setItem('pending_plan', plan)
      sessionStorage.setItem('pending_cycle', cycle)
      navigate('/register')
      return
    }

    if (!pricesFor(cycle)[plan]) {
      setCheckoutError('لم يتم إعداد رابط الدفع بعد — تواصل معنا.')
      return
    }

    if (!org) {
      setCheckoutError('خطأ في تحميل بيانات الحساب — أعد تحميل الصفحة.')
      return
    }

    setCheckoutLoading(true)
    try {
      await openCheckout({ plan, user, org, cycle })
    } catch (err) {
      setCheckoutError(err.message || 'حدث خطأ أثناء فتح صفحة الدفع.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ background:C.bg, minHeight:'100vh', color:C.text }}>
        <Navbar />

        {/* ── Hero ── */}
        <section style={{ padding:'72px 24px 48px', textAlign:'center', direction:'rtl', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 65%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-20%', left:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)', pointerEvents:'none' }} />
          <div style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${C.success}14`, border:`1px solid ${C.success}33`, borderRadius:100, padding:'6px 16px', marginBottom:24, fontSize:12, color:C.success, fontWeight:700 }}>
              <Check size={13} strokeWidth={2.6} /> 14 يوم مجاناً — بدون بطاقة ائتمان
            </div>
            <h1 style={{ fontSize:'clamp(26px,5vw,46px)', fontWeight:900, color:C.text, lineHeight:1.2, marginBottom:14 }}>
              اختر الخطة المناسبة<br /><span className="grad-text">لمشروعك</span>
            </h1>
            <p style={{ fontSize:16, color:C.textDim, lineHeight:1.6 }}>
              جميع الخطط تبدأ بتجربة مجانية 14 يوماً. يمكنك الترقية أو الإلغاء في أي وقت.
            </p>
          </div>
        </section>

        {/* ── Billing cycle toggle ── */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:32, direction:'rtl' }}>
          <div style={{ display:'inline-flex', background:C.surface, border:`1px solid ${C.borderMid}`, borderRadius:14, padding:4, gap:4 }}>
            {[
              { key:'month', label:'شهري' },
              { key:'year',  label:'سنوي' },
            ].map(opt => {
              const active = cycle === opt.key
              return (
                <button key={opt.key} onClick={() => setCycle(opt.key)} className="lp-btn"
                  style={{ display:'inline-flex', alignItems:'center', gap:7, border:'none', cursor:'pointer', borderRadius:11, padding:'9px 20px', fontSize:13, fontWeight:800,
                    background: active ? GRAD.brand : 'transparent',
                    color: active ? '#fff' : C.textDim }}>
                  {opt.label}
                  {opt.key === 'year' && (
                    <span style={{ fontSize:10, fontWeight:800, background: active ? 'rgba(255,255,255,0.22)' : `${C.success}22`, color: active ? '#fff' : C.success, borderRadius:7, padding:'2px 7px' }}>
                      وفّر شهرين
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Checkout feedback ── */}
        {checkoutSuccess && (
          <div style={{ maxWidth:600, margin:'0 auto 24px', padding:'16px 24px', background:`${C.success}18`, border:`1px solid ${C.success}44`, borderRadius:16, textAlign:'center', direction:'rtl', fontSize:14, color:C.success, fontWeight:700 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, justifyContent:'center' }}><CheckCircle2 size={16} strokeWidth={2.4} /> تم تفعيل اشتراكك بنجاح! مرحباً بك في Contractor Pro.</span>
            <button onClick={() => navigate('/app')} style={{ display:'block', margin:'12px auto 0', background:C.success, border:'none', color:'#fff', fontSize:13, fontWeight:800, padding:'10px 24px', borderRadius:12, cursor:'pointer' }}>
              الدخول للتطبيق
            </button>
          </div>
        )}
        {checkoutError && (
          <div style={{ maxWidth:600, margin:'0 auto 24px', padding:'14px 22px', background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:14, textAlign:'center', direction:'rtl', fontSize:13, color:C.accent, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <AlertTriangle size={14} strokeWidth={2.2} /> {checkoutError}
          </div>
        )}

        {/* ── Plans ── */}
        <section style={{ padding:'0 24px 64px', direction:'rtl' }}>
          <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24, alignItems:'start' }}>
            {PLANS.map(plan => (
              <PricingCard
                key={plan.key}
                plan={plan}
                onSubscribe={handleSubscribe}
                currentPlan={org?.plan}
                loading={checkoutLoading}
                cycle={cycle}
              />
            ))}
          </div>
        </section>

        {/* ── Comparison note ── */}
        <section style={{ padding:'0 24px 48px', direction:'rtl', textAlign:'center' }}>
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <div style={{ background:C.surface, borderRadius:20, padding:28, border:`1px solid ${C.border}` }}>
              <Lightbulb size={26} color={C.warning} strokeWidth={1.9} style={{ margin:'0 auto 12px', display:'block' }} />
              <h3 style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:8 }}>غير متأكد من الخطة المناسبة؟</h3>
              <p style={{ fontSize:13, color:C.textDim, lineHeight:1.7, marginBottom:20 }}>
                ابدأ بالتجربة المجانية 14 يوماً واستكشف كل الميزات — ثم اختر الخطة التي تناسب حجم مشاريعك.
                معظم المقاولين يجدون أن خطة <strong style={{ color:C.secondary }}>المحترف</strong> هي الأنسب.
              </p>
              <button onClick={() => handleSubscribe('pro')} disabled={checkoutLoading} className="lp-btn"
                style={{ background:GRAD.brand, border:'none', color:'#fff', fontSize:14, fontWeight:800, padding:'13px 28px', borderRadius:14, cursor:'pointer', boxShadow:`0 8px 24px ${C.primary}44` }}>
                ابدأ بخطة المحترف
              </button>
            </div>
          </div>
        </section>

        <FAQ />

        {/* Footer */}
        <footer style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'28px 24px', direction:'rtl' }}>
          <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HardHat size={16} color={C.primary} strokeWidth={2} />
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Contractor Pro</span>
              <span style={{ fontSize:11, color:C.textDim }}>© {new Date().getFullYear()}</span>
            </div>
            <div style={{ display:'flex', gap:18, flexWrap:'wrap', alignItems:'center' }}>
              {[
                { l: 'الخصوصية',          path: '/privacy' },
                { l: 'شروط الاستخدام',    path: '/terms'   },
                { l: 'الإلغاء والاسترجاع', path: '/refund' },
                { l: 'تواصل معنا',        path: '/contact' },
              ].map(({ l, path }) => (
                <span key={l} onClick={() => navigate(path)} style={{ fontSize:12, color:C.textDim, cursor:'pointer' }}>{l}</span>
              ))}
              <button onClick={() => navigate('/')} style={{ background:'transparent', border:'none', color:C.textDim, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <ArrowLeft size={13} strokeWidth={2.2} /> الرئيسية
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
