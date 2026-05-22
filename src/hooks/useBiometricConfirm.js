import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '../lib/supabase.js'
import { useAppStore } from '../store/useAppStore.js'

const PASSKEY_KEY   = 'cpro_passkey_cred'
const PIN_HASH_KEY  = 'cpro_pin_hash'
const PIN_EMAIL_KEY = 'cpro_pin_email'

export function useBiometricConfirm() {
  const { requestBioConfirm } = useAppStore()

  function isPasskeyRegistered() { return !!localStorage.getItem(PASSKEY_KEY) }
  function isPinSet()            { return !!localStorage.getItem(PIN_HASH_KEY) }
  function hasAnyMethod()        { return isPasskeyRegistered() || isPinSet() }

  async function confirm(description, tbl = 'unknown') {
    try {
      const result = await requestBioConfirm({ description, tbl })
      if (!result) return null

      // سجّل التوقيع في DB
      const { ownerUserId, signerUserId, signerName, signerRole } = useAppStore.getState()
      if (ownerUserId) {
        supabase.from('signature_log').insert({
          owner_id:     ownerUserId,
          signer_id:    signerUserId,
          signer_name:  signerName || 'غير معروف',
          signer_role:  signerRole || 'owner',
          action:       'confirm',
          tbl,
          record_label: description,
        }).then(() => {})
      }
      return { signed: true, name: result.name, role: result.role }
    } catch {
      return null // ألغى → يُحجب في الشاشة
    }
  }

  return { confirm, isPasskeyRegistered, isPinSet, hasAnyMethod }
}

// دالة WebAuthn مستقلة للمودال
export async function runBiometricAuth() {
  const credId = localStorage.getItem(PASSKEY_KEY)
  if (!credId) throw new Error('NO_PASSKEY')

  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)
  const challengeB64 = btoa(String.fromCharCode(...challenge))

  await startAuthentication({
    challenge:        challengeB64,
    allowCredentials: [{ type: 'public-key', id: credId }],
    userVerification: 'required',
    timeout:          60000,
    rpId:             window.location.hostname,
  })
}

// التحقق من PIN محلياً (بدون sign-in كامل)
export async function verifyPinLocal(pin) {
  const stored = localStorage.getItem(PIN_HASH_KEY)
  const email  = localStorage.getItem(PIN_EMAIL_KEY)
  if (!stored || !email) throw new Error('NO_PIN')

  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + email))
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (hash !== stored) throw new Error('WRONG_PIN')
}
