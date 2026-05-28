-- ════════════════════════════════════════════════════════════════════════════
-- Unified Entry Foundation
-- ════════════════════════════════════════════════════════════════════════════
-- Phase 1 من خطة توحيد إدخال القبضات والمصاريف من شاشة المحاسبة.
--
-- الأهداف:
--   1. توسيع set_ref_number() ليدعم projects, payroll_slips, invoice_archive,
--      income_entries, expense_entries (PRJ-/PRL-/INV-/INC-/EXE-).
--   2. إضافة عمود is_general إلى expenses لتمييز "المصروف العام للمصلحة"
--      عن "السجلات اللي محتاجة تصنيف".
--   3. CHECK constraint: كل مصروف جديد لازم يربط بمشروع أو يتعلّم كـ "عام"
--      بقرار صريح من المستخدم. NOT VALID — السجلات الحالية لا تُفحص
--      (لأنها فعلاً كلها مربوطة بمشاريع).
--
-- الملاحظات:
--   - client_receipts.project_id بالفعل NOT NULL في DB — لا نحتاج تغيير.
--   - كل السجلات الحالية (32 قبضة، 21 مصروف، 46 دفعة) عندها business_id
--     و ref_number. لا backfill مطلوب.
--   - السجلات اللي project_id IS NULL فيها payments (سجل واحد فقط) ستظهر
--     في شاشة "مراجعة السجلات غير المصنفة" في Phase لاحقة.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. توسيع set_ref_number ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_ref_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE prefix TEXT;
BEGIN
  IF NEW.ref_number IS NOT NULL AND NEW.ref_number <> '' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'payments'        THEN prefix := 'PAY';
    WHEN 'advances'        THEN prefix := 'ADV';
    WHEN 'expenses'        THEN prefix := 'EXP';
    WHEN 'client_receipts' THEN prefix := 'RCP';
    WHEN 'projects'        THEN prefix := 'PRJ';
    WHEN 'payroll_slips'   THEN prefix := 'PRL';
    WHEN 'invoice_archive' THEN prefix := 'INV';
    WHEN 'income_entries'  THEN prefix := 'INC';
    WHEN 'expense_entries' THEN prefix := 'EXE';
    ELSE prefix := 'TXN';
  END CASE;

  NEW.ref_number := next_ref_number(NEW.user_id, prefix);
  RETURN NEW;
END;
$$;


-- ─── 2. is_general column على expenses ──────────────────────────────────────
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_general boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.expenses.is_general IS
  'true = مصروف عام على المصلحة كلها (بدون مشروع) — قرار صريح من المستخدم.';


-- ─── 3. CHECK constraint للسجلات الجديدة ────────────────────────────────────
-- مصروف جديد لازم يربط بمشروع OR يكون is_general = true.
-- NOT VALID لأن السجلات الحالية كلها مربوطة (لا حاجة لفحصها).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenses_project_or_general_chk'
      AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_project_or_general_chk
      CHECK (project_id IS NOT NULL OR is_general = true)
      NOT VALID;
  END IF;
END $$;


-- ─── 4. Triggers للترقيم على الجداول الجديدة (إذا مش موجودة) ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_payroll_slips_ref'
      AND tgrelid = 'public.payroll_slips'::regclass
  ) THEN
    CREATE TRIGGER trg_payroll_slips_ref
      BEFORE INSERT ON public.payroll_slips
      FOR EACH ROW EXECUTE FUNCTION public.set_ref_number();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_invoice_archive_ref'
      AND tgrelid = 'public.invoice_archive'::regclass
  ) THEN
    CREATE TRIGGER trg_invoice_archive_ref
      BEFORE INSERT ON public.invoice_archive
      FOR EACH ROW EXECUTE FUNCTION public.set_ref_number();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_income_entries_ref'
      AND tgrelid = 'public.income_entries'::regclass
  ) THEN
    CREATE TRIGGER trg_income_entries_ref
      BEFORE INSERT ON public.income_entries
      FOR EACH ROW EXECUTE FUNCTION public.set_ref_number();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_expense_entries_ref'
      AND tgrelid = 'public.expense_entries'::regclass
  ) THEN
    CREATE TRIGGER trg_expense_entries_ref
      BEFORE INSERT ON public.expense_entries
      FOR EACH ROW EXECUTE FUNCTION public.set_ref_number();
  END IF;
END $$;


-- ─── 5. التحقق من وجود ref_number column في الجداول الجديدة ─────────────────
ALTER TABLE public.payroll_slips
  ADD COLUMN IF NOT EXISTS ref_number text;

ALTER TABLE public.invoice_archive
  ADD COLUMN IF NOT EXISTS ref_number text;

ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS ref_number text;

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS ref_number text;


-- ─── 6. Indexes لتسريع شاشة "مراجعة السجلات غير المصنفة" ────────────────────
-- سيستخدم في Phase لاحقة لعرض السجلات اللي محتاجة قرار من المستخدم.
CREATE INDEX IF NOT EXISTS idx_expenses_triage
  ON public.expenses (user_id, business_id)
  WHERE project_id IS NULL AND is_general = false;

CREATE INDEX IF NOT EXISTS idx_payments_no_project
  ON public.payments (user_id)
  WHERE project_id IS NULL;
