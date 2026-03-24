# PRD: Course Database

**Module:** `course_db`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Golf scoring requires accurate course data: par per hole, stroke index (SI) per hole, yardage per tee, and WHS slope/course ratings per tee and gender combination. Without this data, handicap calculations are inaccurate and scorecards cannot be generated. Many golf courses have complex layouts -- Cumberwell Park, the pilot club, has 5 distinct 9-hole loops (Red, Yellow, Blue, Orange, White) that combine into 14 different 18-hole course combinations, each with its own USGA-certified slope and course ratings per tee colour and gender.

LX2 needs a course database that models this loop-combination structure, stores per-hole and per-tee data, and provides the scoring engine with the hole data (par, SI) and the handicap engine with the ratings data (slope, course rating) needed for accurate calculations.

## Goal

Store and serve course data with full support for multi-loop course layouts, per-tee yardages and WHS ratings, and per-combination handicap data, seeded with verified Cumberwell Park data as the pilot.

## Users

- **Primary:** Event creation flow (select course and tee combination), scoring engine (hole data), handicap engine (ratings)
- **Secondary:** Players browsing available courses, organisers setting up events at specific venues

## Core requirements

### Must have

- **Courses** table: name, club, location, holes count, par, slope/course rating (summary), verification flag
- **Course holes** table: per-hole par and stroke index for legacy flat courses
- **Course tees** table: per-tee yardages array, total yards, slope rating, course rating
- **Loops** table: 9-hole routing with name (Red, Yellow, Blue, Orange, White, Par 3)
- **Loop holes** table: per-hole par, SI (men), SI (women) within a loop
- **Loop hole tees** table: yardage per hole per tee colour
- **Course combinations** table: 18-hole combination of two loops (loop_1 + loop_2), with name, par, holes count
- **Combination tees** table: WHS slope and course rating per combination, per tee colour, per gender (m/w)
- Seed data for Cumberwell Park: all 5 loops (Red, Yellow, Blue, Orange, White) + Par 3 loop, all 14 18-hole combinations, USGA NCRDB-sourced ratings
- Client-side course data in `courses.ts` for offline-capable course picker (all 14 Cumberwell combinations with full hole data)
- `searchCourses()` and `getCourse()` utility functions
- RLS: reference data is SELECT-accessible to all authenticated users; writes restricted to service_role

### Should have

- Support for 9-hole-only events using a single loop
- Tee colour standardisation: Black (competition), Yellow (standard), Purple (mid/accessible), Red (forward)
- `defaultRatingTee` field so the UI knows which tee's ratings to display as the default badge
- Course verification workflow (admin marks a course as verified after checking against USGA NCRDB)
- Club association (courses linked to clubs via `club_id`)

### Won't have (this phase)

- Player-submitted course additions (admin-only via service_role)
- Course API integration (pulling from a third-party course database)
- GPS/satellite hole maps or flyover imagery
- Handicap-adjusted course difficulty visualisation
- Multi-country course database beyond pilot UK clubs

## Data model

### Table relationships

```
clubs
  |-- courses (club_id FK)
        |-- course_holes (par, SI per hole)
        |-- course_tees (yardages, ratings per tee)
        |-- loops (9-hole routings)
        |     |-- loop_holes (par, SI per hole in loop)
        |     |     |-- loop_hole_tees (yardage per tee colour)
        |     |-- course_combinations (pairs of loops)
        |           |-- combination_tees (WHS ratings per combo/tee/gender)
```

### Cumberwell Park seed data

| Loop | Holes | Notes |
|------|-------|-------|
| Red | 9 | Par 35 (4 par 4s, 2 par 3s, 2 par 4s, 1 par 5) |
| Yellow | 9 | Par 36 (1 par 5, 5 par 4s, 2 par 3s, 1 par 4) |
| Blue | 9 | Par 36 (1 par 5, 5 par 4s, 2 par 3s, 1 par 4) |
| Orange | 9 | Par 35 (5 par 4s, 2 par 3s, 1 par 5, 1 par 4) |
| White | 9 | Par 35 (1 par 5, 6 par 4s, 1 par 3) -- unique 9-hole loop |
| Par 3 | 9 | All par 3, no WHS ratings |

14 18-hole combinations: Red/Yellow, Yellow/Red, Blue/Orange, Orange/Blue, Red/Blue, Blue/Red, Blue/Yellow, Yellow/Blue, Orange/Yellow, Yellow/Orange, Red/Orange, Orange/Red, White/White (played twice), Par 3/Par 3 (played twice).

### Tee colour mapping

| LX2 colour | USGA designation | Purpose |
|------------|-----------------|---------|
| Black | Green | Competition/Medal (longest) |
| Yellow | White | Standard club play |
| Purple | Purple | Mid/accessible |
| Red | Black | Forward (shortest) |

### Client-side data

The `COURSES` array in `apps/web/src/lib/courses.ts` contains all 14 Cumberwell combinations with full per-hole data (par, SI, yards) for offline-capable scoring. This is sourced from `cumberwell_scorecards_v3.json` and cross-referenced with USGA NCRDB CourseIDs 22312-22317.

Important: the slope/course ratings in `courses.ts` reflect Yellow tees and are for display only. Handicap calculations must always fetch from `combination_tees` in the database to get the correct rating for the selected tee and gender.

## Open questions

- [ ] How to handle courses being added -- admin panel, or CSV import tool?
- [ ] Should we cache course data in the service worker for fully offline event creation?
- [ ] Do we need a "favourite courses" feature for players who regularly play the same venues?
- [ ] How to handle courses that change layout (e.g., temporary greens, course renovation)?

## Links

- Client data: `apps/web/src/lib/courses.ts`
- Schema: `packages/db/migrations/000_initial_schema.sql`
- Loop seed: `packages/db/migrations/golfer/003_golfer_seed_cumberwell_loops.sql`
- Combination tees: `packages/db/migrations/golfer/005_combination_tees.sql`
- RLS policies: `packages/db/migrations/001_rls_policies.sql`
- Related PRD: `docs/prd/handicap.md`
