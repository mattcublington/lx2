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
  combination_id?: string | null
  round_type?: RoundType
  loop_id?: string | null
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
  round_type?: RoundType
  loop_id?: string | null
}

export interface HoleScore {
  id: string
  scorecard_id: string
  hole_number: number
  gross_strokes: number | null  // null = pick-up
  putts: number | null
  fairway_hit: boolean | null
  green_in_regulation: boolean | null
  miss_direction: string | null         // 'left' | 'right' | 'short' | 'long'
  bunker_shots: number | null
  penalties: number | null
  up_and_down: boolean | null
  sand_save: boolean | null
  input_method: string | null           // 'manual' | 'voice'
  voice_transcript: string | null
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

export interface EventRecap {
  id: string
  event_id: string
  commentary_group: string
  commentary_players: Json
  banter_group: string
  banter_players: Json
  stats_group: string
  stats_players: Json
  config: Json
  generated_at: string
  generated_by: string | null
  recap_slug: string | null
}

// ─── Club Platform Types ──────────────────────────────────────────────────────

export type ClubRole = 'admin' | 'secretary' | 'bar_staff' | 'pro_shop'
export type MembershipType = 'full' | 'junior' | 'senior' | 'associate' | 'visitor' | 'five_day'
export type MemberStatus = 'active' | 'suspended' | 'lapsed'
export type SlotType = 'member' | 'visitor' | 'society' | 'blocked'
export type BookingStatus = 'confirmed' | 'cancelled' | 'no_show'

export interface Club {
  id: string
  name: string
  slug: string
  address: string | null
  logo_url: string | null
  created_at: string
}

export interface CourseLoop {
  id: string
  club_id: string
  name: string
  holes: number
  par: number | null
  colour_hex: string | null
  sort_order: number
  created_at: string
}

export interface ClubUserRole {
  id: string
  club_id: string
  user_id: string
  role: ClubRole
  created_at: string
}

export interface ClubMember {
  id: string
  club_id: string
  user_id: string | null
  email: string
  display_name: string
  membership_type: MembershipType
  handicap_index: number | null
  status: MemberStatus
  cdh_number: string | null
  imported_at: string | null
  linked_at: string | null
  created_at: string
}

export interface TeeSheetRule {
  id: string
  club_id: string
  loop_id: string
  slot_interval_minutes: number
  capacity_per_slot: number
  open_time: string       // "HH:MM"
  close_time: string      // "HH:MM"
  member_only_until: string | null
  applies_weekdays: boolean
  applies_weekends: boolean
  valid_from: string      // ISO date
  valid_to: string | null
  created_at: string
}

export interface TeeSlot {
  id: string
  club_id: string
  loop_id: string
  slot_date: string       // ISO date
  slot_time: string       // "HH:MM"
  capacity: number
  booked_count: number
  slot_type: SlotType
  price_pence: number
  created_at: string
}

export interface TeeSlotWithLoop extends TeeSlot {
  course_loops: Pick<CourseLoop, 'name' | 'colour_hex'>
}

export interface Booking {
  id: string
  tee_slot_id: string
  user_id: string
  guests: number
  status: BookingStatus
  payment_id: string | null
  notes: string | null
  created_at: string
  cancelled_at: string | null
}

export interface BookingWithSlot extends Booking {
  tee_slots: Pick<TeeSlot, 'slot_date' | 'slot_time' | 'loop_id'>
  users?: Pick<User, 'display_name' | 'email'>
}

export interface ClubCompetition {
  id: string
  club_id: string
  name: string
  competition_date: string  // ISO date
  format: 'stableford' | 'strokeplay' | 'matchplay' | 'texas_scramble' | 'pairs_betterball'
  loop_ids: string[]
  entry_fee_pence: number
  max_entries: number | null
  entries_count: number
  notes: string | null
  status: 'scheduled' | 'entries_open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

// ─── Loop-based course structure ─────────────────────────────────────────────

export interface Loop {
  id: string
  course_id: string | null
  name: string
  holes: number
  notes: string | null
  created_at: string
}

export interface LoopHole {
  id: string
  loop_id: string
  hole_number: number
  par: number
  si_m: number | null
  si_w: number | null
}

export interface LoopHoleTee {
  id: string
  loop_hole_id: string
  tee_colour: string
  yards: number
}

export interface CourseCombination {
  id: string
  course_id: string | null
  name: string
  par: number
  holes: number
  loop_1_id: string
  loop_2_id: string
  notes: string | null
  created_at: string
}

export interface CombinationTee {
  id: string
  combination_id: string
  tee_colour: string
  gender: 'm' | 'w'
  slope_rating: number | null
  course_rating: number | null
}

// Extended event type with combination support
export type RoundType = '18' | '9'

export interface EventGroup {
  id: string
  event_id: string
  flight_number: number     // 1-based; matches event_players.flight_number
  tee_time: string | null   // "HH:MM" local time, or null
  start_hole: number        // default 1
  label: string | null      // e.g. "Group 1" or "Morning wave"
  created_at: string
}

// ─── Predictions engine types ────────────────────────────────────────────────

export type PredictionMarketType = 'outright' | 'head_to_head' | 'top_3' | 'over_under' | 'group_winner' | 'last_place'
export type PredictionMarketStatus = 'open' | 'suspended' | 'closed' | 'settled'
export type PredictionBetStatus = 'placed' | 'won' | 'lost' | 'void'

export interface PredictionConfig {
  id: string
  event_id: string
  enabled: boolean
  starting_credits: number
  max_bet_pct: number
  overround_pct: number
  h2h_overround_pct: number
  created_at: string
}

export interface PredictionBankroll {
  id: string
  event_id: string
  user_id: string
  credits: number
  created_at: string
}

export interface PredictionMarket {
  id: string
  event_id: string
  market_type: PredictionMarketType
  status: PredictionMarketStatus
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  settled_at: string | null
}

export interface PredictionSelection {
  id: string
  market_id: string
  event_player_id: string | null
  label: string
  odds_numerator: number
  odds_denominator: number
  is_winner: boolean | null
  dead_heat_divisor: number
  sort_order: number
  created_at: string
}

export interface PredictionBet {
  id: string
  market_id: string
  selection_id: string
  user_id: string
  event_id: string
  stake: number
  odds_numerator: number
  odds_denominator: number
  potential_payout: number
  status: PredictionBetStatus
  payout: number
  placed_at: string
  settled_at: string | null
}
