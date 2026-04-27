import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmt, fmtDate } from './helpers.js'

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportExpensesToExcel(expenses, projects) {
  const rows = expenses.map(e => ({
    'التاريخ':      fmtDate(e.date),
    'التصنيف':      e.category || '',
    'المحل/المورّد': e.vendor || '',
    'المشروع':      projects.find(p => p.id === e.project_id)?.name || '',
    'طريقة الدفع':  e.payment_method || '',
    'المبلغ (₪)':   e.amount,
  }))
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  rows.push({ 'التاريخ': 'الإجمالي', 'المبلغ (₪)': total })
  _downloadXlsx(rows, 'مصاريف')
}

export function exportWorkDaysToExcel(workDays, employees, projects) {
  const rows = workDays.map(w => ({
    'التاريخ':    fmtDate(w.date),
    'العامل':     employees.find(e => e.id === w.employee_id)?.name || '',
    'المشروع':    projects.find(p => p.id === w.project_id)?.name || '',
    'نوع اليوم':  w.day_type || '',
    'الساعات':    w.hours || '',
    'الحالة':     w.status === 'approved' ? 'موافق' : 'معلق',
    'المبلغ (₪)': w.amount,
  }))
  const total = workDays.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)
  rows.push({ 'التاريخ': 'الإجمالي', 'المبلغ (₪)': total })
  _downloadXlsx(rows, 'أيام-العمل')
}

export function exportPaymentsToExcel(payments, employees) {
  const rows = payments.map(p => ({
    'التاريخ':     fmtDate(p.date),
    'العامل':      employees.find(e => e.id === p.employee_id)?.name || '',
    'طريقة الدفع': p.method || 'كاش',
    'ملاحظات':     p.notes || '',
    'المبلغ (₪)':  p.amount,
  }))
  const total = payments.reduce((s, p) => s + p.amount, 0)
  rows.push({ 'التاريخ': 'الإجمالي', 'المبلغ (₪)': total })
  _downloadXlsx(rows, 'مدفوعات')
}

export function exportFullReportToExcel({ projects, employees, workDays, expenses, payments, clientReceipts }) {
  const wb = XLSX.utils.book_new()

  // ملخص عام
  const totalRevenue  = (clientReceipts || []).reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalLabor    = workDays.filter(w => w.status !== 'pending').reduce((s, w) => s + w.amount, 0)
  const totalPaid     = payments.reduce((s, p) => s + p.amount, 0)

  const summaryRows = [
    { 'البند': 'المقبوض من العملاء', 'المبلغ (₪)': totalRevenue },
    { 'البند': 'إجمالي المصاريف',    'المبلغ (₪)': totalExpenses },
    { 'البند': 'إجمالي الرواتب',     'المبلغ (₪)': totalLabor },
    { 'البند': 'إجمالي المدفوع',     'المبلغ (₪)': totalPaid },
    { 'البند': 'صافي الربح',         'المبلغ (₪)': totalRevenue - totalExpenses - totalLabor },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'ملخص')

  // المشاريع
  const projRows = projects.map(p => {
    const rev  = (clientReceipts || []).filter(r => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
    const exp  = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    const lab  = workDays.filter(w => w.project_id === p.id && w.status !== 'pending').reduce((s, w) => s + w.amount, 0)
    return {
      'اسم المشروع':     p.name,
      'العميل':          p.client_name || '',
      'الحالة':          p.status || '',
      'السعر (₪)':       p.price || 0,
      'المقبوض (₪)':     rev,
      'المصاريف (₪)':    exp,
      'الرواتب (₪)':     lab,
      'صافي الربح (₪)':  rev - exp - lab,
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), 'مشاريع')

  // مصاريف
  const expRows = expenses.map(e => ({
    'التاريخ':    fmtDate(e.date),
    'التصنيف':    e.category || '',
    'المورّد':    e.vendor || '',
    'المشروع':    projects.find(p => p.id === e.project_id)?.name || '',
    'المبلغ (₪)': e.amount,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'مصاريف')

  // رواتب
  const salRows = employees.map(emp => {
    const earned = workDays.filter(w => w.employee_id === emp.id && w.status !== 'pending').reduce((s, w) => s + w.amount, 0)
    const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    return {
      'اسم العامل':       emp.name,
      'التخصص':          emp.specialization || '',
      'الأجر اليومي (₪)': emp.daily_rate,
      'المستحق (₪)':      earned,
      'المدفوع (₪)':      paid,
      'المتبقي (₪)':      Math.max(0, earned - paid),
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salRows), 'رواتب العمال')

  XLSX.writeFile(wb, `تقرير-contractor-pro-${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── تصدير ضريبي للمحاسب ──────────────────────────────────────────────────────
export function exportTaxSummary({ year, clientReceipts, expenses, projects }) {
  const wb = XLSX.utils.book_new()
  const yearStr = String(year || new Date().getFullYear())
  const VAT_RATE = 0.17

  // ورقة 1: الإيرادات
  const incomeRows = clientReceipts
    .filter(r => (r.date || '').startsWith(yearStr))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({
      'التاريخ':        fmtDate(r.date),
      'المشروع':        projects.find(p => p.id === r.project_id)?.name || '',
      'اسم الزبون':     projects.find(p => p.id === r.project_id)?.client_name || '',
      'المبلغ الكلي (₪)': r.amount,
      'بدون VAT (₪)':   Math.round(r.amount / 1.17),
      'VAT محصّل (₪)':  Math.round(r.amount * VAT_RATE / (1 + VAT_RATE)),
      'ملاحظات':        r.notes || '',
    }))
  const totalIncome    = incomeRows.reduce((s, r) => s + r['المبلغ الكلي (₪)'], 0)
  const totalVATOut    = incomeRows.reduce((s, r) => s + r['VAT محصّل (₪)'], 0)
  incomeRows.push({ 'التاريخ': 'الإجمالي', 'المبلغ الكلي (₪)': totalIncome, 'VAT محصّل (₪)': totalVATOut })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), 'إيرادات')

  // ورقة 2: المصاريف القابلة للخصم
  const expRows = expenses
    .filter(e => (e.date || '').startsWith(yearStr) && e.status !== 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      'التاريخ':          fmtDate(e.date),
      'التصنيف':          e.category || '',
      'المحل/المورّد':     e.vendor || '',
      'المشروع':          projects.find(p => p.id === e.project_id)?.name || '',
      'المبلغ الكلي (₪)': e.amount,
      'بدون VAT (₪)':     Math.round(e.amount / 1.17),
      'VAT مدفوع (₪)':    Math.round(e.amount * VAT_RATE / (1 + VAT_RATE)),
    }))
  const totalExpenses = expRows.reduce((s, r) => s + r['المبلغ الكلي (₪)'], 0)
  const totalVATIn    = expRows.reduce((s, r) => s + r['VAT مدفوع (₪)'], 0)
  expRows.push({ 'التاريخ': 'الإجمالي', 'المبلغ الكلي (₪)': totalExpenses, 'VAT مدفوع (₪)': totalVATIn })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'مصاريف-خصم-ضريبي')

  // ورقة 3: ملخص VAT بالفترات الثنائية (كل شهرين)
  const vatPeriods = []
  for (let m = 1; m <= 12; m += 2) {
    const m1 = String(m).padStart(2, '0')
    const m2 = String(m + 1).padStart(2, '0')
    const periodLabel = `${yearStr}-${m1} / ${yearStr}-${m2}`
    const pIncome  = clientReceipts.filter(r => { const mo = (r.date||'').slice(5,7); return (r.date||'').startsWith(yearStr) && (mo === m1 || mo === m2) })
    const pExpense = expenses.filter(e => { const mo = (e.date||'').slice(5,7); return (e.date||'').startsWith(yearStr) && (mo === m1 || mo === m2) && e.status !== 'pending' })
    const vatOut = Math.round(pIncome.reduce((s,r) => s + r.amount, 0) * VAT_RATE / (1 + VAT_RATE))
    const vatIn  = Math.round(pExpense.reduce((s,e) => s + e.amount, 0) * VAT_RATE / (1 + VAT_RATE))
    vatPeriods.push({ 'الفترة': periodLabel, 'VAT محصّل (₪)': vatOut, 'VAT مدفوع (₪)': vatIn, 'صافي للدفع (₪)': Math.max(0, vatOut - vatIn), 'استرداد (₪)': Math.max(0, vatIn - vatOut) })
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vatPeriods), 'ملخص-מע״מ')

  XLSX.writeFile(wb, `ملخص-ضريبي-${yearStr}.xlsx`)
}

function _downloadXlsx(rows, name) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, name)
  XLSX.writeFile(wb, `${name}-${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function exportProjectToPDF({ project, workDays, expenses, clientReceipts, employees }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // RTL support via flipping — jsPDF doesn't natively support Arabic RTL,
  // but autoTable renders rows correctly if we flip column order
  doc.setFont('helvetica')

  const projExp      = expenses.filter(e => e.project_id === project.id)
  const projDays     = workDays.filter(w => w.project_id === project.id && w.status !== 'pending')
  const projReceipts = (clientReceipts || []).filter(r => r.project_id === project.id)
  const totalExp     = projExp.reduce((s, e) => s + e.amount, 0)
  const totalLabor   = projDays.reduce((s, w) => s + w.amount, 0)
  const totalRev     = projReceipts.reduce((s, r) => s + r.amount, 0)
  const netProfit    = totalRev - totalExp - totalLabor

  // Header
  doc.setFontSize(18)
  doc.setTextColor(0, 212, 170)
  doc.text('Contractor Pro', 105, 18, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text(project.name, 105, 27, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Client: ${project.client_name || '-'}  |  Status: ${project.status || '-'}  |  Date: ${new Date().toLocaleDateString('ar-EG')}`, 105, 34, { align: 'center' })

  // Summary boxes
  const summaryY = 42
  const boxes = [
    { label: 'Revenue',  value: `${fmt(totalRev)}ILS`,    color: [61, 214, 140] },
    { label: 'Expenses', value: `${fmt(totalExp)}ILS`,    color: [255, 92, 92]  },
    { label: 'Labor',    value: `${fmt(totalLabor)}ILS`,  color: [91, 156, 246] },
    { label: 'Profit',   value: `${fmt(netProfit)}ILS`,   color: netProfit >= 0 ? [0, 212, 170] : [255, 92, 92] },
  ]
  boxes.forEach((b, i) => {
    const x = 14 + i * 46
    doc.setFillColor(...b.color)
    doc.roundedRect(x, summaryY, 42, 18, 3, 3, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(b.label, x + 21, summaryY + 6, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(b.value, x + 21, summaryY + 13, { align: 'center' })
  })

  let y = summaryY + 26

  // Work Days table
  if (projDays.length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Work Days', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Worker', 'Type', 'Hours', 'Amount (ILS)']],
      body: projDays.map(w => [
        fmtDate(w.date),
        employees.find(e => e.id === w.employee_id)?.name || '-',
        w.day_type || '-',
        w.hours || '-',
        fmt(w.amount),
      ]),
      foot: [['Total', '', '', '', fmt(totalLabor)]],
      theme: 'striped',
      headStyles:   { fillColor: [91, 156, 246], textColor: 255, fontSize: 8 },
      footStyles:   { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      bodyStyles:   { fontSize: 8 },
      margin:       { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Expenses table
  if (projExp.length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Expenses', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Category', 'Vendor', 'Payment', 'Amount (ILS)']],
      body: projExp.map(e => [
        fmtDate(e.date),
        e.category || '-',
        e.vendor || '-',
        e.payment_method || '-',
        fmt(e.amount),
      ]),
      foot: [['Total', '', '', '', fmt(totalExp)]],
      theme: 'striped',
      headStyles:   { fillColor: [255, 92, 92], textColor: 255, fontSize: 8 },
      footStyles:   { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      bodyStyles:   { fontSize: 8 },
      margin:       { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Client receipts
  if (projReceipts.length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Client Receipts', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Method', 'Notes', 'Amount (ILS)']],
      body: projReceipts.map(r => [
        fmtDate(r.date),
        r.payment_method || '-',
        r.notes || '-',
        fmt(r.amount),
      ]),
      foot: [['Total', '', '', fmt(totalRev)]],
      theme: 'striped',
      headStyles:   { fillColor: [61, 214, 140], textColor: 255, fontSize: 8 },
      footStyles:   { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      bodyStyles:   { fontSize: 8 },
      margin:       { left: 14, right: 14 },
    })
  }

  doc.save(`${project.name}-report-${new Date().toISOString().slice(0,10)}.pdf`)
}

export function exportWorkerSalaryPDF({ worker, workDays, payments }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')

  const myDays     = workDays.filter(w => w.employee_id === worker.id && w.status !== 'pending')
  const myPayments = payments.filter(p => p.employee_id === worker.id)
  const totalEarned = myDays.reduce((s, w) => s + w.amount, 0)
  const totalPaid   = myPayments.reduce((s, p) => s + p.amount, 0)
  const owed        = Math.max(0, totalEarned - totalPaid)

  doc.setFontSize(18)
  doc.setTextColor(0, 212, 170)
  doc.text('Contractor Pro - Salary Report', 105, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setTextColor(40, 40, 40)
  doc.text(worker.name, 105, 27, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Daily Rate: ${worker.daily_rate} ILS  |  Generated: ${new Date().toLocaleDateString()}`, 105, 34, { align: 'center' })

  const boxes = [
    { label: 'Earned',  value: `${fmt(totalEarned)}`, color: [91, 156, 246]   },
    { label: 'Paid',    value: `${fmt(totalPaid)}`,   color: [61, 214, 140]   },
    { label: 'Owed',    value: `${fmt(owed)}`,         color: owed > 0 ? [255, 179, 71] : [61, 214, 140] },
  ]
  boxes.forEach((b, i) => {
    const x = 28 + i * 56
    doc.setFillColor(...b.color)
    doc.roundedRect(x, 42, 50, 18, 3, 3, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255)
    doc.text(b.label, x + 25, 49, { align: 'center' })
    doc.setFontSize(11)
    doc.text(b.value + ' ILS', x + 25, 56, { align: 'center' })
  })

  autoTable(doc, {
    startY: 68,
    head: [['Date', 'Project', 'Type', 'Amount (ILS)']],
    body: myDays.map(w => [fmtDate(w.date), w.project_name || '-', w.day_type || '-', fmt(w.amount)]),
    foot: [['Total', '', '', fmt(totalEarned)]],
    theme: 'striped',
    headStyles: { fillColor: [91, 156, 246], textColor: 255, fontSize: 8 },
    footStyles: { fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  })

  if (myPayments.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Date', 'Method', 'Notes', 'Amount (ILS)']],
      body: myPayments.map(p => [fmtDate(p.date), p.method || 'كاش', p.notes || '-', fmt(p.amount)]),
      foot: [['Total Paid', '', '', fmt(totalPaid)]],
      theme: 'striped',
      headStyles: { fillColor: [61, 214, 140], textColor: 255, fontSize: 8 },
      footStyles: { fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    })
  }

  doc.save(`${worker.name}-salary-${new Date().toISOString().slice(0,10)}.pdf`)
}

// #23: Worker employment contract PDF
export function exportWorkerContractPDF({ worker, ownerName = '', contractorNumber = '' }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')
  const today = new Date().toLocaleDateString('en-GB')

  // Header bar
  doc.setFillColor(0, 212, 170)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFontSize(16)
  doc.setTextColor(255)
  doc.text('Contractor Pro - Employment Contract', 105, 11, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`عقد توظيف / Employment Agreement  |  ${today}`, 105, 20, { align: 'center' })

  // Worker info box
  doc.setFillColor(245, 248, 252)
  doc.roundedRect(14, 34, 182, 38, 3, 3, 'F')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Worker / العامل', 190, 42, { align: 'right' })
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text(worker.name, 190, 51, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  const infoLine = [worker.phone ? `Tel: ${worker.phone}` : '', worker.id_number ? `ID / ת.ז: ${worker.id_number}` : ''].filter(Boolean).join('   ')
  if (infoLine) doc.text(infoLine, 190, 59, { align: 'right' })
  if (worker.specialization) doc.text(`Specialization: ${worker.specialization}`, 18, 59)

  // Section title
  let y = 82
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Contract Terms / شروط العقد', 105, y, { align: 'center' })
  y += 8

  // Terms table
  const terms = [
    ['Daily Rate / الأجر اليومي', `${worker.daily_rate} ILS`],
    ['Start Date / تاريخ البدء', today],
    ['Payment / طريقة الدفع', 'Cash / نقداً'],
    ['Status / الحالة', worker.status || 'Active / نشط'],
    ['Rating / التقييم', worker.performance_rating ? '★'.repeat(worker.performance_rating) + '☆'.repeat(5 - worker.performance_rating) : 'N/A'],
  ]
  doc.setFont('helvetica', 'normal')
  terms.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? [248, 249, 252] : [255, 255, 255]
    doc.setFillColor(...bg)
    doc.rect(14, y - 4, 182, 10, 'F')
    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(label, 18, y + 2)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text(value, 190, y + 2, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 10
  })

  // Contract clauses
  y += 8
  doc.setDrawColor(220)
  doc.line(14, y, 196, y)
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(100)
  const clauses = [
    '1. The worker agrees to perform the assigned work professionally and punctually.',
    '2. Payment is based on approved working days at the agreed daily rate.',
    '3. Advances are deducted from the total due amount.',
    '4. Either party may terminate this agreement with 7 days written notice.',
    '5. This contract is governed by applicable Israeli labor law.',
  ]
  clauses.forEach(c => { doc.text(c, 14, y); y += 7 })

  // Signatures
  y += 10
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.line(14, y + 12, 88, y + 12)
  doc.line(122, y + 12, 196, y + 12)
  doc.text('Worker Signature / توقيع العامل', 51, y + 18, { align: 'center' })
  doc.text(`Employer / صاحب العمل${ownerName ? '\n' + ownerName : ''}`, 159, y + 18, { align: 'center' })

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(160)
  const footer = `Contractor Pro${contractorNumber ? ' • License: ' + contractorNumber : ''} • Generated ${today}`
  doc.text(footer, 105, 288, { align: 'center' })

  doc.save(`${worker.name}-contract-${new Date().toISOString().slice(0, 10)}.pdf`)
}
