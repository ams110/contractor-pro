// TikTok Events API server-to-server forwarder.
//
// Mirrors browser pixel events from the server (deduplicated by event_id) so
// conversions still register when adblockers/iOS strip the client pixel. Also
// the only path used by paddle-webhook for Subscribe events (no browser there).
//
// Auth model: public (no Supabase JWT). The risk surface is small — callers
// can only fire events into our own pixel — and the landing page is anonymous.
// Replace token via TIKTOK_ACCESS_TOKEN secret.

const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
const PIXEL_ID     = Deno.env.get('TIKTOK_PIXEL_ID')     ?? ''
const ACCESS_TOKEN = Deno.env.get('TIKTOK_ACCESS_TOKEN') ?? ''
const TEST_EVENT_CODE = Deno.env.get('TIKTOK_TEST_EVENT_CODE') ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                 'application/json',
}

/** SHA-256 hex — TikTok PII hashing requirement. */
async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Email normalization per TikTok: trim + lowercase before hashing. */
async function hashEmail(email?: string | null): Promise<string | undefined> {
  if (!email) return undefined
  const clean = String(email).trim().toLowerCase()
  return clean ? sha256(clean) : undefined
}

/** Phone normalization: strip everything except digits, then hash. */
async function hashPhone(phone?: string | null): Promise<string | undefined> {
  if (!phone) return undefined
  const clean = String(phone).replace(/[^\d]/g, '')
  return clean ? sha256(clean) : undefined
}

async function hashId(id?: string | null): Promise<string | undefined> {
  if (!id) return undefined
  return sha256(String(id).trim())
}

function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') ?? undefined
}

interface TrackBody {
  event: string
  event_id?: string
  event_time?: number
  user?: { email?: string; phone?: string; external_id?: string; ttclid?: string; ttp?: string }
  page?: { url?: string; referrer?: string }
  properties?: Record<string, unknown>
  // اختياري: يطغى على متغيّر البيئة لإرسال حدث واحد فقط لتبويب Test Events
  // بدل التبديل العام على/إيقاف الـsecret. مفيد للتجربة بدون pollute للداتا الإنتاجية.
  test_event_code?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors })

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('track-tiktok-event: not configured (TIKTOK_PIXEL_ID / TIKTOK_ACCESS_TOKEN missing) — noop')
    return new Response(JSON.stringify({ ok: false, reason: 'not_configured' }), { status: 200, headers: cors })
  }

  let body: TrackBody
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ ok: false, reason: 'bad_json' }), { status: 400, headers: cors }) }

  if (!body?.event) {
    return new Response(JSON.stringify({ ok: false, reason: 'event_required' }), { status: 400, headers: cors })
  }

  const user = body.user || {}
  const ua = req.headers.get('user-agent') ?? undefined
  const ip = clientIp(req)

  const testCode = body.test_event_code || TEST_EVENT_CODE
  const payload = {
    event_source: 'web',
    event_source_id: PIXEL_ID,
    ...(testCode ? { test_event_code: testCode } : {}),
    data: [{
      event:      body.event,
      event_time: body.event_time || Math.floor(Date.now() / 1000),
      event_id:   body.event_id || crypto.randomUUID(),
      user: {
        email:       await hashEmail(user.email),
        phone:       await hashPhone(user.phone),
        external_id: await hashId(user.external_id),
        ttclid:      user.ttclid || undefined,
        ttp:         user.ttp || undefined,
        ip,
        user_agent:  ua,
      },
      page: {
        url:      body.page?.url || undefined,
        referrer: body.page?.referrer || undefined,
      },
      properties: body.properties || {},
    }],
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok || out?.code !== 0) {
      console.error('track-tiktok-event: tiktok rejected', res.status, out)
      return new Response(JSON.stringify({ ok: false, status: res.status, tiktok: out }), { status: 200, headers: cors })
    }
    return new Response(JSON.stringify({ ok: true, event_id: payload.data[0].event_id }), { status: 200, headers: cors })
  } catch (err) {
    console.error('track-tiktok-event: fetch failed', err)
    return new Response(JSON.stringify({ ok: false, reason: 'fetch_failed' }), { status: 200, headers: cors })
  }
})
