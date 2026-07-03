-- تشديد: دالتا الإحالة/السجل الداخليتان ليستا API للعملاء
-- (نفس سابقة harden_worker_activity_grants — أدوات داخلية تعمل داخل
--  SECURITY DEFINER أو كـtrigger، لا تُستدعى من anon/authenticated).
-- مصدر الملاحظة: get_advisors (security) بعد تطبيق migrations 20260703.
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_owner_workday_change() FROM PUBLIC, anon, authenticated;
