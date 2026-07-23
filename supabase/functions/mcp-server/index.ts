// MCP Server — يربط Claude بمصلحة المقاول عبر مفتاح API (ميزة خطة Business).
// Streamable HTTP بلا حالة (stateless): POST واحد بـ JSON-RPC 2.0.
// المصادقة: Authorization: Bearer cpk_... أو ?key=cpk_... (لموصّلات claude.ai التي لا تدعم headers).
// deploy بـ --no-verify-jwt — المصادقة هنا بالكامل (هاش sha256 + مقارنة ثابتة الوقت).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TOOL_DEFS, callTool } from './tools.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

const PROTOCOL_DEFAULT = '2025-03-26'
const PROTOCOL_KNOWN = ['2025-03-26', '2025-06-18']
const RATE_LIMIT_MAX = 60        // نداء أداة لكل نافذة
const RATE_LIMIT_WINDOW_MIN = 5

const enc = new TextEncoder()
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sessionId = req.headers.get('mcp-session-id')
  const baseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: baseHeaders })
  const rpcError = (id: unknown, code: number, message: string, status = 200) =>
    json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status)

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed — MCP Streamable HTTP (stateless): POST only' }, 405)
  }

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // ── المصادقة بمفتاح API ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const url = new URL(req.url)
    const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim() || url.searchParams.get('key') || ''
    if (!rawKey.startsWith('cpk_')) {
      return json({ error: 'مفتاح API مفقود — أرسله في Authorization: Bearer cpk_... أو ?key=' }, 401)
    }
    // بحث بهاش المفتاح (UNIQUE index) — المقارنة الفعلية تتم على الهاش المخزّن،
    // والبحث بالمساواة عبر الفهرس يعادل مقارنة ثابتة الوقت من منظور المهاجم (لا أسرار جزئية تُسرّب).
    const keyHash = await sha256hex(rawKey)
    const { data: keyRow } = await db.from('api_keys')
      .select('id, user_id, revoked_at').eq('key_hash', keyHash).maybeSingle()
    if (!keyRow || keyRow.revoked_at) {
      return json({ error: 'مفتاح API غير صالح أو ملغى' }, 401)
    }
    const userId = keyRow.user_id as string

    // ── بوابة الخطة: Business أو تجربة سارية ────────────────────────────────
    // ملاحظة: علم paddleEnabled خاص بالعميل؛ خادمياً نعتبر Paddle مفعّلاً بالإنتاج —
    // الحسابات غير المدفوعة تغطيها التجربة، وحساب بلا org → رسالة ترقية.
    const { data: org } = await db.from('organizations')
      .select('plan, trial_ends_at').eq('owner_id', userId).maybeSingle()
    const trialActive = org?.trial_ends_at && new Date(org.trial_ends_at) > new Date()
    if (!(org?.plan === 'business' || trialActive)) {
      return json({
        error: 'ربط الذكاء (MCP) متاح لخطة Business فقط — رقِّ خطتك من التطبيق: الإعدادات ← الاشتراك',
        error_en: 'MCP access requires the Business plan',
      }, 403)
    }

    // ── جسم الطلب ────────────────────────────────────────────────────────────
    let body: any
    try { body = await req.json() } catch {
      return rpcError(null, -32700, 'Parse error')
    }
    if (Array.isArray(body)) return rpcError(null, -32600, 'Batch requests not supported')
    const { id, method, params } = body || {}
    if (typeof method !== 'string') return rpcError(id, -32600, 'Invalid Request')

    // إشعارات — بلا ردّ محتوى
    if (method.startsWith('notifications/')) {
      return new Response(null, { status: 202, headers: baseHeaders })
    }

    if (method === 'initialize') {
      const requested = params?.protocolVersion
      const protocolVersion = PROTOCOL_KNOWN.includes(requested) ? requested : PROTOCOL_DEFAULT
      return json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'contractor-pro', version: '1.0.0' },
          instructions: 'خادم MCP لتطبيق Contractor Pro — إدارة مقاولات: مشاريع، عمال، أيام عمل، مصاريف، مقبوضات، رواتب، ضرائب إسرائيلية. كل المبالغ بالشيكل (ILS). الأدوات المالية تعتمد الصفوف المعتمدة (approved) فقط، مطابقة لأرقام التطبيق.',
        },
      })
    }

    if (method === 'ping') return json({ jsonrpc: '2.0', id, result: {} })

    if (method === 'tools/list') {
      return json({ jsonrpc: '2.0', id, result: { tools: TOOL_DEFS } })
    }

    if (method === 'tools/call') {
      const toolName = params?.name
      if (!toolName) return rpcError(id, -32602, 'Missing tool name')

      // rate limit على نداءات الأدوات فقط (نمط scan-receipt)
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()
      const { count } = await db.from('rate_limits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('action', 'mcp_call').gte('created_at', windowStart)
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return json({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `تجاوزت حدّ الاستخدام (${RATE_LIMIT_MAX} نداء / ${RATE_LIMIT_WINDOW_MIN} دقائق) — جرّب بعد قليل | Rate limit exceeded` }], isError: true },
        })
      }
      await db.from('rate_limits').insert({ user_id: userId, action: 'mcp_call' })
      db.from('api_keys').update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRow.id).then(() => {}, () => {})

      try {
        const result = await callTool({ db, userId }, toolName, params?.arguments || {})
        return json({ jsonrpc: '2.0', id, result })
      } catch (e) {
        return json({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `خطأ أثناء التنفيذ: ${(e as Error).message}` }], isError: true },
        })
      }
    }

    return rpcError(id, -32601, `Method not found: ${method}`)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
