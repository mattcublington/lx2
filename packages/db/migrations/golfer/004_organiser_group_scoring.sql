-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/004_organiser_group_scoring.sql
--
-- Allows the event organiser to insert/update hole_scores for any scorecard
-- in their event — enables one person to keep score for the whole group from
-- a single device (guest players have user_id = null so can't score themselves).
--
-- Safe to re-run: uses CREATE POLICY IF NOT EXISTS (Postgres 15+) pattern via
-- DO block checking pg_policies.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'hole_scores'
      and policyname = 'Organisers can insert hole scores for their event'
  ) then
    execute $pol$
      create policy "Organisers can insert hole scores for their event"
        on public.hole_scores for insert
        with check (
          exists (
            select 1 from public.scorecards sc
            join public.events ev on ev.id = sc.event_id
            where sc.id = hole_scores.scorecard_id
              and ev.created_by = auth.uid()
          )
        )
    $pol$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'hole_scores'
      and policyname = 'Organisers can update hole scores for their event'
  ) then
    execute $pol$
      create policy "Organisers can update hole scores for their event"
        on public.hole_scores for update
        using (
          exists (
            select 1 from public.scorecards sc
            join public.events ev on ev.id = sc.event_id
            where sc.id = hole_scores.scorecard_id
              and ev.created_by = auth.uid()
          )
        )
    $pol$;
  end if;

end $$;
