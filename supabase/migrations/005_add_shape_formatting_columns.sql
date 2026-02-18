-- Add shape formatting columns for Miro-like persistence
-- Font (sticky notes), stroke/border, arrows (lines)

ALTER TABLE board_objects
  ADD COLUMN IF NOT EXISTS font_family TEXT,
  ADD COLUMN IF NOT EXISTS font_size INTEGER,
  ADD COLUMN IF NOT EXISTS font_weight TEXT,
  ADD COLUMN IF NOT EXISTS font_style TEXT,
  ADD COLUMN IF NOT EXISTS text_color TEXT,
  ADD COLUMN IF NOT EXISTS stroke_color TEXT,
  ADD COLUMN IF NOT EXISTS stroke_width INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrow_start BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS arrow_end BOOLEAN DEFAULT FALSE;
