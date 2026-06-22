
-- 1) Extend movies with playback/file metadata (idempotent)
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- 2) Upload status enum
DO $$ BEGIN
  CREATE TYPE public.upload_status AS ENUM ('pending','uploading','completed','failed','aborted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Uploads table
CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid REFERENCES public.movies(id) ON DELETE SET NULL,
  filename text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_provider text NOT NULL DEFAULT 'r2',
  storage_key text NOT NULL,
  status public.upload_status NOT NULL DEFAULT 'pending',
  bytes_uploaded bigint NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own uploads" ON public.uploads;
CREATE POLICY "Users manage own uploads" ON public.uploads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS uploads_touch_updated_at ON public.uploads;
CREATE TRIGGER uploads_touch_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS uploads_user_status_idx ON public.uploads(user_id, status);
CREATE INDEX IF NOT EXISTS uploads_movie_idx ON public.uploads(movie_id);
