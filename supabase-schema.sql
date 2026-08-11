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

create table if not exists tasks (
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
  foreach t in array array['inventory','warehouses','material_requests','projects','quotations','purchase_orders','profile','users','tasks']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I;', t, t);
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security (strict): data is ONLY accessible to people who are on
-- the staff list (present in the `users` table) or on the root admins list.
-- A bare Supabase Auth account that isn't in `users` can do nothing — this
-- is the defence against open signups: even if someone creates an account,
-- they get zero rows.
--
-- Staff list management (INSERT/UPDATE/DELETE on `users`) is reserved for
-- root admins, so nobody can grant themselves a higher role.
-- ----------------------------------------------------------------------------

-- Root administrators. Set the emails of the people who own the system here.
create table if not exists root_admins (
  email text primary key,
  note text default ''
);
insert into root_admins (email, note)
values ('taha@abuduhair.com.sa', 'System owner'),
       ('mohammed3li.2029@gmail.com', 'System owner')
on conflict (email) do nothing;

-- Seed every root admin into the staff directory (the `users` table) so the
-- owner is a full admin AND a "staff" member from the very first login.
-- Without this, RLS would block the owner from reading any data until they
-- manually added themselves — and doing that from the app would then prune
-- the existing staff rows. Only inserts the row if it doesn't already exist,
-- and never overwrites an existing staff record.
insert into users (id, data)
select ra.email,
       jsonb_build_object(
         'name', split_part(ra.email, '@', 1),
         'email', ra.email,
         'role', 'admin',
         'dept', 'Management',
         'deptAr', 'الإدارة',
         'init', upper(left(split_part(ra.email, '@', 1), 2)),
         'permissions', '["dashboard","inventory","warehouses","sales","purchasing","issues","movements","reports","projects","tasks","users","notifications","settings"]'::jsonb
       )
from root_admins ra
where not exists (select 1 from users u where u.id = ra.email)
on conflict (id) do nothing;

-- True when the signed-in user has a row in the staff directory.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where lower(data ->> 'email') = lower(coalesce(auth.email(), ''))
  );
$$;

-- True when the signed-in user is on the root admins list.
create or replace function public.is_root()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.root_admins
    where lower(email) = lower(coalesce(auth.email(), ''))
  );
$$;

-- True when the signed-in user may access the given app section. Admins and
-- root admins always have access; every other staff member must have the
-- section key in their `permissions` array (data -> 'permissions'). Legacy
-- staff rows created before per-employee sections keep full access (the old
-- "any staff reads everything" behaviour) until an admin opens their record
-- and saves a section list — from that point RLS enforces the chosen list.
create or replace function public.has_perm(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where lower(data ->> 'email') = lower(coalesce(auth.email(), ''))
      and (
        data ->> 'role' = 'admin'
        or ((data -> 'permissions') ? perm)
        or not (data ? 'permissions')
      )
  ) or public.is_root();
$$;

-- Per-section access: each business table is gated by the matching section
-- key so a staff member who isn't allowed to see a section can neither read
-- nor write its rows (this is real enforcement — the sidebar hiding alone is
-- cosmetic). Section keys: inventory, warehouses, issues (material_requests),
-- projects, sales (quotations), purchasing (purchase_orders), tasks.
do $$
declare
  r record;
begin
  for r in select * from (values
    ('inventory'::text, 'inventory'::text),
    ('warehouses'::text, 'warehouses'::text),
    ('material_requests'::text, 'issues'::text),
    ('projects'::text, 'projects'::text),
    ('quotations'::text, 'sales'::text),
    ('purchase_orders'::text, 'purchasing'::text),
    ('tasks'::text, 'tasks'::text)
  ) as m(tbl, section)
  loop
    execute format('alter table %I enable row level security;', r.tbl);
    execute format('drop policy if exists "Authenticated read/write %s" on %I;', r.tbl, r.tbl);
    execute format('drop policy if exists "Staff read/write %s" on %I;', r.tbl, r.tbl);
    execute format(
      'create policy "Staff read/write %s" on %I for all using (public.is_staff() and public.has_perm(%L)) with check (public.is_staff() and public.has_perm(%L));',
      r.tbl, r.tbl, r.section, r.section
    );
  end loop;
end $$;

-- profile is a single shared row; only registered staff may touch it.
alter table profile enable row level security;
drop policy if exists "Authenticated read/write profile" on profile;
drop policy if exists "Staff read/write profile" on profile;
create policy "Staff read/write profile" on profile for all
  using (public.is_staff()) with check (public.is_staff());

-- Staff directory: any staff member may read it, but only root admins may
-- add / edit / remove staff. This is what blocks role self-escalation.
alter table users enable row level security;
drop policy if exists "Authenticated read/write users" on users;
drop policy if exists "Staff read users" on users;
drop policy if exists "Root write users" on users;
create policy "Staff read users" on users for select
  using (public.is_staff());
create policy "Root write users" on users for all
  using (public.is_root()) with check (public.is_root());

-- The root admins list itself is only visible to root admins.
alter table root_admins enable row level security;
drop policy if exists "Root read root_admins" on root_admins;
create policy "Root read root_admins" on root_admins for select
  using (public.is_root());


-- ----------------------------------------------------------------------------
-- Realtime: add every table to Supabase's realtime publication so that
-- js/app.js's live-update feature (subscribeToTable) actually receives
-- change events. Safe to re-run — skips tables already added.
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['inventory','warehouses','material_requests','projects','quotations','purchase_orders','profile','users','tasks']
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
drop policy if exists "Staff upload stockflow-files" on storage.objects;
create policy "Staff upload stockflow-files"
  on storage.objects for insert
  with check (bucket_id = 'stockflow-files' and public.is_staff());

drop policy if exists "Authenticated update stockflow-files" on storage.objects;
drop policy if exists "Staff update stockflow-files" on storage.objects;
create policy "Staff update stockflow-files"
  on storage.objects for update
  using (bucket_id = 'stockflow-files' and public.is_staff());

drop policy if exists "Authenticated delete stockflow-files" on storage.objects;
drop policy if exists "Staff delete stockflow-files" on storage.objects;
create policy "Staff delete stockflow-files"
  on storage.objects for delete
  using (bucket_id = 'stockflow-files' and public.is_staff());
