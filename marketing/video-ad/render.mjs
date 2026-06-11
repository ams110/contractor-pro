// Renders ad.html to frames via headless Chromium, then ffmpeg -> mp4 (+music).
// Usage: node render.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30, DUR = 15, FRAMES = FPS * DUR;
const FRAMEDIR = path.join(DIR, '.frames');
const FFMPEG = process.env.FFMPEG || '/tmp/node_modules/ffmpeg-static/ffmpeg';

rmSync(FRAMEDIR, { recursive: true, force: true });
mkdirSync(FRAMEDIR, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(DIR, 'ad.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

for (let f = 0; f < FRAMES; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => window.seek(tt), t);
  await page.screenshot({ path: path.join(FRAMEDIR, `f_${String(f).padStart(4, '0')}.png`), animations: 'disabled' });
}
await browser.close();
console.log('frames done:', FRAMES);

const out = path.join(DIR, 'cp_15s_ar_v22.mp4');
execFileSync(FFMPEG, [
  '-y',
  '-framerate', String(FPS), '-i', path.join(FRAMEDIR, 'f_%04d.png'),
  '-i', path.join(DIR, 'assets', 'music15.m4a'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium',
  '-c:a', 'aac', '-b:a', '192k', '-shortest',
  '-movflags', '+faststart', out
], { stdio: 'inherit' });
rmSync(FRAMEDIR, { recursive: true, force: true });
console.log('OK ->', out);
