import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails('mailto:admin@contractorpro.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  // Only POST from Supabase DB webhook
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  let record: Record<string, unknown>
  try {
    const body = await req.json()
    // DB Webhook sends { type, table, record, old_record }
    record = body.record ?? body
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const userId = record.user_id as string
  const title  = (record.title  as string) || 'Contractor Pro'
  const body   = (record.body   as string) || ''
  const tag    = (record.type   as string) || 'general'

  if (!userId) return new Response('no user_id', { status: 400 })

  // Get all push subscriptions for this user
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subs?.length) return new Response('no subscriptions', { status: 200 })

  const payload = JSON.stringify({ title, body, tag })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err: { statusCode?: number }) => {
        // Remove expired / invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, total: subs.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
