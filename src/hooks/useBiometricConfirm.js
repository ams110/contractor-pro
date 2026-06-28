import { supabase } from '../lib/supabase.js'
import { useAppStore } from '../store/useAppStore.js'
import { hasPin, verifyPin } from '../lib/pinCrypto.js'

const PASSKEY_KEY = 'cpro_passkey_cred'

export function useBiometricConfirm() {
  const { requestBioConfirm } = useAppStore()

  function isPasskeyRegistered() { return !!localStorage.getItem(PASSKEY_KEY) }
  function isPinSet()            { return hasPin() }
  function hasAnyMethod()        { return isPasskeyRegistered() || isPinSet() }

  async function confirm(description, tbl = 'unknown') {
    // ما في وسيلة تحقّق مُعدّة (لا بصمة ولا PIN) → لا نحجب العملية.
    // الحماية البيومترية تبقى إجبارية فقط لمن فعّلها من الإعدادات. إجبار مستخدم
    // جديد على إعداد بصمة/PIN قبل إضافة أوّل عامل أو مصروف كان يقتل التفعيل
    // (مودال «لا توجد وسيلة تحقق» بزرّ إغلاق فقط → العملية تُحجب). انظر docs/founder/AUDIT_50.md
    if (!hasAnyMethod()) {
      const { signerName, signerRole } = useAppStore.getState()
      return { signed: true, name: signerName, role: signerRole, auto: true }
    }
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
  const stored = localStorage.getItem(PASSKEY_KEY)
  if (!stored) throw new Error('NO_PASSKEY')

  let credInfo
  try { credInfo = JSON.parse(stored) } catch { throw new Error('NO_PASSKEY') }

  const { credentialId, rpId } = credInfo
  if (!credentialId) throw new Error('NO_PASSKEY')

  const credIdBytes = Uint8Array.from(
    atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  )

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: rpId || window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: credIdBytes }],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  if (!assertion) {
    const e = new Error('تم إلغاء البصمة')
    e.name = 'NotAllowedError'
    throw e
  }
}

// التحقق من PIN محلياً (بدون sign-in كامل) — عبر فكّ تشفير الحمولة (auth tag).
// يرفع WRONG_PIN عند الخطأ، وPIN_LOCKED بعد تجاوز حدّ المحاولات (مع مسح البيانات).
export async function verifyPinLocal(pin) {
  await verifyPin(pin)
}
