-- ─────────────────────────────────────────────────────────────────────────────
-- 013_user_search_policy.sql
--
-- Adds an RLS policy allowing authenticated users to read other users'
-- display_name and handicap_index — required for the playing partner search
-- in the new round wizard (searchUsers server action).
--
-- Without this, the existing SELECT policy ("Users can read own profile") only
-- allows auth.uid() = id, so any search query returns 0 rows for other users.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'users'
      and policyname = 'Authenticated users can search other users'
  ) then
    execute $policy$
      create policy "Authenticated users can search other users"
        on public.users for select
        using (auth.uid() is not null)
    $policy$;
  end if;
end $$;
