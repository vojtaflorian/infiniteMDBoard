-- Fix: project IDs are nanoid strings, not UUIDs

-- Drop dependent objects
DROP POLICY IF EXISTS projects_owner_select ON projects;
DROP POLICY IF EXISTS projects_owner_insert ON projects;
DROP POLICY IF EXISTS projects_owner_update ON projects;
DROP POLICY IF EXISTS projects_owner_delete ON projects;
DROP POLICY IF EXISTS projects_shared_read ON projects;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
DROP INDEX IF EXISTS idx_projects_user_app;
DROP INDEX IF EXISTS idx_projects_share_token;

-- Change column type
ALTER TABLE projects ALTER COLUMN id TYPE text;

-- Recreate indexes
CREATE INDEX idx_projects_user_app ON projects (user_id, app_id);
CREATE INDEX idx_projects_share_token ON projects (share_token) WHERE share_token IS NOT NULL;

-- Recreate trigger
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recreate RLS policies
CREATE POLICY projects_owner_select ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY projects_owner_insert ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY projects_owner_update ON projects FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY projects_owner_delete ON projects FOR DELETE USING (user_id = auth.uid());
CREATE POLICY projects_shared_read ON projects FOR SELECT USING (share_token IS NOT NULL);
