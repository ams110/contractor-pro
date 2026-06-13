-- فهارس على مفاتيح خارجية (FK) غير مفهرسة — تحسين أداء الـ JOIN والحذف المتتالي
-- وفلترة الصفوف حسب user_id/owner_id (أكثر الأنماط شيوعاً في التطبيق).
-- آمنة ورجوعية تماماً (DROP INDEX). IF NOT EXISTS للـ idempotency.
-- (طُبّقت على الإنتاج عبر Supabase MCP؛ هذا الملف للحفظ في نسخة الكود.)

CREATE INDEX IF NOT EXISTS idx_advances_employee_id                ON public.advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_user_id                    ON public.advances(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_entries_user_id             ON public.expense_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client_receipt_id          ON public.expenses(client_receipt_id);
CREATE INDEX IF NOT EXISTS idx_holidays_user_id                    ON public.holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id              ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_archive_user_id             ON public.invoice_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_material_logs_employee_id           ON public.material_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_material_logs_project_id            ON public.material_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id               ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id         ON public.passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_receipt_id          ON public.payments(client_receipt_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id                 ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_user_id               ON public.payroll_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id          ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_advances_user_id                ON public.tax_advances(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_advance_requests_employee_id ON public.worker_advance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_advance_requests_owner_id    ON public.worker_advance_requests(owner_id);
