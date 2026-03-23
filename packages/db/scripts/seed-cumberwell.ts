// ─────────────────────────────────────────────────────────────────────────────
// seed-cumberwell.ts
//
// Reads Cumberwell Park scorecard data from the source JSON and upserts
// all loops, holes, tees, and combinations into Supabase.
//
// The script is fully idempotent — safe to re-run at any time.
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

// Resolve from the repo root regardless of where the script is invoked
const repoRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(repoRoot, "apps/web/.env.local");

if (!fs.existsSync(envPath)) {
  console.error(`❌  Could not find .env.local at: ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL) {
  console.error(
    "❌  NEXT_PUBLIC_SUPABASE_URL is missing from apps/web/.env.local"
  );
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    [
      "❌  SUPABASE_SERVICE_ROLE_KEY is missing from apps/web/.env.local",
      "",
      "  This key is required to bypass Row Level Security during seeding.",
      "  Find it in your Supabase dashboard:",
      "    Project Settings → API → Project API keys → service_role",
      "",
      "  Add it to apps/web/.env.local as:",
      "    SUPABASE_SERVICE_ROLE_KEY=eyJ...",
    ].join("\n")
  );
  process.exit(1);
}

// ─── 2. Supabase client (service role — bypasses RLS) ────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// ─── 3. Types matching the JSON structure ────────────────────────────────────

interface HoleDataRYBO {
  hole: number;
  par: number;
  si_m: number;
  si_w: number;
  green: number;
  white: number;
  yellow: number;
  red: number;
}

interface HoleDataWhite {
  hole: number;
  par: number;
  si: number;
  green: number;
  white: number;
  purple: number;
  black: number;
}

interface HoleDataPar3 {
  hole: number;
  par: number;
  purple: number;
  orange: number;
  blue: number;
}

interface LoopBase {
  holes: number;
  notes: string;
}

interface LoopRYBO extends LoopBase {
  holes_data: HoleDataRYBO[];
}

interface LoopWhite extends LoopBase {
  course_ratings: Record<string, { cr: number; slope: number }>;
  holes_data: HoleDataWhite[];
}

interface LoopPar3 extends LoopBase {
  holes_data: HoleDataPar3[];
}

interface CombinationData {
  par: number;
  holes: number;
  loops: [string, string];
  loop_order: string;
  notes?: string;
}

interface ScorecardJson {
  club: string;
  address: string;
  source: string;
  loops: {
    Red: LoopRYBO;
    Yellow: LoopRYBO;
    Blue: LoopRYBO;
    Orange: LoopRYBO;
    White: LoopWhite;
    "Par 3": LoopPar3;
  };
  combinations: Record<string, CombinationData>;
}

// ─── 4. Load source JSON ─────────────────────────────────────────────────────

const jsonPath = path.join(
  process.env["HOME"] ?? "",
  "Downloads/cumberwell_scorecards_v3.json"
);

if (!fs.existsSync(jsonPath)) {
  console.error(`❌  Cannot find scorecard JSON at: ${jsonPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, "utf-8");
const data = JSON.parse(raw) as ScorecardJson;

// ─── 5. WHS combination_tees data (hardcoded from known ratings) ─────────────

interface WHS {
  tee_colour: string;
  gender: "m" | "w";
  slope_rating: number;
  course_rating: number;
}

/**
 * WHS slope/course-rating data per combination name.
 * Source: USGA National Course Rating Database (ncrdb.usga.org)
 *   Red & Yellow    → CourseID 22312
 *   Yellow & Blue   → CourseID 22313
 *   Blue & Red      → CourseID 22314
 *   Red & Orange    → CourseID 22315
 *   Orange & Yellow → CourseID 22316
 *   Blue & Orange   → CourseID 22317
 *   White & White   → CourseID (verified separately, Bradford-on-Avon)
 *
 * Both loop orderings (e.g. Red-Yellow AND Yellow-Red) share the same rating —
 * the 18 holes are identical, only the sequence differs.
 *
 * Tee colour mapping at Cumberwell:
 *   Green  = Medal / Competition (longest)
 *   White  = Club standard
 *   Purple = Yellow equivalent (mid)
 *   Black  = Forward / accessible
 */
const whsByCombination: Record<string, WHS[]> = {
  // ── Red & Yellow (USGA 22312) ─────────────────────────────────────────────
  "Red-Yellow": [
    { tee_colour: "Green",         gender: "m", slope_rating: 130, course_rating: 72.5 },
    { tee_colour: "White",         gender: "m", slope_rating: 126, course_rating: 71.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 123, course_rating: 69.5 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 112, course_rating: 66.7 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 133, course_rating: 71.8 },
  ],
  "Yellow-Red": [
    { tee_colour: "Green",         gender: "m", slope_rating: 130, course_rating: 72.5 },
    { tee_colour: "White",         gender: "m", slope_rating: 126, course_rating: 71.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 123, course_rating: 69.5 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 112, course_rating: 66.7 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 133, course_rating: 71.8 },
  ],
  // ── Yellow & Blue (USGA 22313) ────────────────────────────────────────────
  "Yellow-Blue": [
    { tee_colour: "Green",         gender: "m", slope_rating: 132, course_rating: 73.3 },
    { tee_colour: "White",         gender: "m", slope_rating: 129, course_rating: 71.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 125, course_rating: 69.7 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 114, course_rating: 67.1 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 134, course_rating: 72.3 },
  ],
  "Blue-Yellow": [
    { tee_colour: "Green",         gender: "m", slope_rating: 132, course_rating: 73.3 },
    { tee_colour: "White",         gender: "m", slope_rating: 129, course_rating: 71.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 125, course_rating: 69.7 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 114, course_rating: 67.1 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 134, course_rating: 72.3 },
  ],
  // ── Blue & Red (USGA 22314) ───────────────────────────────────────────────
  "Blue-Red": [
    { tee_colour: "Green",         gender: "m", slope_rating: 131, course_rating: 74.4 },
    { tee_colour: "White",         gender: "m", slope_rating: 126, course_rating: 72.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 124, course_rating: 70.4 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 117, course_rating: 67.0 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 134, course_rating: 72.7 },
  ],
  "Red-Blue": [
    { tee_colour: "Green",         gender: "m", slope_rating: 131, course_rating: 74.4 },
    { tee_colour: "White",         gender: "m", slope_rating: 126, course_rating: 72.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 124, course_rating: 70.4 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 117, course_rating: 67.0 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 134, course_rating: 72.7 },
  ],
  // ── Red & Orange (USGA 22315) ─────────────────────────────────────────────
  "Red-Orange": [
    { tee_colour: "Green",         gender: "m", slope_rating: 125, course_rating: 73.1 },
    { tee_colour: "White",         gender: "m", slope_rating: 122, course_rating: 71.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 119, course_rating: 69.1 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 113, course_rating: 65.5 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 127, course_rating: 70.9 },
  ],
  "Orange-Red": [
    { tee_colour: "Green",         gender: "m", slope_rating: 125, course_rating: 73.1 },
    { tee_colour: "White",         gender: "m", slope_rating: 122, course_rating: 71.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 119, course_rating: 69.1 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 113, course_rating: 65.5 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 127, course_rating: 70.9 },
  ],
  // ── Orange & Yellow (USGA 22316) ──────────────────────────────────────────
  "Orange-Yellow": [
    { tee_colour: "Green",         gender: "m", slope_rating: 126, course_rating: 72.0 },
    { tee_colour: "White",         gender: "m", slope_rating: 125, course_rating: 70.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 120, course_rating: 68.4 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 110, course_rating: 65.6 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 127, course_rating: 70.5 },
  ],
  "Yellow-Orange": [
    { tee_colour: "Green",         gender: "m", slope_rating: 126, course_rating: 72.0 },
    { tee_colour: "White",         gender: "m", slope_rating: 125, course_rating: 70.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 120, course_rating: 68.4 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 110, course_rating: 65.6 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 127, course_rating: 70.5 },
  ],
  // ── Blue & Orange (USGA 22317) ────────────────────────────────────────────
  "Blue-Orange": [
    { tee_colour: "Green",         gender: "m", slope_rating: 127, course_rating: 73.9 },
    { tee_colour: "White",         gender: "m", slope_rating: 125, course_rating: 71.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 121, course_rating: 69.3 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 115, course_rating: 65.9 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 128, course_rating: 71.4 },
  ],
  "Orange-Blue": [
    { tee_colour: "Green",         gender: "m", slope_rating: 127, course_rating: 73.9 },
    { tee_colour: "White",         gender: "m", slope_rating: 125, course_rating: 71.5 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating: 121, course_rating: 69.3 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating: 115, course_rating: 65.9 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating: 128, course_rating: 71.4 },
  ],
  // ── White & White (USGA verified) ─────────────────────────────────────────
  "White-White": [
    { tee_colour: "Green",         gender: "m", slope_rating: 111, course_rating: 68.2 },
    { tee_colour: "White",         gender: "m", slope_rating: 100, course_rating: 61.0 },
    { tee_colour: "Yellow/Purple", gender: "m", slope_rating:  98, course_rating: 59.5 },
    { tee_colour: "Yellow/Purple", gender: "w", slope_rating: 103, course_rating: 61.8 },
    { tee_colour: "Red/Black",     gender: "m", slope_rating:  92, course_rating: 58.4 },
    { tee_colour: "Red/Black",     gender: "w", slope_rating:  99, course_rating: 60.0 },
  ],
  // Par 3-Par 3: no WHS rating (not a qualifying competition course)
};

// ─── 6. Counters for summary output ──────────────────────────────────────────

const counts = {
  courses: 0,
  loops: 0,
  loop_holes: 0,
  loop_hole_tees: 0,
  course_combinations: 0,
  combination_tees: 0,
};

// ─── 7. Helper: upsert with error logging (non-fatal) ────────────────────────

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

/**
 * Get-or-create a course row by name.
 *
 * public.courses has no unique constraint on `name`, so we cannot use
 * ON CONFLICT. Instead: select first, insert only if not found.
 * This is idempotent as long as we never insert duplicates.
 */
async function getOrCreateCourse(courseData: {
  name: string;
  club: string;
  location: string;
  holes_count: number;
  source: string;
  verified: boolean;
}): Promise<{ id: string; created: boolean }> {
  // Check for an existing row
  const { data: existing, error: selectError } = await supabase
    .from("courses")
    .select("id")
    .eq("name", courseData.name)
    .maybeSingle();

  if (selectError) {
    // Code 42501 = PostgreSQL permission denied; PGRST205 = table not in schema cache.
    // Both indicate the required migrations have not been applied to this Supabase project.
    if (
      selectError.code === "42501" ||
      selectError.code === "PGRST205" ||
      selectError.message.includes("permission denied") ||
      selectError.message.includes("schema cache")
    ) {
      throw new Error(
        [
          `Database not ready: ${selectError.message}`,
          "",
          "  This usually means one or more migrations have not been applied.",
          "  Please run the following migrations in the Supabase SQL editor:",
          "    • packages/db/migrations/001_initial_schema.sql",
          "    • packages/db/migrations/010_course_loops_scoring.sql",
          "",
          "  Then re-run this script.",
        ].join("\n")
      );
    }
    throw new Error(`Failed to query courses: ${selectError.message}`);
  }

  if (existing) {
    return { id: (existing as { id: string }).id, created: false };
  }

  // Not found — insert
  const { data: inserted, error: insertError } = await supabase
    .from("courses")
    .insert(courseData)
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to insert course: ${insertError?.message ?? "no data returned"}`
    );
  }

  return { id: (inserted as { id: string }).id, created: true };
}

// ─── 8. Main seed function ────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Cumberwell Park Golf Club — seed script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Pre-flight: verify required migrations have been applied ────────────

  console.log("Checking database readiness...");

  const { error: preflightError } = await supabase
    .from("loops")
    .select("id")
    .limit(1);

  if (preflightError) {
    const isNotReady =
      preflightError.code === "42501" ||
      preflightError.code === "PGRST205" ||
      preflightError.message.includes("permission denied") ||
      preflightError.message.includes("schema cache") ||
      preflightError.message.includes("does not exist");

    if (isNotReady) {
      console.error(
        [
          "\n❌  Required migrations have not been applied to this Supabase project.",
          "",
          "  Please run the following SQL files in the Supabase dashboard",
          "  (Project → SQL Editor → New query):",
          "",
          "    1. packages/db/migrations/001_initial_schema.sql",
          "    2. packages/db/migrations/010_course_loops_scoring.sql",
          "",
          "  Then re-run this script:",
          "    npx tsx packages/db/scripts/seed-cumberwell.ts",
          "",
          `  Supabase error: ${preflightError.message} (${preflightError.code})`,
        ].join("\n")
      );
      process.exit(1);
    }

    // Non-fatal: loops table exists but is empty — that's fine
  }

  console.log("  ✓ Database schema OK\n");

  // ── Step A: Get or create the course row ─────────────────────────────────

  console.log("Seeding course...");

  const { id: courseId, created: courseCreated } = await getOrCreateCourse({
    name: data.club,
    club: data.club,
    location: "Bradford-on-Avon, Wiltshire",
    holes_count: 45, // 5 full loops × 9 holes + Par 3 × 9
    source: data.source,
    verified: false,
  });

  counts.courses = courseCreated ? 1 : 0;
  console.log(
    `  ✓ Course ID: ${courseId} (${courseCreated ? "inserted" : "already exists"})\n`
  );

  // ── Step B: Upsert all 6 loops ───────────────────────────────────────────

  console.log("Seeding loops...");

  const loopNames = ["Red", "Yellow", "Blue", "Orange", "White", "Par 3"] as const;

  const loopInsertRows = loopNames.map((name) => {
    const loop = data.loops[name];
    return {
      course_id: courseId,
      name,
      holes: loop.holes,
      notes: loop.notes,
    };
  });

  const loopRows = await upsert("loops", loopInsertRows, "course_id,name");
  counts.loops += loopRows.length;

  // Build a name→id lookup
  const loopIdByName: Record<string, string> = {};
  for (const row of loopRows as Array<{ id: string; name: string }>) {
    loopIdByName[row.name] = row.id;
  }

  console.log(`  ✓ ${loopRows.length} loops upserted\n`);

  // ── Step C: Upsert all loop_holes ───────────────────────────────────────

  console.log("Seeding loop holes...");

  const allHoleRows: Array<{
    loop_id: string;
    hole_number: number;
    par: number;
    si_m: number | null;
    si_w: number | null;
  }> = [];

  // Red, Yellow, Blue, Orange — have si_m and si_w
  for (const name of ["Red", "Yellow", "Blue", "Orange"] as const) {
    const loopId = loopIdByName[name];
    if (!loopId) {
      console.error(`  ⚠️  No loop ID found for "${name}", skipping holes.`);
      continue;
    }
    for (const h of data.loops[name].holes_data) {
      allHoleRows.push({
        loop_id: loopId,
        hole_number: h.hole,
        par: h.par,
        si_m: h.si_m,
        si_w: h.si_w,
      });
    }
  }

  // White — has a single si; use for both si_m and si_w
  {
    const loopId = loopIdByName["White"];
    if (!loopId) {
      console.error('  ⚠️  No loop ID found for "White", skipping holes.');
    } else {
      for (const h of data.loops["White"].holes_data) {
        allHoleRows.push({
          loop_id: loopId,
          hole_number: h.hole,
          par: h.par,
          si_m: h.si,
          si_w: h.si,
        });
      }
    }
  }

  // Par 3 — no stroke index
  {
    const loopId = loopIdByName["Par 3"];
    if (!loopId) {
      console.error('  ⚠️  No loop ID found for "Par 3", skipping holes.');
    } else {
      for (const h of data.loops["Par 3"].holes_data) {
        allHoleRows.push({
          loop_id: loopId,
          hole_number: h.hole,
          par: h.par,
          si_m: null,
          si_w: null,
        });
      }
    }
  }

  const holeRows = await upsert("loop_holes", allHoleRows, "loop_id,hole_number");
  counts.loop_holes += holeRows.length;

  // Build a lookup: `${loop_id}:${hole_number}` → hole row id
  const holeIdByKey: Record<string, string> = {};
  for (const row of holeRows as Array<{
    id: string;
    loop_id: string;
    hole_number: number;
  }>) {
    holeIdByKey[`${row.loop_id}:${row.hole_number}`] = row.id;
  }

  console.log(`  ✓ ${holeRows.length} loop holes upserted\n`);

  // ── Step D: Upsert all loop_hole_tees ───────────────────────────────────

  console.log("Seeding loop hole tees...");

  const allTeeRows: Array<{
    loop_hole_id: string;
    tee_colour: string;
    yards: number;
  }> = [];

  // Helper: push tee rows for a set of colours
  function pushTeeRows(
    loopId: string,
    holeNumber: number,
    tees: Record<string, number>
  ) {
    const holeId = holeIdByKey[`${loopId}:${holeNumber}`];
    if (!holeId) {
      console.error(
        `  ⚠️  No hole ID for loop=${loopId} hole=${holeNumber}, skipping tees.`
      );
      return;
    }
    for (const [colour, yards] of Object.entries(tees)) {
      allTeeRows.push({
        loop_hole_id: holeId,
        tee_colour: colour.charAt(0).toUpperCase() + colour.slice(1), // capitalise
        yards,
      });
    }
  }

  // Red, Yellow, Blue, Orange: green / white / yellow / red tees
  for (const name of ["Red", "Yellow", "Blue", "Orange"] as const) {
    const loopId = loopIdByName[name];
    if (!loopId) continue;
    for (const h of data.loops[name].holes_data) {
      pushTeeRows(loopId, h.hole, {
        green: h.green,
        white: h.white,
        yellow: h.yellow,
        red: h.red,
      });
    }
  }

  // White: green / white / purple / black tees
  {
    const loopId = loopIdByName["White"];
    if (loopId) {
      for (const h of data.loops["White"].holes_data) {
        pushTeeRows(loopId, h.hole, {
          green: h.green,
          white: h.white,
          purple: h.purple,
          black: h.black,
        });
      }
    }
  }

  // Par 3: purple / orange / blue tees
  {
    const loopId = loopIdByName["Par 3"];
    if (loopId) {
      for (const h of data.loops["Par 3"].holes_data) {
        pushTeeRows(loopId, h.hole, {
          purple: h.purple,
          orange: h.orange,
          blue: h.blue,
        });
      }
    }
  }

  const teeRows = await upsert(
    "loop_hole_tees",
    allTeeRows,
    "loop_hole_id,tee_colour"
  );
  counts.loop_hole_tees += teeRows.length;
  console.log(`  ✓ ${teeRows.length} loop hole tees upserted\n`);

  // ── Step E: Upsert all 14 course_combinations ────────────────────────────

  console.log("Seeding course combinations...");

  const combinationInsertRows: Array<{
    course_id: string;
    name: string;
    par: number;
    holes: number;
    loop_1_id: string;
    loop_2_id: string;
    notes: string | null;
  }> = [];

  for (const [name, combo] of Object.entries(data.combinations)) {
    const [loop1Name, loop2Name] = combo.loops;

    const loop1Id = loopIdByName[loop1Name];
    const loop2Id = loopIdByName[loop2Name];

    if (!loop1Id || !loop2Id) {
      console.error(
        `  ⚠️  Missing loop ID for combination "${name}" (${loop1Name}, ${loop2Name}) — skipping.`
      );
      continue;
    }

    combinationInsertRows.push({
      course_id: courseId,
      name,
      par: combo.par,
      holes: combo.holes,
      loop_1_id: loop1Id,
      loop_2_id: loop2Id,
      notes: combo.notes ?? null,
    });
  }

  const combinationRows = await upsert(
    "course_combinations",
    combinationInsertRows,
    "course_id,name"
  );
  counts.course_combinations += combinationRows.length;

  // Build name→id lookup for combinations
  const combinationIdByName: Record<string, string> = {};
  for (const row of combinationRows as Array<{ id: string; name: string }>) {
    combinationIdByName[row.name] = row.id;
  }

  console.log(`  ✓ ${combinationRows.length} combinations upserted\n`);

  // ── Step F: Upsert combination_tees (WHS data where known) ───────────────

  console.log("Seeding combination tees (WHS ratings)...");

  const combTeeRows: Array<{
    combination_id: string;
    tee_colour: string;
    gender: "m" | "w";
    slope_rating: number;
    course_rating: number;
  }> = [];

  for (const [combName, whsEntries] of Object.entries(whsByCombination)) {
    const combinationId = combinationIdByName[combName];
    if (!combinationId) {
      console.error(
        `  ⚠️  No combination ID found for "${combName}" — skipping WHS tees.`
      );
      continue;
    }
    for (const whs of whsEntries) {
      combTeeRows.push({
        combination_id: combinationId,
        tee_colour: whs.tee_colour,
        gender: whs.gender,
        slope_rating: whs.slope_rating,
        course_rating: whs.course_rating,
      });
    }
  }

  const combTeeInserted = await upsert(
    "combination_tees",
    combTeeRows,
    "combination_id,tee_colour,gender"
  );
  counts.combination_tees += combTeeInserted.length;
  console.log(`  ✓ ${combTeeInserted.length} combination tees upserted\n`);

  // ── Summary ───────────────────────────────────────────────────────────────

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
