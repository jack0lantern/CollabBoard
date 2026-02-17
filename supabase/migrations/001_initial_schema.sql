-- CollabBoard: Supabase schema migration from Firebase
-- Auth: Supabase Auth. Presence: Firebase RTDB (not in Supabase).
-- Run in Supabase SQL Editor or via: supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFILES (maps to Firestore `profiles` collection)
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. BOARDS (maps to Firestore `boards` collection)
-- =============================================================================
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT 'Untitled Board',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_snapshot JSONB,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  -- shared_with: { "email@example.com": "editor" | "viewer" }
  shared_with JSONB NOT NULL DEFAULT '{}'
);

-- Index for listing boards by owner (replaces Firestore composite index)
CREATE INDEX idx_boards_owner_created ON boards(owner_id, created_at DESC);

-- =============================================================================
-- 3. BOARD_OBJECTS (maps to Firestore `boards/{id}/objects` subcollection)
-- =============================================================================
CREATE TABLE board_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sticky', 'rect', 'circle', 'line')),
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  radius DOUBLE PRECISION,
  radius_x DOUBLE PRECISION,
  radius_y DOUBLE PRECISION,
  points DOUBLE PRECISION[],
  color TEXT,
  text TEXT,
  rotation DOUBLE PRECISION DEFAULT 0,
  -- Extra shape-specific data (flexible)
  meta JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For real-time: subscribe to changes by board_id
CREATE INDEX idx_board_objects_board ON board_objects(board_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- Presence stays in Firebase RTDB; no presence table here.
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_objects ENABLE ROW LEVEL SECURITY;

-- Helper: user has access to board (owner, public, or shared by email)
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

-- Profiles: users can read/update own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Boards: create (as owner), read (if access), update/delete (owner only)
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

-- Board objects: read/write if user has board access
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

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER board_objects_updated_at
  BEFORE UPDATE ON board_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 6. REALTIME (board_objects + boards; presence stays in Firebase RTDB)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE board_objects;
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER TABLE board_objects REPLICA IDENTITY FULL;
ALTER TABLE boards REPLICA IDENTITY FULL;

-- =============================================================================
-- 7. AUTO-CREATE PROFILE (on signup)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
