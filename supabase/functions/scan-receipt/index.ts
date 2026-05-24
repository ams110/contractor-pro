import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Rate limit config ─────────────────────────────────────────────────────────
const RATE_LIMIT_MAX    = 10   // max scans per window
const RATE_LIMIT_WINDOW = 60   // window in minutes
// Max base64 payload ≈ 8 MB (raw image ~6 MB after decode)
const MAX_BASE64_BYTES  = 8 * 1024 * 1024
const ALLOWED_MIME      = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW * 60 * 1000).toISOString()
  const { count } = await adminClient
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', 'scan_receipt')
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return json({
      error: `تجاوزت الحد المسموح: ${RATE_LIMIT_MAX} طلبات كل ${RATE_LIMIT_WINDOW} دقيقة`,
    }, 429)
  }

  // سجّل الطلب الحالي
  await adminClient.from('rate_limits').insert({
    user_id: user.id,
    action:  'scan_receipt',
  })

  try {
    // ── Input validation ──────────────────────────────────────────────────
    let body: { imageBase64?: string; mimeType?: string }
    try { body = await req.json() }
    catch { return json({ error: 'JSON غير صالح' }, 400) }

    const { imageBase64, mimeType } = body

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ error: 'imageBase64 مطلوب' }, 400)
    }

    // Server-side size check (base64 string length ≈ 4/3 × raw bytes)
    if (imageBase64.length > MAX_BASE64_BYTES) {
      return json({ error: 'حجم الصورة أكبر من 6 MB' }, 413)
    }

    // Validate MIME type
    const safeMime = (mimeType || 'image/jpeg').toLowerCase()
    if (!ALLOWED_MIME.has(safeMime)) {
      return json({ error: 'نوع الملف غير مدعوم' }, 415)
    }

    // ── Claude API call ───────────────────────────────────────────────────
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: safeMime, data: imageBase64 },
            },
            {
              type: 'text',
              text: `استخرج من هذه الفاتورة المعلومات التالية وأرجعها بصيغة JSON فقط بدون أي نص إضافي:
{
  "amount": <المبلغ الإجمالي كرقم عشري فقط، بدون رمز العملة>,
  "vendor": "<اسم المحل أو المورد>",
  "date": "<التاريخ بصيغة YYYY-MM-DD إذا وُجد>",
  "category": "<التصنيف: اختر واحداً من: مواد, عدد, وقود, إيجار, تأمين, أخرى>"
}
إذا لم تجد معلومة ضعها فارغة أو صفراً.`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error: ${response.status} ${errText}`)
    }

    const claudeData = await response.json()
    const text = claudeData.content?.[0]?.text || '{}'

    let result: Record<string, unknown> = {}
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
    } catch {
      // return empty if parsing fails
    }

    return json({ result })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
