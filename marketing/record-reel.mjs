// ─────────────────────────────────────────────────────────────────────────────
// record-reel.mjs — يخرج فيديو ريلز (WebM 1080×1920) من marketing/promo-reel.html
// تلقائياً عبر Playwright (بدون تسجيل شاشة يدوي وبدون ffmpeg).
//
// التشغيل:
//   node marketing/record-reel.mjs
//
// المخرجات: marketing/out/contractor-pro-reel.webm  (~28s، 9:16)
// لتحويلها MP4 (إن توفّر ffmpeg):
//   ffmpeg -i marketing/out/contractor-pro-reel.webm -c:v libx264 -pix_fmt yuv420p \
//          -vf "scale=1080:1920" marketing/out/contractor-pro-reel.mp4
// أو ارفع الـ WebM مباشرة (إنستغرام/تيك‑توك/فيسبوك تقبلها).
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readdirSync, renameSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'out');
mkdirSync(outDir, { recursive: true });

// مدّة لقطة كاملة واحدة من الريلز (مطابقة لـ SCENES في promo-reel.html) + هامش
const DURATION_MS = 31200 + 600;

// اعثر على chromium المدمج (headless shell) إن كان Chrome النظامي غير متوفّر
let executablePath;
try {
  executablePath = execSync(
    'ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null'
  ).toString().trim().split('\n')[0] || undefined;
} catch { /* استعمل الافتراضي */ }

const reelUrl = 'file://' + join(__dirname, 'promo-reel.html');

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
});
const page = await context.newPage();
await page.goto(reelUrl, { waitUntil: 'load' });
// إخفاء عناصر الواجهة (أزرار/شريط/نقاط) لتسجيل نظيف
await page.addStyleTag({ content: '#ctrl,.topbar .nope{display:none!important}' });
await page.evaluate(() => { document.body.classList.add('hide-ui'); window.Reel?.replay(); });

console.log(`⏺  جاري التسجيل (~${Math.round(DURATION_MS / 1000)}s)…`);
await page.waitForTimeout(DURATION_MS);

const video = page.video();
await context.close();           // يُنهي ويحفظ الفيديو
await browser.close();

// أعِد التسمية لاسم ثابت
const finalPath = join(outDir, 'contractor-pro-reel.webm');
if (video) {
  const p = await video.path();
  if (existsSync(p) && p !== finalPath) renameSync(p, finalPath);
} else {
  // احتياط: التقط أحدث ملف webm
  const webm = readdirSync(outDir).filter(f => f.endsWith('.webm')).sort();
  if (webm.length) renameSync(join(outDir, webm[webm.length - 1]), finalPath);
}
console.log('✅  تمّ:', finalPath);
