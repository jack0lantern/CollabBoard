-- Add 'frame' to allowed shape types and frame-specific columns

ALTER TABLE board_objects
  DROP CONSTRAINT IF EXISTS board_objects_type_check;

ALTER TABLE board_objects
  ADD CONSTRAINT board_objects_type_check
  CHECK (type IN ('sticky', 'rect', 'circle', 'line', 'frame'));

ALTER TABLE board_objects
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS frame_color TEXT;
