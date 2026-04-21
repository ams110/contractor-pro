-- جدول السلف (salary advances)
CREATE TABLE IF NOT EXISTS advances (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  employee_id UUID REFERENCES employees  NOT NULL,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_advances" ON advances
  FOR ALL USING (auth.uid() = user_id);

-- RPC: يتحقق من رصيد السلف لعامل معين (مشابه لاستعلام العامل في بوابة العمال)
CREATE OR REPLACE FUNCTION get_worker_advances(emp_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         a.id,
        'amount',     a.amount,
        'date',       a.date,
        'notes',      a.notes,
        'created_at', a.created_at
      ) ORDER BY a.date DESC
    ), '[]'::JSONB
  ) INTO result
  FROM advances a
  WHERE a.employee_id = emp_id;

  RETURN result;
END;
$$;
