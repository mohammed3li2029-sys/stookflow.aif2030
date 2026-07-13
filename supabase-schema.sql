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
