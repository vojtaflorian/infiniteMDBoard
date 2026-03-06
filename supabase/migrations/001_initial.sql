-- infiniteMDBoard: initial schema + RLS
-- Shared multi-app tables (filtered by app_id)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id      text NOT NULL DEFAULT 'infiniteMDBoard',
  name        text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id         text NOT NULL DEFAULT 'infiniteMDBoard',
  gemini_api_key text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_app
  ON projects (user_id, app_id);

CREATE INDEX IF NOT EXISTS idx_projects_share_token
  ON projects (share_token)
  WHERE share_token IS NOT NULL;

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Projects: owner can do everything
CREATE POLICY projects_owner_select ON projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY projects_owner_insert ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_owner_update ON projects
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_owner_delete ON projects
  FOR DELETE USING (user_id = auth.uid());

-- Projects: anyone can read shared projects (share_token is set)
CREATE POLICY projects_shared_read ON projects
  FOR SELECT USING (share_token IS NOT NULL);

-- User profiles: owner only
CREATE POLICY profiles_owner_all ON user_profiles
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
