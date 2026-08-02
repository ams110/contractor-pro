import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEFAULT_QUIET, NOTIF_GROUPS, shouldPush, notifTag } from '../lib/notifications.js'

const PREF_KEY = 'cpro_notif_prefs'

// VAPID public key — not a secret, safe to hardcode (client-side only)
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BBWTNkHM3Nz5Rc5sDSLDp0YMXwI-QXqP3VmdDO4hkrCuWuLE3mX5Zt7ZfmhimxwE5NZsbbGMklqpyLB7TO99awI'

/**
 * تفضيلات الإشعارات: مجموعات مكتومة + ساعات هدوء.
 * تُقرأ محليّاً (فوريّة) وتُزامَن للقاعدة حتى **الـpush الخلفي** يحترمها كمان —
 * قبل، التفضيل كان localStorage فقط فالـtrigger كان يبعت رغم الكتم.
 */
export function getNotifPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
    return {
      muted: Array.isArray(raw.muted) ? raw.muted.filter(g => NOTIF_GROUPS.includes(g)) : [],
      quiet: { ...DEFAULT_QUIET, ...(raw.quiet || {}) },
    }
  } catch {
    return { muted: [], quiet: { ...DEFAULT_QUIET } }
  }
}

export function saveNotifPrefs(next) {
  const prefs = { ...getNotifPrefs(), ...next }
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)) } catch { /* تصفّح خاص */ }
  return prefs
}

/** اكتم/فعّل مجموعة كاملة (requests · money · insights · system). */
export function toggleNotifGroup(group, muted) {
  const prefs = getNotifPrefs()
  const set = new Set(prefs.muted)
  if (muted) set.add(group); else set.delete(group)
  return saveNotifPrefs({ muted: [...set] })
}

/**
 * مزامنة التفضيلات للقاعدة. متسامحة عمداً: لو جدول notification_prefs
 * لسّا ما انعمل (migration ما انطبّقت) بنفضل شغّالين على النسخة المحليّة.
 */
export async function syncNotifPrefs(userId, prefs = getNotifPrefs()) {
  if (!userId) return false
  try {
    const { error } = await supabase.from('notification_prefs').upsert({
      user_id:      userId,
      muted_groups: prefs.muted || [],
      quiet_enabled: prefs.quiet?.enabled !== false,
      quiet_start:  Number(prefs.quiet?.start ?? DEFAULT_QUIET.start),
      quiet_end:    Number(prefs.quiet?.end   ?? DEFAULT_QUIET.end),
      tz_offset_minutes: -new Date().getTimezoneOffset(),
    }, { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Returns 'ok' | 'no_vapid' | 'sw_error' | 'subscribe_error' | 'db_error'
export async function subscribePush(userId) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID_PUBLIC_KEY not set — skipping subscribe')
    return 'no_vapid'
  }
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const json = sub.toJSON()
    if (!json?.keys?.p256dh || !json?.keys?.auth) {
      console.warn('[Push] Subscription missing keys')
      return 'subscribe_error'
    }
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: json.endpoint,
      p256dh:   json.keys.p256dh,
      auth:     json.keys.auth,
    }, { onConflict: 'endpoint' })
    if (error) {
      console.warn('[Push] DB upsert error:', error.message)
      return 'db_error'
    }
    console.info('[Push] Subscription saved ✓')
    return 'ok'
  } catch (e) {
    console.warn('[Push] Subscribe error:', e.message || e)
    return 'subscribe_error'
  }
}

export async function unsubscribePush(userId) {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete()
        .eq('user_id', userId).eq('endpoint', sub.endpoint)
    }
  } catch (e) {
    console.warn('[Push] Unsubscribe error:', e)
  }
}

export async function getPushSubscriptionCount(userId) {
  const { count } = await supabase.from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count || 0
}

export function usePushNotifications(userId) {
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'denied'
  )
  const [subStatus, setSubStatus] = useState('idle')

  useEffect(() => {
    if (!supported || permission !== 'granted' || !userId) return
    setSubStatus('subscribing')
    subscribePush(userId).then(result => {
      setSubStatus(result === 'ok' ? 'ok' : result)
    })
  }, [userId, permission, supported])

  async function requestPermission() {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && userId) {
      setSubStatus('subscribing')
      const status = await subscribePush(userId)
      setSubStatus(status === 'ok' ? 'ok' : status)
    }
    return result
  }

  async function forceResubscribe() {
    if (!supported || !userId) return
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
    } catch {}
    setSubStatus('subscribing')
    const status = await subscribePush(userId)
    setSubStatus(status === 'ok' ? 'ok' : status)
    return status
  }

  const notify = useCallback((title, body, type) => {
    if (!supported || Notification.permission !== 'granted') return
    if (!shouldPush(type, getNotifPrefs())) return
    try {
      new Notification(title, {
        body, icon: '/pwa-192.png', badge: '/badge-96.png',
        tag: notifTag(type), dir: 'rtl', lang: 'ar',
      })
    } catch { /* ignore */ }
  }, [supported])

  const [prefs, setPrefs] = useState(getNotifPrefs)

  // التفضيلات المحليّة هي المصدر الفوري، والقاعدة نسخة يقرأها الـtrigger.
  const updatePrefs = useCallback(async (next) => {
    const saved = saveNotifPrefs(next)
    setPrefs(saved)
    await syncNotifPrefs(userId, saved)
    return saved
  }, [userId])

  // ادفع التفضيلات المحليّة للقاعدة أول ما تصير جلسة (أو بعد أول تفعيل push)
  useEffect(() => {
    if (!userId || subStatus !== 'ok') return
    syncNotifPrefs(userId)
  }, [userId, subStatus])

  return {
    supported, permission, subStatus, requestPermission, forceResubscribe, notify,
    prefs, updatePrefs,
  }
}
