-- Migration: Switch from Supabase Auth UUIDs to Firebase Auth UIDs (TEXT)
-- Firebase UIDs are strings like "abc123xyz", not UUIDs.
-- When using Firebase as a third-party auth provider, auth.uid() returns the
-- Firebase UID from the JWT `sub` claim.
--
-- Postgres refuses ALTER COLUMN TYPE when RLS policies depend on the column,
-- so we must drop all policies / functions first, alter, then recreate.

BEGIN;

-- ============================================================================
-- 1. DROP the auto-create-profile trigger (fires on auth.users INSERT;
--    Firebase Auth doesn't insert into auth.users)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- 2. DROP has_board_access (CASCADE drops all policies that reference it)
-- ============================================================================
DROP FUNCTION IF EXISTS has_board_access(boards, TEXT) CASCADE;

-- ============================================================================
-- 3. DROP remaining policies on profiles (they compare auth.uid() = id)
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- ============================================================================
-- 4. DROP remaining policies on boards that reference owner_id directly
-- ============================================================================
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Owners can update boards" ON boards;
DROP POLICY IF EXISTS "Owners can delete boards" ON boards;
-- Anon policies (from migration 002) don't reference owner_id, keep them

-- ============================================================================
-- 5. DROP FK constraints referencing auth.users
-- ============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE boards   DROP CONSTRAINT IF EXISTS boards_owner_id_fkey;

-- ============================================================================
-- 6. ALTER column types from UUID → TEXT
-- ============================================================================
ALTER TABLE profiles ALTER COLUMN id       TYPE TEXT USING id::TEXT;
ALTER TABLE profiles ADD PRIMARY KEY (id);

ALTER TABLE boards   ALTER COLUMN owner_id TYPE TEXT USING owner_id::TEXT;

-- ============================================================================
-- 7. ADD first_name / last_name if missing (may exist from migration 002)
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- ============================================================================
-- 8. RECREATE has_board_access helper
-- ============================================================================
CREATE OR REPLACE FUNCTION has_board_access(board_row boards, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    board_row.owner_id = auth.uid()::TEXT OR
    board_row.is_public = TRUE OR
    (user_email IS NOT NULL AND board_row.shared_with ? user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. RECREATE all RLS policies
-- ============================================================================

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid()::TEXT = id);

-- Boards (authenticated)
CREATE POLICY "Users can create boards" ON boards
  FOR INSERT WITH CHECK (auth.uid()::TEXT = owner_id);

CREATE POLICY "Users can read boards they have access to" ON boards
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND has_board_access(boards, (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Owners can update boards" ON boards
  FOR UPDATE USING (auth.uid()::TEXT = owner_id);

CREATE POLICY "Owners can delete boards" ON boards
  FOR DELETE USING (auth.uid()::TEXT = owner_id);

-- Board objects (authenticated)
CREATE POLICY "Users with board access can read objects" ON board_objects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND has_board_access(
      (SELECT b FROM boards b WHERE b.id = board_objects.board_id),
      (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users with board access can insert objects" ON board_objects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND has_board_access(
      (SELECT b FROM boards b WHERE b.id = board_objects.board_id),
      (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users with board access can update objects" ON board_objects
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND has_board_access(
      (SELECT b FROM boards b WHERE b.id = board_objects.board_id),
      (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users with board access can delete objects" ON board_objects
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND has_board_access(
      (SELECT b FROM boards b WHERE b.id = board_objects.board_id),
      (auth.jwt() ->> 'email')
    )
  );

COMMIT;
