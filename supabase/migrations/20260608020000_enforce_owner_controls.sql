-- =====================================================
-- المرحلة 2: فرض الضوابط التشغيلية للمالك على مستوى الخادم (triggers)
-- كانت تُفحص في الواجهة فقط (FinanceScreen) فيمكن تجاوزها باستعلام مباشر:
--   - وضع القراءة فقط (is_read_only)
--   - الفترات المقفلة (locked_periods) — منع تعديل أشهر ماضية
--   - حدّ الصرف اليومي (daily_spend_limit)
-- =====================================================

-- ─── ضابط: القراءة فقط + الفترة المقفلة (عام لأي جدول فيه user_id و date) ─────
CREATE OR REPLACE FUNCTION enforce_owner_controls()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_owner uuid;
  v_date  date;
  v_ro    boolean;
BEGIN
  v_owner := COALESCE((to_jsonb(NEW)->>'user_id'), (to_jsonb(OLD)->>'user_id'))::uuid;
  IF v_owner IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- وضع القراءة فقط
  SELECT is_read_only INTO v_ro FROM app_config WHERE owner_id = v_owner;
  IF COALESCE(v_ro, false) THEN
    RAISE EXCEPTION 'الحساب في وضع القراءة فقط — التعديلات معطّلة'
      USING ERRCODE = 'check_violation';
  END IF;

  -- الفترة المقفلة (حسب تاريخ السجل)
  v_date := NULLIF(COALESCE(to_jsonb(NEW)->>'date', to_jsonb(OLD)->>'date'), '')::date;
  IF v_date IS NOT NULL AND EXISTS (
    SELECT 1 FROM locked_periods
    WHERE owner_id = v_owner
      AND year  = EXTRACT(YEAR  FROM v_date)::int
      AND month = EXTRACT(MONTH FROM v_date)::int
  ) THEN
    RAISE EXCEPTION 'الفترة %/% مقفلة — لا يمكن إضافة أو تعديل سجلات فيها',
      EXTRACT(MONTH FROM v_date)::int, EXTRACT(YEAR FROM v_date)::int
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── ضابط: حدّ الصرف اليومي (مصاريف فقط، عند الإضافة) ────────────────────────
CREATE OR REPLACE FUNCTION enforce_daily_spend_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_limit numeric;
  v_today numeric;
BEGIN
  SELECT daily_spend_limit INTO v_limit FROM app_config WHERE owner_id = NEW.user_id;
  IF v_limit IS NOT NULL AND v_limit > 0 THEN
    SELECT COALESCE(sum(amount), 0) INTO v_today
    FROM expenses WHERE user_id = NEW.user_id AND date = NEW.date;
    IF v_today + COALESCE(NEW.amount, 0) > v_limit THEN
      RAISE EXCEPTION 'تجاوز حدّ الصرف اليومي (%₪)', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── ربط الـ triggers ────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses','work_days','payments','advances','client_receipts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_owner_controls ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_owner_controls BEFORE INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION enforce_owner_controls()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_daily_spend_limit ON expenses;
CREATE TRIGGER trg_daily_spend_limit BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION enforce_daily_spend_limit();
