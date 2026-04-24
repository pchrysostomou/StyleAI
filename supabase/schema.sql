-- ============================================================
-- StyleAI — W1 Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── Body Profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  body_type     TEXT,
  height_estimate TEXT,
  skin_tone     TEXT,
  hair_color    TEXT,
  recommended_fits TEXT[],
  avoid_styles  TEXT[],
  best_colors   TEXT[],
  style_notes   TEXT,
  photo_front   TEXT,
  photo_side    TEXT,
  photo_back    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE body_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON body_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON body_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON body_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON body_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_body_profiles_updated_at
  BEFORE UPDATE ON body_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Storage Bucket ──────────────────────────────────────────
-- Run this separately or via Supabase Dashboard → Storage → New bucket
-- Bucket name: body-photos
-- Public: false (private)

-- Storage RLS (if you want to add via SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('body-photos', 'body-photos', false);

-- CREATE POLICY "Users upload own photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users read own photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
