-- ============================================================================
-- StockFlow — Supabase Schema
-- ============================================================================
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run.
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

-- Keep updated_at current on every write.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_updated_at on inventory;
create trigger trg_inventory_updated_at
  before update on inventory
  for each row execute function set_updated_at();

drop trigger if exists trg_warehouses_updated_at on warehouses;
create trigger trg_warehouses_updated_at
  before update on warehouses
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security: only signed-in users (via Supabase Auth) may read
-- or write. This matches the app's current permission model (all logged-in
-- staff share full access). Tighten later with a `role` column if needed.
-- ----------------------------------------------------------------------------

alter table inventory enable row level security;
alter table warehouses enable row level security;

drop policy if exists "Authenticated read/write inventory" on inventory;
create policy "Authenticated read/write inventory"
  on inventory for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated read/write warehouses" on warehouses;
create policy "Authenticated read/write warehouses"
  on warehouses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
