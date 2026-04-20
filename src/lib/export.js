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
