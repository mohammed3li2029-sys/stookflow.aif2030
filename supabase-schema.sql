-- ============================================================================
-- StockFlow — Supabase Schema
-- ============================================================================
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run any time (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
--
-- Each table stores one row per item, with the full item as a JSONB blob
-- in the `data` column. This mirrors the original in-app data shape
-- exactly, so no business logic in js/app.js had to change.
-- ============================================================================

create table if not exists inventory (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists warehouses (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists material_requests (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists quotations (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Single-row table: always exactly one row with id = 'profile'.
create table if not exists profile (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Staff directory. Deliberately does NOT store passwords — see
-- js/app.js's syncUsers() for why.
create table if not exists users (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every write, for every table above.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['inventory','warehouses','material_requests','projects','quotations','purchase_orders','profile','users']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I;', t, t);
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security: only signed-in users (via Supabase Auth) may read
-- or write. This matches the app's current permission model (all logged-in
-- staff share full access). Tighten later with a `role` column if needed.
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['inventory','warehouses','material_requests','projects','quotations','purchase_orders','profile','users']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "Authenticated read/write %s" on %I;', t, t);
    execute format(
      'create policy "Authenticated read/write %s" on %I for all using (auth.role() = %L) with check (auth.role() = %L);',
      t, t, 'authenticated', 'authenticated'
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Realtime: add every table to Supabase's realtime publication so that
-- js/app.js's live-update feature (subscribeToTable) actually receives
-- change events. Safe to re-run — skips tables already added.
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['inventory','warehouses','material_requests','projects','quotations','purchase_orders','profile','users']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Storage: a public bucket for uploaded files (inventory item photos,
-- profile pictures, quote attachments, project documents). Storing these
-- as files instead of base64 text inside the JSONB `data` columns above
-- keeps the database small and pages loading fast as usage grows.
-- Safe to re-run — skips creation if the bucket/policies already exist.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('stockflow-files', 'stockflow-files', true)
on conflict (id) do nothing;

drop policy if exists "Public read stockflow-files" on storage.objects;
create policy "Public read stockflow-files"
  on storage.objects for select
  using (bucket_id = 'stockflow-files');

drop policy if exists "Authenticated upload stockflow-files" on storage.objects;
create policy "Authenticated upload stockflow-files"
  on storage.objects for insert
  with check (bucket_id = 'stockflow-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated update stockflow-files" on storage.objects;
create policy "Authenticated update stockflow-files"
  on storage.objects for update
  using (bucket_id = 'stockflow-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete stockflow-files" on storage.objects;
create policy "Authenticated delete stockflow-files"
  on storage.objects for delete
  using (bucket_id = 'stockflow-files' and auth.role() = 'authenticated');
