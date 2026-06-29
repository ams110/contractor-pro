// ── تتبّع مصدر المستخدم (UTM / Referrer) — أول لمسة ───────────────────────────
// نلتقط من أين جاء الزائر أول مرّة (تيك توك/فيسبوك/إعلان/مباشر)، نخزّنه محلياً،
// ثم نحفظه في جدول user_attribution أول ما يصير للمستخدم جلسة مصادَقة.
// أول لمسة (first-touch): ما نكتب فوق مصدر موجود — أول مصدر هو مصدر الاكتساب.

import { supabase } from './supabase.js'

const KEY = 'kbl_attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

// يُستدعى مرّة عند إقلاع التطبيق (قبل أي تنقّل) — يثبّت المصدر أول لمسة فقط.
export function captureAttribution() {
  try {
    if (localStorage.getItem(KEY)) return // أول لمسة فقط — لا نكتب فوق الموجود
    const p = new URLSearchParams(window.location.search)
    const get = (k) => { const v = p.get(k); return v ? v.slice(0, 200) : undefined }

    let source = get('utm_source') || (get('ref') ? get('ref') : undefined)
    if (!source) {
      // اشتقّ المصدر من الـreferrer (مثلاً tiktok.com → tiktok)، وإلا «direct»
      if (document.referrer) {
        try { source = new URL(document.referrer).hostname.replace(/^www\./, '') }
        catch { source = 'referral' }
      } else {
        source = 'direct'
      }
    }

    const a = {
      utm_source:   source,
      utm_medium:   get('utm_medium'),
      utm_campaign: get('utm_campaign'),
      utm_content:  get('utm_content'),
      utm_term:     get('utm_term'),
      referrer:     document.referrer ? document.referrer.slice(0, 400) : undefined,
      landing_path: (window.location.pathname + window.location.search).slice(0, 400),
    }
    localStorage.setItem(KEY, JSON.stringify(a))
  } catch { /* localStorage محظور أو SSR — تجاهل بأمان */ }
}

export function getAttribution() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

// يُستدعى أول ما يصير للمستخدم جلسة — يحفظ المصدر مرّة واحدة (لو ما في صفّ بعد).
export async function persistAttribution(userId) {
  if (!userId) return
  try {
    const a = getAttribution()
    if (!a) return
    const { data: existing } = await supabase
      .from('user_attribution').select('user_id').eq('user_id', userId).maybeSingle()
    if (existing) return // محفوظ مسبقاً — لا تكرّر
    const row = { user_id: userId, referrer: a.referrer, landing_path: a.landing_path }
    for (const k of UTM_KEYS) row[k] = a[k] ?? null
    await supabase.from('user_attribution').insert(row)
  } catch { /* RLS/شبكة — تجاهل بأمان، لا نكسر الدخول */ }
}
