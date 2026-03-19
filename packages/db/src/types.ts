// ─── Database types (manually maintained until we generate from Supabase) ────
// Run `supabase gen types typescript` to regenerate this file once the
// Supabase project is connected.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Phase = 'mvp' | 'soon' | 'later' | 'future'
export type EventFormat = 'stableford' | 'strokeplay' | 'matchplay'
export type RsvpStatus = 'invited' | 'confirmed' | 'declined' | 'waitlisted'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'waived'

export interface User {
  id: string
  email: string
  display_name: string | null
  handicap_index: number | null
  created_at: string
}

export interface Course {
  id: string
  name: string
  club: string | null
  location: string | null
  holes_count: 9 | 18
  slope_rating: number | null
  course_rating: number | null
  par: number | null
  source: 'golfcourseapi' | 'manual'
  verified: boolean
  created_at: string
}

export interface CourseHole {
  id: string
  course_id: string
  hole_number: number
  par: number
  stroke_index: number
}

export interface CourseTee {
  id: string
  course_id: string
  tee_name: string          // 'Yellow', 'White', 'Red', etc.
  yardages: number[]        // per hole
  total_yards: number | null
  slope_rating: number | null
  course_rating: number | null
}

export interface Event {
  id: string
  created_by: string        // user id
  course_id: string
  tee_id: string | null
  name: string
  date: string              // ISO date
  format: EventFormat
  handicap_allowance_pct: number // 0.95 for Stableford, 1.0 for Stroke Play
  entry_fee_pence: number | null
  max_players: number | null
  group_size: number
  ntp_holes: number[]       // hole numbers designated NTP
  ld_holes: number[]        // hole numbers designated LD
  is_public: boolean
  finalised: boolean
  created_at: string
}

export interface EventPlayer {
  id: string
  event_id: string
  user_id: string | null    // null for anonymous/manual entries
  display_name: string
  handicap_index: number
  rsvp_status: RsvpStatus
  payment_status: PaymentStatus
  flight_number: number | null
  created_at: string
}

export interface Scorecard {
  id: string
  event_id: string
  event_player_id: string
  created_at: string
  submitted_at: string | null
}

export interface HoleScore {
  id: string
  scorecard_id: string
  hole_number: number
  gross_strokes: number | null  // null = pick-up
  created_at: string
}

export interface ContestEntry {
  id: string
  event_id: string
  hole_number: number
  type: 'ntp' | 'ld'
  event_player_id: string
  distance_cm: number | null
  created_at: string
}
