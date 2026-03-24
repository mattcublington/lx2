// ─────────────────────────────────────────────────────────────────────────────
// seed-cumberwell.ts
//
// Idempotent seed script for Cumberwell Park Golf Club.
//
// Data sources:
//   • apps/web/src/lib/courses.ts (hole par, SI, Yellow/Purple yardages)
//   • USGA NCRDB CourseIDs 22312–22317 (WHS slope/course ratings)
//
// The JSON file (cumberwell_scorecards_v3.json) referenced in earlier comments
// is no longer required — all data is embedded here and in courses.ts.
//
// Run with:
//   npx tsx packages/db/scripts/seed-cumberwell.ts
//
// Requires SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// ─── 1. Load environment variables ───────────────────────────────────────────

const repoRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(repoRoot, "apps/web/.env.local");

if (!fs.existsSync(envPath)) {
  console.error(`❌  Could not find .env.local at: ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from apps/web/.env.local"
  );
  process.exit(1);
}

// ─── 2. Supabase client (service role — bypasses RLS) ────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ─── 3. Fixed loop UUIDs (stable across all environments) ────────────────────
//
// Declared as constants so they can be referenced in DO $$ blocks via SQL
// migrations (packages/db/migrations/golfer/003_golfer_seed_cumberwell_loops.sql).
// Never change these — any event with combination_id relies on them.

const LOOP_ID = {
  Red:    "10000000-0000-0000-0000-000000000001",
  Yellow: "10000000-0000-0000-0000-000000000002",
  Blue:   "10000000-0000-0000-0000-000000000003",
  Orange: "10000000-0000-0000-0000-000000000004",
  White:  "10000000-0000-0000-0000-000000000005",
  Par3:   "10000000-0000-0000-0000-000000000006",
} as const;

// ─── 4. Loop definitions ──────────────────────────────────────────────────────

const LOOPS: Array<{ id: string; name: string; notes: string }> = [
  { id: LOOP_ID.Red,    name: "Red",    notes: "Cumberwell Park — Red loop"    },
  { id: LOOP_ID.Yellow, name: "Yellow", notes: "Cumberwell Park — Yellow loop" },
  { id: LOOP_ID.Blue,   name: "Blue",   notes: "Cumberwell Park — Blue loop"   },
  { id: LOOP_ID.Orange, name: "Orange", notes: "Cumberwell Park — Orange loop" },
  { id: LOOP_ID.White,  name: "White",  notes: "Cumberwell Park — White loop"  },
  { id: LOOP_ID.Par3,   name: "Par 3",  notes: "Cumberwell Park — Par 3 loop"  },
];

// ─── 5. Loop hole data (par + si_m + Yellow/Purple yards) ─────────────────────
//
// Source: apps/web/src/lib/courses.ts
// SI values are the within-combination stroke indices from the scorecard.
// Yellow/Purple yards are the only tee recorded here; other tee colours
// require the source JSON which is not currently available.

interface LoopHoleDef {
  loopId: string;
  hole: number;
  par: number;
  siM: number | null;  // null = no WHS index (Par 3 loop)
  yards: number;        // Yellow/Purple tee
}

const LOOP_HOLES: LoopHoleDef[] = [
  // ── Red loop ──────────────────────────────────────────────────────────────
  { loopId: LOOP_ID.Red, hole: 1, par: 4, siM:  9, yards: 380 },
  { loopId: LOOP_ID.Red, hole: 2, par: 4, siM:  5, yards: 432 },
  { loopId: LOOP_ID.Red, hole: 3, par: 3, siM: 17, yards: 142 },
  { loopId: LOOP_ID.Red, hole: 4, par: 4, siM: 11, yards: 376 },
  { loopId: LOOP_ID.Red, hole: 5, par: 4, siM: 13, yards: 318 },
  { loopId: LOOP_ID.Red, hole: 6, par: 4, siM:  3, yards: 390 },
  { loopId: LOOP_ID.Red, hole: 7, par: 3, siM: 15, yards: 132 },
  { loopId: LOOP_ID.Red, hole: 8, par: 4, siM:  1, yards: 397 },
  { loopId: LOOP_ID.Red, hole: 9, par: 5, siM:  7, yards: 561 },
  // ── Yellow loop ───────────────────────────────────────────────────────────
  { loopId: LOOP_ID.Yellow, hole: 1, par: 4, siM: 18, yards: 285 },
  { loopId: LOOP_ID.Yellow, hole: 2, par: 5, siM: 10, yards: 478 },
  { loopId: LOOP_ID.Yellow, hole: 3, par: 5, siM:  6, yards: 492 },
  { loopId: LOOP_ID.Yellow, hole: 4, par: 3, siM: 16, yards: 164 },
  { loopId: LOOP_ID.Yellow, hole: 5, par: 4, siM:  4, yards: 356 },
  { loopId: LOOP_ID.Yellow, hole: 6, par: 4, siM:  2, yards: 450 },
  { loopId: LOOP_ID.Yellow, hole: 7, par: 3, siM: 12, yards: 144 },
  { loopId: LOOP_ID.Yellow, hole: 8, par: 4, siM: 14, yards: 283 },
  { loopId: LOOP_ID.Yellow, hole: 9, par: 4, siM:  8, yards: 343 },
  // ── Blue loop ─────────────────────────────────────────────────────────────
  { loopId: LOOP_ID.Blue, hole: 1, par: 5, siM:  5, yards: 526 },
  { loopId: LOOP_ID.Blue, hole: 2, par: 4, siM:  1, yards: 396 },
  { loopId: LOOP_ID.Blue, hole: 3, par: 4, siM: 15, yards: 331 },
  { loopId: LOOP_ID.Blue, hole: 4, par: 4, siM: 13, yards: 306 },
  { loopId: LOOP_ID.Blue, hole: 5, par: 4, siM:  3, yards: 383 },
  { loopId: LOOP_ID.Blue, hole: 6, par: 3, siM: 17, yards: 135 },
  { loopId: LOOP_ID.Blue, hole: 7, par: 4, siM:  7, yards: 391 },
  { loopId: LOOP_ID.Blue, hole: 8, par: 3, siM:  9, yards: 172 },
  { loopId: LOOP_ID.Blue, hole: 9, par: 5, siM: 11, yards: 440 },
  // ── Orange loop ───────────────────────────────────────────────────────────
  { loopId: LOOP_ID.Orange, hole: 1, par: 4, siM: 18, yards: 285 },
  { loopId: LOOP_ID.Orange, hole: 2, par: 4, siM: 10, yards: 380 },
  { loopId: LOOP_ID.Orange, hole: 3, par: 4, siM:  6, yards: 432 },
  { loopId: LOOP_ID.Orange, hole: 4, par: 3, siM: 16, yards: 142 },
  { loopId: LOOP_ID.Orange, hole: 5, par: 4, siM: 12, yards: 376 },
  { loopId: LOOP_ID.Orange, hole: 6, par: 4, siM: 14, yards: 318 },
  { loopId: LOOP_ID.Orange, hole: 7, par: 4, siM:  4, yards: 390 },
  { loopId: LOOP_ID.Orange, hole: 8, par: 3, siM:  8, yards: 132 },
  { loopId: LOOP_ID.Orange, hole: 9, par: 5, siM:  2, yards: 397 },
  // ── White loop ────────────────────────────────────────────────────────────
  // SI from White/White scorecard; Green tees used as Yellow tee equivalent.
  { loopId: LOOP_ID.White, hole: 1, par: 4, siM: 15, yards: 267 },
  { loopId: LOOP_ID.White, hole: 2, par: 5, siM:  3, yards: 477 },
  { loopId: LOOP_ID.White, hole: 3, par: 4, siM:  7, yards: 380 },
  { loopId: LOOP_ID.White, hole: 4, par: 3, siM: 11, yards: 179 },
  { loopId: LOOP_ID.White, hole: 5, par: 4, siM:  9, yards: 347 },
  { loopId: LOOP_ID.White, hole: 6, par: 4, siM:  1, yards: 465 },
  { loopId: LOOP_ID.White, hole: 7, par: 4, siM: 13, yards: 306 },
  { loopId: LOOP_ID.White, hole: 8, par: 4, siM:  5, yards: 355 },
  { loopId: LOOP_ID.White, hole: 9, par: 3, siM: 17, yards: 159 },
  // ── Par 3 loop ────────────────────────────────────────────────────────────
  // No WHS stroke index — hole number used as SI.
  { loopId: LOOP_ID.Par3, hole: 1, par: 3, siM: null, yards: 109 },
  { loopId: LOOP_ID.Par3, hole: 2, par: 3, siM: null, yards: 165 },
  { loopId: LOOP_ID.Par3, hole: 3, par: 3, siM: null, yards: 141 },
  { loopId: LOOP_ID.Par3, hole: 4, par: 3, siM: null, yards: 186 },
  { loopId: LOOP_ID.Par3, hole: 5, par: 3, siM: null, yards: 180 },
  { loopId: LOOP_ID.Par3, hole: 6, par: 3, siM: null, yards: 164 },
  { loopId: LOOP_ID.Par3, hole: 7, par: 3, siM: null, yards: 172 },
  { loopId: LOOP_ID.Par3, hole: 8, par: 3, siM: null, yards: 144 },
  { loopId: LOOP_ID.Par3, hole: 9, par: 3, siM: null, yards: 150 },
];

// ─── 6. Course combinations (16 total) ───────────────────────────────────────

interface ComboDef {
  name: string;          // matches public.courses.name exactly
  par: number;
  loop1Id: string;
  loop2Id: string;
}

const COMBINATIONS: ComboDef[] = [
  { name: "Cumberwell Park — Red/Yellow",    par: 71, loop1Id: LOOP_ID.Red,    loop2Id: LOOP_ID.Yellow },
  { name: "Cumberwell Park — Yellow/Red",    par: 71, loop1Id: LOOP_ID.Yellow, loop2Id: LOOP_ID.Red    },
  { name: "Cumberwell Park — Blue/Orange",   par: 71, loop1Id: LOOP_ID.Blue,   loop2Id: LOOP_ID.Orange },
  { name: "Cumberwell Park — Orange/Blue",   par: 71, loop1Id: LOOP_ID.Orange, loop2Id: LOOP_ID.Blue   },
  { name: "Cumberwell Park — Red/Blue",      par: 71, loop1Id: LOOP_ID.Red,    loop2Id: LOOP_ID.Blue   },
  { name: "Cumberwell Park — Blue/Red",      par: 71, loop1Id: LOOP_ID.Blue,   loop2Id: LOOP_ID.Red    },
  { name: "Cumberwell Park — Blue/Yellow",   par: 72, loop1Id: LOOP_ID.Blue,   loop2Id: LOOP_ID.Yellow },
  { name: "Cumberwell Park — Yellow/Blue",   par: 72, loop1Id: LOOP_ID.Yellow, loop2Id: LOOP_ID.Blue   },
  { name: "Cumberwell Park — Orange/Yellow", par: 71, loop1Id: LOOP_ID.Orange, loop2Id: LOOP_ID.Yellow },
  { name: "Cumberwell Park — Yellow/Orange", par: 71, loop1Id: LOOP_ID.Yellow, loop2Id: LOOP_ID.Orange },
  { name: "Cumberwell Park — Red/Orange",    par: 71, loop1Id: LOOP_ID.Red,    loop2Id: LOOP_ID.Orange },
  { name: "Cumberwell Park — Orange/Red",    par: 71, loop1Id: LOOP_ID.Orange, loop2Id: LOOP_ID.Red    },
  { name: "Cumberwell Park — White/White",   par: 70, loop1Id: LOOP_ID.White,  loop2Id: LOOP_ID.White  },
  { name: "Cumberwell Park — Par 3/Par 3",   par: 54, loop1Id: LOOP_ID.Par3,   loop2Id: LOOP_ID.Par3   },
  { name: "Cumberwell Park — White/Par 3",   par: 62, loop1Id: LOOP_ID.White,  loop2Id: LOOP_ID.Par3   },
  { name: "Cumberwell Park — Par 3/White",   par: 62, loop1Id: LOOP_ID.Par3,   loop2Id: LOOP_ID.White  },
];

// ─── 7. WHS combination_tees (slope + course rating per tee + gender) ────────
//
// Source: USGA National Course Rating Database (ncrdb.usga.org)
//   Red & Yellow    → CourseID 22312
//   Yellow & Blue   → CourseID 22313
//   Blue & Red      → CourseID 22314
//   Red & Orange    → CourseID 22315
//   Orange & Yellow → CourseID 22316
//   Blue & Orange   → CourseID 22317
//   White & White   → verified separately
//
// Both orderings (e.g. Red-Yellow AND Yellow-Red) share the same rating.
//
// Tee colour mapping at Cumberwell:
//   Green  = Medal / Competition (longest)
//   White  = Club standard
//   Yellow/Purple = Mid / accessible
//   Red/Black     = Forward

interface WHS {
  teeColour: string;
  gender: "m" | "w";
  slopeRating: number;
  courseRating: number;
}

const WHS_BY_COMBO_NAME: Record<string, WHS[]> = {
  // ── Red & Yellow (USGA 22312) ─────────────────────────────────────────────
  "Cumberwell Park — Red/Yellow": [
    { teeColour: "Green",         gender: "m", slopeRating: 130, courseRating: 72.5 },
    { teeColour: "White",         gender: "m", slopeRating: 126, courseRating: 71.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 123, courseRating: 69.5 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 112, courseRating: 66.7 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 133, courseRating: 71.8 },
  ],
  "Cumberwell Park — Yellow/Red": [
    { teeColour: "Green",         gender: "m", slopeRating: 130, courseRating: 72.5 },
    { teeColour: "White",         gender: "m", slopeRating: 126, courseRating: 71.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 123, courseRating: 69.5 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 112, courseRating: 66.7 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 133, courseRating: 71.8 },
  ],
  // ── Yellow & Blue (USGA 22313) ────────────────────────────────────────────
  "Cumberwell Park — Yellow/Blue": [
    { teeColour: "Green",         gender: "m", slopeRating: 132, courseRating: 73.3 },
    { teeColour: "White",         gender: "m", slopeRating: 129, courseRating: 71.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 125, courseRating: 69.7 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 114, courseRating: 67.1 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 134, courseRating: 72.3 },
  ],
  "Cumberwell Park — Blue/Yellow": [
    { teeColour: "Green",         gender: "m", slopeRating: 132, courseRating: 73.3 },
    { teeColour: "White",         gender: "m", slopeRating: 129, courseRating: 71.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 125, courseRating: 69.7 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 114, courseRating: 67.1 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 134, courseRating: 72.3 },
  ],
  // ── Blue & Red (USGA 22314) ───────────────────────────────────────────────
  "Cumberwell Park — Blue/Red": [
    { teeColour: "Green",         gender: "m", slopeRating: 131, courseRating: 74.4 },
    { teeColour: "White",         gender: "m", slopeRating: 126, courseRating: 72.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 124, courseRating: 70.4 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 117, courseRating: 67.0 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 134, courseRating: 72.7 },
  ],
  "Cumberwell Park — Red/Blue": [
    { teeColour: "Green",         gender: "m", slopeRating: 131, courseRating: 74.4 },
    { teeColour: "White",         gender: "m", slopeRating: 126, courseRating: 72.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 124, courseRating: 70.4 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 117, courseRating: 67.0 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 134, courseRating: 72.7 },
  ],
  // ── Red & Orange (USGA 22315) ─────────────────────────────────────────────
  "Cumberwell Park — Red/Orange": [
    { teeColour: "Green",         gender: "m", slopeRating: 125, courseRating: 73.1 },
    { teeColour: "White",         gender: "m", slopeRating: 122, courseRating: 71.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 119, courseRating: 69.1 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 113, courseRating: 65.5 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 127, courseRating: 70.9 },
  ],
  "Cumberwell Park — Orange/Red": [
    { teeColour: "Green",         gender: "m", slopeRating: 125, courseRating: 73.1 },
    { teeColour: "White",         gender: "m", slopeRating: 122, courseRating: 71.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 119, courseRating: 69.1 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 113, courseRating: 65.5 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 127, courseRating: 70.9 },
  ],
  // ── Orange & Yellow (USGA 22316) ──────────────────────────────────────────
  "Cumberwell Park — Orange/Yellow": [
    { teeColour: "Green",         gender: "m", slopeRating: 126, courseRating: 72.0 },
    { teeColour: "White",         gender: "m", slopeRating: 125, courseRating: 70.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 120, courseRating: 68.4 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 110, courseRating: 65.6 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 127, courseRating: 70.5 },
  ],
  "Cumberwell Park — Yellow/Orange": [
    { teeColour: "Green",         gender: "m", slopeRating: 126, courseRating: 72.0 },
    { teeColour: "White",         gender: "m", slopeRating: 125, courseRating: 70.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 120, courseRating: 68.4 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 110, courseRating: 65.6 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 127, courseRating: 70.5 },
  ],
  // ── Blue & Orange (USGA 22317) ────────────────────────────────────────────
  "Cumberwell Park — Blue/Orange": [
    { teeColour: "Green",         gender: "m", slopeRating: 127, courseRating: 73.9 },
    { teeColour: "White",         gender: "m", slopeRating: 125, courseRating: 71.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 121, courseRating: 69.3 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 115, courseRating: 65.9 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 128, courseRating: 71.4 },
  ],
  "Cumberwell Park — Orange/Blue": [
    { teeColour: "Green",         gender: "m", slopeRating: 127, courseRating: 73.9 },
    { teeColour: "White",         gender: "m", slopeRating: 125, courseRating: 71.5 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating: 121, courseRating: 69.3 },
    { teeColour: "Red/Black",     gender: "m", slopeRating: 115, courseRating: 65.9 },
    { teeColour: "Red/Black",     gender: "w", slopeRating: 128, courseRating: 71.4 },
  ],
  // ── White & White (USGA verified — CR 68.2, Slope 111 on Green/M) ─────────
  "Cumberwell Park — White/White": [
    { teeColour: "Green",         gender: "m", slopeRating: 111, courseRating: 68.2 },
    { teeColour: "White",         gender: "m", slopeRating: 100, courseRating: 61.0 },
    { teeColour: "Yellow/Purple", gender: "m", slopeRating:  98, courseRating: 59.5 },
    { teeColour: "Yellow/Purple", gender: "w", slopeRating: 103, courseRating: 61.8 },
    { teeColour: "Red/Black",     gender: "m", slopeRating:  92, courseRating: 58.4 },
    { teeColour: "Red/Black",     gender: "w", slopeRating:  99, courseRating: 60.0 },
  ],
  // Par 3/Par 3, White/Par 3, Par 3/White: no WHS rating
};

// ─── 8. Courses table rows (16 total, matching public.courses) ────────────────

const COURSES = [
  { name: "Cumberwell Park — Red/Yellow",    slopeRating: 126, courseRating: 71.0, par: 71 },
  { name: "Cumberwell Park — Yellow/Red",    slopeRating: 126, courseRating: 71.0, par: 71 },
  { name: "Cumberwell Park — Blue/Orange",   slopeRating: 125, courseRating: 71.5, par: 71 },
  { name: "Cumberwell Park — Orange/Blue",   slopeRating: 125, courseRating: 71.5, par: 71 },
  { name: "Cumberwell Park — Red/Blue",      slopeRating: 126, courseRating: 72.5, par: 71 },
  { name: "Cumberwell Park — Blue/Red",      slopeRating: 126, courseRating: 72.5, par: 71 },
  { name: "Cumberwell Park — Blue/Yellow",   slopeRating: 129, courseRating: 71.5, par: 72 },
  { name: "Cumberwell Park — Yellow/Blue",   slopeRating: 129, courseRating: 71.5, par: 72 },
  { name: "Cumberwell Park — Orange/Yellow", slopeRating: 125, courseRating: 70.0, par: 71 },
  { name: "Cumberwell Park — Yellow/Orange", slopeRating: 125, courseRating: 70.0, par: 71 },
  { name: "Cumberwell Park — Red/Orange",    slopeRating: 122, courseRating: 71.0, par: 71 },
  { name: "Cumberwell Park — Orange/Red",    slopeRating: 122, courseRating: 71.0, par: 71 },
  { name: "Cumberwell Park — White/White",   slopeRating: 111, courseRating: 68.2, par: 70 },
  { name: "Cumberwell Park — Par 3/Par 3",   slopeRating:   0, courseRating:  0.0, par: 54 },
  { name: "Cumberwell Park — White/Par 3",   slopeRating:   0, courseRating:  0.0, par: 62 },
  { name: "Cumberwell Park — Par 3/White",   slopeRating:   0, courseRating:  0.0, par: 62 },
];

// ─── 9. Counters ──────────────────────────────────────────────────────────────

const counts = {
  courses: 0,
  loops: 0,
  loop_holes: 0,
  loop_hole_tees: 0,
  course_combinations: 0,
  combination_tees: 0,
};

// ─── 10. Helper: upsert with error logging ────────────────────────────────────

async function upsert<T extends object>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<T[]> {
  if (rows.length === 0) return [];
  const { data: inserted, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict })
    .select();
  if (error) {
    console.error(`  ⚠️  Error upserting into ${table}:`, error.message);
    return [];
  }
  return (inserted ?? []) as T[];
}

// ─── 11. Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Cumberwell Park Golf Club — seed script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Pre-flight: verify schema is ready
  const { error: preflightError } = await supabase.from("loops").select("id").limit(1);
  if (preflightError) {
    console.error("❌  Database schema not ready:", preflightError.message);
    console.error("   Run migrations/golfer/*.sql in the Supabase SQL editor first.");
    process.exit(1);
  }
  console.log("  ✓ Database schema OK\n");

  // ── A. Courses ──────────────────────────────────────────────────────────────
  console.log("Seeding courses...");
  const courseRows = COURSES.map(c => ({
    name: c.name,
    club: "Cumberwell Park",
    location: "Bradford-on-Avon, Wiltshire",
    holes_count: 18,
    slope_rating: c.slopeRating,
    course_rating: c.courseRating,
    par: c.par,
    source: "manual",
    verified: true,
  }));
  const upsertedCourses = await upsert("courses", courseRows, "name");
  counts.courses = upsertedCourses.length;
  console.log(`  ✓ ${upsertedCourses.length} courses upserted\n`);

  // Build name → id lookup
  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, name")
    .eq("club", "Cumberwell Park");
  const courseIdByName: Record<string, string> = {};
  for (const c of allCourses ?? []) {
    courseIdByName[(c as { id: string; name: string }).name] =
      (c as { id: string; name: string }).id;
  }

  // ── B. Loops (with fixed UUIDs) ─────────────────────────────────────────────
  console.log("Seeding loops...");
  const loopRows = LOOPS.map(l => ({
    id: l.id,
    course_id: null as string | null,
    name: l.name,
    holes: 9,
    notes: l.notes,
  }));
  const upsertedLoops = await upsert("loops", loopRows, "id");
  counts.loops = upsertedLoops.length;
  console.log(`  ✓ ${upsertedLoops.length} loops upserted\n`);

  // ── C. Loop holes ────────────────────────────────────────────────────────────
  console.log("Seeding loop holes...");
  const holeRows = LOOP_HOLES.map(h => ({
    loop_id: h.loopId,
    hole_number: h.hole,
    par: h.par,
    si_m: h.siM,
    si_w: h.siM,  // use same SI for both genders (no separate women's SI data)
  }));
  const upsertedHoles = await upsert("loop_holes", holeRows, "loop_id,hole_number");
  counts.loop_holes = upsertedHoles.length;

  // Build loopId:holeNumber → loop_hole.id lookup
  const { data: allHoles } = await supabase
    .from("loop_holes")
    .select("id, loop_id, hole_number");
  const holeIdByKey: Record<string, string> = {};
  for (const h of allHoles ?? []) {
    const row = h as { id: string; loop_id: string; hole_number: number };
    holeIdByKey[`${row.loop_id}:${row.hole_number}`] = row.id;
  }

  console.log(`  ✓ ${upsertedHoles.length} loop holes upserted\n`);

  // ── D. Loop hole tees (Yellow/Purple) ───────────────────────────────────────
  console.log("Seeding loop hole tees (Yellow/Purple)...");
  const teeRows = LOOP_HOLES.map(h => ({
    loop_hole_id: holeIdByKey[`${h.loopId}:${h.hole}`] ?? "",
    tee_colour: "Yellow/Purple",
    yards: h.yards,
  })).filter(r => r.loop_hole_id !== "");

  const upsertedTees = await upsert("loop_hole_tees", teeRows, "loop_hole_id,tee_colour");
  counts.loop_hole_tees = upsertedTees.length;
  console.log(`  ✓ ${upsertedTees.length} loop hole tees upserted\n`);

  // ── E. Course combinations ──────────────────────────────────────────────────
  console.log("Seeding course combinations...");
  const comboRows = COMBINATIONS.map(c => {
    const courseId = courseIdByName[c.name];
    if (!courseId) {
      console.error(`  ⚠️  No course ID found for "${c.name}" — skipping combination.`);
      return null;
    }
    return {
      course_id: courseId,
      name: c.name,
      par: c.par,
      holes: 18,
      loop_1_id: c.loop1Id,
      loop_2_id: c.loop2Id,
      notes: null as string | null,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const upsertedCombos = await upsert("course_combinations", comboRows, "course_id,name");
  counts.course_combinations = upsertedCombos.length;

  // Build name → combination id lookup
  const { data: allCombos } = await supabase
    .from("course_combinations")
    .select("id, name");
  const comboIdByName: Record<string, string> = {};
  for (const c of allCombos ?? []) {
    const row = c as { id: string; name: string };
    comboIdByName[row.name] = row.id;
  }

  console.log(`  ✓ ${upsertedCombos.length} combinations upserted\n`);

  // ── F. Combination tees (WHS ratings) ───────────────────────────────────────
  console.log("Seeding combination tees (WHS ratings)...");
  const combTeeRows: Array<{
    combination_id: string;
    tee_colour: string;
    gender: "m" | "w";
    slope_rating: number;
    course_rating: number;
  }> = [];

  for (const [comboName, entries] of Object.entries(WHS_BY_COMBO_NAME)) {
    const combinationId = comboIdByName[comboName];
    if (!combinationId) {
      console.error(`  ⚠️  No combination ID for "${comboName}" — skipping WHS tees.`);
      continue;
    }
    for (const w of entries) {
      combTeeRows.push({
        combination_id: combinationId,
        tee_colour: w.teeColour,
        gender: w.gender,
        slope_rating: w.slopeRating,
        course_rating: w.courseRating,
      });
    }
  }

  const upsertedCombTees = await upsert(
    "combination_tees",
    combTeeRows,
    "combination_id,tee_colour,gender"
  );
  counts.combination_tees = upsertedCombTees.length;
  console.log(`  ✓ ${upsertedCombTees.length} combination tees upserted\n`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Seed complete — rows upserted:");
  console.log(`    courses              : ${counts.courses}`);
  console.log(`    loops                : ${counts.loops}`);
  console.log(`    loop_holes           : ${counts.loop_holes}`);
  console.log(`    loop_hole_tees       : ${counts.loop_hole_tees}`);
  console.log(`    course_combinations  : ${counts.course_combinations}`);
  console.log(`    combination_tees     : ${counts.combination_tees}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err: unknown) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
