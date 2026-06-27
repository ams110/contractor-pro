import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TOKEN_TTL_SECONDS = 8 * 60 * 60
const enc = new TextEncoder()

// ── encoders ──────────────────────────────────────────────────────────────────
function encodeBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function encodeBase64url(bytes: Uint8Array): string {
  return encodeBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function decodeBase64url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  return decodeBase64(b64 + pad)
}
function hex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── crypto helpers ────────────────────────────────────────────────────────────
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return hex(new Uint8Array(buf))
}
async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg))
  return encodeBase64url(new Uint8Array(sig))
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
function randomSalt(): string {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return hex(b)
}

async function issueToken(secret: string): Promise<string> {
  const payload = encodeBase64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })))
  return `${payload}.${await hmac(secret, payload)}`
}
async function verifyToken(secret: string, token: string): Promise<boolean> {
  const parts = (token || '').split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  if (!timingSafeEqual(sig, await hmac(secret, payload))) return false
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' && json.exp > Math.floor(Date.now() / 1000)
  } catch { return false }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const ENV_USER = Deno.env.get('ADMIN_USERNAME') || ''
    const ENV_PASS = Deno.env.get('ADMIN_PASSWORD') || ''
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // سرّ توقيع التوكن — ثابت ومستقلّ عن كلمة المرور حتى لا تُبطَل الجلسات عند تغييرها
    const TOKEN_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || (SERVICE_KEY + ':contractor-admin-v1')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, { auth: { persistSession: false } })

    // مهيّأة إذا وُجد سجلّ admin_auth بالقاعدة، أو ضُبطت أسرار البيئة (bootstrap)
    const { data: dbCreds } = await admin.from('admin_auth').select('username').eq('id', 1).maybeSingle()
    if (!dbCreds && (!ENV_USER || !ENV_PASS)) {
      return json({ error: 'لوحة الأدمن غير مهيّأة — اضبط بيانات الدخول أولاً.' }, 503)
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'stats'
    const origin = req.headers.get('origin') || 'https://localhost'
    const rpID = origin.replace(/^https?:\/\//, '').split(':')[0]

    // بيانات الدخول الحاليّة: من جدول admin_auth إن وُجد، وإلا من الأسرار (bootstrap)
    async function currentUsername(): Promise<string> {
      const { data } = await admin.from('admin_auth').select('username').eq('id', 1).maybeSingle()
      return data?.username || ENV_USER
    }
    async function verifyPassword(username: string, password: string): Promise<boolean> {
      const { data } = await admin.from('admin_auth').select('*').eq('id', 1).maybeSingle()
      if (data) {
        const h = await sha256hex(data.password_salt + password)
        return timingSafeEqual(username, data.username) && timingSafeEqual(h, data.password_hash)
      }
      return timingSafeEqual(username, ENV_USER) && timingSafeEqual(password, ENV_PASS)
    }
    async function requireToken(): Promise<boolean> {
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '') || body?.token || ''
      return verifyToken(TOKEN_SECRET, token)
    }

    // ════════════════ تسجيل الدخول بكلمة المرور ════════════════
    if (action === 'login') {
      if (!(await verifyPassword(String(body?.username || ''), String(body?.password || '')))) {
        return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401)
      }
      return json({ token: await issueToken(TOKEN_SECRET), expires_in: TOKEN_TTL_SECONDS })
    }

    // ════════════════ خيارات دخول البصمة (عام) ════════════════
    if (action === 'wa-auth-options') {
      const { data: keys } = await admin.from('admin_passkeys').select('credential_id')
      if (!keys || keys.length === 0) return json({ error: 'لا توجد بصمة مسجّلة' }, 400)
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: keys.map(k => ({ id: decodeBase64url(k.credential_id), type: 'public-key' as const })),
        userVerification: 'required',
      })
      await admin.from('admin_challenges').upsert({
        type: 'authentication', challenge: options.challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      return json(options)
    }

    // ════════════════ تحقّق دخول البصمة → توكن (عام) ════════════════
    if (action === 'wa-auth-verify') {
      const credential = body?.credential
      const credentialId = credential?.id
      if (!credentialId) return json({ error: 'بصمة غير صالحة' }, 400)
      const { data: stored } = await admin.from('admin_passkeys').select('*').eq('credential_id', credentialId).single()
      if (!stored) return json({ error: 'بصمة غير معروفة' }, 400)
      const { data: ch } = await admin.from('admin_challenges').select('challenge')
        .eq('type', 'authentication').gt('expires_at', new Date().toISOString()).single()
      if (!ch) return json({ error: 'انتهت صلاحية التحقق، أعد المحاولة' }, 400)

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: decodeBase64url(stored.credential_id),
          credentialPublicKey: decodeBase64(stored.public_key),
          counter: Number(stored.counter),
        },
        requireUserVerification: true,
      })
      if (!verification.verified) return json({ error: 'فشل التحقق من البصمة' }, 400)

      await admin.from('admin_passkeys').update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      }).eq('credential_id', credentialId)
      await admin.from('admin_challenges').delete().eq('type', 'authentication')

      return json({ token: await issueToken(TOKEN_SECRET), expires_in: TOKEN_TTL_SECONDS })
    }

    // ════════════════ ما تبقّى يتطلّب توكن صالح ════════════════
    if (!(await requireToken())) {
      return json({ error: 'انتهت الجلسة — سجّل الدخول من جديد' }, 401)
    }

    // ── تغيير كلمة المرور (واسم المستخدم اختيارياً) ──────────────────────────
    if (action === 'change-password') {
      const cur = String(body?.current_password || '')
      const next = String(body?.new_password || '')
      const uname = await currentUsername()
      if (!(await verifyPassword(uname, cur))) return json({ error: 'كلمة المرور الحالية غير صحيحة' }, 401)
      if (next.length < 8) return json({ error: 'كلمة المرور الجديدة 8 أحرف على الأقل' }, 400)
      const newUser = String(body?.new_username || '').trim() || uname
      const salt = randomSalt()
      const hash = await sha256hex(salt + next)
      const { error } = await admin.from('admin_auth').upsert({
        id: 1, username: newUser, password_hash: hash, password_salt: salt, updated_at: new Date().toISOString(),
      })
      if (error) return json({ error: error.message }, 500)
      return json({ success: true, username: newUser })
    }

    // ── خيارات تسجيل البصمة ──────────────────────────────────────────────────
    if (action === 'wa-reg-options') {
      const uname = await currentUsername()
      const { data: existing } = await admin.from('admin_passkeys').select('credential_id')
      const options = await generateRegistrationOptions({
        rpName: 'Kabblan Admin',
        rpID,
        userID: enc.encode('contractor-admin'),
        userName: uname,
        userDisplayName: uname,
        excludeCredentials: (existing || []).map(c => ({ id: decodeBase64url(c.credential_id), type: 'public-key' as const })),
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      })
      await admin.from('admin_challenges').upsert({
        type: 'registration', challenge: options.challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      return json(options)
    }

    // ── تحقّق تسجيل البصمة ────────────────────────────────────────────────────
    if (action === 'wa-reg-verify') {
      const credential = body?.credential
      const { data: ch } = await admin.from('admin_challenges').select('challenge')
        .eq('type', 'registration').gt('expires_at', new Date().toISOString()).single()
      if (!ch) return json({ error: 'انتهت صلاحية التحقق، أعد المحاولة' }, 400)

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      })
      if (!verification.verified || !verification.registrationInfo) return json({ error: 'فشل التحقق من البصمة' }, 400)

      const info = verification.registrationInfo
      const rawId = info.credentialID
      const credentialId = typeof rawId === 'string' ? rawId : encodeBase64url(rawId as Uint8Array)
      await admin.from('admin_passkeys').upsert({
        credential_id: credentialId,
        public_key: encodeBase64(info.credentialPublicKey),
        counter: info.counter,
        label: body?.label || 'جهاز',
      }, { onConflict: 'credential_id' })
      await admin.from('admin_challenges').delete().eq('type', 'registration')
      return json({ verified: true, credentialId })
    }

    // ── حالة البصمة (هل في مفاتيح مسجّلة) ─────────────────────────────────────
    if (action === 'passkey-status') {
      const { count } = await admin.from('admin_passkeys').select('*', { count: 'exact', head: true })
      return json({ count: count || 0, username: await currentUsername() })
    }

    // ── إدارة المستخدمين ──────────────────────────────────────────────────────
    if (action === 'list-users') {
      const { data, error } = await admin.rpc('admin_list_users', { p_search: String(body?.search || ''), p_limit: Number(body?.limit || 100) })
      if (error) return json({ error: error.message }, 500)
      return json({ users: data })
    }
    if (action === 'user-detail') {
      if (!body?.user_id) return json({ error: 'مطلوب user_id' }, 400)
      const { data, error } = await admin.rpc('admin_user_detail', { p_uid: body.user_id })
      if (error) return json({ error: error.message }, 500)
      return json({ user: data })
    }
    if (action === 'set-user-banned') {
      if (!body?.user_id) return json({ error: 'مطلوب user_id' }, 400)
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { ban_duration: body?.banned ? '876000h' : 'none' })
      if (error) return json({ error: error.message }, 500)
      return json({ success: true })
    }

    // ── التحكّم بالاشتراكات ────────────────────────────────────────────────────
    if (action === 'set-trial') {
      if (!body?.user_id) return json({ error: 'مطلوب user_id' }, 400)
      const days = Number(body?.days || 14)
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await admin.from('organizations').update({ trial_ends_at: until }).eq('owner_id', body.user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ success: true, trial_ends_at: until })
    }
    if (action === 'set-plan') {
      if (!body?.user_id) return json({ error: 'مطلوب user_id' }, 400)
      const plan = String(body?.plan || '')
      if (!['free', 'starter', 'pro', 'business'].includes(plan)) return json({ error: 'خطة غير صالحة' }, 400)
      const { error } = await admin.from('organizations').update({ plan }).eq('owner_id', body.user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ success: true })
    }

    // ── بثّ إشعار لكل المستخدمين ───────────────────────────────────────────────
    if (action === 'broadcast') {
      const title = String(body?.title || '').trim()
      const text = String(body?.body || '').trim()
      if (!title || !text) return json({ error: 'العنوان والنص مطلوبان' }, 400)
      const { data, error } = await admin.rpc('admin_broadcast', { p_title: title, p_body: text })
      if (error) return json({ error: error.message }, 500)
      return json({ success: true, count: data })
    }

    // ════════════════ الإحصائيات ════════════════
    if (action === 'stats') {
      const { data, error } = await admin.rpc('admin_get_stats')
      if (error) return json({ error: error.message }, 500)
      const { data: cfg } = await admin.from('admin_auth').select('target_users, target_mrr').eq('id', 1).maybeSingle()
      const stats = { ...data, targets: { users: cfg?.target_users ?? null, mrr: cfg?.target_mrr ?? null } }
      return json({ stats })
    }

    // ── صندوق الإجراءات الذكي ──────────────────────────────────────────────────
    if (action === 'action-items') {
      const { data, error } = await admin.rpc('admin_action_items')
      if (error) return json({ error: error.message }, 500)
      return json({ items: data })
    }

    // ── سجلّ النشاط الحيّ ──────────────────────────────────────────────────────
    if (action === 'activity-feed') {
      const { data, error } = await admin.rpc('admin_activity_feed', { p_limit: Number(body?.limit || 30) })
      if (error) return json({ error: error.message }, 500)
      return json({ feed: data })
    }

    // ── قائمة نشاط البوتات ──────────────────────────────────────────────────────
    if (action === 'bot-activity') {
      const { data, error } = await admin.rpc('admin_bot_activity', { p_limit: Number(body?.limit || 50) })
      if (error) return json({ error: error.message }, 500)
      return json({ bots: data })
    }

    // ── ضبط الأهداف ───────────────────────────────────────────────────────────
    if (action === 'set-targets') {
      const tu = body?.target_users === '' || body?.target_users == null ? null : Number(body.target_users)
      const tm = body?.target_mrr === '' || body?.target_mrr == null ? null : Number(body.target_mrr)
      const { error } = await admin.from('admin_auth').update({ target_users: tu, target_mrr: tm }).eq('id', 1)
      if (error) return json({ error: error.message }, 500)
      return json({ success: true })
    }

    // ── دخول كمستخدم (انتحال للدعم) → token_hash لجلسة Supabase ─────────────────
    if (action === 'impersonate') {
      if (!body?.user_id) return json({ error: 'مطلوب user_id' }, 400)
      const { data: ud } = await admin.auth.admin.getUserById(body.user_id)
      if (!ud?.user?.email) return json({ error: 'مستخدم بلا بريد صالح' }, 400)
      const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ud.user.email })
      if (error || !link?.properties?.hashed_token) return json({ error: 'فشل إنشاء الجلسة' }, 400)
      return json({ token_hash: link.properties.hashed_token, email: ud.user.email })
    }

    return json({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    return json({ error: e.message || 'خطأ غير متوقع' }, 500)
  }
})
