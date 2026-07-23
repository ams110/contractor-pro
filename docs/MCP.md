# ربط الذكاء (MCP) — Claude موصول بمصلحتك

ميزة **خطة Business**: المقاول يربط Claude (تطبيق الموبايل/الويب أو Claude Desktop) بمصلحته
عبر مفتاح API، ويسأل ويأمر بلغة طبيعية:

> «كم مستحق للعمال هالشهر؟» · «شو ربح مشروع الفيلا؟» · «سجّل مصروف 500₪ سولار على مشروع رمات غان» · «سجّل يوم عمل كامل لمحمد أمس»

## المعمارية

- **Edge Function** `supabase/functions/mcp-server/` — خادم MCP بنقل Streamable HTTP بلا حالة (JSON-RPC 2.0 على POST واحد). تُنشر بـ`--no-verify-jwt` (المصادقة داخلية بمفتاح API).
- **جدول `api_keys`** — الهاش فقط (sha256). المفتاح `cpk_` + 64 hex يولَّد بالعميل ويظهر مرّة واحدة. RLS للمالك (قراءة ميتاداتا + إلغاء عبر `revoked_at`، بلا حذف).
- **بوابة الخطة خادمياً**: `organizations.plan === 'business'` أو تجربة سارية.
- **الحسابات**: `mcp-server/calc.ts` نسخة منقولة حرفياً من `src/lib/calculations.js` + `helpers.js` — اختبار التكافؤ `src/lib/mcpCalcParity.test.js` يكسر الـCI عند أي انحراف. **عدّلت الأصل؟ زامن النسخة.**
- **UI**: الإعدادات ← فئة «ربط الذكاء» (`McpAccessSection.jsx`، مقفولة بـ`FeatureGate` على business).

## الأدوات (16)

| قراءة | كتابة |
|-------|-------|
| `get_business_summary` نقد/مستحقات/معلّقات | `add_expense` (מע"מ تلقائي حسب الفئة) |
| `list_projects` + P&L لكل مشروع | `add_work_day` (bulk ≤31 يوم، الأجر يُحسب خادمياً) |
| `get_project` (id أو اسم تقريبي) | `add_payment` · `add_receipt` · `add_advance` |
| `list_workers` + مستحق/واصل/متبقي | `create_project` · `create_worker` |
| `get_worker_statement` (شهر اختياري) | `update_project` (+أرشفة) · `update_worker` |
| `list_expenses` · `list_receipts` (فلاتر) | — |
| `get_tax_summary` (מע"מ/ביטוח לאומי/מס הכנסה) | — |

## الضوابط

- **بلا حذف نهائي** عبر MCP — الحذف من التطبيق فقط (حيث تأكيد البصمة).
- ضوابط المالك مفروضة **مرّتين**: pre-check بالـedge (رسائل ودّية) + triggers القاعدة (`enforce_owner_controls`/`enforce_daily_spend_limit` تعمل حتى على service-role): وضع القراءة فقط، قفل الفترات، حدّ الصرف اليومي.
- كل كتابة تُسجّل في `audit_log` بـ`actor_email='mcp:claude'` (تظهر بشاشة النشاط).
- Rate limit: 60 نداء أداة / 5 دقائق (جدول `rate_limits`، action `mcp_call`).
- الكتابات تُدرج بحالة `approved` (سلطة المالك — المفتاح مفتاح مالك).

## طرق الربط

1. **claude.ai / تطبيق Claude** (موصّل مخصّص — لا يدعم headers):
   `https://<project>.supabase.co/functions/v1/mcp-server?key=cpk_...`
2. **Claude Desktop** (الأفضل — المفتاح خارج الرابط) في `claude_desktop_config.json`:
   ```json
   {"mcpServers":{"contractor-pro":{"command":"npx","args":["mcp-remote","https://<project>.supabase.co/functions/v1/mcp-server","--header","Authorization: Bearer cpk_..."]}}}
   ```

## فحص يدوي سريع (curl)

```bash
URL="https://rvhjrzbhugvytvktdhor.supabase.co/functions/v1/mcp-server"
H='-H "Content-Type: application/json" -H "Authorization: Bearer cpk_..."'
# initialize → tools/list → نداء أداة
curl -s $H -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}' "$URL"
curl -s $H -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' "$URL"
curl -s $H -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_business_summary","arguments":{}}}' "$URL"
```

المتوقع: بلا مفتاح → 401 · خطة غير business ومنتهي التجربة → 403 رسالة ترقية · مفتاح ملغى → 401 · كتابة بشهر مقفول → خطأ عربي بلا صف.
