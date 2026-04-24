-- ============================================================
-- StyleAI — W3 Schema Extension
-- Run after W1 + W2 schemas
-- ============================================================

-- ─── Outfit History ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outfit_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_ids    UUID[],            -- array of wardrobe_item ids
  occasion    TEXT,              -- casual, work, sport, formal, event
  weather     JSONB,             -- { temp, condition, icon }
  reasoning   TEXT,              -- why Claude chose this combination
  style_tip   TEXT,              -- one quick tip
  rating      INTEGER,           -- 1-5 user rating (nullable)
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE outfit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfit history"
  ON outfit_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outfits"
  ON outfit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits"
  ON outfit_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits"
  ON outfit_history FOR DELETE
  USING (auth.uid() = user_id);
