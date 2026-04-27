-- Batch 11 additions
-- Run in Supabase SQL Editor (safe to re-run, all idempotent)

-- #53: Worker notes/description field
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
