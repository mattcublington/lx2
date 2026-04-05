// Course data JSON schema — shared types for per-club source files.
// Used by scripts/generate-courses.ts to produce apps/web/src/lib/courses.ts
// and packages/db/migrations seed SQL.

export interface LoopHole {
  par: number
  si: number      // stroke index within the 18-hole combination; 0 = missing data
  yards: number   // yards for the defaultRatingTee (or White/standard tee)
  metres?: number
  teeYards?: Record<string, number>  // per-tee yardages: { Blue: 505, White: 492, 'Purple/Red': 470 }
}

export interface ClubLoop {
  holes: LoopHole[]  // exactly 9 holes; hole numbers are positional (1–9)
}

export interface TeeRatings {
  slopeRating: number
  courseRating: number
}

/**
 * A combination uses two 9-hole loops to form an 18-hole course.
 * front → holes 1–9, back → holes 10–18.
 *
 * SI handling:
 *   - If frontSI / backSI are provided they override the loop's own si values.
 *     Use this when the SI for a loop differs between combinations (Royal Canberra).
 *   - If omitted, the loop's si values are used directly.
 *     Suitable when SIs are consistent across all combinations (Cumberwell Park).
 */
export interface ClubCombination {
  id: string
  name: string
  front: string       // key into loops{}
  back: string        // key into loops{}
  par: number
  tees: string[]
  defaultRatingTee: string  // tee used for top-level slopeRating/courseRating; '' = no WHS data
  slopeRating: number       // 0 = no WHS data
  courseRating: number      // 0 = no WHS data
  teeRatings?: Record<string, TeeRatings>
  frontSI?: number[]  // 9 values; overrides loop si values for the front 9
  backSI?: number[]   // 9 values; overrides loop si values for the back 9
}

/**
 * A standard (non-loop) 18-hole course definition.
 * Use this for clubs that don't have multiple 9-hole loops.
 */
export interface CourseHoleSource {
  par: number
  si: number
  yards: number
  metres?: number
  teeYards?: Record<string, number>
}

export interface CourseSource {
  id: string
  name: string
  par: number
  tees: string[]
  defaultRatingTee: string
  slopeRating: number
  courseRating: number
  teeRatings?: Record<string, TeeRatings>
  holes: CourseHoleSource[]  // exactly 18 holes
}

export interface ClubData {
  club: string
  location: string
  country: string
  continent: string
  /**
   * Loop-based facility (e.g. 27-hole with multiple 9-hole loops).
   * Provide both `loops` and `combinations`.
   */
  loops?: Record<string, ClubLoop>
  combinations?: ClubCombination[]
  /**
   * Standard single/multi-course club.
   * Provide `courses` (18-hole entries directly).
   */
  courses?: CourseSource[]
}
