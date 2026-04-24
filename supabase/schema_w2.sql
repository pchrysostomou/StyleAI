-- ============================================================
-- StyleAI — W2 Schema Extension
-- Add to existing Supabase project (run after W1 schema)
-- ============================================================

-- ─── Wardrobe Items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wardrobe_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  type          TEXT,                    -- shirt, pants, shoes, jacket, dress, ...
  color         TEXT,                    -- primary color
  secondary_colors TEXT[],
  style         TEXT,                    -- casual, formal, sporty, smart-casual
  season        TEXT[],                  -- spring, summer, autumn, winter
  pattern       TEXT,                    -- solid, striped, checked, floral, ...
  material_estimate TEXT,               -- cotton, denim, wool, ...
  tags          TEXT[],                  -- basics, statement, layering, ...
  times_worn    INTEGER DEFAULT 0,
  last_worn     DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wardrobe"
  ON wardrobe_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wardrobe items"
  ON wardrobe_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wardrobe items"
  ON wardrobe_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wardrobe items"
  ON wardrobe_items FOR DELETE
  USING (auth.uid() = user_id);
