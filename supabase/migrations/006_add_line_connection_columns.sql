-- Add line connection columns for snapped endpoints
-- Stores { objectId, pointIndex } when a line endpoint is snapped to another shape

ALTER TABLE board_objects
  ADD COLUMN IF NOT EXISTS line_start_connection JSONB,
  ADD COLUMN IF NOT EXISTS line_end_connection JSONB;
