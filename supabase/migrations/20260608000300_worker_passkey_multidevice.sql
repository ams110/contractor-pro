-- =====================================================
-- دعم عدّة أجهزة لبصمة العامل
-- البصمة مربوطة فيزيائياً بكل جهاز، فالعامل يحتاج بصمة منفصلة لكل جهاز.
-- نسمح بعدّة صفوف لكل عامل، ونجعل الإلغاء يستهدف جهازاً واحداً (credential_id)
-- بدل مسح كل الأجهزة.
-- (إيقاف المسح الشامل عند التسجيل تمّ في edge function worker-webauthn-register-verify)
-- =====================================================

-- استبدال الدالة بإصدار يقبل credential_id اختياري (إلغاء جهاز واحد)
DROP FUNCTION IF EXISTS worker_remove_passkey(UUID, TEXT);

CREATE OR REPLACE FUNCTION worker_remove_passkey(p_emp_id UUID, p_token TEXT, p_credential_id TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_remaining INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_emp_id AND worker_session_token = p_token) THEN
    RETURN json_build_object('error', 'جلسة منتهية، أعد تسجيل الدخول');
  END IF;

  IF p_credential_id IS NOT NULL THEN
    -- إلغاء بصمة هذا الجهاز فقط
    DELETE FROM worker_passkey_credentials
    WHERE employee_id = p_emp_id AND credential_id = p_credential_id;
  ELSE
    -- توافق خلفي: إلغاء كل بصمات العامل
    DELETE FROM worker_passkey_credentials WHERE employee_id = p_emp_id;
  END IF;

  SELECT count(*) INTO v_remaining FROM worker_passkey_credentials WHERE employee_id = p_emp_id;

  PERFORM log_worker_activity(
    (SELECT user_id FROM employees WHERE id = p_emp_id), p_emp_id,
    (SELECT name FROM employees WHERE id = p_emp_id),
    'disable_passkey', 'auth', NULL,
    json_build_object('remaining', v_remaining)::jsonb);

  RETURN json_build_object('success', true, 'remaining', v_remaining);
END;
$$;

REVOKE EXECUTE ON FUNCTION worker_remove_passkey(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION worker_remove_passkey(UUID, TEXT, TEXT) TO anon, authenticated;
