-- جدول السلف (salary advances)
CREATE TABLE IF NOT EXISTS advances (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees  NOT NULL,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_advances" ON advances
  FOR ALL USING (auth.uid() = user_id);

-- RPC: يتحقق من رصيد السلف لعامل معين
CREATE OR REPLACE FUNCTION get_worker_advances(emp_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         a.id,
          'amount',     a.amount,
          'date',       a.date,
          'notes',      a.notes,
          'created_at', a.created_at
        )
      )
      FROM (
        SELECT * FROM advances
        WHERE employee_id = emp_id
        ORDER BY date DESC
      ) a
    ),
    '[]'::JSONB
  )
$$;
