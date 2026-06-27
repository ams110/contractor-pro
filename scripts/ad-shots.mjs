// ═══════════════════════════════════════════════════════════════════════════
//  ad-shots.mjs — توليد البوسترات الإعلانية من محرّك AdStudio (مسار /adstudio)
//  كل بوستر = موك‑أب آيفون (جوّاه شاشة التطبيق الحيّة) + عنوان + CTA بالهوية.
//
//  الإعدادات المحفوظة (نفس اللي طلعت البوسترات النهائية):
//    • المقاسات    : square 1080×1080 · portrait 1080×1350 · story 1080×1920
//    • الدقّة       : deviceScaleFactor = 2   (square→2160² · story→2160×3840)
//    • الصيغة      : png بدون ضغط (lossless)  |  أو jpeg جودة 95
//    • الالتقاط     : يُقصّ على عنصر البوستر بالضبط (بلا هوامش المتصفّح)
//    • الانتظار     : networkidle + ظهور عنصر البوستر + 4s للأنميشن و iframe الشاشة
//
//  الاستعمال:
//    npm run dev                      # لازم السيرفر شغّال على :3000
//    node scripts/ad-shots.mjs        # أفضل 9 أفكار × (square + story) PNG 2x
//
//  تخصيص عبر متغيّرات البيئة:
//    IDEAS=0,1,3,4,7,10,11,13,29   # أرقام الأفكار (0..29) — انظر IDEAS في src/pages/AdStudio.jsx
//    SIZES=square,story            # square | portrait | story (مفصولة بفواصل)
//    DPR=2                         # الدقّة (1 = المقاس الأصلي 1080 · 2 = ريتينا)
//    FORMAT=png                    # png | jpeg
//    QUALITY=95                    # jpeg فقط
//    BASE=http://localhost:3000
//    OUT=ads                       # مجلّد الإخراج
//    CHANNEL=chrome  أو  EXECUTABLE_PATH=/usr/bin/google-chrome-stable
//
//  مثال (كل المقاسات الثلاثة لفكرتين، jpeg):
//    IDEAS=0,7 SIZES=square,portrait,story FORMAT=jpeg node scripts/ad-shots.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const env = (k, d) => process.env[k] ?? d

// أبعاد كل مقاس (لازم تطابق SIZES في src/pages/AdStudio.jsx)
const DIMS = { square: { w: 1080, h: 1080 }, portrait: { w: 1080, h: 1350 }, story: { w: 1080, h: 1920 } }

const IDEAS   = env('IDEAS', '0,1,3,4,7,10,11,13,29').split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
const SIZES   = env('SIZES', 'square,story').split(',').map(s => s.trim()).filter(s => DIMS[s])
const DPR     = Number(env('DPR', 2))
const FORMAT  = env('FORMAT', 'png').toLowerCase()
const QUALITY = Number(env('QUALITY', 95))
const BASE    = env('BASE', 'http://localhost:3000')
const LANG    = env('LANG', '')            // '' = عربي (افتراضي) · he = بوسترات عبرية (IDEAS_HE)
const OUT     = resolve(process.cwd(), env('OUT', LANG ? `ads-${LANG}` : 'ads'))

async function main() {
  if (!SIZES.length) { console.error('❌ لا مقاسات صالحة (square|portrait|story)'); process.exit(1) }
  await mkdir(OUT, { recursive: true })

  const channel = env('CHANNEL', 'chrome')
  const execPath = process.env.EXECUTABLE_PATH
  let browser
  try {
    browser = await chromium.launch(execPath ? { executablePath: execPath } : { channel })
  } catch {
    console.warn('⚠️  تعذّر Chrome النظام — أحاول chromium المجمّع (قد يحتاج: npx playwright install chromium)')
    browser = await chromium.launch()
  }

  let count = 0
  for (const size of SIZES) {
    const { w, h } = DIMS[size]
    const ctx = await browser.newContext({ viewport: { width: w + 100, height: h + 60 }, deviceScaleFactor: DPR })
    // 🔑 ابذر لغة التطبيق قبل أي تحميل حتى يبدأ i18n باللغة المطلوبة من أوّل لقطة
    // (وإلا أوّل بوستر يُلتقط أثناء انتقال ar→he فيطلع نصف عربي).
    if (LANG) await ctx.addInitScript((l) => { try { localStorage.setItem('cp_lang', l) } catch (e) {} }, LANG)
    const page = await ctx.newPage()

    for (const id of IDEAS) {
      await page.goto(`${BASE}/adstudio?idea=${id}&size=${size}${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'networkidle' })
      // انتظر ظهور عنصر البوستر بالأبعاد الصحيحة ثم علّمه
      try {
        await page.waitForFunction(({ ww, hh }) => {
          for (const el of document.querySelectorAll('div'))
            if (Math.abs(el.offsetWidth - ww) <= 2 && Math.abs(el.offsetHeight - hh) <= 2) return true
          return false
        }, { ww: w, hh: h }, { timeout: 15000 })
      } catch {
        console.warn(`⚠️  لم يظهر عنصر البوستر للفكرة ${id} (${size}) — أتخطّاها`); continue
      }
      await page.evaluate(({ ww, hh }) => {
        for (const el of document.querySelectorAll('div'))
          if (Math.abs(el.offsetWidth - ww) <= 2 && Math.abs(el.offsetHeight - hh) <= 2) { el.setAttribute('data-poster', '1'); return }
      }, { ww: w, hh: h })

      await page.waitForTimeout(4000) // أنميشن البوستر + تحميل iframe الشاشة

      const ext = FORMAT === 'jpeg' ? 'jpg' : 'png'
      const path = resolve(OUT, `ad-${String(id).padStart(2, '0')}-${size}.${ext}`)
      await page.locator('[data-poster]').screenshot({
        path,
        type: FORMAT === 'jpeg' ? 'jpeg' : 'png',
        ...(FORMAT === 'jpeg' ? { quality: QUALITY } : {}),
        scale: 'device',
      })
      await page.evaluate(() => { const e = document.querySelector('[data-poster]'); if (e) e.removeAttribute('data-poster') })
      count++
      console.log(`✅ idea ${String(id).padStart(2, '0')} · ${size.padEnd(8)} → ${path}  (${w * DPR}×${h * DPR})`)
    }
    await ctx.close()
  }

  await browser.close()
  console.log(`\n🎉 ${count} بوستر في: ${OUT}`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
