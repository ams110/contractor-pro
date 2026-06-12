import { useState, useEffect } from 'react'
import { refreshSignedUrl } from '../lib/storage.js'

/**
 * يحوّل رابط إيصال مخزّن (public قديم أو signed منتهٍ) إلى رابط موقّع طازج
 * صالح للعرض من دلو خاصّ. يرجّع الرابط الأصلي ريثما يكتمل التوقيع.
 *
 * الملفات نفسها موجودة في التخزين؛ هذا فقط يولّد رابط وصول جديد عبر RLS.
 */
export function useSignedUrl(storedUrl) {
  const [url, setUrl] = useState(storedUrl || '')
  useEffect(() => {
    let alive = true
    if (!storedUrl) { setUrl(''); return }
    setUrl(storedUrl)
    refreshSignedUrl(storedUrl)
      .then(u => { if (alive && u) setUrl(u) })
      .catch(() => {})
    return () => { alive = false }
  }, [storedUrl])
  return url
}

/**
 * <img> يعرض إيصالاً مخزّناً عبر رابط موقّع طازج تلقائياً.
 * استعمله بدل <img src={storedUrl}> لأي صورة من دلاء receipts/worker-receipts.
 */
export function SignedImg({ src, ...props }) {
  const signed = useSignedUrl(src)
  return <img src={signed} {...props} />
}
