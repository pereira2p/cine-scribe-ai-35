
-- =============== ENUMS ===============
create type public.app_role as enum ('admin', 'user');
create type public.storage_provider as enum ('tmdb_only','r2','gdrive','onedrive','local');
create type public.credit_role as enum ('cast','director','writer','producer');

-- =============== ROLES (security definer pattern) ===============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- =============== PROFILES (account) ===============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles self read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles self upsert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);

-- viewer profiles (multi-profile per account, Netflix-style)
create table public.viewer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  avatar_color text not null default '#e50914',
  is_kids boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.viewer_profiles(user_id);
grant select, insert, update, delete on public.viewer_profiles to authenticated;
grant all on public.viewer_profiles to service_role;
alter table public.viewer_profiles enable row level security;
create policy "Viewer profiles owner" on public.viewer_profiles for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== MOVIES ===============
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer,
  imdb_id text,
  title text not null,
  original_title text,
  overview text,
  tagline text,
  release_date date,
  release_year integer,
  runtime_minutes integer,
  original_language text,
  origin_country text,
  poster_path text,
  backdrop_path text,
  trailer_key text,
  vote_average numeric(3,1),
  vote_count integer,
  popularity numeric,
  status text,
  -- storage
  storage_provider public.storage_provider not null default 'tmdb_only',
  storage_key text,
  file_hash text,
  file_size_bytes bigint,
  video_codec text,
  audio_codec text,
  resolution text,
  -- meta
  is_archived boolean not null default false,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tmdb_id)
);
create index on public.movies(user_id);
create index on public.movies(user_id, added_at desc);
create index on public.movies(user_id, vote_average desc);
grant select, insert, update, delete on public.movies to authenticated;
grant all on public.movies to service_role;
alter table public.movies enable row level security;
create policy "Movies owner" on public.movies for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== GENRES ===============
create table public.genres (
  id integer primary key, -- tmdb genre id
  name text not null
);
grant select on public.genres to authenticated, anon;
grant all on public.genres to service_role;
alter table public.genres enable row level security;
create policy "Genres readable" on public.genres for select to authenticated, anon using (true);

create table public.movie_genres (
  movie_id uuid not null references public.movies(id) on delete cascade,
  genre_id integer not null references public.genres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(movie_id, genre_id)
);
create index on public.movie_genres(user_id);
create index on public.movie_genres(genre_id);
grant select, insert, update, delete on public.movie_genres to authenticated;
grant all on public.movie_genres to service_role;
alter table public.movie_genres enable row level security;
create policy "Movie genres owner" on public.movie_genres for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== PEOPLE & CREDITS ===============
create table public.people (
  id integer primary key, -- tmdb person id
  name text not null,
  profile_path text
);
grant select on public.people to authenticated;
grant all on public.people to service_role;
alter table public.people enable row level security;
create policy "People readable" on public.people for select to authenticated using (true);

create table public.movie_credits (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  person_id integer not null references public.people(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.credit_role not null,
  character_name text,
  job text,
  ord integer
);
create index on public.movie_credits(movie_id);
create index on public.movie_credits(user_id, role);
grant select, insert, update, delete on public.movie_credits to authenticated;
grant all on public.movie_credits to service_role;
alter table public.movie_credits enable row level security;
create policy "Credits owner" on public.movie_credits for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== COLLECTIONS ===============
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_collection_id integer,
  name text not null,
  description text,
  poster_path text,
  backdrop_path text,
  is_smart boolean not null default false,
  smart_rule jsonb,
  created_at timestamptz not null default now()
);
create index on public.collections(user_id);
grant select, insert, update, delete on public.collections to authenticated;
grant all on public.collections to service_role;
alter table public.collections enable row level security;
create policy "Collections owner" on public.collections for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.collection_movies (
  collection_id uuid not null references public.collections(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key(collection_id, movie_id)
);
grant select, insert, update, delete on public.collection_movies to authenticated;
grant all on public.collection_movies to service_role;
alter table public.collection_movies enable row level security;
create policy "Collection movies owner" on public.collection_movies for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== FAVORITES ===============
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  viewer_profile_id uuid references public.viewer_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, movie_id, viewer_profile_id)
);
grant select, insert, update, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "Favorites owner" on public.favorites for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== WATCHLISTS (custom lists) ===============
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viewer_profile_id uuid references public.viewer_profiles(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.watchlists(user_id);
grant select, insert, update, delete on public.watchlists to authenticated;
grant all on public.watchlists to service_role;
alter table public.watchlists enable row level security;
create policy "Watchlists owner" on public.watchlists for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.watchlist_movies (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key(watchlist_id, movie_id)
);
grant select, insert, update, delete on public.watchlist_movies to authenticated;
grant all on public.watchlist_movies to service_role;
alter table public.watchlist_movies enable row level security;
create policy "Watchlist movies owner" on public.watchlist_movies for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== HISTORY ===============
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viewer_profile_id uuid references public.viewer_profiles(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  last_position_seconds integer not null default 0,
  duration_seconds integer,
  completed boolean not null default false,
  device text,
  watched_at timestamptz not null default now()
);
create index on public.watch_history(user_id, watched_at desc);
create index on public.watch_history(user_id, movie_id);
grant select, insert, update, delete on public.watch_history to authenticated;
grant all on public.watch_history to service_role;
alter table public.watch_history enable row level security;
create policy "History owner" on public.watch_history for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== USER SETTINGS ===============
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  language text not null default 'pt-BR',
  default_quality text not null default 'auto',
  default_subtitle text,
  default_playback_speed numeric(3,2) not null default 1.0,
  autoplay_next boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "Settings owner" on public.user_settings for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- =============== TRIGGERS ===============
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_movies_touch before update on public.movies for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Auto create profile + default viewer profile + role + settings on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.viewer_profiles (user_id, name, is_default)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), true);

  insert into public.watchlists (user_id, name, is_default, description)
  values (new.id, 'Minha Lista', true, 'Filmes para assistir depois');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Seed TMDB genres (standard list)
insert into public.genres(id,name) values
(28,'Ação'),(12,'Aventura'),(16,'Animação'),(35,'Comédia'),(80,'Crime'),
(99,'Documentário'),(18,'Drama'),(10751,'Família'),(14,'Fantasia'),(36,'História'),
(27,'Terror'),(10402,'Música'),(9648,'Mistério'),(10749,'Romance'),(878,'Ficção Científica'),
(10770,'Cinema TV'),(53,'Thriller'),(10752,'Guerra'),(37,'Faroeste')
on conflict (id) do update set name = excluded.name;
