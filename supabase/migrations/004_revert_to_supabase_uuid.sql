-- Migration: Revert profiles.id and boards.owner_id from TEXT back to UUID
-- *** Only run this if migration 003_firebase_uid.sql was previously applied. ***
-- Restores FK references to auth.users and recreates RLS policies for Supabase Auth.

BEGIN;

-- ============================================================================
-- 1. DROP existing RLS policies (they use ::TEXT casts from migration 003)
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Users can read boards they have access to" ON boards;
DROP POLICY IF EXISTS "Owners can update boards" ON boards;
DROP POLICY IF EXISTS "Owners can delete boards" ON boards;
DROP POLICY IF EXISTS "Users with board access can read objects" ON board_objects;
DROP POLICY IF EXISTS "Users with board access can insert objects" ON board_objects;
DROP POLICY IF EXISTS "Users with board access can update objects" ON board_objects;
DROP POLICY IF EXISTS "Users with board access can delete objects" ON board_objects;

-- ============================================================================
-- 2. DROP the TEXT-based has_board_access function
-- ============================================================================
DROP FUNCTION IF EXISTS has_board_access(boards, TEXT) CASCADE;

-- ============================================================================
-- 3. Revert profiles.id from TEXT → UUID, restore FK to auth.users
-- ============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE profiles ADD PRIMARY KEY (id);
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 4. Revert boards.owner_id from TEXT → UUID, restore FK to auth.users
-- ============================================================================
ALTER TABLE boards ALTER COLUMN owner_id TYPE UUID USING owner_id::UUID;
ALTER TABLE boards ADD CONSTRAINT boards_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Recreate has_board_access with UUID-based auth.uid()
-- ============================================================================
CREATE OR REPLACE FUNCTION has_board_access(board_row boards, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    board_row.owner_id = auth.uid() OR
    board_row.is_public = TRUE OR
    (user_email IS NOT NULL AND board_row.shared_with ? user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Recreate all RLS policies (UUID-based, no TEXT casts)
-- ============================================================================

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Boards (authenticated)
CREATE POLICY "Users can create boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can read boards they have access to" ON boards
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND has_board_access(boards, (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Owners can update boards" ON boards
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete boards" ON boards
  FOR DELETE USING (auth.uid() = owner_id);

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

-- ============================================================================
-- 7. Restore the handle_new_user trigger (dropped by 003)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
