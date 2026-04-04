-- Tighten event_groups SELECT: only event organiser or participants can read groups
-- Previously qual was `true` which exposed group composition to any authenticated user
DROP POLICY IF EXISTS "event_groups_select" ON public.event_groups;

CREATE POLICY "event_groups_select" ON public.event_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_groups.event_id
        AND events.created_by = auth.uid()
    )
    OR is_event_participant(event_id, auth.uid())
  );
