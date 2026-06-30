import { useEffect } from 'react'
import {
  ORIGIN, OG_IMAGE,
  ROUTE_SEO, breadcrumbFor,
  seoField, defaultTitleFor, defaultDescFor,
} from './seoRoutes.js'

// اللغة الحالية من سمة <html lang> (يضبطها setLanguage في i18n حسب ?lang=). نقرأها
// من الـDOM بدل استيراد i18n حتى تبقى seo.js بلا أثر جانبي (localStorage) فتُختبر في node.
function currentLang() {
  if (typeof document === 'undefined') return 'ar'
  return document.documentElement.getAttribute('lang') || 'ar'
}

// ─── محرّك SEO لكل مسار (SPA) ──────────────────────────────────────────────────
// التطبيق Single-Page، فـ index.html يحمل ميتا ثابتة لكل المسارات. هذا الـhook
// يحدّث العنوان/الوصف/الـcanonical/Open Graph/Twitter + بيانات JSON-LD ديناميكياً
// حسب الصفحة، فيظهر كل مسار في جوجل بعنوانه ووصفه الخاص (لا تكرار). بلا أي
// اعتماد خارجي (react-helmet) — DOM صِرف. مصدر بيانات المسارات: seoRoutes.js.

export { ORIGIN }
const DEFAULT_IMAGE = OG_IMAGE

function setMeta(attr, key, content) {
  if (content == null) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// JSON-LD مُدار بمعرّف خاص بالمسار → يُستبدل ويُنظَّف عند مغادرة الصفحة فلا
// تتسرّب بيانات (مثل FAQ الرئيسية) لصفحات أخرى.
const ROUTE_LD_ID = 'cp-route-jsonld'
function setRouteJsonLd(schema) {
  const existing = document.getElementById(ROUTE_LD_ID)
  if (existing) existing.remove()
  // فلترة العناصر الفارغة (مثل faqLd الذي يرجّع null لقائمة فارغة) من المصفوفة
  const clean = Array.isArray(schema) ? schema.filter(Boolean) : schema
  if (!clean || (Array.isArray(clean) && clean.length === 0)) return
  const s = document.createElement('script')
  s.id = ROUTE_LD_ID
  s.type = 'application/ld+json'
  s.text = JSON.stringify(Array.isArray(clean) && clean.length === 1 ? clean[0] : clean)
  document.head.appendChild(s)
}

// ─── بُناة بيانات منظّمة (JSON-LD) قابلة لإعادة الاستخدام ──────────────────────
// دوال نقيّة تبني schema.org صالحاً من بيانات الصفحة، فتظهر نتائج غنية في جوجل
// (FAQ + فتات تنقّل) بلا تكرار يدوي في كل صفحة.

/**
 * يبني FAQPage من قائمة أسئلة/أجوبة مرئية على الصفحة.
 * @param {Array<{q:string, a:string}>} items
 * @returns {object|null}
 */
export function faqLd(items) {
  if (!Array.isArray(items) || items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/**
 * يطبّق ميتا SEO لمسار. يُستدعى من داخل useSeo.
 * @param {{title?:string, description?:string, path?:string, image?:string,
 *          jsonLd?:object|array, noindex?:boolean}} opts
 */
export function applySeo(opts = {}) {
  const { title, description, path = '/', image, jsonLd, noindex } = opts
  const url = ORIGIN + path
  const lang = currentLang()
  const t = title || defaultTitleFor(lang)
  const d = description || defaultDescFor(lang)
  const img = image || DEFAULT_IMAGE

  document.title = t
  setMeta('name', 'description', d)
  setMeta(
    'name',
    'robots',
    noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  )
  setCanonical(url)

  setMeta('property', 'og:title', t)
  setMeta('property', 'og:description', d)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', img)

  setMeta('name', 'twitter:title', t)
  setMeta('name', 'twitter:description', d)
  setMeta('name', 'twitter:image', img)

  setRouteJsonLd(jsonLd)
}

/**
 * Hook React: يطبّق ميتا الصفحة عند التركيب، ويرجّع الافتراضي عند المغادرة.
 */
export function useSeo(opts = {}) {
  useEffect(() => {
    applySeo(opts)
    return () => setRouteJsonLd(null) // نظّف JSON-LD الخاص بالمسار
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(opts)])
}

/**
 * Hook مختصر يقرأ ميتا المسار من ROUTE_SEO ويضيف breadcrumb تلقائياً.
 * extraSchema: schema إضافي (مثل FAQ) يُدمج مع الـbreadcrumb في مصفوفة.
 */
export function useRouteSeo(path, extraSchema = null) {
  const meta = ROUTE_SEO[path] || {}
  const lang = currentLang()
  const crumb = breadcrumbFor(path)
  const own = meta.schema || extraSchema
  const schemas = [crumb, own].filter(Boolean)
  const jsonLd = schemas.length === 0 ? null : schemas.length === 1 ? schemas[0] : schemas
  useSeo({
    path,
    // العنوان/الوصف حسب اللغة الحالية (he/en) مع رجوع للعربي الافتراضي
    title: seoField(meta, 'title', lang),
    description: seoField(meta, 'description', lang),
    noindex: meta.noindex,
    jsonLd,
  })
}
