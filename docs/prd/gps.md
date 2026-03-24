# PRD: GPS Yardage

**Module:** `gps`
**Phase:** Future
**Status:** Planned
**Last updated:** March 2026

---

## Problem

On-course yardage information is essential for shot selection. Golfers currently rely on physical yardage markers (150-yard posts, sprinkler heads), expensive handheld GPS devices (Garmin, Bushnell), or dedicated GPS apps (Hole19, Golfshot). None of these integrate with the scoring flow — a golfer using LX2 for scoring still needs a separate device or app for yardage.

Bringing GPS into LX2 means the player stays in one app for everything during their round: yardage, scoring, and leaderboard — reducing phone juggling on the course.

## Goal

Provide real-time GPS distances to the green (front, middle, back) on every hole, integrated into the LX2 scoring experience. Optionally show hole flyovers and hazard distances.

## Users

- **Primary:** The golfer on the course who wants yardage to the green before their next shot
- **Secondary:** A player new to a course who wants to see the hole layout
- **Tertiary:** Caddies or playing partners checking distances on behalf of the group

## Core requirements

### Must have

- **Distance display on score entry screen:**
  - Distance to front of green (yards)
  - Distance to middle of green (yards)
  - Distance to back of green (yards)
  - Auto-updates as player walks (GPS polling interval: 3-5 seconds)
  - Large, high-contrast numbers readable in bright sunlight
  - Unit toggle: yards / metres (default yards for UK, persistent preference)

- **Geolocation:**
  - Uses browser Geolocation API (`navigator.geolocation.watchPosition`)
  - Requires HTTPS (PWA or production deployment)
  - Permission prompt on first use with clear explanation
  - Graceful degradation: if denied, hide GPS section, scoring still works
  - Battery-efficient: reduce polling frequency when screen is off

- **Course mapping data:**
  - Green coordinates: front, centre, back (latitude, longitude) per hole
  - Stored per course/loop in database
  - Distance calculated using Haversine formula (spherical distance)
  - Accuracy: within 2-3 yards of dedicated GPS devices

- **Hole detection:**
  - Auto-detect which hole the player is on based on proximity to tee boxes
  - Override: manual hole selection always available
  - Sync with score entry: when GPS detects hole 7, score entry shows hole 7

### Should have

- **Hole flyover / overview:**
  - Satellite or illustrated view of the hole layout
  - Shows tee, fairway, bunkers, water, green
  - Player's current position marked
  - Tap-to-measure: tap any point on the map to see distance from current position

- **Hazard distances:**
  - Distance to front/back of water hazards
  - Distance to nearest bunker
  - Carry distance over hazards from tee
  - Layup distance markers

- **Shot tracking (optional):**
  - "Mark shot" button to record position
  - Calculate distance of last shot
  - Build shot map over the round (post-round review)

### Won't have (this phase)

- Elevation adjustment (requires DEM data, adds significant complexity)
- Wind speed/direction integration
- Club recommendation based on historical distances
- Apple Watch / Wear OS companion app
- Offline map caching (requires significant storage)
- Augmented reality overlays

## Course mapping data model

```sql
green_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES loops(id),
  hole_number smallint NOT NULL,
  front_lat numeric(10,7) NOT NULL,
  front_lng numeric(10,7) NOT NULL,
  centre_lat numeric(10,7) NOT NULL,
  centre_lng numeric(10,7) NOT NULL,
  back_lat numeric(10,7) NOT NULL,
  back_lng numeric(10,7) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (loop_id, hole_number)
)

tee_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES loops(id),
  hole_number smallint NOT NULL,
  tee_id uuid REFERENCES course_tees(id),  -- Yellow, White, Red, etc.
  lat numeric(10,7) NOT NULL,
  lng numeric(10,7) NOT NULL,
  UNIQUE (loop_id, hole_number, tee_id)
)

hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES loops(id),
  hole_number smallint NOT NULL,
  type text NOT NULL,  -- 'water' | 'bunker' | 'ob'
  name text,           -- e.g. 'Front left bunker'
  front_lat numeric(10,7),
  front_lng numeric(10,7),
  back_lat numeric(10,7),
  back_lng numeric(10,7),
  carry_lat numeric(10,7),  -- point to carry over
  carry_lng numeric(10,7)
)
```

## Distance calculation

Haversine formula for great-circle distance:

```typescript
function distanceYards(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth radius in metres
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const metres = R * c
  return Math.round(metres * 1.09361) // metres to yards
}
```

Accuracy depends on device GPS. Most modern smartphones achieve 3-5 metre accuracy, translating to 3-5 yards — acceptable for golf.

## PWA considerations

- Geolocation API requires secure context (HTTPS)
- `watchPosition` with `enableHighAccuracy: true` for best results
- Background GPS: limited on iOS Safari (screen must stay on)
- Suggest "keep screen on" setting or wake lock API where supported
- Battery impact: GPS polling every 3s will drain battery; offer "power save" mode with 10s interval

## Course data sourcing

Options for populating green/tee coordinates:

1. **Manual entry** (MVP): Admin tool for entering coordinates. Club staff or LX2 team walks the course with a GPS device.
2. **Community contribution**: Allow verified users to submit/correct coordinates.
3. **Data provider**: License course mapping data from providers like GolfNow, Every Course, or OpenStreetMap golf overlays.
4. **Satellite imagery**: Identify green boundaries from aerial photos (semi-automated with manual verification).

## Open questions

- [ ] Is PWA geolocation accurate enough, or do we need a native app?
- [ ] How do we source course mapping data at scale? (UK has ~2,600 courses)
- [ ] Should we show GPS on the score entry screen or as a separate tab?
- [ ] Battery usage: should we pause GPS when the player isn't actively looking at the screen?
- [ ] Do we need to worry about R&A rules on distance-measuring devices? (Currently allowed in most competitions)
- [ ] Should shot tracking be part of this module or a separate feature?

## Links

- Score entry (GPS integration point): `apps/web/src/app/score/ScoreEntry.tsx`
- Course data: `packages/db/migrations/001_initial_schema.sql`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/player-profile.md`
