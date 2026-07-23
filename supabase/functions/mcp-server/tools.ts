// أدوات MCP الـ16 — تعريفات (JSON Schema) + معالجات.
// كل استعلام مفلتر بـ user_id، وكل الحسابات المالية approved فقط (mirror calcProjectStats).
// كل كتابة: تحقّق → فحص ملكية → pre-check ضوابط المالك → insert → audit_log يدوي.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  calcEarned, calcMustahaq, calcWasel, calcMutabqi, calcRevenue,
  calcProjectStats, calcSalary, calcVATNet, calcBituachLeumiAnnual, estimateIncomeTax,
} from './calc.ts'

type Ctx = { db: SupabaseClient; userId: string }
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

const ok = (payload: unknown): ToolResult =>
  ({ content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] })
const fail = (ar: string, en: string): ToolResult =>
  ({ content: [{ type: 'text', text: `${ar} | ${en}` }], isError: true })

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const todayStr = () => new Date().toISOString().split('T')[0]
const monthOf = (d: string) => ({ month: Number(d.slice(5, 7)), year: Number(d.slice(0, 4)) })

// ── جلب جداول المستخدم ────────────────────────────────────────────────────────
async function fetchAll(ctx: Ctx, tables: string[]) {
  const out: Record<string, any[]> = {}
  await Promise.all(tables.map(async (t) => {
    const { data, error } = await ctx.db.from(t).select('*').eq('user_id', ctx.userId)
    if (error) throw new Error(`${t}: ${error.message}`)
    out[t] = data || []
  }))
  return out
}

// ── ضوابط المالك (pre-check لرسائل ودّية — triggers القاعدة تفرضها بكل الأحوال) ──
async function guardWrite(ctx: Ctx, date?: string, spendAmount = 0) {
  const { data: cfg } = await ctx.db.from('app_config')
    .select('is_read_only, daily_spend_limit').eq('user_id', ctx.userId).maybeSingle()
  if (cfg?.is_read_only) {
    return fail('الحساب في وضع القراءة فقط — عطّله من الإعدادات ← الأمان',
      'Account is in read-only mode — disable it in Settings → Security')
  }
  if (date) {
    const { month, year } = monthOf(date)
    const { data: locked } = await ctx.db.from('locked_periods')
      .select('id').eq('user_id', ctx.userId).eq('month', month).eq('year', year).maybeSingle()
    if (locked) {
      return fail(`الفترة ${year}-${String(month).padStart(2, '0')} مقفولة — لا يمكن التعديل عليها`,
        `Period ${year}-${String(month).padStart(2, '0')} is locked`)
    }
  }
  if (spendAmount > 0 && cfg?.daily_spend_limit > 0) {
    const today = todayStr()
    const [exp, pay] = await Promise.all([
      ctx.db.from('expenses').select('amount').eq('user_id', ctx.userId).eq('date', today),
      ctx.db.from('payments').select('amount').eq('user_id', ctx.userId).eq('date', today),
    ])
    const spent = [...(exp.data || []), ...(pay.data || [])].reduce((s, r) => s + (r.amount || 0), 0)
    if (spent + spendAmount > cfg.daily_spend_limit) {
      return fail(`تجاوز حدّ الصرف اليومي (${cfg.daily_spend_limit}₪ — صُرف اليوم ${Math.round(spent)}₪)`,
        `Daily spend limit exceeded (${cfg.daily_spend_limit}, spent today ${Math.round(spent)})`)
    }
  }
  return null
}

// سجلّ تدقيق يدوي — audit_trigger_fn يتخطى service-role (auth.uid() IS NULL)
async function audit(ctx: Ctx, action: string, tbl: string, recordId?: string) {
  await ctx.db.from('audit_log').insert({
    owner_id: ctx.userId, actor_id: ctx.userId, actor_email: 'mcp:claude',
    action, tbl, record_id: recordId ?? null,
  }).then(() => {}, () => {}) // best-effort — لا نفشل العملية إذا فشل السجل
}

async function ownedRow(ctx: Ctx, table: string, id: string) {
  const { data } = await ctx.db.from(table).select('*').eq('user_id', ctx.userId).eq('id', id).maybeSingle()
  return data
}

// فحص نوع المصلحة الرئيسية (עוסק פטור بلا מע"מ)
async function primaryBusinessType(ctx: Ctx): Promise<string> {
  const { data } = await ctx.db.from('businesses').select('type')
    .eq('user_id', ctx.userId).order('sort_order').limit(1)
  return data?.[0]?.type || 'osek_patur'
}

const vatFor = (amount: number, date: string, bizType: string) => {
  if (bizType === 'osek_patur') return 0
  const rate = date >= '2025-01-01' ? 0.18 : 0.17
  return Math.round(amount * (rate / (1 + rate)))
}

// ═══════════════════ تعريفات الأدوات (tools/list) ═══════════════════

export const TOOL_DEFS = [
  {
    name: 'get_business_summary',
    description: 'ملخص المصلحة الشامل: نقد بالجيب، مستحق للعمال، مستحق من العملاء، إيرادات ومصاريف، مشاريع نشطة، معلّقات بانتظار الموافقة. | Full business summary: cash on hand, owed to workers, owed by clients, revenue/expenses, active projects, pending approvals.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_projects',
    description: 'قائمة المشاريع مع أرقام كل مشروع (إيراد/تكلفة/ربح/هامش). | List projects with P&L stats each.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: "فلترة بالحالة مثل 'نشط' | filter by status" },
        include_archived: { type: 'boolean', description: 'شمول المؤرشفة (افتراضي لا) | include archived (default false)' },
      },
    },
  },
  {
    name: 'get_project',
    description: 'تفاصيل مشروع واحد مع P&L كامل ورصيد العميل. مرّر project_id أو name (بحث تقريبي). | Single project details with full P&L and client balance. Pass project_id or name (fuzzy).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        name: { type: 'string', description: 'اسم المشروع أو جزء منه | project name or part of it' },
      },
    },
  },
  {
    name: 'list_workers',
    description: 'قائمة العمال مع مستحقات كل عامل (مستحق/واصل/متبقي). | List workers with dues (earned/received/remaining).',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', description: "فلترة بالحالة مثل 'نشط'" } },
    },
  },
  {
    name: 'get_worker_statement',
    description: 'كشف حساب عامل: أيام العمل، المصاريف، الدفعات، السلف، والمتبقي. مرّر employee_id أو name. | Worker statement: work days, expenses, payments, advances, remaining. Pass employee_id or name.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string' },
        name: { type: 'string' },
        month: { type: 'string', description: 'YYYY-MM لحصر شهر معيّن (اختياري) | optional month filter' },
      },
    },
  },
  {
    name: 'list_expenses',
    description: 'المصاريف بفلاتر اختيارية. | List expenses with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        project_id: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        limit: { type: 'number', description: 'أقصاه 200 (افتراضي 50)' },
      },
    },
  },
  {
    name: 'list_receipts',
    description: 'مقبوضات العملاء بفلاتر اختيارية. | List client receipts with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string' }, to: { type: 'string' }, project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'get_tax_summary',
    description: 'ملخص ضرائب الفترة: מע"מ (خارج/داخل/صافي)، ביטוח לאומי تقديري، מס הכנסה تقديري. עוסק פטור → بلا מע"מ. | Tax summary for period: VAT out/in/net, estimated Bituach Leumi and income tax.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD (إلزامي)' },
        to: { type: 'string', description: 'YYYY-MM-DD (إلزامي)' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'add_expense',
    description: 'تسجيل مصروف جديد (يُعتمد مباشرة بصلاحية المالك). מע"מ يُحسب تلقائياً حسب الفئة. | Add a new expense (auto-approved as owner). VAT computed by category.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'بالشيكل، أكبر من صفر' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        category: { type: 'string', description: "مثل: 'مواد بناء / خامات'، 'وقود وتنقلات'، 'عدد وأدوات'، 'أخرى'" },
        project_id: { type: 'string', description: 'اختياري — بدونه يكون مصروفاً عاماً' },
        employee_id: { type: 'string', description: 'اختياري — مصروف عامل يدخل بمستحقه' },
        description: { type: 'string' },
      },
      required: ['amount', 'date', 'category'],
    },
  },
  {
    name: 'add_work_day',
    description: "تسجيل يوم/أيام عمل لعامل (حتى 31 تاريخاً دفعة واحدة). الأجر يُحسب تلقائياً من أجر العامل اليومي حسب النوع (كامل/نص يوم/ساعات مع أوفرتايم). 'مبلغ مسكر' يتطلب custom_amount. | Log work day(s) for a worker (bulk up to 31 dates). Salary computed server-side.",
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string' },
        project_id: { type: 'string', description: "إلزامي إلا ليوم 'عطلة'" },
        dates: { type: 'array', items: { type: 'string' }, description: 'تواريخ YYYY-MM-DD (≤31، لا مستقبلية)' },
        day_type: { type: 'string', enum: ['كامل', 'نص يوم', 'ساعات', 'مبلغ مسكر', 'عطلة'] },
        hours: { type: 'number', description: "لنوع 'ساعات' فقط" },
        custom_amount: { type: 'number', description: "لنوع 'مبلغ مسكر' فقط" },
        location: { type: 'string' },
      },
      required: ['employee_id', 'dates', 'day_type'],
    },
  },
  {
    name: 'add_payment',
    description: 'تسجيل دفعة راتب لعامل على مشروع. | Record a salary payment for a worker on a project.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string' }, project_id: { type: 'string' },
        amount: { type: 'number' }, date: { type: 'string' },
        method: { type: 'string', description: 'نقدي/تحويل/شيك... اختياري' },
      },
      required: ['employee_id', 'project_id', 'amount', 'date'],
    },
  },
  {
    name: 'add_receipt',
    description: 'تسجيل مقبوض من عميل على مشروع. מע"מ يُحسب حسب نوع المصلحة. | Record a client receipt for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' }, amount: { type: 'number' },
        date: { type: 'string' }, method: { type: 'string' }, notes: { type: 'string' },
      },
      required: ['project_id', 'amount', 'date'],
    },
  },
  {
    name: 'add_advance',
    description: 'تسجيل سلفة لعامل. | Record a cash advance for a worker.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string' }, amount: { type: 'number' }, date: { type: 'string' },
      },
      required: ['employee_id', 'amount', 'date'],
    },
  },
  {
    name: 'create_project',
    description: 'إنشاء مشروع جديد. | Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', description: "مثل 'مقطوع' أو 'يومي'" },
        price: { type: 'number', description: 'سعر الاتفاق (اختياري)' },
        client_name: { type: 'string' }, client_phone: { type: 'string' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'create_worker',
    description: 'إضافة عامل جديد. | Add a new worker.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        daily_rate: { type: 'number', description: 'الأجر اليومي بالشيكل، أكبر من صفر' },
        specialization: { type: 'string' }, phone: { type: 'string' },
        worker_type: { type: 'string', description: 'israeli/foreign_res/foreign_non/palestinian/self' },
      },
      required: ['name', 'daily_rate'],
    },
  },
  {
    name: 'update_project',
    description: "تعديل حقول محدّدة لمشروع (status/price/client_name/client_phone) أو أرشفته بـ archive:true. لا حذف نهائي عبر MCP — الحذف من التطبيق فقط. | Update whitelisted project fields or archive it. No hard deletes via MCP.",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        status: { type: 'string' }, price: { type: 'number' },
        client_name: { type: 'string' }, client_phone: { type: 'string' },
        archive: { type: 'boolean', description: 'true → أرشفة المشروع' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_worker',
    description: 'تعديل حقول محدّدة لعامل (daily_rate/status/phone/specialization). لا حذف نهائي عبر MCP. | Update whitelisted worker fields. No hard deletes via MCP.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string' },
        daily_rate: { type: 'number' }, status: { type: 'string' },
        phone: { type: 'string' }, specialization: { type: 'string' },
      },
      required: ['employee_id'],
    },
  },
]

// ═══════════════════ المعالجات (tools/call) ═══════════════════

export async function callTool(ctx: Ctx, name: string, args: Record<string, any> = {}): Promise<ToolResult> {
  switch (name) {

    case 'get_business_summary': {
      const t = await fetchAll(ctx, ['projects', 'employees', 'work_days', 'expenses', 'payments', 'advances', 'client_receipts'])
      const approvedWd  = t.work_days.filter(w => w.status === 'approved')
      const totalRevenue = calcRevenue(t.client_receipts)
      const nonWorkerExp = t.expenses.filter(e => !e.employee_id && e.status === 'approved')
        .reduce((s, e) => s + (e.amount || 0), 0)
      const totalWasel = calcWasel(t.payments, t.advances)
      const cashOnHand = totalRevenue - nonWorkerExp - totalWasel

      const owedToWorkers = t.employees.reduce((s, emp) => {
        const wds  = t.work_days.filter(w => w.employee_id === emp.id && w.status === 'approved')
        const wExp = t.expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
        const pays = t.payments.filter(p => p.employee_id === emp.id)
        const advs = t.advances.filter(a => a.employee_id === emp.id)
        return s + Math.max(0, calcMutabqi(wds, wExp, pays, advs))
      }, 0)

      const owedByClients = t.projects.reduce((s, p) => {
        if (!p.price || p.price <= 0) return s
        const got = calcRevenue(t.client_receipts.filter(r => r.project_id === p.id))
        return s + Math.max(0, (parseFloat(p.price) || 0) - got)
      }, 0)

      return ok({
        currency: 'ILS',
        cash_on_hand: Math.round(cashOnHand),
        owed_to_workers: Math.round(owedToWorkers),
        owed_by_clients: Math.round(owedByClients),
        total_revenue: Math.round(totalRevenue),
        total_expenses_non_worker: Math.round(nonWorkerExp),
        worker_costs_earned: Math.round(calcEarned(approvedWd)),
        net_profit: Math.round(totalRevenue - nonWorkerExp - calcEarned(approvedWd)),
        active_projects: t.projects.filter(p => p.status === 'نشط' && !p.archived_at).length,
        workers: t.employees.length,
        pending_work_days: t.work_days.filter(w => w.status === 'pending').length,
        pending_expenses: t.expenses.filter(e => e.status === 'pending').length,
      })
    }

    case 'list_projects': {
      const t = await fetchAll(ctx, ['projects', 'work_days', 'expenses', 'client_receipts'])
      let projects = t.projects
      if (!args.include_archived) projects = projects.filter(p => !p.archived_at)
      if (args.status) projects = projects.filter(p => p.status === args.status)
      return ok(projects.map(p => ({
        id: p.id, name: p.name, type: p.type, status: p.status, price: p.price,
        client_name: p.client_name,
        ...calcProjectStats(p.id, t.work_days, t.expenses, t.client_receipts),
      })))
    }

    case 'get_project': {
      const t = await fetchAll(ctx, ['projects', 'work_days', 'expenses', 'client_receipts'])
      let proj = args.project_id ? t.projects.find(p => p.id === args.project_id) : undefined
      if (!proj && args.name) {
        const q = String(args.name).trim()
        const matches = t.projects.filter(p => (p.name || '').includes(q))
        if (matches.length > 1) {
          return fail(`أكثر من مشروع مطابق: ${matches.map(m => m.name).join('، ')} — حدّد أكثر`,
            'Multiple matches, be more specific')
        }
        proj = matches[0]
      }
      if (!proj) return fail('المشروع غير موجود', 'Project not found')
      const stats = calcProjectStats(proj.id, t.work_days, t.expenses, t.client_receipts)
      const balance = proj.price > 0 ? Math.round(proj.price - stats.revenue) : null
      return ok({ ...proj, stats, client_balance_remaining: balance })
    }

    case 'list_workers': {
      const t = await fetchAll(ctx, ['employees', 'work_days', 'expenses', 'payments', 'advances'])
      let emps = t.employees
      if (args.status) emps = emps.filter(e => e.status === args.status)
      return ok(emps.map(emp => {
        const wds  = t.work_days.filter(w => w.employee_id === emp.id && w.status === 'approved')
        const wExp = t.expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
        const pays = t.payments.filter(p => p.employee_id === emp.id)
        const advs = t.advances.filter(a => a.employee_id === emp.id)
        return {
          id: emp.id, name: emp.name, specialization: emp.specialization,
          daily_rate: emp.daily_rate, status: emp.status,
          mustahaq: Math.round(calcMustahaq(wds, wExp)),
          wasel: Math.round(calcWasel(pays, advs)),
          mutabqi: Math.round(calcMutabqi(wds, wExp, pays, advs)),
          approved_days: wds.length,
        }
      }))
    }

    case 'get_worker_statement': {
      const t = await fetchAll(ctx, ['employees', 'work_days', 'expenses', 'payments', 'advances'])
      let emp = args.employee_id ? t.employees.find(e => e.id === args.employee_id) : undefined
      if (!emp && args.name) {
        const q = String(args.name).trim()
        const matches = t.employees.filter(e => (e.name || '').includes(q))
        if (matches.length > 1) {
          return fail(`أكثر من عامل مطابق: ${matches.map(m => m.name).join('، ')}`, 'Multiple matches')
        }
        emp = matches[0]
      }
      if (!emp) return fail('العامل غير موجود', 'Worker not found')
      const inMonth = (d: string) => !args.month || (d || '').startsWith(args.month)
      const wds  = t.work_days.filter(w => w.employee_id === emp.id && inMonth(w.date))
      const wExp = t.expenses.filter(e => e.employee_id === emp.id && inMonth(e.date))
      const pays = t.payments.filter(p => p.employee_id === emp.id && inMonth(p.date))
      const advs = t.advances.filter(a => a.employee_id === emp.id && inMonth(a.date))
      const approvedWds = wds.filter(w => w.status === 'approved')
      const approvedExp = wExp.filter(e => e.status === 'approved')
      return ok({
        worker: { id: emp.id, name: emp.name, daily_rate: emp.daily_rate },
        month: args.month || 'all',
        mustahaq: Math.round(calcMustahaq(approvedWds, approvedExp)),
        wasel: Math.round(calcWasel(pays, advs)),
        mutabqi: Math.round(calcMutabqi(approvedWds, approvedExp, pays, advs)),
        work_days: wds.map(w => ({ date: w.date, day_type: w.day_type, hours: w.hours, amount: w.amount, status: w.status })),
        expenses: wExp.map(e => ({ date: e.date, amount: e.amount, category: e.category, status: e.status })),
        payments: pays.map(p => ({ date: p.date, amount: p.amount })),
        advances: advs.map(a => ({ date: a.date, amount: a.amount })),
      })
    }

    case 'list_expenses': {
      const limit = Math.min(Number(args.limit) || 50, 200)
      let q = ctx.db.from('expenses').select('*').eq('user_id', ctx.userId)
        .order('date', { ascending: false }).limit(limit)
      if (args.from) q = q.gte('date', args.from)
      if (args.to) q = q.lte('date', args.to)
      if (args.project_id) q = q.eq('project_id', args.project_id)
      if (args.category) q = q.eq('category', args.category)
      if (args.status) q = q.eq('status', args.status)
      const { data, error } = await q
      if (error) return fail(`خطأ: ${error.message}`, error.message)
      const total = (data || []).reduce((s, e) => s + (e.amount || 0), 0)
      return ok({ count: data?.length || 0, total: Math.round(total), expenses: data })
    }

    case 'list_receipts': {
      let q = ctx.db.from('client_receipts').select('*').eq('user_id', ctx.userId)
        .order('date', { ascending: false }).limit(200)
      if (args.from) q = q.gte('date', args.from)
      if (args.to) q = q.lte('date', args.to)
      if (args.project_id) q = q.eq('project_id', args.project_id)
      const { data, error } = await q
      if (error) return fail(`خطأ: ${error.message}`, error.message)
      const total = (data || []).reduce((s, r) => s + (r.amount || 0), 0)
      return ok({ count: data?.length || 0, total: Math.round(total), receipts: data })
    }

    case 'get_tax_summary': {
      if (!DATE_RE.test(args.from || '') || !DATE_RE.test(args.to || '')) {
        return fail('from/to إلزاميان بصيغة YYYY-MM-DD', 'from/to required as YYYY-MM-DD')
      }
      const t = await fetchAll(ctx, ['client_receipts', 'expenses', 'work_days'])
      const bizType = await primaryBusinessType(ctx)
      const inRange = (d: string) => d >= args.from && d <= args.to
      const receipts = t.client_receipts.filter(r => inRange(r.date || ''))
      const expenses = t.expenses.filter(e => inRange(e.date || ''))
      const revenue = calcRevenue(receipts)
      const nonWorkerExp = expenses.filter(e => !e.employee_id && e.status === 'approved')
        .reduce((s, e) => s + (e.amount || 0), 0)
      const workerCosts = calcEarned(t.work_days.filter(w => w.status === 'approved' && inRange(w.date || '')))
      const netProfit = revenue - nonWorkerExp - workerCosts
      // تقدير سنوي: تحويل صافي الفترة لوتيرة سنوية حسب طول الفترة بالأيام
      const days = Math.max(1, Math.round((new Date(args.to).getTime() - new Date(args.from).getTime()) / 86400000) + 1)
      const annualized = netProfit * (365 / days)
      const vat = bizType === 'osek_patur'
        ? { vatOut: 0, vatIn: 0, net: 0, note: 'עוסק פטור — לא חייב במע"מ' }
        : calcVATNet(receipts, expenses, args.from, args.to)
      return ok({
        period: { from: args.from, to: args.to }, business_type: bizType, currency: 'ILS',
        revenue: Math.round(revenue),
        expenses_non_worker: Math.round(nonWorkerExp),
        worker_costs: Math.round(workerCosts),
        net_profit: Math.round(netProfit),
        vat,
        bituach_leumi_annual_estimate: calcBituachLeumiAnnual(annualized),
        income_tax_annual_estimate: estimateIncomeTax(annualized),
        note: 'تقديرات ביטוח לאומי ومס הכנסה سنوية مبنية على تعميم صافي الفترة — استشر محاسبك للأرقام الرسمية',
      })
    }

    // ═══════════ أدوات الكتابة ═══════════

    case 'add_expense': {
      const amt = Number(args.amount)
      if (!amt || amt <= 0 || amt > 9_999_999) return fail('المبلغ يجب أن يكون بين 1 و9,999,999', 'Invalid amount')
      if (!DATE_RE.test(args.date || '')) return fail('التاريخ إلزامي بصيغة YYYY-MM-DD', 'Invalid date')
      if (!args.category) return fail('التصنيف مطلوب', 'Category required')
      if (args.project_id && !(await ownedRow(ctx, 'projects', args.project_id))) return fail('المشروع غير موجود', 'Project not found')
      if (args.employee_id && !(await ownedRow(ctx, 'employees', args.employee_id))) return fail('العامل غير موجود', 'Worker not found')
      const g = await guardWrite(ctx, args.date, amt); if (g) return g
      const bizType = await primaryBusinessType(ctx)
      const row = {
        user_id: ctx.userId, amount: amt, date: args.date, category: args.category,
        project_id: args.project_id || null, employee_id: args.employee_id || null,
        is_general: !args.project_id, description: args.description || null,
        vat_amount: args.employee_id ? 0 : vatFor(amt, args.date, bizType),
        status: 'approved',
      }
      const { data, error } = await ctx.db.from('expenses').insert(row).select().single()
      if (error) return fail(`رُفض من ضوابط الحساب: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'expenses', data.id)
      return ok({ created: 'expense', id: data.id, amount: data.amount, date: data.date, category: data.category, vat_amount: data.vat_amount })
    }

    case 'add_work_day': {
      const emp = await ownedRow(ctx, 'employees', args.employee_id)
      if (!emp) return fail('العامل غير موجود', 'Worker not found')
      const dates: string[] = Array.isArray(args.dates) ? args.dates : []
      if (!dates.length || dates.length > 31) return fail('dates: بين 1 و31 تاريخاً', '1-31 dates required')
      const today = todayStr()
      if (dates.some(d => !DATE_RE.test(d))) return fail('كل التواريخ يجب أن تكون YYYY-MM-DD', 'Bad date format')
      if (dates.some(d => d > today)) return fail('لا يمكن تسجيل أيام مستقبلية', 'No future dates')
      const dt = args.day_type
      if (!['كامل', 'نص يوم', 'ساعات', 'مبلغ مسكر', 'عطلة'].includes(dt)) return fail('نوع يوم غير صالح', 'Invalid day_type')
      if (dt !== 'عطلة' && !args.project_id) return fail("المشروع إلزامي إلا ليوم 'عطلة'", 'project_id required')
      if (args.project_id && !(await ownedRow(ctx, 'projects', args.project_id))) return fail('المشروع غير موجود', 'Project not found')
      if (dt === 'ساعات' && !(Number(args.hours) > 0)) return fail("hours مطلوبة لنوع 'ساعات'", 'hours required')
      if (dt === 'مبلغ مسكر' && !(Number(args.custom_amount) > 0)) return fail("custom_amount مطلوب لنوع 'مبلغ مسكر'", 'custom_amount required')
      for (const d of dates) { const g = await guardWrite(ctx, d); if (g) return g }

      const amount = dt === 'مبلغ مسكر' ? Math.round(Number(args.custom_amount))
        : calcSalary(emp.daily_rate || 0, dt, args.hours)

      // تخطي التواريخ المسجّلة مسبقاً لنفس العامل
      const { data: existing } = await ctx.db.from('work_days').select('date')
        .eq('user_id', ctx.userId).eq('employee_id', emp.id).in('date', dates)
      const taken = new Set((existing || []).map(r => r.date))
      const toInsert = dates.filter(d => !taken.has(d)).map(d => ({
        user_id: ctx.userId, employee_id: emp.id,
        project_id: dt === 'عطلة' ? null : args.project_id,
        date: d, day_type: dt, hours: dt === 'ساعات' ? Number(args.hours) : null,
        amount, location: args.location || null, status: 'approved',
      }))
      if (!toInsert.length) return fail('كل التواريخ مسجّلة مسبقاً لهذا العامل', 'All dates already logged')
      const { data, error } = await ctx.db.from('work_days').insert(toInsert).select('id, date')
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      for (const r of data || []) await audit(ctx, 'insert', 'work_days', r.id)
      return ok({
        created: 'work_days', count: data?.length || 0, amount_per_day: amount,
        dates: (data || []).map(r => r.date),
        skipped_existing: dates.filter(d => taken.has(d)),
      })
    }

    case 'add_payment': {
      const amt = Number(args.amount)
      if (!amt || amt <= 0 || amt > 9_999_999) return fail('المبلغ غير صالح', 'Invalid amount')
      if (!DATE_RE.test(args.date || '')) return fail('التاريخ غير صالح', 'Invalid date')
      if (!(await ownedRow(ctx, 'employees', args.employee_id))) return fail('العامل غير موجود', 'Worker not found')
      if (!(await ownedRow(ctx, 'projects', args.project_id))) return fail('المشروع غير موجود — الدفعة يجب أن ترتبط بمشروع', 'Project not found')
      const g = await guardWrite(ctx, args.date, amt); if (g) return g
      const { data, error } = await ctx.db.from('payments').insert({
        user_id: ctx.userId, employee_id: args.employee_id, project_id: args.project_id,
        amount: amt, date: args.date, method: args.method || null,
      }).select().single()
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'payments', data.id)
      return ok({ created: 'payment', id: data.id, amount: data.amount, date: data.date })
    }

    case 'add_receipt': {
      const amt = Number(args.amount)
      if (!amt || amt <= 0) return fail('المبلغ غير صالح', 'Invalid amount')
      if (!DATE_RE.test(args.date || '')) return fail('التاريخ غير صالح', 'Invalid date')
      if (!(await ownedRow(ctx, 'projects', args.project_id))) return fail('المشروع غير موجود', 'Project not found')
      const g = await guardWrite(ctx, args.date); if (g) return g
      const bizType = await primaryBusinessType(ctx)
      const { data, error } = await ctx.db.from('client_receipts').insert({
        user_id: ctx.userId, project_id: args.project_id, amount: amt, date: args.date,
        payment_method: args.method || null, notes: args.notes || null,
        vat_amount: vatFor(amt, args.date, bizType),
      }).select().single()
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'client_receipts', data.id)
      return ok({ created: 'receipt', id: data.id, amount: data.amount, date: data.date, vat_amount: data.vat_amount })
    }

    case 'add_advance': {
      const amt = Number(args.amount)
      if (!amt || amt <= 0) return fail('المبلغ غير صالح', 'Invalid amount')
      if (!DATE_RE.test(args.date || '')) return fail('التاريخ غير صالح', 'Invalid date')
      if (!(await ownedRow(ctx, 'employees', args.employee_id))) return fail('العامل غير موجود', 'Worker not found')
      const g = await guardWrite(ctx, args.date, amt); if (g) return g
      const { data, error } = await ctx.db.from('advances').insert({
        user_id: ctx.userId, employee_id: args.employee_id, amount: amt, date: args.date,
      }).select().single()
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'advances', data.id)
      return ok({ created: 'advance', id: data.id, amount: data.amount, date: data.date })
    }

    case 'create_project': {
      if (!args.name?.trim()) return fail('اسم المشروع مطلوب', 'Name required')
      if (!args.type) return fail('نوع المشروع مطلوب', 'Type required')
      if (args.price != null && Number(args.price) < 0) return fail('السعر لا يمكن أن يكون سالباً', 'Negative price')
      const g = await guardWrite(ctx); if (g) return g
      const { data, error } = await ctx.db.from('projects').insert({
        user_id: ctx.userId, name: args.name.trim(), type: args.type,
        price: args.price ?? null, client_name: args.client_name || null,
        client_phone: args.client_phone || null, status: 'نشط',
      }).select().single()
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'projects', data.id)
      return ok({ created: 'project', id: data.id, name: data.name })
    }

    case 'create_worker': {
      if (!args.name?.trim()) return fail('اسم العامل مطلوب', 'Name required')
      if (!(Number(args.daily_rate) > 0)) return fail('الأجر اليومي يجب أن يكون أكبر من صفر', 'daily_rate must be > 0')
      const g = await guardWrite(ctx); if (g) return g
      const { data, error } = await ctx.db.from('employees').insert({
        user_id: ctx.userId, name: args.name.trim(), daily_rate: Number(args.daily_rate),
        specialization: args.specialization || null, phone: args.phone || null,
        worker_type: args.worker_type || 'israeli', status: 'نشط',
      }).select().single()
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'insert', 'employees', data.id)
      return ok({ created: 'worker', id: data.id, name: data.name, daily_rate: data.daily_rate })
    }

    case 'update_project': {
      const proj = await ownedRow(ctx, 'projects', args.project_id)
      if (!proj) return fail('المشروع غير موجود', 'Project not found')
      const g = await guardWrite(ctx); if (g) return g
      const patch: Record<string, unknown> = {}
      if (args.status != null) patch.status = args.status
      if (args.price != null) {
        if (Number(args.price) < 0) return fail('السعر لا يمكن أن يكون سالباً', 'Negative price')
        patch.price = Number(args.price)
      }
      if (args.client_name != null) patch.client_name = args.client_name
      if (args.client_phone != null) patch.client_phone = args.client_phone
      if (args.archive === true) patch.archived_at = new Date().toISOString()
      if (!Object.keys(patch).length) return fail('لا حقول للتعديل', 'No fields to update')
      const { error } = await ctx.db.from('projects').update(patch)
        .eq('user_id', ctx.userId).eq('id', proj.id)
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'update', 'projects', proj.id)
      return ok({ updated: 'project', id: proj.id, fields: Object.keys(patch) })
    }

    case 'update_worker': {
      const emp = await ownedRow(ctx, 'employees', args.employee_id)
      if (!emp) return fail('العامل غير موجود', 'Worker not found')
      const g = await guardWrite(ctx); if (g) return g
      const patch: Record<string, unknown> = {}
      if (args.daily_rate != null) {
        if (!(Number(args.daily_rate) > 0)) return fail('الأجر اليومي يجب أن يكون أكبر من صفر', 'daily_rate must be > 0')
        patch.daily_rate = Number(args.daily_rate)
      }
      if (args.status != null) patch.status = args.status
      if (args.phone != null) patch.phone = args.phone
      if (args.specialization != null) patch.specialization = args.specialization
      if (!Object.keys(patch).length) return fail('لا حقول للتعديل', 'No fields to update')
      const { error } = await ctx.db.from('employees').update(patch)
        .eq('user_id', ctx.userId).eq('id', emp.id)
      if (error) return fail(`رُفض: ${error.message}`, error.message)
      await audit(ctx, 'update', 'employees', emp.id)
      return ok({ updated: 'worker', id: emp.id, fields: Object.keys(patch) })
    }

    default:
      return fail(`أداة غير معروفة: ${name}`, `Unknown tool: ${name}`)
  }
}
