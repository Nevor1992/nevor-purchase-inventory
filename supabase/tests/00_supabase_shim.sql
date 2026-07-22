-- Minimal Supabase environment shim for local migration/RLS validation.
-- Mirrors what a real Supabase project provides before user migrations run.

do $$ begin
  begin create role anon nologin; exception when duplicate_object then null; end;
  begin create role authenticated nologin; exception when duplicate_object then null; end;
  begin create role service_role nologin bypassrls; exception when duplicate_object then null; end;
end $$;

create schema auth;

-- auth.users: minimal shape used by the app's trigger (id, email, raw_user_meta_data)
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  raw_user_meta_data jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Exact semantics of Supabase's auth.uid(): sub claim of the request JWT
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- storage schema (Supabase provides it): minimal storage.objects for storage RLS tests
create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

-- Supabase grants schema/table access broadly; RLS is the gate.
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
