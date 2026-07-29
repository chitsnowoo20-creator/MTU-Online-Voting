-- Stand-ins for the pieces Supabase provides. TEST HARNESS ONLY — this file is
-- never part of a migration and must never be applied to a Supabase database.
--
-- Use it only when running the suite against a plain Postgres (no Docker, so no
-- `supabase start`):
--
--   initdb -D /tmp/pg && pg_ctl -D /tmp/pg -o "-p 55432" start
--   createdb -p 55432 evoting
--   psql -p 55432 -d evoting -f supabase/tests/_standalone_shim.sql
--   for f in supabase/migrations/*.sql; do psql -p 55432 -d evoting -v ON_ERROR_STOP=1 -f "$f"; done
--   psql -p 55432 -d evoting -v ON_ERROR_STOP=1 -f supabase/tests/invariants.test.sql
--
-- Against a real local stack the schemas below already exist and this file is
-- unnecessary — run the migrations and then the test file.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
create schema storage;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- The suite sets `test.uid`; on Supabase this comes out of the JWT claims.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
