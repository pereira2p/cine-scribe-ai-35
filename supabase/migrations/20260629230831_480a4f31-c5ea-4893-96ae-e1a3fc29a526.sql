
-- Enrichment status enum
DO $$ BEGIN
  CREATE TYPE public.enrichment_status AS ENUM ('pending','partial','complete','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Movies enrichment columns
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS enrichment_status public.enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS budget bigint,
  ADD COLUMN IF NOT EXISTS revenue bigint,
  ADD COLUMN IF NOT EXISTS certification text,
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS spoken_languages text[],
  ADD COLUMN IF NOT EXISTS tmdb_keywords text[];

-- Add 'thumbnail' to movie_asset_kind enum if missing
DO $$ BEGIN
  ALTER TYPE public.movie_asset_kind ADD VALUE IF NOT EXISTS 'thumbnail';
EXCEPTION WHEN others THEN NULL; END $$;

-- Seed smart tag vocabulary (idempotent on slug)
INSERT INTO public.smart_tags (slug, label, emoji) VALUES
  ('cult','Cult','🎭'),
  ('mind-blowing','Mind-blowing','🤯'),
  ('cyberpunk','Cyberpunk','🤖'),
  ('oscar','Oscar','🏆'),
  ('slow-burn','Slow Burn','🔥'),
  ('plot-twist','Plot Twist','🔄'),
  ('espacial','Espacial','🚀'),
  ('viagem-no-tempo','Viagem no Tempo','⏳'),
  ('heist','Heist','💰'),
  ('noir','Noir','🕶️'),
  ('coming-of-age','Coming-of-Age','🌱'),
  ('tear-jerker','Tear-jerker','😭'),
  ('feel-good','Feel-good','☀️'),
  ('body-horror','Body Horror','🩸'),
  ('found-footage','Found Footage','📼')
ON CONFLICT (slug) DO NOTHING;
