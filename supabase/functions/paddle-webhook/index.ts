import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Supabase admin client (bypasses RLS — webhook acts as service) ──────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

const WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET') ?? ''

// Price ID → internal plan name (set as Supabase Edge Function secrets)
function buildPriceMap(): Record<string, string> {
  const map: Record<string, string> = {}
  // الأسعار الشهرية
  const starter  = Deno.env.get('PADDLE_PRICE_ID_STARTER')
  const pro      = Deno.env.get('PADDLE_PRICE_ID_PRO')
  const business = Deno.env.get('PADDLE_PRICE_ID_BUSINESS')
  if (starter)  map[starter]  = 'starter'
  if (pro)      map[pro]      = 'pro'
  if (business) map[business] = 'business'
  // الأسعار السنوية — تُحوَّل لنفس اسم الخطة (الدورة لا تغيّر الميزات)
  const starterY  = Deno.env.get('PADDLE_PRICE_ID_STARTER_ANNUAL')
  const proY      = Deno.env.get('PADDLE_PRICE_ID_PRO_ANNUAL')
  const businessY = Deno.env.get('PADDLE_PRICE_ID_BUSINESS_ANNUAL')
  if (starterY)  map[starterY]  = 'starter'
  if (proY)      map[proY]      = 'pro'
  if (businessY) map[businessY] = 'business'
  return map
}
const PRICE_MAP = buildPriceMap()

// ─── Paddle HMAC-SHA256 signature verification ───────────────────────────────
// Header format:  Paddle-Signature: ts=<unix>;h1=<hex>
async function verifySignature(rawBody: string, header: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false  // reject all — never accept without a configured secret
  if (!header) return false

  const parts: Record<string, string> = {}
  for (const seg of header.split(';')) {
    const [k, v] = seg.split('=')
    if (k && v) parts[k] = v
  }
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${ts}:${rawBody}`)
  )

  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === h1
}

// ─── Resolve plan name from event data ───────────────────────────────────────
function resolvePlan(data: Record<string, unknown>): string {
  // Prefer explicit plan set as custom_data during checkout
  const custom = data?.custom_data as Record<string, string> | null
  if (custom?.plan && ['starter', 'pro', 'business'].includes(custom.plan)) {
    return custom.plan
  }
  // Fall back to price ID mapping
  const items = data?.items as Array<{ price?: { id?: string } }> | null
  const priceId = items?.[0]?.price?.id ?? ''
  return PRICE_MAP[priceId] ?? 'starter'
}

// ─── Resolve org plan from subscription status ────────────────────────────────
// active/trialing → keep plan; all others → downgrade to free
function orgPlanFromStatus(status: string, plan: string): string {
  return ['active', 'trialing'].includes(status) ? plan : 'free'
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCreated(data: Record<string, unknown>) {
  const custom   = data.custom_data as Record<string, string> | null
  const userId   = custom?.user_id
  const orgId    = custom?.org_id
  if (!userId || !orgId) {
    console.error('paddle-webhook: subscription.created missing custom_data', data)
    return
  }

  const plan      = resolvePlan(data)
  const status    = (data.status as string) || 'active'
  const items     = data.items as Array<{ price?: { id?: string } }> | null
  const priceId   = items?.[0]?.price?.id ?? null
  const billing   = data.current_billing_period as Record<string, string> | null
  const periodEnd = billing?.ends_at ?? null

  const { error: upsertErr } = await supabase.from('subscriptions').upsert({
    user_id:                userId,
    org_id:                 orgId,
    paddle_subscription_id: data.id as string,
    paddle_customer_id:     data.customer_id as string ?? null,
    paddle_price_id:        priceId,
    plan,
    status,
    current_period_end:     periodEnd,
    cancel_at_period_end:   false,
  }, { onConflict: 'paddle_subscription_id' })

  if (upsertErr) console.error('paddle-webhook: upsert error', upsertErr)

  const { error: orgErr } = await supabase.from('organizations')
    .update({ plan: orgPlanFromStatus(status, plan), updated_at: new Date().toISOString() })
    .eq('id', orgId)

  if (orgErr) console.error('paddle-webhook: org update error', orgErr)
}

async function handleUpdated(data: Record<string, unknown>) {
  const paddleSubId = data.id as string
  const plan        = resolvePlan(data)
  const status      = (data.status as string) || 'active'
  const items       = data.items as Array<{ price?: { id?: string } }> | null
  const priceId     = items?.[0]?.price?.id ?? null
  const billing     = data.current_billing_period as Record<string, string> | null
  const periodEnd   = billing?.ends_at ?? null
  const scheduled   = data.scheduled_change as Record<string, string> | null
  const cancelAtEnd = scheduled?.action === 'cancel'
  const effectivePlan = orgPlanFromStatus(status, plan)

  const { data: updated, error: updateErr } = await supabase
    .from('subscriptions')
    .update({
      plan:                  effectivePlan,
      status,
      current_period_end:    periodEnd,
      cancel_at_period_end:  cancelAtEnd,
      paddle_price_id:       priceId,
    })
    .eq('paddle_subscription_id', paddleSubId)
    .select('org_id')
    .maybeSingle()

  if (updateErr) console.error('paddle-webhook: update error', updateErr)

  const orgId = (updated as { org_id?: string } | null)?.org_id
    ?? (data.custom_data as Record<string, string> | null)?.org_id

  if (orgId) {
    const { error: orgErr } = await supabase.from('organizations')
      .update({ plan: effectivePlan, updated_at: new Date().toISOString() })
      .eq('id', orgId)
    if (orgErr) console.error('paddle-webhook: org plan update error', orgErr)
  }
}

async function handleCanceled(data: Record<string, unknown>) {
  const paddleSubId = data.id as string

  const { data: canceled, error: cancelErr } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', plan: 'free', cancel_at_period_end: false })
    .eq('paddle_subscription_id', paddleSubId)
    .select('org_id')
    .maybeSingle()

  if (cancelErr) console.error('paddle-webhook: cancel error', cancelErr)

  const orgId = (canceled as { org_id?: string } | null)?.org_id
  if (orgId) {
    await supabase.from('organizations')
      .update({ plan: 'free', updated_at: new Date().toISOString() })
      .eq('id', orgId)
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let rawBody: string
  try { rawBody = await req.text() }
  catch { return new Response('Bad Request', { status: 400 }) }

  const sig = req.headers.get('paddle-signature') ?? ''
  if (!(await verifySignature(rawBody, sig))) {
    console.error('paddle-webhook: invalid signature')
    return new Response('Unauthorized', { status: 401 })
  }

  let event: { event_type: string; data: Record<string, unknown> }
  try { event = JSON.parse(rawBody) }
  catch { return new Response('Bad Request — invalid JSON', { status: 400 }) }

  const { event_type, data } = event
  console.log(`paddle-webhook: received ${event_type}`)

  try {
    switch (event_type) {
      case 'subscription.created':
        await handleCreated(data)
        break
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.paused':
      case 'subscription.past_due':
      case 'subscription.resumed':
        await handleUpdated(data)
        break
      case 'subscription.canceled':
        await handleCanceled(data)
        break
      default:
        // Acknowledge unknown events without error so Paddle stops retrying
        console.log(`paddle-webhook: unhandled event ${event_type} — ack'd`)
    }
  } catch (err) {
    console.error(`paddle-webhook: unhandled error for ${event_type}:`, err)
    // Return 200 so Paddle doesn't retry indefinitely for application errors
  }

  return new Response('OK', { status: 200 })
})
