import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '../lib/supabase.js'
import { useAppStore } from '../store/useAppStore.js'

const PASSKEY_KEY = 'cpro_passkey_cred'

export function useBiometricConfirm() {
  const { requestBioConfirm } = useAppStore()

  function isRegistered() {
    return !!localStorage.getItem(PASSKEY_KEY)
  }

  async function isSupported() {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  // confirm() — shows biometric modal, returns { name, role } or null if cancelled/not registered
  async function confirm(description, tbl = 'unknown') {
    if (!isRegistered()) return null
    try {
      const result = await requestBioConfirm({ description, tbl })
      // Fire-and-forget: log signature to DB
      const { ownerUserId, signerUserId, signerName, signerRole } = useAppStore.getState()
      if (ownerUserId) {
        supabase.from('signature_log').insert({
          owner_id:     ownerUserId,
          signer_id:    signerUserId,
          signer_name:  signerName || 'غير معروف',
          signer_role:  signerRole || 'owner',
          action:       tbl.includes('delete') ? 'delete' : 'confirm',
          tbl,
          record_label: description,
        }).then(() => {})
      }
      return result
    } catch {
      return null
    }
  }

  return { confirm, isRegistered, isSupported }
}

// Standalone function for the modal component (doesn't need the hook)
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
