-- Batch 12 additions
-- Run in Supabase SQL Editor (safe to re-run, all idempotent)

-- نوع العامل للحساب الضريبي الإسرائيلي
-- القيم: 'israeli' | 'foreign_res' | 'foreign_non' | 'palestinian' | 'self'
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS worker_tax_type TEXT DEFAULT 'self';
