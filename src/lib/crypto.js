import CryptoJS from 'crypto-js'

const KEY_NAME = 'cp_enc_key_v3'

// مفتاح عشوائي 256-بت يُولَّد مرّة ويُخزَّن محلياً.
// (سابقاً كان مشتقّاً من بصمة المتصفح: userAgent/screen/timezone + salt ثابت،
//  وهو قابل للتخمين بدون الوصول للجهاز — استُبدل بمفتاح عشوائي حقيقي.)
function getKey() {
  let key = localStorage.getItem(KEY_NAME)
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(KEY_NAME, key)
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
