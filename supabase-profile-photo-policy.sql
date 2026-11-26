-- Run this once in the Supabase SQL Editor.
-- It lets each signed-in staff member save their own name/initials/photo only.
-- They cannot change another user, their own role, permissions, or department.

drop policy if exists "Staff update own profile" on public.users;
create policy "Staff update own profile" on public.users for update
  using (
    public.is_staff()
    and lower(coalesce(data ->> 'email', '')) = lower(coalesce(auth.email(), ''))
  )
  with check (
    public.is_staff()
    and lower(coalesce(data ->> 'email', '')) = lower(coalesce(auth.email(), ''))
  );

create or replace function public.enforce_own_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_root() then return new; end if;

  if lower(coalesce(old.data ->> 'email', '')) <> lower(coalesce(auth.email(), ''))
     or lower(coalesce(new.data ->> 'email', '')) <> lower(coalesce(auth.email(), '')) then
    raise exception 'You can only update your own profile';
  end if;

  if (new.data - 'name' - 'init' - 'image')
     is distinct from
     (old.data - 'name' - 'init' - 'image') then
    raise exception 'Only personal profile fields may be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_own_profile_update on public.users;
create trigger trg_enforce_own_profile_update
before update on public.users
for each row execute function public.enforce_own_profile_update();
