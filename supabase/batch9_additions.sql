-- Batch 9 additions
-- Run in Supabase SQL Editor (safe to re-run, all idempotent)

-- #88: Employee ID number (ת.ז) field
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS id_number TEXT;

-- #89: Contractor license number in profile
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contractor_number TEXT;

-- #18: Worker advance requests table
CREATE TABLE IF NOT EXISTS worker_advance_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for worker_advance_requests
ALTER TABLE worker_advance_requests ENABLE ROW LEVEL SECURITY;

-- Owner can see and manage all advance requests for their employees
DROP POLICY IF EXISTS "owner_manage_advance_requests" ON worker_advance_requests;
CREATE POLICY "owner_manage_advance_requests" ON worker_advance_requests
  FOR ALL USING (owner_id = auth.uid());

-- Worker portal RPC: request advance
CREATE OR REPLACE FUNCTION worker_request_advance(
  p_emp_id  UUID,
  p_token   TEXT,
  p_amount  NUMERIC,
  p_notes   TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Validate token
  SELECT owner_id INTO v_owner_id
  FROM employees
  WHERE id = p_emp_id
    AND worker_token = p_token
    AND worker_token IS NOT NULL;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  IF p_amount <= 0 OR p_amount > 999999 THEN
    RETURN jsonb_build_object('error', 'مبلغ غير صالح');
  END IF;

  -- Check pending advance requests (max 1 pending)
  IF (SELECT COUNT(*) FROM worker_advance_requests
        WHERE employee_id = p_emp_id AND status = 'pending') >= 1 THEN
    RETURN jsonb_build_object('error', 'لديك طلب سلفة معلق — انتظر موافقة المشرف أولاً');
  END IF;

  INSERT INTO worker_advance_requests (owner_id, employee_id, amount, notes)
  VALUES (v_owner_id, p_emp_id, p_amount, p_notes);

  RETURN jsonb_build_object('ok', true);
END;
$$;
