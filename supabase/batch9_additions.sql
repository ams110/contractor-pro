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
  emp employees%ROWTYPE;
BEGIN
  SELECT * INTO emp FROM employees
  WHERE id = p_emp_id
    AND worker_session_token = p_token
    AND worker_session_token IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  IF p_amount <= 0 OR p_amount > 999999 THEN
    RETURN jsonb_build_object('error', 'مبلغ غير صالح');
  END IF;

  IF (SELECT COUNT(*) FROM worker_advance_requests
        WHERE employee_id = p_emp_id AND status = 'pending') >= 1 THEN
    RETURN jsonb_build_object('error', 'لديك طلب سلفة معلق — انتظر موافقة المشرف أولاً');
  END IF;

  INSERT INTO worker_advance_requests (owner_id, employee_id, amount, notes)
  VALUES (emp.user_id, p_emp_id, p_amount, p_notes);

  INSERT INTO notifications (user_id, title, body, type)
  VALUES (
    emp.user_id,
    'طلب سلفة جديد',
    emp.name || ' يطلب سلفة ' || p_amount || '₪' ||
      CASE WHEN p_notes <> '' THEN ' • ' || p_notes ELSE '' END,
    'pending_advance'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;
