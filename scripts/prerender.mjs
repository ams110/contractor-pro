// ─── Prerender ثابت لكل مسار (postbuild) ────────────────────────────────────────
// التطبيق SPA يخدم نفس index.html لكل المسارات. جوجل يرندر JS، لكن زواحف
// المشاركة (واتساب/فيسبوك/لينكدإن/تويتر) لا ترندر JS — فلمّا يُشارك رابط مثل
// /pricing تظهر ميتا الصفحة الرئيسية فقط. هذا السكربت ينسخ dist/index.html لكل
// مسار ويستبدل العنوان/الوصف/canonical/OG/JSON-LD بقيمه الصحيحة، ويكتب
// dist/<path>/index.html. الخوادم (Vercel/Pages) تخدم الملف الثابت إن وُجد قبل
// تطبيق إعادة التوجيه للـSPA. لا puppeteer — استبدال نصّي صِرف فلا يكسر البناء.

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import {
  ROUTE_SEO, breadcrumbFor, ORIGIN, OG_IMAGE,
  DEFAULT_TITLE, DEFAULT_DESC,
} from '../src/lib/seoRoutes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')

// هروب آمن لقيمة سمة HTML (content="...") و لنصّ <title>
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const text = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let template
try {
  template = readFileSync(join(DIST, 'index.html'), 'utf8')
} catch {
  console.error('prerender: dist/index.html غير موجود — شغّل البناء أولاً.')
  process.exit(0) // لا تُفشل البناء
}

function buildHtml(path, meta) {
  const url = ORIGIN + (path === '/' ? '/' : path)
  const title = meta.title || DEFAULT_TITLE
  const desc = meta.description || DEFAULT_DESC
  const robots = meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'

  // schemas الخاصة بالمسار: breadcrumb + (FAQ أو غيره)
  const crumb = breadcrumbFor(path)
  const own = meta.schema || null
  const schemas = [crumb, own].filter(Boolean)

  let html = template
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${text(title)}</title>`)
  html = html.replace(/(<meta name="description" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(desc)}$2`)
  html = html.replace(/(<meta name="robots" content=")[\s\S]*?("\s*\/?>)/, `$1${robots}$2`)
  html = html.replace(/(<link rel="canonical" href=")[\s\S]*?("\s*\/?>)/, `$1${attr(url)}$2`)
  html = html.replace(/(<meta property="og:title" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(title)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(desc)}$2`)
  html = html.replace(/(<meta property="og:url" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(url)}$2`)
  html = html.replace(/(<meta name="twitter:title" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(title)}$2`)
  html = html.replace(/(<meta name="twitter:description" content=")[\s\S]*?("\s*\/?>)/, `$1${attr(desc)}$2`)

  // حقن JSON-LD الخاص بالمسار قبل </head>
  if (schemas.length) {
    const ld = schemas.length === 1 ? schemas[0] : schemas
    const script = `  <script type="application/ld+json" id="cp-route-jsonld">${JSON.stringify(ld)}</script>\n</head>`
    html = html.replace('</head>', script)
  }
  return html
}

let count = 0
for (const [path, meta] of Object.entries(ROUTE_SEO)) {
  if (meta.noindex) continue            // صفحات داخلية (welcome) لا تُولَّد ثابتة
  const html = buildHtml(path, meta)
  if (path === '/') {
    writeFileSync(join(DIST, 'index.html'), html)   // أثرِ الرئيسية بـFAQ
  } else {
    const dir = join(DIST, path.replace(/^\//, ''))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html)
  }
  count++
}
console.log(`✓ prerender: ${count} صفحة ثابتة (${Object.keys(ROUTE_SEO).filter(p => !ROUTE_SEO[p].noindex).join(', ')})`)
