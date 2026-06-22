import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ════════════════════════════════════════════════════════════════════════════
// scan-plan — قراءة مخطط بناء/موقع بالرؤية (Claude) واقتراح هيكل الموقع:
//   { buildings: [{ name, floors, unitsPerFloor }], confidence, notes }
// يستعمله دفتر المشروع لبناء «التوأم الرقمي» 3D تلقائياً. مرآة لـ scan-receipt.
// ════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT_MAX    = 8    // max plan scans per window
const RATE_LIMIT_WINDOW = 60   // window in minutes
const MAX_BASE64_BYTES  = 12 * 1024 * 1024 // ~9 MB raw (يستوعب PDF المخططات)
const ALLOWED_MIME      = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // ── Auth ────────────────────────────────────────────────────────────────
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
    .eq('action', 'scan_plan')
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return json({ error: `تجاوزت الحد المسموح: ${RATE_LIMIT_MAX} طلبات كل ${RATE_LIMIT_WINDOW} دقيقة` }, 429)
  }
  await adminClient.from('rate_limits').insert({ user_id: user.id, action: 'scan_plan' })

  try {
    let body: { imageBase64?: string; mimeType?: string }
    try { body = await req.json() }
    catch { return json({ error: 'JSON غير صالح' }, 400) }

    const { imageBase64, mimeType } = body
    if (!imageBase64 || typeof imageBase64 !== 'string') return json({ error: 'imageBase64 مطلوب' }, 400)
    if (imageBase64.length > MAX_BASE64_BYTES) return json({ error: 'حجم الملف أكبر من الحد المسموح' }, 413)

    const safeMime = (mimeType || 'image/jpeg').toLowerCase()
    if (!ALLOWED_MIME.has(safeMime)) return json({ error: 'نوع الملف غير مدعوم' }, 415)
    const isPdf = safeMime === 'application/pdf'

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const prompt = `أنت مهندس يقرأ مخططات بناء. انظر إلى صورة المخطط واستخرج الهيكل الإنشائي للمبنى/الموقع.
أرجِع JSON فقط بدون أي نص إضافي، بالشكل:
{
  "buildings": [
    { "name": "<اسم/رقم العمارة إن وُجد وإلا اتركه فارغاً>", "floors": <عدد الطوابق كرقم>, "unitsPerFloor": <عدد الشقق في الطابق الواحد كرقم> }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "<ملاحظة قصيرة جداً بالعربية عمّا رأيته>"
}
قواعد:
- إن كان مخطط طابق واحد (floor plan): floors=1 و unitsPerFloor = عدد الشقق الظاهرة.
- إن كان مخطط واجهة/مقطع (elevation/section): قدّر عدد الطوابق من الصفوف.
- إن كان مخطط موقع/إفراز فيه عدّة عمارات: اذكر كل عمارة في المصفوفة.
- إن لم يظهر رقم بوضوح فقدّر تقديراً معقولاً. لا تُرجع أصفاراً فارغة إن أمكن التقدير.
- لا تكتب أي شيء خارج كائن JSON.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            isPdf
              ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
              : { type: 'image', source: { type: 'base64', media_type: safeMime, data: imageBase64 } },
            { type: 'text', text: prompt },
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
