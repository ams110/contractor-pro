// ── קבלה رسمية للزبون — مولّد مستند طباعة ────────────────────────────────────
// من محاكاة solo-plan: الطلب رقم 1 من الجمهور الفردي (يوسف: «أهم إشي بشغلتي —
// قبض رسمي فيه اسمي ورقم העוסק، مش بس كشف واتساب»).
//
// القرار المعماري: HTML للطباعة (window.print → حفظ PDF من المتصفح) بدل jsPDF —
// jsPDF لا يرندر عربي/عبري (يحتاج خطوط مضمّنة + glyph shaping غير مدعوم للعربي)،
// بينما HTML يرندر RTL بخطوط النظام مجاناً وبصفر تكلفة bundle.
//
// فرق قانوني مهم: עוסק פטור يصدر «קבלה» فقط (لا חשבונית מס ولا מע"מ) —
// السطر «עוסק פטור — אין לקזז מע"מ» إلزامي الوضوح.

import { fmt, fmtDate } from './helpers.js'

const BIZ_TYPE_LABEL = {
  osek_patur: 'עוסק פטור',
  osek_moreh: 'עוסק מורשה',
  hevra:      'חברה בע"מ',
}

/**
 * يبني نموذج بيانات الקבלה — دالة نقيّة قابلة للاختبار، الـHTML يعرضها فقط.
 * @param {object} receipt  صف client_receipts (amount, date, payer_name, ref_number, payment_method, notes)
 * @param {object} business المصلحة (name, business_type, reg_number, phone, address)
 * @param {object} [opts]   { projectName }
 */
export function buildReceiptModel(receipt, business, { projectName = '' } = {}) {
  if (!receipt || !business) return null
  const isPatur = business.business_type === 'osek_patur'
  const isHevra = business.business_type === 'hevra'
  return {
    docTitle:     'קבלה',
    number:       receipt.ref_number || '',
    businessName: business.name || '',
    bizTypeLabel: BIZ_TYPE_LABEL[business.business_type] || '',
    // רقم מזهה: לעוסק ע.מ، לחברה ח.פ — من businesses.reg_number (مش contractor_number)
    regLabel:     isHevra ? 'ח.פ' : 'ע.מ',
    regNumber:    business.reg_number || '',
    phone:        business.phone || '',
    address:      business.address || '',
    date:         receipt.date ? fmtDate(receipt.date) : '',
    payerName:    receipt.payer_name || '',
    amountText:   `₪${fmt(receipt.amount || 0)}`,
    method:       receipt.payment_method || '',
    projectName,
    notes:        receipt.notes || '',
    // السطر القانوني: פטור → إلزامي؛ מורשה/חברה → توضيح أن الקבלה ليست חשבונית מס
    legalLine: isPatur
      ? 'עוסק פטור — אין לקזז מע"מ'
      : 'קבלה זו אינה חשבונית מס',
  }
}

/** يبني HTML مستند الקבלה — نقيّة (قابلة للاختبار كنص) */
export function buildReceiptHtml(model) {
  if (!model) return ''
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const row = (label, value) => value
    ? `<div class="row"><span class="lbl">${label}</span><span class="val">${esc(value)}</span></div>`
    : ''
  return `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>${esc(model.docTitle)} ${esc(model.number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 24px; }
  .doc { max-width: 148mm; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; padding: 22px 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 14px; }
  .biz-name { font-size: 20px; font-weight: 800; }
  .biz-meta { font-size: 12px; color: #444; margin-top: 4px; line-height: 1.7; }
  .doc-title { text-align: left; }
  .doc-title h1 { font-size: 24px; font-weight: 900; }
  .doc-title .num { font-size: 13px; color: #444; margin-top: 2px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .lbl { color: #555; }
  .val { font-weight: 700; }
  .amount { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; margin: 14px 0; display: flex; justify-content: space-between; align-items: center; }
  .amount .lbl { font-size: 14px; font-weight: 700; color: #333; }
  .amount .val { font-size: 24px; font-weight: 900; }
  .legal { font-size: 12.5px; font-weight: 700; color: #333; border: 1px dashed #999; border-radius: 7px; padding: 8px 12px; margin-top: 12px; text-align: center; }
  .sig { display: flex; justify-content: space-between; margin-top: 34px; font-size: 12px; color: #555; }
  .sig .line { border-top: 1px solid #999; padding-top: 5px; min-width: 140px; text-align: center; }
  .foot { text-align: center; font-size: 10.5px; color: #999; margin-top: 22px; }
  @media print {
    body { padding: 0; }
    .doc { border: none; max-width: none; }
    @page { size: A5; margin: 10mm; }
  }
</style>
</head>
<body>
<div class="doc">
  <div class="head">
    <div>
      <div class="biz-name">${esc(model.businessName)}</div>
      <div class="biz-meta">
        ${esc(model.bizTypeLabel)}${model.regNumber ? ` · ${esc(model.regLabel)} ${esc(model.regNumber)}` : ''}<br>
        ${esc([model.phone, model.address].filter(Boolean).join(' · '))}
      </div>
    </div>
    <div class="doc-title">
      <h1>${esc(model.docTitle)}</h1>
      ${model.number ? `<div class="num">מס׳ ${esc(model.number)}</div>` : ''}
    </div>
  </div>

  ${row('תאריך / التاريخ', model.date)}
  ${row('התקבל מאת / استُلم من', model.payerName)}
  ${row('עבור / مقابل', model.projectName || model.notes)}
  ${row('אמצעי תשלום / طريقة الدفع', model.method)}

  <div class="amount">
    <span class="lbl">סה"כ התקבל / المبلغ المستلم</span>
    <span class="val">${esc(model.amountText)}</span>
  </div>

  <div class="legal">${esc(model.legalLine)}</div>

  <div class="sig">
    <div class="line">חתימה / التوقيع</div>
    <div class="line">חותמת / الختم</div>
  </div>
  <div class="foot">הופק באמצעות כבלאן · أُصدر عبر تطبيق كبلان</div>
</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 150) }</script>
</body>
</html>`
}

/** يفتح نافذة طباعة الקבלה (المتصفح يوفّر «حفظ كـPDF» للمشاركة) */
export function openReceiptPrint(receipt, business, opts = {}) {
  const model = buildReceiptModel(receipt, business, opts)
  if (!model) return false
  const win = window.open('', '_blank', 'noopener,noreferrer,width=680,height=860')
  if (!win) return false
  win.document.write(buildReceiptHtml(model))
  win.document.close()
  return true
}
