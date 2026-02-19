-- Add 'text' to allowed shape types

ALTER TABLE board_objects
  DROP CONSTRAINT IF EXISTS board_objects_type_check;

ALTER TABLE board_objects
  ADD CONSTRAINT board_objects_type_check
  CHECK (type IN ('sticky', 'rect', 'circle', 'line', 'frame', 'text'));
