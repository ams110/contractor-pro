import CryptoJS from 'crypto-js'

const KEY_NAME = 'cp_enc_key'

function getKey() {
  let key = sessionStorage.getItem(KEY_NAME)
  if (!key) {
    // Derive from a stable device fingerprint + app salt
    const seed = [
      navigator.userAgent,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      'cp_v2_salt_2025',
    ].join('|')
    key = CryptoJS.SHA256(seed).toString()
    sessionStorage.setItem(KEY_NAME, key)
  }
  return key
}

export function encrypt(data) {
  if (data === null || data === undefined) return null
  try {
    const str   = typeof data === 'string' ? data : JSON.stringify(data)
    const cipher = CryptoJS.AES.encrypt(str, getKey(), {
      mode:    CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    return cipher.toString()
  } catch {
    return null
  }
}

export function decrypt(cipherText) {
  if (!cipherText) return null
  try {
    const bytes  = CryptoJS.AES.decrypt(cipherText, getKey(), {
      mode:    CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    const plain = bytes.toString(CryptoJS.enc.Utf8)
    if (!plain) return null
    try { return JSON.parse(plain) } catch { return plain }
  } catch {
    return null
  }
}

export function secureSet(key, value) {
  const enc = encrypt(value)
  if (enc) localStorage.setItem(key, enc)
}

export function secureGet(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const dec = decrypt(raw)
  return dec
}

export function secureRemove(key) {
  localStorage.removeItem(key)
}
