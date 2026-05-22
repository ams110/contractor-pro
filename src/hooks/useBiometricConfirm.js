import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '../lib/supabase.js'
import { useAppStore } from '../store/useAppStore.js'

const PASSKEY_KEY = 'cpro_passkey_cred'

export function useBiometricConfirm() {
  const { requestBioConfirm } = useAppStore()

  function isRegistered() {
    return !!localStorage.getItem(PASSKEY_KEY)
  }

  // confirm() — دائماً تكمل العملية
  // إذا البصمة نجحت  → تسجّل التوقيع وترجع { signed: true, name, role }
  // إذا ألغى / فشل / مش مسجّلة → ترجع { signed: false } والعملية تكمل طبيعي
  async function confirm(description, tbl = 'unknown') {
    if (!isRegistered()) return { signed: false }
    try {
      const result = await requestBioConfirm({ description, tbl })
      if (!result) return { signed: false } // ألغى من المودال

      // سجّل التوقيع في DB (fire-and-forget)
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
      return { signed: false }
    }
  }

  return { confirm, isRegistered }
}

// دالة مستقلة للمودال (لا تحتاج الـ hook)
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
