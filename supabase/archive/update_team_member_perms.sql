-- =====================================================
-- RPC: تحديث صلاحيات عضو الفريق
-- شغّل هذا الملف في Supabase > SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION update_team_member_perms(
  p_id                UUID,
  p_can_view_projects BOOLEAN,
  p_can_edit_projects BOOLEAN,
  p_can_view_workers  BOOLEAN,
  p_can_edit_workers  BOOLEAN,
  p_can_view_expenses BOOLEAN,
  p_can_add_expenses  BOOLEAN,
  p_can_view_payments BOOLEAN,
  p_can_add_payments  BOOLEAN,
  p_can_delete        BOOLEAN,
  p_can_manage_team   BOOLEAN,
  p_can_view_amounts  BOOLEAN,
  p_can_view_activity BOOLEAN
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{"error":"غير مصرح"}'::json; END IF;

  UPDATE team_members SET
    can_view_projects = p_can_view_projects,
    can_edit_projects = p_can_edit_projects,
    can_view_workers  = p_can_view_workers,
    can_edit_workers  = p_can_edit_workers,
    can_view_expenses = p_can_view_expenses,
    can_add_expenses  = p_can_add_expenses,
    can_view_payments = p_can_view_payments,
    can_add_payments  = p_can_add_payments,
    can_delete        = p_can_delete,
    can_manage_team   = p_can_manage_team,
    can_view_amounts  = p_can_view_amounts,
    can_view_activity = p_can_view_activity
  WHERE id = p_id AND owner_id = auth.uid();

  IF NOT FOUND THEN RETURN '{"error":"العضو غير موجود أو ليس لديك صلاحية"}'::json; END IF;

  RETURN '{"success":true}'::json;
END;
$$;
