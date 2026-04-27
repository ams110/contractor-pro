import { useEffect, useCallback } from 'react'

const PREF_KEY = 'cpro_notif_prefs'

export function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}

export function setNotifPref(key, val) {
  const prefs = getNotifPrefs()
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, [key]: val }))
}

export function usePushNotifications() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const permission = supported ? Notification.permission : 'denied'

  async function requestPermission() {
    if (!supported) return 'denied'
    return Notification.requestPermission()
  }

  const notify = useCallback((title, body, tag) => {
    if (!supported || Notification.permission !== 'granted') return
    const prefs = getNotifPrefs()
    if (prefs[tag] === false) return
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag,
        renotify: true,
      })
    } catch { /* ignore */ }
  }, [supported])

  return { supported, permission, requestPermission, notify }
}
