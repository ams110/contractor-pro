-- إضافة حقل تقييد المشاريع لأعضاء الفريق
-- NULL = يرى كل المشاريع، UUID[] = يرى هذه المشاريع فقط

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS allowed_project_ids UUID[] DEFAULT NULL;

-- إعادة بناء update_team_member_perms مع المعامل الجديد
DROP FUNCTION IF EXISTS update_team_member_perms(uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean);

CREATE OR REPLACE FUNCTION update_team_member_perms(
  p_id                  UUID,
  p_can_view_projects   BOOLEAN,
  p_can_edit_projects   BOOLEAN,
  p_can_view_workers    BOOLEAN,
  p_can_edit_workers    BOOLEAN,
  p_can_view_expenses   BOOLEAN,
  p_can_add_expenses    BOOLEAN,
  p_can_view_payments   BOOLEAN,
  p_can_add_payments    BOOLEAN,
  p_can_delete          BOOLEAN,
  p_can_manage_team     BOOLEAN,
  p_can_view_amounts    BOOLEAN,
  p_can_view_activity   BOOLEAN,
  p_allowed_project_ids UUID[] DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM team_members WHERE id = p_id;
  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RETURN json_build_object('error', 'غير مصرح');
  END IF;

  UPDATE team_members SET
    can_view_projects   = p_can_view_projects,
    can_edit_projects   = p_can_edit_projects,
    can_view_workers    = p_can_view_workers,
    can_edit_workers    = p_can_edit_workers,
    can_view_expenses   = p_can_view_expenses,
    can_add_expenses    = p_can_add_expenses,
    can_view_payments   = p_can_view_payments,
    can_add_payments    = p_can_add_payments,
    can_delete          = p_can_delete,
    can_manage_team     = p_can_manage_team,
    can_view_amounts    = p_can_view_amounts,
    can_view_activity   = p_can_view_activity,
    allowed_project_ids = p_allowed_project_ids
  WHERE id = p_id AND owner_id = auth.uid();

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_team_member_perms(
  UUID,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,
  BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,UUID[]
) TO authenticated;
