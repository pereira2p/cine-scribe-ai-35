
-- background_jobs
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_jobs TO authenticated;
GRANT ALL ON public.background_jobs TO service_role;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs" ON public.background_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bg_jobs_touch BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS bg_jobs_user_status_idx ON public.background_jobs(user_id, status);

-- movie_assets
DO $$ BEGIN
  CREATE TYPE public.movie_asset_kind AS ENUM ('poster','backdrop','logo','banner','trailer','thumbnail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.movie_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.movie_asset_kind NOT NULL,
  url text NOT NULL,
  source text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_assets TO authenticated;
GRANT ALL ON public.movie_assets TO service_role;
ALTER TABLE public.movie_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own movie_assets" ON public.movie_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS movie_assets_movie_idx ON public.movie_assets(movie_id, kind);

-- smart_tags + movie_smart_tags
CREATE TABLE IF NOT EXISTS public.smart_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text
);
GRANT SELECT ON public.smart_tags TO authenticated, anon;
GRANT ALL ON public.smart_tags TO service_role;
ALTER TABLE public.smart_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read smart_tags" ON public.smart_tags FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.smart_tags (slug, label, emoji) VALUES
  ('mind-blowing','Mind-blowing','🤯'),
  ('plot-twist','Plot Twist','🌀'),
  ('oscar','Oscar','🏆'),
  ('cult','Cult','🎭'),
  ('feel-good','Feel Good','☀️'),
  ('cyberpunk','Cyberpunk','🤖'),
  ('espacial','Espacial','🚀'),
  ('viagem-no-tempo','Viagem no Tempo','⏳'),
  ('distopia','Distopia','🏚️'),
  ('slow-burn','Slow Burn','🕯️')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.movie_smart_tags (
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.smart_tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_smart_tags TO authenticated;
GRANT ALL ON public.movie_smart_tags TO service_role;
ALTER TABLE public.movie_smart_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own movie_smart_tags" ON public.movie_smart_tags FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_feed TO authenticated;
GRANT ALL ON public.activity_feed TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity_feed" ON public.activity_feed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS activity_feed_user_created_idx ON public.activity_feed(user_id, created_at DESC);

-- watch_parties
CREATE TABLE IF NOT EXISTS public.watch_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid REFERENCES public.movies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;
GRANT ALL ON public.watch_parties TO service_role;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "host manages party" ON public.watch_parties FOR ALL TO authenticated
  USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);

-- offline_downloads
CREATE TABLE IF NOT EXISTS public.offline_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  quality text NOT NULL DEFAULT 'original',
  status text NOT NULL DEFAULT 'queued',
  bytes bigint NOT NULL DEFAULT 0,
  total_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_downloads TO authenticated;
GRANT ALL ON public.offline_downloads TO service_role;
ALTER TABLE public.offline_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own offline_downloads" ON public.offline_downloads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER offline_downloads_touch BEFORE UPDATE ON public.offline_downloads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
