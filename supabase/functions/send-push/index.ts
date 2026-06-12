import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_PUSH_SECRET  = Deno.env.get('SEND_PUSH_SECRET') ?? ''

webpush.setVapidDetails('mailto:support@linko.services', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

// ── CORS headers (required for browser fetch / supabase.functions.invoke) ──
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sendToUser(userId: string, title: string, body: string, tag: string) {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subs?.length) return 0

  const payload = JSON.stringify({ title, body, tag })
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    )
  )
  return results.filter(r => r.status === 'fulfilled').length
}

Deno.serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: cors })
  }

  const webhookSecret = req.headers.get('x-webhook-secret') ?? ''
  const authHeader    = req.headers.get('Authorization') ?? ''

  // ── Path 1: DB trigger via shared secret ──────────────────────────────────
  if (webhookSecret) {
    if (!SEND_PUSH_SECRET || webhookSecret !== SEND_PUSH_SECRET) {
      return new Response('Unauthorized', { status: 401, headers: cors })
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return new Response('bad json', { status: 400, headers: cors }) }

    const record = (body.record ?? body) as Record<string, unknown>
    const userId = record.user_id as string
    const title  = (record.title as string) || 'Contractor Pro'
    const text   = (record.body  as string) || ''
    const tag    = (record.type  as string) || 'general'
    if (!userId) return new Response('no user_id', { status: 400, headers: cors })

    const sent = await sendToUser(userId, title, text, tag)
    return new Response(JSON.stringify({ sent }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // ── Path 2: Authenticated client (test notification) ─────────────────────
  if (authHeader) {
    const callerClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: cors })

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return new Response('bad json', { status: 400, headers: cors }) }

    const title   = (body.title as string) || 'Contractor Pro'
    const text    = (body.body  as string) || ''
    const tag     = (body.tag   as string) || 'test'
    const userIds: string[] = Array.isArray(body.user_ids)
      ? (body.user_ids as string[])
      : body.user_id
        ? [body.user_id as string]
        : [user.id]

    // Security: client can only send to themselves
    const targets = userIds.filter(id => id === user.id)
    if (!targets.length) return new Response('Forbidden', { status: 403, headers: cors })

    let totalSent = 0
    for (const uid of targets) {
      totalSent += await sendToUser(uid, title, text, tag)
    }
    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response('Unauthorized', { status: 401, headers: cors })
})
