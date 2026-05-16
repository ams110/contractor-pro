import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const PREF_KEY = 'cpro_notif_prefs'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}

export function setNotifPref(key, val) {
  const prefs = getNotifPrefs()
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, [key]: val }))
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function subscribePush(userId) {
  if (!VAPID_PUBLIC_KEY) return
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const json = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: json.endpoint,
      p256dh:   json.keys.p256dh,
      auth:     json.keys.auth,
    }, { onConflict: 'endpoint' })
  } catch (e) {
    console.warn('Push subscribe failed:', e)
  }
}

export function usePushNotifications(userId) {
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')

  // Auto-subscribe if permission already granted
  useEffect(() => {
    if (supported && permission === 'granted' && userId) {
      subscribePush(userId)
    }
  }, [userId, permission, supported])

  async function requestPermission() {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && userId) {
      await subscribePush(userId)
    }
    return result
  }

  const notify = useCallback((title, body, tag) => {
    if (!supported || Notification.permission !== 'granted') return
    const prefs = getNotifPrefs()
    if (prefs[tag] === false) return
    try {
      new Notification(title, {
        body,
        icon:     '/pwa-192.png',
        badge:    '/pwa-192.png',
        tag,
        renotify: true,
      })
    } catch { /* ignore */ }
  }, [supported])

  return { supported, permission, requestPermission, notify }
}
