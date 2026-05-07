-- =====================================================
-- Phase 1 Migration: Multi-tenant Organizations
-- Run in Supabase > SQL Editor
-- Safe to re-run (idempotent)
-- =====================================================

-- ─── 1. organizations ────────────────────────────────────────────────────────
-- Each owner/contractor has one organization. Expandable to multi-org later.
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL DEFAULT '',
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. user_organizations ───────────────────────────────────────────────────
-- Join table: one user ↔ one org for now; schema supports multi-org expansion.
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner'
               CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, org_id)
);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- organizations: members can SELECT; only owner can mutate
DROP POLICY IF EXISTS "org_select"       ON organizations;
DROP POLICY IF EXISTS "org_owner_insert" ON organizations;
DROP POLICY IF EXISTS "org_owner_update" ON organizations;
DROP POLICY IF EXISTS "org_owner_delete" ON organizations;

CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid() AND org_id = organizations.id
    )
  );

CREATE POLICY "org_owner_insert" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_owner_update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "org_owner_delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- user_organizations: each user manages their own rows
DROP POLICY IF EXISTS "uorg_self" ON user_organizations;

CREATE POLICY "uorg_self" ON user_organizations
  FOR ALL USING (user_id = auth.uid());

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON organizations      (owner_id);
CREATE INDEX IF NOT EXISTS idx_uorgs_user ON user_organizations (user_id);
CREATE INDEX IF NOT EXISTS idx_uorgs_org  ON user_organizations (org_id);

-- ─── 5. updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON organizations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── 6. Auto-create org + profile on new user signup ─────────────────────────
-- Fires after every auth.users INSERT (i.e., every new registration)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(NEW.email, '@', 1),
    'مقاول'
  );

  -- Create profile (ignore if exists from a manual insert)
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, display_name)
  ON CONFLICT (id) DO NOTHING;

  -- Create organization
  INSERT INTO organizations (name, owner_id, trial_ends_at)
  VALUES (display_name, NEW.id, now() + INTERVAL '14 days')
  RETURNING id INTO new_org_id;

  -- Link user → org as owner
  INSERT INTO user_organizations (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 7. Backfill existing users (idempotent) ─────────────────────────────────
-- Assigns an organization to every existing user who doesn't have one yet.
DO $$
DECLARE
  u           RECORD;
  new_org_id  UUID;
  display_name TEXT;
BEGIN
  FOR u IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT DISTINCT owner_id FROM organizations)
  LOOP
    display_name := COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(u.email, '@', 1),
      'مقاول'
    );

    -- Ensure profile exists
    INSERT INTO profiles (id, full_name)
    VALUES (u.id, display_name)
    ON CONFLICT (id) DO NOTHING;

    -- Create org
    INSERT INTO organizations (name, owner_id, trial_ends_at)
    VALUES (display_name, u.id, now() + INTERVAL '14 days')
    RETURNING id INTO new_org_id;

    -- Link
    INSERT INTO user_organizations (user_id, org_id, role)
    VALUES (u.id, new_org_id, 'owner')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- For users who already have an org but are missing the user_organizations row
  INSERT INTO user_organizations (user_id, org_id, role)
  SELECT o.owner_id, o.id, 'owner'
  FROM organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = o.owner_id AND uo.org_id = o.id
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── 8. Helper RPC: get current user's organization ──────────────────────────
CREATE OR REPLACE FUNCTION get_my_organization()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT row_to_json(r) INTO result FROM (
    SELECT
      o.id,
      o.name,
      o.owner_id,
      o.plan,
      o.trial_ends_at,
      o.created_at,
      uo.role
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.org_id
    WHERE uo.user_id = auth.uid()
    LIMIT 1
  ) r;

  RETURN result;
END;
$$;

-- ─── 9. Reload schema cache ───────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
