-- Seed: Cumberwell Park
-- Run ONCE in dev/staging. Production seed should be run manually.

insert into clubs (id, name, slug, address)
values (
  '00000000-0000-0000-0000-000000000001',
  'Cumberwell Park',
  'cumberwell-park',
  'Bradford-on-Avon, Wiltshire, BA15 2PQ'
) on conflict (slug) do nothing;

insert into course_loops (club_id, name, holes, par, colour_hex, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Red',    9, 35, '#DC2626', 1),
  ('00000000-0000-0000-0000-000000000001', 'Yellow', 9, 35, '#CA8A04', 2),
  ('00000000-0000-0000-0000-000000000001', 'Blue',   9, 35, '#2563EB', 3),
  ('00000000-0000-0000-0000-000000000001', 'Orange', 9, 35, '#EA580C', 4),
  ('00000000-0000-0000-0000-000000000001', 'Par 3',  9, 27, '#16A34A', 5)
on conflict do nothing;
