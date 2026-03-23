-- ─────────────────────────────────────────────────────────────────────────────
-- 011_rls_write_policies.sql
--
-- Adds RLS write policies for the golfer app tables.
-- Without these the authenticated user (anon key + session) cannot insert
-- event_players, scorecards, or hole_scores from the browser / server actions.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── event_players ───────────────────────────────────────────────────────────
-- Allow the event organiser to add players to their own event.
create policy "Organisers can add event players" on public.event_players
  for insert with check (
    exists (
      select 1 from public.events
      where id = event_players.event_id
        and created_by = auth.uid()
    )
  );

-- ─── scorecards ──────────────────────────────────────────────────────────────
-- Allow the event organiser to create scorecards for their own event.
create policy "Organisers can create scorecards" on public.scorecards
  for insert with check (
    exists (
      select 1 from public.events
      where id = scorecards.event_id
        and created_by = auth.uid()
    )
  );

-- ─── hole_scores ─────────────────────────────────────────────────────────────
-- Allow a player to insert their own scores.
-- Traverses: hole_scores → scorecards → event_players (user_id = auth.uid())
create policy "Players can insert own hole scores" on public.hole_scores
  for insert with check (
    exists (
      select 1 from public.scorecards sc
      join public.event_players ep on ep.id = sc.event_player_id
      where sc.id = hole_scores.scorecard_id
        and ep.user_id = auth.uid()
    )
  );

-- Allow a player to update their own scores (upsert requires both INSERT + UPDATE).
create policy "Players can update own hole scores" on public.hole_scores
  for update using (
    exists (
      select 1 from public.scorecards sc
      join public.event_players ep on ep.id = sc.event_player_id
      where sc.id = hole_scores.scorecard_id
        and ep.user_id = auth.uid()
    )
  );

-- ─── users ───────────────────────────────────────────────────────────────────
-- Allow new users to create their own row (triggered on first sign-in upsert).
create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);
