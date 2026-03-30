-- ═══════════════════════════════════════════════════════════════════════════════
-- 012: Fix RLS policies — scope anonymous-accessible policies to authenticated
-- ═══════════════════════════════════════════════════════════════════════════════

-- event_groups_select was missing TO authenticated, allowing anon access to
-- group/tee-time data. Scope it to authenticated users only.
DROP POLICY IF EXISTS "event_groups_select" ON event_groups;
CREATE POLICY "event_groups_select" ON event_groups
  FOR SELECT TO authenticated USING (true);
