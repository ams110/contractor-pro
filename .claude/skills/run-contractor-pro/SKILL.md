---
name: run-contractor-pro
description: Build, launch, run, and screenshot the Contractor Pro web app (React 18 + Vite + Supabase). Use when asked to run, start, serve, drive, or take a screenshot of Contractor Pro, or to verify a UI change in the running app on a headless Linux machine.
---

# Run Contractor Pro

Contractor Pro is a mobile-first **RTL Arabic** contractor-management PWA
(React 18 + Vite 5 + Supabase). It has no backend of its own to launch — the
frontend talks to a remote Supabase. To drive the UI headlessly we run the Vite
dev server with **dummy** Supabase env vars (auth/network calls fail, but every
screen renders) and drive it with Playwright Chromium.

The driver is **`.claude/skills/run-contractor-pro/driver.mjs`**: it boots the
dev server, reads the actual port from Vite's output (Vite auto-increments past
3000 when busy), visits routes, and writes full-page mobile screenshots to
`.claude/skills/run-contractor-pro/screenshots/`.

All paths below are relative to the repo root. Run commands from there.

## Prerequisites

```bash
npm install
# Playwright Chromium. PLAYWRIGHT_BROWSERS_PATH is preset to /opt/pw-browsers
# in Claude Code web containers; install honors it, and so does runtime — leave
# it as-is. Idempotent.
npx playwright install chromium
```

If you hit `Executable doesn't exist`, your shell overrode
`PLAYWRIGHT_BROWSERS_PATH` between install and run. Don't set/unset it — let
install and the driver see the same value.

## Run (agent path) — the driver

```bash
# default routes: / (landing), /login, /pricing
node .claude/skills/run-contractor-pro/driver.mjs

# or pass specific client-side routes:
node .claude/skills/run-contractor-pro/driver.mjs / /login /pricing
```

Useful routes (client-side, handled by `src/Router.jsx`): `/` `/login`
`/register` `/pricing` `/welcome` `/terms` `/privacy` `/refund` `/contact`.
The worker portal is a query param, not a path: visit `/?portal`.

The driver prints each page's title + first chars of visible text, then exits.
Inspect the PNGs in `.claude/skills/run-contractor-pro/screenshots/` (e.g. Read
`screenshots/login.png`). **Look at the screenshot** — a blank dark page
(`#07080F`) means the JS crashed (see Gotchas).

Expected console noise: `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID`
— the dummy Supabase URL. Harmless; the UI still renders.

To drive a route the default driver doesn't cover (click, fill, assert),
override env to point at a real Supabase and add steps to the driver's `for`
loop using the Playwright `page` it already creates.

## Run (human path)

```bash
VITE_SUPABASE_URL=https://demo.supabase.co VITE_SUPABASE_ANON_KEY=demo \
  npm run dev   # → http://localhost:3000  (Ctrl-C to stop)
```

Useless headless on its own (no browser to view it) — the driver is the
headless path. Without the two `VITE_SUPABASE_*` vars the app throws at startup
(see Gotchas) and renders blank.

## Test

```bash
npm test                                  # full Vitest unit suite (~143 tests)
npx vitest run src/lib/whatsapp.test.js    # a single file (14 tests, fast sanity)
npm run lint                               # ESLint over src
```

E2E (`npm run test:e2e`, Playwright) spins up its own dev server; not needed for
a screenshot.

## Gotchas

- **`src/lib/supabase.js` throws at import** if `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are unset — the whole app fails to mount and you get
  a blank dark screen. There is **no fallback in the code** (CLAUDE.md's mention
  of sandbox defaults is stale). The driver injects dummy values; any other
  launch must too.
- **Stale dev servers cause blank screenshots.** If a previous `npm run dev` is
  still bound to 3000, a naive client hits the old (possibly env-less) instance.
  The driver avoids this by parsing the port Vite actually bound from its
  stdout. If screenshots look wrong, `pkill -f vite` and retry.
- **Vite auto-increments the port** (3000 → 3001 → 3002…) when one is busy. Never
  assume 3000 — read the `Local: http://localhost:PORT/` line (the driver does).
- **`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`** is preset in the container;
  browsers install there, not `~/.cache/ms-playwright`. Overriding it for only
  install or only run breaks the other.
- Routing is **manual client-side** (`history.pushState`), not file-based —
  unknown paths fall through to the app shell, so deep-linking `/login` etc.
  works directly via `page.goto`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank dark (`#07080F`) screenshot | App crashed at boot — confirm dummy `VITE_SUPABASE_*` are set (driver sets them); `pkill -f vite` to clear a stale server, retry. |
| `Executable doesn't exist …chrome-headless-shell` | `PLAYWRIGHT_BROWSERS_PATH` differed between install and run. Don't touch it; rerun `npx playwright install chromium` then the driver. |
| `dev server timeout` | `npm install` not run, or Vite crashed — check the mirrored Vite output the driver prints. |
| `Port 3000 is in use` spam | Harmless — Vite picks the next free port and the driver follows it. |
