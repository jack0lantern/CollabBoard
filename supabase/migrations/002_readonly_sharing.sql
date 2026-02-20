-- Add read-only public sharing for boards
-- When is_public_readonly is true, anyone with the link can view but not edit

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS is_public_readonly BOOLEAN NOT NULL DEFAULT FALSE;

-- Update has_board_access so authenticated users can read readonly boards
CREATE OR REPLACE FUNCTION has_board_access(board_row boards, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    board_row.owner_id = auth.uid() OR
    board_row.is_public = TRUE OR
    board_row.is_public_readonly = TRUE OR
    (user_email IS NOT NULL AND board_row.shared_with ? user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict anon access: only allow read when board is explicitly shared
DROP POLICY IF EXISTS "Anon can read any board" ON boards;
DROP POLICY IF EXISTS "Anon can read board objects" ON board_objects;
DROP POLICY IF EXISTS "Anon can insert board objects" ON board_objects;
DROP POLICY IF EXISTS "Anon can update board objects" ON board_objects;
DROP POLICY IF EXISTS "Anon can delete board objects" ON board_objects;

-- Anon can read boards only when is_public or is_public_readonly
CREATE POLICY "Anon can read public or readonly boards" ON boards
  FOR SELECT TO anon USING (is_public = TRUE OR is_public_readonly = TRUE);

-- Anon can read board_objects only when parent board is public or readonly
CREATE POLICY "Anon can read objects of public or readonly boards" ON board_objects
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_objects.board_id
      AND (b.is_public = TRUE OR b.is_public_readonly = TRUE)
    )
  );

-- Anon can write board_objects only when parent board is public (edit), NOT readonly
CREATE POLICY "Anon can insert objects on public boards" ON board_objects
  FOR INSERT TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_objects.board_id
      AND b.is_public = TRUE
    )
  );

CREATE POLICY "Anon can update objects on public boards" ON board_objects
  FOR UPDATE TO anon USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_objects.board_id
      AND b.is_public = TRUE
    )
  );

CREATE POLICY "Anon can delete objects on public boards" ON board_objects
  FOR DELETE TO anon USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_objects.board_id
      AND b.is_public = TRUE
    )
  );
