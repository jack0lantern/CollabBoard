-- CollabBoard: Add first_name / last_name to profiles; allow anonymous board access
-- Run in Supabase SQL Editor or via: supabase db push

-- =============================================================================
-- 1. ADD first_name AND last_name TO PROFILES
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- =============================================================================
-- 2. UPDATE AUTO-CREATE PROFILE TRIGGER
--    Extract first_name / last_name from user_metadata set during signUp.
--    For Google OAuth, also checks given_name / family_name.
-- =============================================================================
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

-- =============================================================================
-- 3. ANONYMOUS ACCESS — allow the `anon` role to read/write boards and objects
--    This enables unauthenticated users to view and edit any board by URL.
-- =============================================================================

-- Boards: anon can read any board (link-sharing model)
CREATE POLICY "Anon can read any board" ON boards
  FOR SELECT TO anon USING (true);

-- Board objects: anon can CRUD on any board
CREATE POLICY "Anon can read board objects" ON board_objects
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert board objects" ON board_objects
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update board objects" ON board_objects
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can delete board objects" ON board_objects
  FOR DELETE TO anon USING (true);
