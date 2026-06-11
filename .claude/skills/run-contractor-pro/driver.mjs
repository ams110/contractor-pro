#!/usr/bin/env node
// Driver for Contractor Pro — launches the Vite dev server with dummy env,
// drives it with Playwright (headless Chromium), and screenshots routes.
//
// Usage (run from repo root):
//   node .claude/skills/run-contractor-pro/driver.mjs [route ...]
//
// Each arg is a route to visit and screenshot (default: "/", "/login", "/pricing").
// Screenshots land in .claude/skills/run-contractor-pro/screenshots/.
//
// The app's src/lib/supabase.js THROWS at import if VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY are unset, so we inject dummy values. They point at
// nothing real — auth/network calls fail, but every screen renders, which is
// what we need to drive the UI.

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const shotsDir = join(__dirname, 'screenshots')
mkdirSync(shotsDir, { recursive: true })

const routes = process.argv.slice(2)
const targets = routes.length ? routes : ['/', '/login', '/pricing']

const env = {
  ...process.env,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://demo.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key',
}

// Parse the actual base URL from Vite's stdout — it auto-increments the port
// when 3000 is busy, so we must read the port it actually bound, not assume 3000.
function waitForViteUrl(proc, timeoutMs = 40000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('dev server timeout')), timeoutMs)
    const onData = (buf) => {
      process.stdout.write(buf) // mirror vite output
      const m = buf.toString().match(/Local:\s+(https?:\/\/localhost:\d+)\//)
      if (m) { clearTimeout(t); proc.stdout.off('data', onData); res(m[1]) }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', (b) => process.stderr.write(b))
  })
}

const slug = (r) => (r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root')

let server
let exitCode = 0
try {
  console.log('▶ starting vite dev server…')
  server = spawn('npm', ['run', 'dev'], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const BASE = await waitForViteUrl(server)
  console.log(`✓ dev server up on ${BASE}`)

  const { chromium } = await import('playwright')
  const browser = await chromium.launch() // PLAYWRIGHT_BROWSERS_PATH picks the installed shell
  // iPhone-ish viewport — app is mobile-first RTL
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'ar' })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  for (const route of targets) {
    const url = BASE + route
    console.log(`\n→ ${url}`)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => {
      console.log(`  (networkidle timed out, continuing): ${e.message}`)
    })
    await page.waitForTimeout(1200) // let framer-motion settle
    const title = await page.title()
    const visible = (await page.evaluate(() => document.body.innerText || '')).trim().slice(0, 120)
    const out = join(shotsDir, `${slug(route)}.png`)
    await page.screenshot({ path: out, fullPage: true })
    console.log(`  title: ${JSON.stringify(title)}`)
    console.log(`  text : ${JSON.stringify(visible)}`)
    console.log(`  shot : ${out}`)
  }

  if (errors.length) {
    console.log(`\n⚠ ${errors.length} console error(s) (expected: network/auth fail against dummy Supabase):`)
    console.log('  ' + errors.slice(0, 5).join('\n  '))
  }
  await browser.close()
  console.log('\n✓ done')
} catch (err) {
  console.error('✗ driver failed:', err)
  exitCode = 1
} finally {
  if (server) server.kill('SIGTERM')
  setTimeout(() => process.exit(exitCode), 500)
}
