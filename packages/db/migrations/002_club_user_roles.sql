-- club_user_roles — which users are staff at which club, and in what role
create table if not exists club_user_roles (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'secretary', 'bar_staff', 'pro_shop')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id, role)
);

alter table club_user_roles enable row level security;

-- A user can read their own roles
create policy "club_user_roles_own_read" on club_user_roles
  for select using (auth.uid() = user_id);

-- A club admin can read all roles for their club
create policy "club_user_roles_admin_read" on club_user_roles
  for select using (
    exists (
      select 1 from club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- A club admin can insert roles for their club
-- NOTE: First admin must be inserted via Supabase SQL Editor (bypasses RLS),
-- because the policy requires an existing admin row to authorise the insert.
create policy "club_user_roles_admin_write" on club_user_roles
  for insert with check (
    exists (
      select 1 from club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- Helper function: is the current user a staff member of a given club?
create or replace function is_club_staff(p_club_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from club_user_roles
    where club_id = p_club_id and user_id = auth.uid()
  );
$$;

-- Helper function: does the current user have a specific role?
create or replace function has_club_role(p_club_id uuid, p_role text)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from club_user_roles
    where club_id = p_club_id and user_id = auth.uid() and role = p_role
  );
$$;
