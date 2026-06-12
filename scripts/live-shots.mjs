// ═══════════════════════════════════════════════════════════════════════════
//  live-shots.mjs — لقطات للشاشات الحقيقية بعد تسجيل دخول حقيقي (بيانات الديمو)
//  يدخل بحساب demo.reel، ويصوّر: لوحة التحكم · الذمّة الصافية · بصمة العامل ·
//  المالية/المحاسبة/ملخص الضرائب — كلها شاشات حقيقية ببيانات حقيقية.
//
//  يتطلّب: dev server شغّال على :3000 موصول بـSupabase الحقيقي (.env.local).
//  الاستعمال: node scripts/live-shots.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const env = (k, d) => process.env[k] ?? d
const BASE  = env('BASE', 'http://localhost:3000')
const EMAIL = env('EMAIL', 'demo.reel@contractorpro.app')
const PASS  = env('PASS', 'DemoReel2026!')
const DPR   = Number(env('DPR', 3))
const OUT   = resolve(process.cwd(), env('OUT', 'live'))
const WORKER = env('WORKER', 'يوسف العبد')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  await mkdir(OUT, { recursive: true })

  const channel = env('CHANNEL', 'chrome')
  let browser
  try { browser = await chromium.launch({ channel }) }
  catch { console.warn('⚠️ تعذّر chrome — chromium المجمّع'); browser = await chromium.launch() }

  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: DPR,
    ignoreHTTPSErrors: true,          // تخطّي مشكلة شهادة البروكسي
    locale: 'ar',
  })
  const page = await ctx.newPage()
  const shot = async (name) => {
    const path = resolve(OUT, `${name}.png`)
    await page.screenshot({ path, type: 'png' })
    console.log(`✅ ${name} → ${path}`)
  }
  // نقر عبر JS — يتخطّى اعتراض pointer-events، ويصعد لأقرب سلف قابل للنقر
  const clickText = async (txt, { exact = false } = {}) => {
    return page.evaluate(({ txt, exact }) => {
      const nodes = [...document.querySelectorAll('button,a,div,span,p,h1,h2,h3')]
      const match = nodes.find(n => {
        const t = (n.textContent || '').trim()
        return exact ? t === txt : t.includes(txt)
      })
      if (!match) return false
      const clickable = match.closest('button,a,[role="button"]') || match
      clickable.click()
      return true
    }, { txt, exact })
  }

  // ── 1) تسجيل الدخول ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  // لافتة الكوكيز
  try { await page.getByRole('button', { name: 'موافق' }).click({ timeout: 3000 }) } catch {}
  await page.getByPlaceholder('example@email.com').fill(EMAIL)
  await page.getByPlaceholder('••••••••').fill(PASS)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

  // انتظر تحميل التطبيق (شريط التنقّل السفلي)
  await page.waitForSelector('text=الرئيسية', { timeout: 30000 })
  await sleep(3000)
  // أغلق نافذة الترحيب «ابدأ الآن» إن ظهرت (مرّة/مرّتين)
  for (let i = 0; i < 3; i++) {
    const closed = await clickText('ابدأ الآن', { exact: true })
    if (!closed) break
    await sleep(1500)
  }
  await sleep(2500)   // استقرار بعد الإغلاق
  await shot('01-dashboard')

  // ── 2) الذمّة الصافية — تمرير لها على لوحة التحكم ─────────────────────────
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('div,span,h1,h2,h3')]
      .find(n => { const t = (n.textContent || '').trim(); return t === 'ذمّتك الصافية' })
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  })
  await sleep(2500)
  await shot('02-networth')

  // ── 3) بصمة العامل — افتح عاملاً ──────────────────────────────────────────
  await clickText('عمال', { exact: true })
  await sleep(3500)
  await shot('03-workers-roster')
  // افتح تفصيل العامل (نقر حقيقي على صف لوحة الشرف → onSelect)
  try {
    const w = page.getByText(WORKER, { exact: false }).first()
    await w.scrollIntoViewIfNeeded()
    await w.click({ force: true })
    await page.waitForSelector('text=بصمة العامل', { timeout: 12000 })
    await sleep(4500)   // الرادار + الهيتماب + العدّادات
    await shot('04-workerdna')
    await page.screenshot({ path: resolve(OUT, '04-workerdna-full.png'), type: 'png', fullPage: true })
    console.log('✅ 04-workerdna-full')
  } catch (e) { console.warn('⚠️ تعذّر فتح تفصيل العامل:', e.message) }

  // ── 4) المالية → محاسبة → ملخص ────────────────────────────────────────────
  await clickText('المالية', { exact: true })
  await sleep(3500)
  await shot('05-finance')
  await clickText('محاسبة', { exact: true }); await sleep(2800)
  await clickText('ملخص', { exact: true });  await sleep(3800)
  await shot('06-tax-summary')
  await page.screenshot({ path: resolve(OUT, '06-tax-summary-full.png'), type: 'png', fullPage: true })
  console.log('✅ 06-tax-summary-full')

  await browser.close()
  console.log(`\n🎉 لقطات في: ${OUT}`)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
