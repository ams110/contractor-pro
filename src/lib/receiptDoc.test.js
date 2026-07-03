import { describe, it, expect } from 'vitest'
import { buildReceiptModel, buildReceiptHtml } from './receiptDoc.js'

const RECEIPT = { amount: 12500, date: '2026-07-01', payer_name: 'أبو خالد', ref_number: 'RCP-0042', payment_method: 'تحويل بنكي', notes: 'دفعة أولى' }
const PATUR   = { name: 'وسيم للجبص والديكور', business_type: 'osek_patur', reg_number: '558812345', phone: '050-1234567' }
const HEVRA   = { name: 'شركة البناء', business_type: 'hevra', reg_number: '515551234' }

describe('buildReceiptModel', () => {
  it('עוסק פטור → السطر القانوني الإلزامي + ע.מ', () => {
    const m = buildReceiptModel(RECEIPT, PATUR)
    expect(m.docTitle).toBe('קבלה')
    expect(m.legalLine).toContain('עוסק פטור')
    expect(m.legalLine).toContain('אין לקזז מע"מ')
    expect(m.regLabel).toBe('ע.מ')
    expect(m.regNumber).toBe('558812345')
    expect(m.amountText).toBe('₪12,500')
    expect(m.number).toBe('RCP-0042')
  })

  it('חברה → ח.פ وسطر «ليست חשבונית מס»', () => {
    const m = buildReceiptModel(RECEIPT, HEVRA)
    expect(m.regLabel).toBe('ח.פ')
    expect(m.legalLine).toBe('קבלה זו אינה חשבונית מס')
  })

  it('بلا مدخلات → null', () => {
    expect(buildReceiptModel(null, PATUR)).toBe(null)
    expect(buildReceiptModel(RECEIPT, null)).toBe(null)
  })
})

describe('buildReceiptHtml', () => {
  it('يتضمن اسم المصلحة والدافع والمبلغ والسطر القانوني، وRTL', () => {
    const html = buildReceiptHtml(buildReceiptModel(RECEIPT, PATUR, { projectName: 'فيلا المشهد' }))
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('وسيم للجبص والديكور')
    expect(html).toContain('أبو خالد')
    expect(html).toContain('₪12,500')
    // علامة الاقتباس بـ«מע"מ» تُهرَّب لـ&quot; داخل الـHTML
    expect(html).toContain('עוסק פטור — אין לקזז')
    expect(html).toContain('فيلا المشهد')
    expect(html).toContain('RCP-0042')
  })

  it('يهرّب HTML بالمدخلات', () => {
    const html = buildReceiptHtml(buildReceiptModel({ ...RECEIPT, payer_name: '<script>x</script>' }, PATUR))
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;script&gt;')
  })
})
