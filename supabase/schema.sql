-- ================================================
-- FitTrack — Supabase Schema
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ================================================

-- ─── EXTENSIONS ───────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nombre      text,
  edad        smallint check (edad between 10 and 120),
  altura      numeric(5,1) check (altura between 50 and 300),
  objetivo    text check (objetivo in ('perdida_grasa','ganancia_muscular','recomposicion','mantenimiento')),
  nivel       text check (nivel in ('principiante','intermedio','avanzado')),
  created_at  timestamptz not null default now(),
  constraint profiles_user_id_unique unique (user_id)
);

-- ─── CHECKINS ─────────────────────────────────────
create table if not exists public.checkins (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  mes         smallint not null check (mes between 1 and 12),
  anio         smallint not null check (anio between 2000 and 2099),
  peso        numeric(5,2),
  cintura     numeric(5,1),
  abdomen     numeric(5,1),
  gluteos     numeric(5,1),
  muslos      numeric(5,1),
  brazos      numeric(5,1),
  espalda     numeric(5,1),
  notas       text,
  created_at  timestamptz not null default now(),
  constraint checkins_user_mes_anio_unique unique (user_id, mes, anio)
);

-- ─── CHECKIN FOTOS ────────────────────────────────
create table if not exists public.checkin_fotos (
  id          uuid primary key default uuid_generate_v4(),
  checkin_id  uuid not null references public.checkins(id) on delete cascade,
  url         text not null,
  tipo        text not null check (tipo in ('frente','perfil','espalda','extra')),
  created_at  timestamptz not null default now()
);

-- ─── INDEXES ──────────────────────────────────────
create index if not exists idx_checkins_user_id      on public.checkins(user_id);
create index if not exists idx_checkins_user_fecha   on public.checkins(user_id, anio, mes);
create index if not exists idx_checkin_fotos_checkin on public.checkin_fotos(checkin_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────
alter table public.profiles      enable row level security;
alter table public.checkins      enable row level security;
alter table public.checkin_fotos enable row level security;

-- profiles: cada user solo ve/edita los suyos
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = user_id);
create policy "profiles_delete" on public.profiles
  for delete using (auth.uid() = user_id);

-- checkins
drop policy if exists "checkins_select" on public.checkins;
drop policy if exists "checkins_insert" on public.checkins;
drop policy if exists "checkins_update" on public.checkins;
drop policy if exists "checkins_delete" on public.checkins;

create policy "checkins_select" on public.checkins
  for select using (auth.uid() = user_id);
create policy "checkins_insert" on public.checkins
  for insert with check (auth.uid() = user_id);
create policy "checkins_update" on public.checkins
  for update using (auth.uid() = user_id);
create policy "checkins_delete" on public.checkins
  for delete using (auth.uid() = user_id);

-- checkin_fotos: a través de la relación con checkins
drop policy if exists "fotos_select" on public.checkin_fotos;
drop policy if exists "fotos_insert" on public.checkin_fotos;
drop policy if exists "fotos_delete" on public.checkin_fotos;

create policy "fotos_select" on public.checkin_fotos
  for select using (
    exists (
      select 1 from public.checkins
      where checkins.id = checkin_fotos.checkin_id
        and checkins.user_id = auth.uid()
    )
  );
create policy "fotos_insert" on public.checkin_fotos
  for insert with check (
    exists (
      select 1 from public.checkins
      where checkins.id = checkin_fotos.checkin_id
        and checkins.user_id = auth.uid()
    )
  );
create policy "fotos_delete" on public.checkin_fotos
  for delete using (
    exists (
      select 1 from public.checkins
      where checkins.id = checkin_fotos.checkin_id
        and checkins.user_id = auth.uid()
    )
  );

-- ─── STORAGE ──────────────────────────────────────
-- Crear el bucket en Supabase Dashboard > Storage > New bucket
-- Nombre: checkin-fotos  |  Public: true

-- Policies de storage (ejecutar en SQL Editor):
insert into storage.buckets (id, name, public)
values ('checkin-fotos', 'checkin-fotos', true)
on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
drop policy if exists "storage_insert" on storage.objects;
drop policy if exists "storage_delete" on storage.objects;

create policy "storage_select" on storage.objects
  for select using (bucket_id = 'checkin-fotos');

create policy "storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'checkin-fotos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage_delete" on storage.objects
  for delete using (
    bucket_id = 'checkin-fotos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── AUTO-CREATE PROFILE ON SIGNUP ────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
