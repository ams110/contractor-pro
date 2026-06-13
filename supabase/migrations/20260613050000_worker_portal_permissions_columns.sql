-- صلاحيات بوّابة العامل لكل عامل + مفتاح تفعيل/إيقاف الوصول.
-- can_submit_expenses / can_request_payment موجودان مسبقاً في جدول employees.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS can_submit_workday boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_log_materials  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_access_portal  boolean NOT NULL DEFAULT true;
