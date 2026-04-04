'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { COURSES, getCourse } from '@/lib/courses'
import type { Course, CourseHole } from '@/lib/courses'
import { startRound, searchUsers, getRecentlyPlayedWith, getRecentlyPlayedClubs } from './actions'
import ScorecardUpload from './ScorecardUpload'
import type { ExtractedCourseData } from '@/lib/scorecard-ocr'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DbCombo {
  id: string
  name: string
  par: number
  holes: number
  course_id: string
}

interface CombinationTee {
  combination_id: string
  tee_colour: string
  gender: string
  slope_rating: number
  course_rating: number
}

interface Props {
  userId: string
  displayName: string
  handicapIndex: number | null
  dbCombinations: DbCombo[] | null
  combinationTees: CombinationTee[]
  extraCourses: Course[]
}

type Step = 'venue' | 'scorecard-upload' | 'players' | 'groups' | 'combination' | 'settings'

interface Player {
  name: string
  handicapIndex: string
  isUser: boolean
  gender: 'm' | 'w'
  teeOverride: string | null
}

interface WizardState {
  step: Step
  selectedClub: string | null
  courseId: string
  dbCombinationId: string | null
  players: Player[]
  format: 'stableford' | 'strokeplay' | 'matchplay'
  tee: string
  roundType: '18' | '9'
  ntpEnabled: boolean
  ldEnabled: boolean
  ntpHoles: number[]
  ldHoles: number[]
  allowancePct: number
  balls: string[]
  // Event / advanced options
  eventDate: string          // YYYY-MM-DD, default today
  inviteLink: boolean        // open registration via shared link
  groupSize: 2 | 3 | 4      // players per group
  entryFeeStr: string        // raw input string, parsed on submit
  groupAssignments: number[][] // groups of player indices (into active players list)
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const FE = {
  forestPrimary: '#1A2E1A',
  greenDark: '#0D631B',
  greenLight: '#0a4f15',
  sageBg: '#F0F4EC',
  white: '#FFFFFF',
  onPrimary: '#1A2E1A',
  onSecondary: '#44483E',
  onTertiary: '#72786E',
  berryTertiary: '#923357',
  shadowFloat: '0 4px 12px rgba(26, 28, 28, 0.04)',
  shadowHover: '0 6px 16px rgba(26, 28, 28, 0.08)',
  borderGhost: '1px solid rgba(26, 28, 28, 0.12)',
  gradientGreen: 'linear-gradient(135deg, #0D631B 0%, #0a4f15 100%)',
} as const

const font = {
  display: "'Manrope', sans-serif",
  body: "'Lexend', sans-serif",
} as const


const TEE_TO_DB_COLOUR: Record<string, string> = {
  'Green': 'Green', 'White': 'White', 'Yellow/Purple': 'Purple',
  'Red/Black': 'Black', 'Yellow': 'Yellow', 'Purple': 'Purple',
  'Black': 'Black', 'Red': 'Red', 'Blue': 'Blue',
}

// Must be declared before any component that references them (avoids TDZ in prod bundles)
const inputFieldStyle: React.CSSProperties = {
  width: '100%', padding: '0.875rem 1rem',
  background: '#FFFFFF', border: '1px solid rgba(26, 28, 28, 0.12)', borderRadius: 12,
  fontFamily: "'Lexend', sans-serif", fontSize: 16, color: '#1A2E1A',
  outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s ease-in-out',
}

const dropdownStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem',
  border: '1px solid rgba(26, 28, 28, 0.12)', borderRadius: 12,
  fontFamily: "'Lexend', sans-serif", fontSize: 15, color: '#1A2E1A',
  background: `#FFFFFF url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2372786E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.75rem center`,
  appearance: 'none', paddingRight: '2.5rem',
  cursor: 'pointer', outline: 'none',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getVenues(allCourses: Course[]) {
  const seen = new Set<string>()
  const venues: { club: string; location: string; country: string; continent: string; count: number }[] = []
  for (const c of allCourses) {
    if (!seen.has(c.club)) {
      seen.add(c.club)
      venues.push({ club: c.club, location: c.location, country: c.country, continent: c.continent, count: allCourses.filter(x => x.club === c.club).length })
    }
  }
  return venues
}

function getCoursesForClub(club: string, allCourses: Course[]) {
  return allCourses.filter(c => c.club === club)
}

function shortName(name: string): string {
  const after = name.split('—').pop()?.trim() ?? name
  return after.replace('/', ' / ')
}

function venueDisplayName(club: string): string {
  return club.replace(/ Golf Club$/i, '').replace(/ GC$/i, '')
}

function defaultTee(courseId: string): string {
  const course = getCourse(courseId)
  if (!course) return 'White'
  return course.tees.includes('White') ? 'White' : (course.tees[0] ?? 'White')
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const FIRST_COURSE = COURSES[0]!.id

// ── Shared components ──────────────────────────────────────────────────────────

// Step order for stepper: Club=0, Course=1, Players=2, Settings=3
function stepIndex(step: Step): number {
  if (step === 'venue' || step === 'scorecard-upload') return 0
  if (step === 'combination') return 1
  if (step === 'players') return 2
  return 3 // settings
}

function StepBar({ step }: { step: Step }) {
  const current = stepIndex(step)
  const isAllDone = step === 'settings'
  const steps = ['Club', 'Course', 'Players', 'Settings']

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '0 1.25rem 1.5rem', position: 'relative', flexShrink: 0,
    }}>
      {/* Background progress line */}
      <div style={{
        position: 'absolute', top: 16, left: 'calc(1.25rem + 16px)',
        right: 'calc(1.25rem + 16px)', height: 2,
        background: 'rgba(26, 28, 28, 0.12)', zIndex: 0,
      }} />
      {/* Filled progress line */}
      <div style={{
        position: 'absolute', top: 16, left: 'calc(1.25rem + 16px)',
        height: 2, background: FE.greenDark, zIndex: 1, transition: 'width 0.3s ease-in-out',
        width: isAllDone ? 'calc(100% - 2.5rem - 32px)' : `${(current / (steps.length - 1)) * 100}%`,
      }} />

      {steps.map((label, i) => {
        const done = isAllDone || i < current
        const active = !isAllDone && i === current
        return (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2, flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: done || active ? FE.gradientGreen : FE.white,
              border: done || active ? 'none' : '2px solid rgba(26, 28, 28, 0.12)',
              boxShadow: active ? '0 0 0 4px rgba(13, 99, 27, 0.1)' : 'none',
              transition: 'all 0.2s ease-in-out',
            }}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : active ? (
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: FE.white }} />
              ) : (
                <span style={{ fontFamily: font.display, fontWeight: 600, fontSize: 14, color: FE.onTertiary }}>
                  {i + 1}
                </span>
              )}
            </div>
            <span style={{
              fontFamily: font.body, fontSize: 11, fontWeight: 500,
              color: done || active ? FE.greenDark : FE.onTertiary,
              transition: 'color 0.2s',
            }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Go back"
      style={{
        width: 40, height: 40, background: 'transparent', border: 'none',
        borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: FE.forestPrimary, fontSize: 20,
        transition: 'all 0.2s ease-in-out',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,28,28,0.05)'; e.currentTarget.style.transform = 'translateX(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function PrimaryButton({
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '1.125rem',
        background: disabled ? 'rgba(26,28,28,0.12)' : FE.gradientGreen,
        color: disabled ? FE.onTertiary : FE.white,
        border: 'none', borderRadius: 16,
        fontFamily: font.display, fontWeight: 700, fontSize: 16,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : '0 8px 24px rgba(13, 99, 27, 0.15)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(13, 99, 27, 0.25)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = disabled ? 'none' : '0 8px 24px rgba(13, 99, 27, 0.15)' }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {children}
    </button>
  )
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flexShrink: 0,
      background: FE.white,
      padding: '1rem 1.25rem',
      paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      boxShadow: '0 -4px 12px rgba(26, 28, 28, 0.1)', zIndex: 50,
    }}>
      {children}
    </div>
  )
}

function SearchInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
      <svg
        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="16" height="16" viewBox="0 0 16 16" fill="none"
      >
        <circle cx="6.5" cy="6.5" r="5" stroke={FE.onTertiary} strokeWidth="1.5"/>
        <path d="M10.5 10.5 L14 14" stroke={FE.onTertiary} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="done"
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        style={{
          width: '100%', padding: '0.875rem 1rem 0.875rem 3rem',
          background: FE.white, border: FE.borderGhost, borderRadius: 16,
          fontFamily: font.body, fontSize: 16, color: FE.onPrimary,
          boxShadow: FE.shadowFloat, outline: 'none', boxSizing: 'border-box',
          transition: 'all 0.2s ease-in-out',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 99, 27, 0.1)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = FE.shadowFloat }}
      />
    </div>
  )
}

// ── Screen 1: Course Selection ─────────────────────────────────────────────────


type VenueFilter = 'all' | 'nearby' | 'recent'

function VenueStep({
  selectedClub,
  onSelect,
  onNext,
  onAddCourse,
  allCourses,
}: {
  selectedClub: string | null
  onSelect: (club: string) => void
  onNext: () => void
  onAddCourse: () => void
  allCourses: Course[]
}) {
  const venues = getVenues(allCourses)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<VenueFilter>('all')
  const [recentClubs, setRecentClubs] = useState<{ club: string; location: string; country: string; lastPlayed: string }[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  // Load recently played clubs when "Recent" tab is activated
  useEffect(() => {
    if (filter === 'recent' && recentClubs.length === 0 && !loadingRecent) {
      setLoadingRecent(true)
      getRecentlyPlayedClubs().then(clubs => {
        setRecentClubs(clubs)
        setLoadingRecent(false)
      })
    }
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle nearby tab
  const handleNearby = () => {
    if (filter === 'nearby') { setFilter('all'); return }
    setFilter('nearby')
    setNearbyLoading(true)
    setNearbyError(null)
    if (!navigator.geolocation) {
      setNearbyError('Location not supported on this device')
      setNearbyLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        // GPS obtained — but courses don't have coordinates yet
        setNearbyLoading(false)
        setNearbyError('Nearby search coming soon — GPS courses are being added')
      },
      () => {
        setNearbyLoading(false)
        setNearbyError('Location access denied. Enable location in your browser settings.')
      },
      { timeout: 8000 }
    )
  }

  // Build venue list based on active filter
  const getFilteredVenues = () => {
    if (filter === 'recent') {
      // Match recent clubs against known venues
      const recentClubNames = new Set(recentClubs.map(r => r.club))
      const matched = venues.filter(v => recentClubNames.has(v.club))
      if (!search) return matched
      return matched.filter(v =>
        v.club.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase())
      )
    }

    // 'all' or 'nearby' (nearby falls back to all for now)
    if (!search) return venues
    return venues.filter(v =>
      v.club.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase()) ||
      v.country.toLowerCase().includes(search.toLowerCase())
    )
  }

  const filtered = getFilteredVenues()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 1.25rem', paddingBottom: 16 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="nrw-step-title">
            Where are you playing?
          </h1>
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Search clubs" />

        {/* Filter tabs: Nearby / Recently played */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={handleNearby}
            style={{
              flex: 1, padding: '0.625rem 0.75rem', borderRadius: 12,
              border: filter === 'nearby' ? `2px solid ${FE.greenDark}` : '2px solid rgba(26,28,28,0.12)',
              background: filter === 'nearby' ? 'rgba(13, 99, 27, 0.05)' : FE.white,
              fontFamily: font.body, fontWeight: 500, fontSize: 14,
              color: filter === 'nearby' ? FE.greenDark : FE.onSecondary,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Nearby
          </button>
          <button
            onClick={() => setFilter(filter === 'recent' ? 'all' : 'recent')}
            style={{
              flex: 1, padding: '0.625rem 0.75rem', borderRadius: 12,
              border: filter === 'recent' ? `2px solid ${FE.greenDark}` : '2px solid rgba(26,28,28,0.12)',
              background: filter === 'recent' ? 'rgba(13, 99, 27, 0.05)' : FE.white,
              fontFamily: font.body, fontWeight: 500, fontSize: 14,
              color: filter === 'recent' ? FE.greenDark : FE.onSecondary,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Recently played
          </button>
        </div>

        {/* Nearby loading / error state */}
        {filter === 'nearby' && nearbyLoading && (
          <div style={{ padding: '1.5rem', textAlign: 'center', fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
            Requesting location&hellip;
          </div>
        )}
        {filter === 'nearby' && nearbyError && (
          <div style={{
            padding: '1rem', marginBottom: '1rem', borderRadius: 12,
            background: 'rgba(13, 99, 27, 0.05)', border: '1px solid rgba(13, 99, 27, 0.15)',
            fontFamily: font.body, fontSize: 14, color: FE.onSecondary, textAlign: 'center',
          }}>
            {nearbyError}
          </div>
        )}

        {/* Recently played loading */}
        {filter === 'recent' && loadingRecent && (
          <div style={{ padding: '1.5rem', textAlign: 'center', fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
            Loading recent clubs&hellip;
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map(venue => {
            const selected = selectedClub === venue.club
            return (
              <div
                key={venue.club}
                onClick={() => onSelect(venue.club)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelect(venue.club)}
                style={{
                  display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: selected ? 'rgba(13, 99, 27, 0.05)' : FE.white,
                  borderRadius: 12, cursor: 'pointer', marginBottom: '0.5rem',
                  boxShadow: FE.shadowFloat,
                  borderLeft: selected ? `4px solid ${FE.greenDark}` : '4px solid transparent',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = FE.shadowHover }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat }}
              >
                {/* Venue icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="3" x2="5" y2="21" stroke={FE.greenDark} strokeWidth="2" strokeLinecap="round"/>
                    <path d="M5 3 L19 8 L5 13 Z" fill={FE.greenDark}/>
                    <line x1="3" y1="21" x2="8" y2="21" stroke={FE.greenDark} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 16, color: FE.onPrimary, marginBottom: '0.125rem' }}>
                    {venueDisplayName(venue.club)}
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, lineHeight: 1.4 }}>
                    {venue.location}, {venue.country} · {venue.count} {venue.count === 1 ? 'course' : 'courses'}
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && !nearbyLoading && !loadingRecent && (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: font.body, fontSize: 15, color: FE.onTertiary }}>
              {filter === 'recent' ? 'No recently played clubs' : search ? <>No clubs found matching &ldquo;{search}&rdquo;</> : 'No clubs found'}
            </div>
          )}
        </div>

        {/* Add a course via scorecard photo */}
        <div
          onClick={onAddCourse}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onAddCourse()}
          style={{
            display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
            background: FE.white, borderRadius: 12, cursor: 'pointer',
            boxShadow: FE.shadowFloat, border: `1px dashed rgba(13, 99, 27, 0.3)`,
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = FE.shadowHover; e.currentTarget.style.borderColor = FE.greenDark }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat; e.currentTarget.style.borderColor = 'rgba(13, 99, 27, 0.3)' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="13" rx="2" stroke={FE.greenDark} strokeWidth="1.5"/>
              <circle cx="12" cy="12.5" r="3" stroke={FE.greenDark} strokeWidth="1.5"/>
              <circle cx="17" cy="9" r="1" fill={FE.greenDark}/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 16, color: FE.greenDark, marginBottom: '0.125rem' }}>
              Add a course
            </div>
            <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, lineHeight: 1.4 }}>
              Photograph a scorecard and we&apos;ll extract the data
            </div>
          </div>
        </div>
      </div>

      <BottomBar>
        <PrimaryButton onClick={onNext} disabled={!selectedClub}>
          Next: Course
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PrimaryButton>
      </BottomBar>
    </div>
  )
}

// ── Player Picker Sheet (GolfGameBook-style full-screen overlay) ──────────────

interface RecentPlayer {
  id: string | null
  displayName: string
  handicapIndex: number | null
}

function PlayerPickerSheet({
  groupIdx,
  groupSize,
  currentPlayers,
  allPlayers,
  onAdd,
  onClose,
}: {
  groupIdx: number
  groupSize: number
  currentPlayers: number[] // indices into allPlayers
  allPlayers: Player[]
  onAdd: (name: string, hcp: string) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; displayName: string; handicapIndex: number | null }[]>([])
  const [searching, setSearching] = useState(false)
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualHcp, setManualHcp] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getRecentlyPlayedWith().then(r => { setRecentPlayers(r); setLoadingRecent(false) })
  }, [])

  useEffect(() => {
    if (showManualForm) requestAnimationFrame(() => nameRef.current?.focus())
  }, [showManualForm])

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await searchUsers(q)
    setSearchResults(results)
    setSearching(false)
  }

  const addPlayer = (name: string, hcp: string) => {
    onAdd(name, hcp)
  }

  // Filter out already-added players from recent list
  const addedNames = new Set(allPlayers.map(p => p.name.toLowerCase()))
  const filteredRecent = recentPlayers.filter(r => !addedNames.has(r.displayName.toLowerCase()))

  // Filtered search results (also exclude already added)
  const filteredSearch = searchResults.filter(r => !addedNames.has(r.displayName.toLowerCase()))

  const slotsTotal = groupSize
  const slotsFilled = currentPlayers.length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: FE.sageBg,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.25s ease-out',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .nrw-step-title {
          margin: 0;
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 24px;
          color: #1A2E1A;
          letter-spacing: -0.01em;
          margin-bottom: 0.5rem;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(26,28,28,0.08)',
        background: FE.white,
      }}>
        <div style={{ width: 60 }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: FE.forestPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Group {groupIdx + 1}
          </div>
          <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary }}>
            {slotsFilled}/{slotsTotal}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: FE.greenDark, color: '#fff',
            fontFamily: font.display, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '12px 20px', background: FE.white }}>
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke={FE.greenDark} strokeWidth="1.5"/>
            <path d="M10.5 10.5 L14 14" stroke={FE.greenDark} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text" value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search from all users"
            style={{
              ...inputFieldStyle, paddingLeft: 38,
              borderColor: 'rgba(13,99,27,0.2)',
            }}
          />
        </div>
      </div>

      {/* Group slots row */}
      <div style={{
        padding: '12px 20px', background: FE.white,
        borderBottom: '1px solid rgba(26,28,28,0.08)',
        display: 'flex', gap: 16, justifyContent: 'center',
      }}>
        {Array.from({ length: slotsTotal }).map((_, i) => {
          const playerIdx = currentPlayers[i]
          const player = playerIdx != null ? allPlayers[playerIdx] : null
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: player ? `2px solid ${FE.greenDark}` : '2px dashed rgba(26,28,28,0.2)',
                background: player
                  ? (player.isUser ? 'linear-gradient(135deg, #0D631B 0%, #1a5c1a 100%)' : 'linear-gradient(135deg, rgba(13,99,27,0.15) 0%, rgba(61,107,26,0.1) 100%)')
                  : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: font.display, fontWeight: 700, fontSize: 16,
                color: player?.isUser ? '#fff' : (player ? FE.greenDark : FE.onTertiary),
                position: 'relative',
              }}>
                {player ? initials(player.name) : (i + 1)}
              </div>
              <span style={{
                fontFamily: font.body, fontSize: 11, color: player ? FE.onPrimary : FE.onTertiary,
                maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
              }}>
                {player ? player.name.split(' ')[0] : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Search results (shown when searching) */}
        {searchQuery.trim().length >= 2 && (
          <div style={{ background: FE.white }}>
            {searching && (
              <div style={{ padding: '16px 20px', fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
                Searching&hellip;
              </div>
            )}
            {!searching && filteredSearch.length === 0 && searchQuery.trim().length >= 2 && (
              <div style={{ padding: '16px 20px', fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
                No users found
              </div>
            )}
            {filteredSearch.map(u => (
              <button
                key={u.id}
                onClick={() => addPlayer(u.displayName, u.handicapIndex?.toString() ?? '')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '14px 20px', background: FE.white, border: 'none',
                  borderBottom: '1px solid rgba(26,28,28,0.06)', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(13,99,27,0.15) 0%, rgba(61,107,26,0.1) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font.display, fontWeight: 700, fontSize: 14, color: FE.greenDark,
                }}>
                  {initials(u.displayName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                    {u.displayName}
                  </div>
                  {u.handicapIndex !== null && (
                    <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary }}>
                      {u.handicapIndex}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Add unregistered player / manual form */}
        {searchQuery.trim().length < 2 && (
          <>
            <button
              onClick={() => setShowManualForm(f => !f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '14px 20px', background: FE.white, border: 'none',
                borderBottom: '1px solid rgba(26,28,28,0.06)', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: FE.greenDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                Add unregistered player
              </span>
            </button>

            {showManualForm && (
              <div style={{ padding: '12px 20px', background: FE.white, borderBottom: '1px solid rgba(26,28,28,0.06)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    ref={nameRef}
                    type="text" value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Name"
                    enterKeyHint="next"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('picker-hcp')?.focus() } }}
                    style={{ ...inputFieldStyle, flex: 2 }}
                  />
                  <input
                    id="picker-hcp"
                    type="number" value={manualHcp}
                    onChange={e => setManualHcp(e.target.value)}
                    placeholder="HCP" min={0} max={54} step={0.1}
                    enterKeyHint="done"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (manualName.trim()) { addPlayer(manualName, manualHcp); setManualName(''); setManualHcp(''); setShowManualForm(false) } } }}
                    style={{ ...inputFieldStyle, flex: 1 }}
                  />
                </div>
                <button
                  onClick={() => { if (manualName.trim()) { addPlayer(manualName, manualHcp); setManualName(''); setManualHcp(''); setShowManualForm(false) } }}
                  disabled={!manualName.trim()}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                    background: manualName.trim() ? FE.greenDark : 'rgba(26,28,28,0.12)',
                    fontFamily: font.body, fontWeight: 600, fontSize: 14,
                    color: manualName.trim() ? '#fff' : FE.onTertiary,
                    cursor: manualName.trim() ? 'pointer' : 'default',
                  }}
                >
                  Add to group
                </button>
              </div>
            )}

            {/* Recently played with */}
            {filteredRecent.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  padding: '12px 20px 8px',
                  fontFamily: font.display, fontWeight: 700, fontSize: 15,
                  color: FE.forestPrimary,
                }}>
                  Recently played with
                </div>
                <div style={{ background: FE.white }}>
                  {filteredRecent.map((player, i) => (
                    <button
                      key={player.id ?? `guest-${i}`}
                      onClick={() => addPlayer(player.displayName, player.handicapIndex?.toString() ?? '')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: '14px 20px', background: FE.white, border: 'none',
                        borderBottom: '1px solid rgba(26,28,28,0.06)', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(13,99,27,0.15) 0%, rgba(61,107,26,0.1) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: font.display, fontWeight: 700, fontSize: 14, color: FE.greenDark,
                      }}>
                        {initials(player.displayName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                          {player.displayName}
                        </div>
                        {player.handicapIndex !== null && (
                          <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary }}>
                            {player.handicapIndex}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: '2px solid rgba(26,28,28,0.15)',
                        flexShrink: 0,
                      }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingRecent && filteredRecent.length === 0 && (
              <div style={{ padding: '24px 20px', textAlign: 'center', fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
                Loading recent players&hellip;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Screen 2: Player Management (GolfGameBook-style groups) ─────────────────

function PlayersStep({
  players,
  groupSize,
  groupAssignments,
  onChange,
  onGroupAssignmentsChange,
  onNext,
}: {
  players: Player[]
  groupSize: 2 | 3 | 4
  groupAssignments: number[][]
  onChange: (players: Player[]) => void
  onGroupAssignmentsChange: (assignments: number[][]) => void
  onNext: () => void
}) {
  const [pickerGroup, setPickerGroup] = useState<number | null>(null)

  // Initialize groups: put user (index 0) in group 1
  useEffect(() => {
    if (groupAssignments.length === 0) {
      onGroupAssignmentsChange([[0]])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addPlayerToGroup = (groupIdx: number, name: string, hcp: string) => {
    if (!name.trim()) return
    const newPlayer: Player = { name: name.trim(), handicapIndex: hcp, isUser: false, gender: 'm', teeOverride: null }
    const newPlayers = [...players, newPlayer]
    const newIdx = newPlayers.length - 1
    const newGroups = groupAssignments.map(g => [...g])
    if (!newGroups[groupIdx]) newGroups[groupIdx] = []
    newGroups[groupIdx]!.push(newIdx)
    onChange(newPlayers)
    onGroupAssignmentsChange(newGroups)
  }

  const removeFromGroup = (groupIdx: number, playerIdx: number) => {
    if (players[playerIdx]?.isUser) return
    const newGroups = groupAssignments.map(g => [...g])
    newGroups[groupIdx] = newGroups[groupIdx]!.filter(i => i !== playerIdx)
    onGroupAssignmentsChange(newGroups)
  }

  const addGroup = () => {
    onGroupAssignmentsChange([...groupAssignments, []])
  }

  const canProceed = players[0]?.name.trim() !== ''

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 1.25rem', paddingBottom: 16 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="nrw-step-title">
            Who&rsquo;s playing?
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary, lineHeight: 1.5 }}>
            Add players to your groups
          </p>
        </div>

        {/* Group cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupAssignments.map((playerIndices, gIdx) => {
            const emptySlots = Math.max(0, groupSize - playerIndices.length)
            return (
              <div key={gIdx} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: FE.shadowFloat }}>
                {/* Green gradient header */}
                <div style={{
                  background: FE.gradientGreen,
                  padding: '12px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontFamily: font.display, fontSize: 15, letterSpacing: '0.02em' }}>
                    Group&nbsp;&nbsp;{gIdx + 1}
                  </span>
                  {groupAssignments.length > 1 && playerIndices.every(i => !players[i]?.isUser) && (
                    <button
                      onClick={() => {
                        const newGroups = groupAssignments.filter((_, i) => i !== gIdx)
                        onGroupAssignmentsChange(newGroups)
                      }}
                      aria-label="Remove group"
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: font.body, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* 2-column grid of player slots */}
                <div style={{
                  background: FE.white,
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}>
                  {/* Filled player cards */}
                  {playerIndices.map(pIdx => {
                    const player = players[pIdx]
                    if (!player) return null
                    return (
                      <div key={pIdx} style={{
                        border: '1px solid #E0EBE0',
                        borderRadius: 12,
                        padding: '12px',
                        position: 'relative',
                        minHeight: 100,
                      }}>
                        {!player.isUser && (
                          <button
                            onClick={() => removeFromGroup(gIdx, pIdx)}
                            aria-label="Remove player"
                            style={{
                              position: 'absolute', top: 6, right: 6,
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.06)', border: 'none',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#72786E', padding: 0,
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: player.isUser
                            ? 'linear-gradient(135deg, #0D631B 0%, #1a5c1a 100%)'
                            : 'linear-gradient(135deg, rgba(13,99,27,0.15) 0%, rgba(61,107,26,0.1) 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: font.display, fontWeight: 700, fontSize: 14,
                          color: player.isUser ? '#fff' : FE.greenDark,
                          marginBottom: 8,
                        }}>
                          {initials(player.name || 'P')}
                        </div>
                        <div style={{
                          fontFamily: font.display, fontWeight: 600, fontSize: 14, color: FE.onPrimary,
                          marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {player.name}
                        </div>
                        <div style={{ fontFamily: font.body, fontSize: 12, color: '#6B8C6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          HCP:
                          <input
                            type="number"
                            value={player.handicapIndex}
                            onChange={e => {
                              const val = e.target.value
                              const num = parseFloat(val)
                              if (val !== '' && (isNaN(num) || num < 0 || num > 54)) return
                              const updated = [...players]
                              updated[pIdx] = { ...player, handicapIndex: val }
                              onChange(updated)
                            }}
                            placeholder="Enter handicap"
                            min={0}
                            max={54}
                            step={0.1}
                            style={{
                              width: 56,
                              padding: '2px 4px',
                              border: '1px solid #E0EBE0',
                              borderRadius: 6,
                              fontFamily: font.body,
                              fontSize: 12,
                              fontWeight: 600,
                              color: FE.onPrimary,
                              background: '#FAFCFA',
                              outline: 'none',
                              textAlign: 'center',
                              MozAppearance: 'textfield',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(13,99,27,0.1)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#E0EBE0'; e.currentTarget.style.boxShadow = 'none' }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {/* Empty add-player slots — tap opens picker sheet */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                      key={`empty-${gIdx}-${i}`}
                      onClick={() => setPickerGroup(gIdx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setPickerGroup(gIdx)}
                      style={{
                        border: '1.5px dashed rgba(13, 99, 27, 0.25)',
                        borderRadius: 12, padding: '12px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        minHeight: 100, transition: 'all 0.15s',
                        background: 'rgba(240, 244, 236, 0.3)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,99,27,0.5)'; e.currentTarget.style.background = 'rgba(240,244,236,0.6)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,99,27,0.25)'; e.currentTarget.style.background = 'rgba(240,244,236,0.3)' }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(13,99,27,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 8,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3V13M3 8H13" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: FE.greenDark }}>
                        Add Player
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Group button */}
        <button
          onClick={addGroup}
          style={{
            width: '100%', marginTop: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '14px', background: FE.white, borderRadius: 16,
            border: '1px dashed rgba(13, 99, 27, 0.3)',
            fontFamily: font.body, fontWeight: 500, fontSize: 15,
            color: FE.greenDark, cursor: 'pointer',
            boxShadow: FE.shadowFloat, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = FE.shadowHover }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13, 99, 27, 0.3)'; e.currentTarget.style.boxShadow = FE.shadowFloat }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,99,27,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          Add Group
        </button>
      </div>

      <BottomBar>
        <PrimaryButton onClick={onNext} disabled={!canProceed}>
          Next: Settings
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PrimaryButton>
      </BottomBar>

      {/* Full-screen player picker sheet */}
      {pickerGroup !== null && (
        <PlayerPickerSheet
          groupIdx={pickerGroup}
          groupSize={groupSize}
          currentPlayers={groupAssignments[pickerGroup] ?? []}
          allPlayers={players}
          onAdd={(name, hcp) => addPlayerToGroup(pickerGroup, name, hcp)}
          onClose={() => setPickerGroup(null)}
        />
      )}
    </div>
  )
}

// ── Screen 3: Tee / Combination Selection ──────────────────────────────────────

function CombinationStep({
  club,
  dbCombinations,
  onSelect,
  allCourses,
}: {
  club: string
  dbCombinations: DbCombo[] | null
  onSelect: (courseId: string, dbComboId: string | null) => void
  allCourses: Course[]
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const courses = getCoursesForClub(club, allCourses)

  const findDbCombo = (courseId: string): string | null => {
    if (!dbCombinations || dbCombinations.length === 0) return null
    const course = allCourses.find(c => c.id === courseId)
    if (!course) return null
    const short = shortName(course.name)
    return dbCombinations.find(dc => shortName(dc.name) === short || dc.name === course.name)?.id ?? null
  }

  const filtered = courses.filter(c =>
    !search || shortName(c.name).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 1.25rem', paddingBottom: 16 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="nrw-step-title">
            Which combination?
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary }}>
            {venueDisplayName(club)}
          </p>
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Search combinations" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(course => {
            const label = shortName(course.name)
            const hasWhs = course.slopeRating > 0
            const selected = selectedId === course.id
            return (
              <div
                key={course.id}
                onClick={() => setSelectedId(course.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedId(course.id)}
                style={{
                  background: selected ? 'rgba(13, 99, 27, 0.05)' : FE.white,
                  borderRadius: 16, padding: '1rem',
                  boxShadow: FE.shadowFloat, cursor: 'pointer',
                  borderLeft: `4px solid ${selected ? FE.greenDark : 'transparent'}`,
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = FE.shadowHover }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: font.display, fontWeight: 600, fontSize: 18, color: FE.forestPrimary }}>
                    {label}
                  </span>
                  {hasWhs && (
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
                      color: FE.greenDark, padding: '0.25rem 0.625rem', borderRadius: 12,
                      fontFamily: font.body, fontSize: 12, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}>
                      WHS
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.5 7L8.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontFamily: font.body, fontSize: 14, color: FE.onTertiary, lineHeight: 1.4 }}>
                  Par {course.par}
                  {hasWhs && ` · CR ${course.courseRating} · Slope ${course.slopeRating}`}
                </p>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: font.body, fontSize: 15, color: FE.onTertiary }}>
              No combinations found
            </div>
          )}
        </div>
      </div>

      <BottomBar>
        <PrimaryButton
          onClick={() => selectedId && onSelect(selectedId, findDbCombo(selectedId))}
          disabled={!selectedId}
        >
          Next: Players
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PrimaryButton>
      </BottomBar>
    </div>
  )
}

// Setting row label for settings card sections
function SettingLabel({ children }: { children: string }) {
  return (
    <label style={{
      display: 'block', fontFamily: font.body, fontWeight: 500, fontSize: 14,
      color: FE.onPrimary, marginBottom: '0.75rem',
    }}>
      {children}
    </label>
  )
}

// Extracted from SettingsStep to avoid inline component remount on every render
function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1.25rem', borderRadius: 24,
        border: active ? `2px solid ${FE.greenDark}` : '2px solid rgba(26,28,28,0.20)',
        background: active ? FE.gradientGreen : 'transparent',
        fontFamily: font.body, fontWeight: 500, fontSize: 15,
        color: active ? FE.white : FE.onPrimary,
        cursor: 'pointer', transition: 'all 0.2s ease-in-out',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(240,244,236,0.5)'; e.currentTarget.style.borderColor = 'rgba(26,28,28,0.30)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(26,28,28,0.20)' } }}
    >
      {children}
    </button>
  )
}

// ── Screen 4: Round Settings ───────────────────────────────────────────────────

// Maps every tee name that can appear in Course.tees to a visual swatch.
// Compound tees (Yellow/Purple, Red/Black) use a split-gradient circle.
const TEE_COLOUR_MAP: Record<string, { bg: string; border: string }> = {
  'Blue':          { bg: '#3B82F6', border: '#3B82F6' },
  'Green':         { bg: '#22C55E', border: '#22C55E' },
  'White':         { bg: '#FFFFFF', border: 'rgba(26,28,28,0.25)' },
  'Yellow':        { bg: '#FCD34D', border: '#ca9f1a' },
  'Yellow/Purple': { bg: 'linear-gradient(90deg,#FCD34D 50%,#A78BFA 50%)', border: 'rgba(26,28,28,0.15)' },
  'Purple':        { bg: '#A78BFA', border: '#A78BFA' },
  'Red':           { bg: '#EF4444', border: '#EF4444' },
  'Red/Black':     { bg: 'linear-gradient(90deg,#EF4444 50%,#1a1a1a 50%)', border: 'rgba(26,28,28,0.15)' },
  'Black':         { bg: '#1a1a1a', border: '#1a1a1a' },
}

function SettingsStep({
  state,
  onUpdate,
  onSubmit,
  submitting,
  combinationTees,
  allCourses,
}: {
  state: WizardState
  onUpdate: (partial: Partial<WizardState>) => void
  onSubmit: () => void
  submitting: boolean
  combinationTees: CombinationTee[]
  allCourses: Course[]
}) {
  const [advOpen, setAdvOpen] = useState(false)
  const course = allCourses.find(c => c.id === state.courseId)
  if (!course) return <div>Course not found</div>

  const par3Holes = course.holes.filter(h => h.par === 3).map(h => h.num)
  const par5Holes = course.holes.filter(h => h.par === 5).map(h => h.num)
  const anyHoles = course.holes.map(h => h.num)
  const toggle = (list: number[], hole: number) =>
    list.includes(hole) ? list.filter(h => h !== hole) : [...list, hole].sort((a, b) => a - b)

  const hasCourseRating = course.courseRating > 0 && course.slopeRating > 0
  const dbColour = TEE_TO_DB_COLOUR[state.tee] ?? state.tee
  const teeCrSlope = state.dbCombinationId
    ? combinationTees.find(t => t.combination_id === state.dbCombinationId && t.tee_colour === dbColour && t.gender === 'm')
    : undefined
  // Fallback chain: DB combination_tees → courses.ts teeRatings → courses.ts default (White)
  const displayCR = teeCrSlope?.course_rating ?? course.teeRatings?.[state.tee]?.courseRating ?? course.courseRating
  const displaySlope = teeCrSlope?.slope_rating ?? course.teeRatings?.[state.tee]?.slopeRating ?? course.slopeRating

  const activePlayers = state.players.filter((p, i) => i === 0 || p.name.trim() !== '')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 1.25rem', paddingBottom: 16 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="nrw-step-title" style={{ marginBottom: '0.25rem' }}>
            Round settings
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary }}>
            {shortName(course.name)} · Par {course.par}
          </p>
        </div>

        <div style={{ background: FE.white, borderRadius: 16, padding: '1.5rem', boxShadow: FE.shadowFloat }}>

          {/* Format */}
          <div style={{ marginBottom: '1.5rem' }}>
            <SettingLabel>Format</SettingLabel>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
              {(['stableford', 'strokeplay', 'matchplay'] as const).map(f => (
                <PillBtn key={f} active={state.format === f} onClick={() => onUpdate({ format: f })}>
                  {f === 'stableford' ? 'Stableford' : f === 'strokeplay' ? 'Stroke Play' : 'Match Play'}
                </PillBtn>
              ))}
            </div>
          </div>

          {/* Tee selector — coloured grid */}
          {course.tees.length > 1 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <SettingLabel>Tee</SettingLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: course.tees.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: '0.625rem',
              }}>
                {course.tees.map(tee => {
                  const swatch = TEE_COLOUR_MAP[tee] ?? { bg: '#ccc', border: '#ccc' }
                  const selected = state.tee === tee
                  const isLight = tee === 'White' || tee === 'Yellow'
                  const isGradient = swatch.bg.includes('gradient')
                  const textColor = isLight ? FE.onPrimary : '#FFFFFF'
                  const checkColor = isLight ? FE.greenDark : '#FFFFFF'
                  return (
                    <button
                      key={tee}
                      onClick={() => onUpdate({ tee })}
                      style={{
                        position: 'relative',
                        padding: '0.875rem 0.75rem',
                        borderRadius: 12,
                        border: selected ? `2.5px solid ${FE.greenDark}` : `2px solid ${swatch.border}`,
                        background: isGradient ? swatch.bg : swatch.bg,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        fontFamily: font.body, fontWeight: 600, fontSize: 14,
                        color: textColor,
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: selected ? `0 0 0 3px rgba(13,99,27,0.15)` : 'none',
                        outline: 'none',
                        minHeight: 48,
                      }}
                    >
                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8L6.5 11.5L13 4.5" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {tee}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Handicap / Course Rating */}
          {hasCourseRating && (
            <div style={{ marginBottom: '1.5rem' }}>
              <SettingLabel>Handicap</SettingLabel>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.25rem' }}>
                    Course Rating
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 20, fontWeight: 600, color: FE.onPrimary }}>
                    {typeof displayCR === 'number' ? displayCR.toFixed(1) : displayCR}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.25rem' }}>
                    Slope Rating
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 20, fontWeight: 600, color: FE.onPrimary }}>
                    {displaySlope}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Round length */}
          <div style={{ marginBottom: '1.5rem' }}>
            <SettingLabel>Round length</SettingLabel>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['18', '9'] as const).map(rt => (
                <PillBtn key={rt} active={state.roundType === rt} onClick={() => onUpdate({ roundType: rt })}>
                  {rt} holes
                </PillBtn>
              ))}
            </div>
          </div>

          {/* Advanced options */}
          <div>
            <div
              onClick={() => setAdvOpen(o => !o)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setAdvOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 0', cursor: 'pointer', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <span style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                Advanced options
              </span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ color: FE.onTertiary, transition: 'transform 0.3s ease-in-out', transform: advOpen ? 'rotate(180deg)' : 'none' }}
              >
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{
              maxHeight: advOpen ? 1200 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-in-out',
            }}>
              <div style={{ height: 1, background: 'rgba(26,28,28,0.06)', margin: '0 0 1.5rem' }} />

              {/* Handicap allowance */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.75rem' }}>
                  Handicap allowance
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="range" min={50} max={100} step={5}
                    value={state.allowancePct}
                    onChange={e => onUpdate({ allowancePct: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: FE.greenDark }}
                    aria-label="Handicap allowance percentage"
                  />
                  <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: FE.greenDark, minWidth: 48, textAlign: 'right' as const }}>
                    {state.allowancePct}%
                  </span>
                </div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, marginTop: 4 }}>
                  {state.allowancePct === 100 ? 'Full handicap (casual / society play)' : state.allowancePct === 95 ? 'WHS competition standard' : `${state.allowancePct}% of handicap index`}
                </div>
              </div>

              {/* Player tees & gender */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '1rem' }}>
                  Player handicaps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activePlayers.map((player) => {
                    const i = state.players.indexOf(player)
                    // Mock CR/SR lookup based on tee + gender
                    const playerTee = player.teeOverride ?? state.tee
                    const playerGender = player.gender
                    const playerDbColour = TEE_TO_DB_COLOUR[playerTee] ?? playerTee
                    const playerCrSlope = state.dbCombinationId
                      ? combinationTees.find(t =>
                          t.combination_id === state.dbCombinationId &&
                          t.tee_colour === playerDbColour &&
                          t.gender === playerGender
                        )
                      : undefined
                    // For women, use women's tee ratings when available
                    const playerTeeRatings = playerGender === 'w'
                      ? (course.teeRatingsWomen?.[playerTee] ?? course.teeRatings?.[playerTee])
                      : course.teeRatings?.[playerTee]
                    const fallbackCR = playerTeeRatings?.courseRating ?? displayCR
                    const fallbackSlope = playerTeeRatings?.slopeRating ?? displaySlope
                    const crDisplay = playerCrSlope ? playerCrSlope.course_rating.toFixed(1) : (hasCourseRating ? fallbackCR.toFixed(1) : '—')
                    const srDisplay = playerCrSlope ? playerCrSlope.slope_rating : (hasCourseRating ? fallbackSlope : '—')

                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: font.display, fontWeight: 600, fontSize: 14, color: FE.greenDark,
                          }}>
                            {initials(player.name)}
                          </div>
                          <span style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                            {player.name}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <select
                            value={player.teeOverride ?? state.tee}
                            onChange={e => {
                              const next = [...state.players]
                              next[i] = { ...next[i]!, teeOverride: e.target.value === state.tee ? null : e.target.value }
                              onUpdate({ players: next })
                            }}
                            style={dropdownStyle}
                            aria-label={`Tee for ${player.name}`}
                          >
                            {course.tees.map(tee => (
                              <option key={tee} value={tee}>{tee}</option>
                            ))}
                          </select>
                          <select
                            value={player.gender}
                            onChange={e => {
                              const next = [...state.players]
                              next[i] = { ...next[i]!, gender: e.target.value as 'm' | 'w' }
                              onUpdate({ players: next })
                            }}
                            style={dropdownStyle}
                            aria-label={`Gender for ${player.name}`}
                          >
                            <option value="m">M</option>
                            <option value="w">W</option>
                          </select>
                        </div>
                        <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, paddingLeft: '0.25rem', marginTop: '0.5rem' }}>
                          CR: {crDisplay} · SR: {srDisplay}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Side contests */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.75rem' }}>
                  Side contests
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.5rem' }}>
                  {par3Holes.length > 0 && (
                    <PillBtn
                      active={state.ntpEnabled}
                      onClick={() => {
                        if (state.ntpEnabled) {
                          onUpdate({ ntpEnabled: false, ntpHoles: [] })
                        } else {
                          onUpdate({ ntpEnabled: true, ntpHoles: course.holes.filter(h => h.par === 3).map(h => h.num).slice(0, 1) })
                        }
                      }}
                    >
                      🎯 Nearest the Pin
                    </PillBtn>
                  )}
                  <PillBtn
                    active={state.ldEnabled}
                    onClick={() => {
                      if (state.ldEnabled) {
                        onUpdate({ ldEnabled: false, ldHoles: [] })
                      } else {
                        const par5s = course.holes.filter(h => h.par === 5).map(h => h.num)
                        const ldDefault = par5s.length > 0 ? [par5s[0]!] : course.holes.filter(h => h.par === 4).map(h => h.num).slice(0, 1)
                        onUpdate({ ldEnabled: true, ldHoles: ldDefault })
                      }
                    }}
                  >
                    🏌️ Longest Drive
                  </PillBtn>
                </div>
              </div>

              {/* NTP holes — only when enabled */}
              {state.ntpEnabled && par3Holes.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.75rem' }}>
                    Nearest the pin <span style={{ color: FE.onTertiary, fontWeight: 400 }}>(par 3s)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.5rem' }}>
                    {par3Holes.map(h => {
                      const active = state.ntpHoles.includes(h)
                      return (
                        <button key={h} onClick={() => onUpdate({ ntpHoles: toggle(state.ntpHoles, h) })} style={{
                          width: 40, height: 40, borderRadius: 8,
                          border: active ? `2px solid ${FE.greenDark}` : FE.borderGhost,
                          background: active ? 'rgba(13,99,27,0.1)' : FE.white,
                          color: active ? FE.greenDark : FE.onTertiary,
                          fontFamily: font.body, fontSize: 14, fontWeight: active ? 700 : 400,
                          cursor: 'pointer',
                        }}>
                          {h}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* LD holes — only when enabled */}
              {state.ldEnabled && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.75rem' }}>
                    Longest drive
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.5rem' }}>
                    {(par5Holes.length > 0 ? par5Holes : anyHoles).map(h => {
                      const active = state.ldHoles.includes(h)
                      return (
                        <button key={h} onClick={() => onUpdate({ ldHoles: toggle(state.ldHoles, h) })} style={{
                          width: 40, height: 40, borderRadius: 8,
                          border: active ? `2px solid ${FE.greenDark}` : FE.borderGhost,
                          background: active ? 'rgba(13,99,27,0.1)' : FE.white,
                          color: active ? FE.greenDark : FE.onTertiary,
                          fontFamily: font.body, fontSize: 14, fontWeight: active ? 700 : 400,
                          cursor: 'pointer',
                        }}>
                          {h}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Event / society options ─────────────────────── */}
              <div style={{ height: 1, background: 'rgba(26,28,28,0.06)', margin: '1.5rem 0' }} />

              <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14, color: FE.onPrimary, marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                Society &amp; event options
              </div>

              {/* Date */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>
                  Date
                </div>
                <input
                  type="date"
                  value={state.eventDate}
                  onChange={e => onUpdate({ eventDate: e.target.value })}
                  style={inputFieldStyle}
                />
                <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, marginTop: 4 }}>
                  Default: today. Set a future date for planned events.
                </div>
              </div>

              {/* Invite link toggle */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary }}>
                    Open invite link
                  </span>
                  <button
                    onClick={() => onUpdate({ inviteLink: !state.inviteLink })}
                    aria-label="Toggle invite link"
                    style={{
                      width: 48, height: 28, borderRadius: 14, border: 'none',
                      background: state.inviteLink ? FE.greenDark : 'rgba(26,28,28,0.15)',
                      cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      position: 'absolute' as const, top: 3,
                      left: state.inviteLink ? 23 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </button>
                </div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, lineHeight: 1.4 }}>
                  Players join by sharing a link — perfect for society days. You&rsquo;ll manage groups and tee times from the organiser page.
                </div>
              </div>

              {/* Group size — show when more than 1 group worth of players or invite link on */}
              {(activePlayers.length > 4 || state.inviteLink) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.75rem' }}>
                    Group size
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {([2, 3, 4] as const).map(n => (
                      <PillBtn key={n} active={state.groupSize === n} onClick={() => onUpdate({ groupSize: n })}>
                        {n}-ball
                      </PillBtn>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry fee */}
              <div>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>
                  Entry fee
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: font.body, fontSize: 16, color: FE.onTertiary }}>£</span>
                  <input
                    type="number"
                    value={state.entryFeeStr}
                    onChange={e => onUpdate({ entryFeeStr: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    step={0.5}
                    enterKeyHint="done"
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    style={{ ...inputFieldStyle, width: 120 }}
                  />
                </div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, marginTop: 4 }}>
                  Leave blank for free entry
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomBar>
        <PrimaryButton onClick={onSubmit} disabled={submitting}>
          {submitting
            ? 'Creating…'
            : state.inviteLink
              ? 'Create event'
              : 'Start round'}
        </PrimaryButton>
      </BottomBar>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export default function NewRoundWizard({ displayName, handicapIndex, dbCombinations, combinationTees, extraCourses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]!

  const [state, setState] = useState<WizardState>({
    step: 'venue',
    selectedClub: null,
    courseId: FIRST_COURSE,
    dbCombinationId: null,
    players: [
      { name: displayName, handicapIndex: handicapIndex?.toString() ?? '', isUser: true, gender: 'm', teeOverride: null },
    ],
    format: 'stableford',
    tee: defaultTee(FIRST_COURSE),
    roundType: '18',
    ntpEnabled: false,
    ldEnabled: false,
    ntpHoles: [],
    ldHoles: [],
    allowancePct: 100,
    balls: ['White'],
    eventDate: today,
    inviteLink: false,
    groupSize: 4,
    entryFeeStr: '',
    groupAssignments: [],
  })

  // Uploaded courses from scorecard OCR (temporary, session-only)
  const [uploadedCourses, setUploadedCourses] = useState<Course[]>([])

  // All courses: static bundle + DB-approved OCR courses + session-uploaded courses
  const allCourses: Course[] = [...COURSES, ...extraCourses, ...uploadedCourses]

  const findCourse = (id: string) => allCourses.find(c => c.id === id)

  const update = (partial: Partial<WizardState>) => setState(s => ({ ...s, ...partial }))

  // Step order: venue → combination → players → settings
  const goBack = () => {
    if (state.step === 'scorecard-upload') update({ step: 'venue' })
    else if (state.step === 'combination') update({ step: 'venue' })
    else if (state.step === 'players') update({ step: 'combination' })
    else if (state.step === 'settings') update({ step: 'players' })
  }

  const selectVenue = (club: string) => update({ selectedClub: club })

  const proceedToCombination = () => {
    if (state.selectedClub) update({ step: 'combination' })
  }

  const handleScorecardDone = (data: ExtractedCourseData, uploadId: string) => {
    // Build a temporary Course object from the extracted data using the first tee
    const primaryTee = data.tees[0]
    if (!primaryTee) return

    const tempId = `upload-${uploadId}`
    const isMetres = data.distanceUnit === 'metres'
    const toYards = (m: number) => Math.round(m * 1.094)
    const holes: CourseHole[] = primaryTee.holes.map(h => ({
      num: h.hole, par: h.par, si: h.si,
      yards: isMetres ? toYards(h.yards) : h.yards,
      ...(isMetres ? { metres: h.yards } : {}),
      teeYards: Object.fromEntries(
        data.tees.map(t => {
          const match = t.holes.find(th => th.hole === h.hole)
          const dist = match?.yards ?? h.yards
          return [t.teeName, isMetres ? toYards(dist) : dist]
        })
      ),
    }))

    const tempCourse: Course = {
      id: tempId,
      name: `${data.courseName} — ${primaryTee.teeName}`,
      club: data.clubName || data.courseName,
      location: data.location ?? '',
      country: '',
      continent: '',
      holes,
      slopeRating: primaryTee.slopeRating ?? 113,
      courseRating: primaryTee.courseRating ?? 72,
      par: primaryTee.par ?? holes.reduce((sum, h) => sum + h.par, 0),
      tees: data.tees.map(t => t.teeName),
      defaultRatingTee: primaryTee.teeName,
      teeRatings: Object.fromEntries(
        data.tees
          .filter(t => t.slopeRating && t.courseRating)
          .map(t => [t.teeName, { slopeRating: t.slopeRating!, courseRating: t.courseRating! }])
      ),
      teeRatingsWomen: Object.fromEntries(
        data.tees
          .filter(t => t.slopeRatingWomen && t.courseRatingWomen)
          .map(t => [t.teeName, { slopeRating: t.slopeRatingWomen!, courseRating: t.courseRatingWomen! }])
      ),
    }

    // Add to COURSES so the rest of the wizard can find it
    if (!COURSES.find(c => c.id === tempId)) {
      COURSES.push(tempCourse)
    }
    setUploadedCourses(prev => [...prev, tempCourse])

    // Select this venue and jump to combination (or players if single course)
    update({
      selectedClub: tempCourse.club,
      courseId: tempId,
      tee: primaryTee.teeName,
      step: 'combination',
    })
  }

  const proceedFromPlayers = () => {
    update({ step: 'settings' })
  }

  const selectCombination = (courseId: string, dbComboId: string | null) => {
    const c = findCourse(courseId)
    const tee = c ? (c.tees.includes('White') ? 'White' : (c.tees[0] ?? 'White')) : 'White'
    const newNtpHoles = c ? c.holes.filter(h => h.par === 3).map(h => h.num).slice(0, 1) : []
    const par5s = c ? c.holes.filter(h => h.par === 5).map(h => h.num) : []
    const newLdHoles = par5s.length > 0 ? [par5s[0]!] : (c ? c.holes.filter(h => h.par === 4).map(h => h.num).slice(0, 1) : [])
    const ntpEnabled = state.ntpEnabled && newNtpHoles.length > 0
    update({
      courseId, dbCombinationId: dbComboId,
      tee,
      ntpEnabled,
      ldEnabled: state.ldEnabled,
      ntpHoles: ntpEnabled ? newNtpHoles : [],
      ldHoles: state.ldEnabled ? newLdHoles : [],
      step: 'players',
    })
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      try {
        const activePlayers = state.players
          .filter(p => p.isUser || p.name.trim() !== '')
          .map(p => ({
            name: p.name.trim(),
            handicapIndex: parseFloat(p.handicapIndex) || 0,
            isUser: p.isUser,
          }))

        const entryFeePence = state.entryFeeStr
          ? Math.round(parseFloat(state.entryFeeStr) * 100)
          : null

        // If this is an OCR-uploaded course, pass the course data to the server
        const uploadedCourse = state.courseId.startsWith('upload-')
          ? uploadedCourses.find(c => c.id === state.courseId)
          : null

        // Convert raw-index groupAssignments to active-player-index groupAssignments
        const rawToActive = new Map<number, number>()
        let activeIdx = 0
        state.players.forEach((p, rawIdx) => {
          if (p.isUser || p.name.trim() !== '') {
            rawToActive.set(rawIdx, activeIdx++)
          }
        })
        const convertedAssignments = state.groupAssignments
          .map(group => group.map(rawIdx => rawToActive.get(rawIdx)).filter((i): i is number => i !== undefined))
          .filter(group => group.length > 0)

        const url = await startRound({
          courseId: state.courseId,
          dbCombinationId: state.dbCombinationId,
          players: activePlayers,
          format: state.format,
          tee: state.tee,
          roundType: state.roundType,
          ntpHoles: state.ntpHoles,
          ldHoles: state.ldHoles,
          allowancePct: state.allowancePct,
          eventDate: state.eventDate,
          inviteLink: state.inviteLink,
          groupSize: state.groupSize,
          entryFeePence: entryFeePence && entryFeePence > 0 ? entryFeePence : null,
          groupAssignments: convertedAssignments,
          ...(uploadedCourse ? {
            uploadedCourse: {
              name: uploadedCourse.name,
              club: uploadedCourse.club,
              location: uploadedCourse.location,
              par: uploadedCourse.par,
              slopeRating: uploadedCourse.slopeRating,
              courseRating: uploadedCourse.courseRating,
              holesCount: uploadedCourse.holes.length,
            },
          } : {}),
        })
        router.push(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  const showBackButton = state.step !== 'venue'

  return (
    <div style={{ height: '100dvh', background: FE.sageBg, fontFamily: font.body, color: FE.onPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ maxWidth: 430, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {showBackButton ? (
            <BackButton onClick={goBack} />
          ) : (
            <a
              href="/play"
              aria-label="Back to dashboard"
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', borderRadius: 12,
                color: FE.forestPrimary, textDecoration: 'none',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>

        {/* Step bar */}
        <StepBar step={state.step} />

        {/* Error */}
        {error && (
          <div style={{
            margin: '0 1.25rem 1rem', padding: '12px 16px',
            background: '#FEE2E2', border: '1px solid #FCA5A5',
            borderRadius: 12, fontFamily: font.body, fontSize: 14,
            color: '#991B1B', lineHeight: 1.4, flexShrink: 0,
          }}>
            {error}
          </div>
        )}

        {/* Steps */}
        {state.step === 'venue' && (
          <VenueStep
            selectedClub={state.selectedClub}
            onSelect={selectVenue}
            onNext={proceedToCombination}
            onAddCourse={() => update({ step: 'scorecard-upload' })}
            allCourses={allCourses}
          />
        )}

        {state.step === 'scorecard-upload' && (
          <ScorecardUpload
            onDone={handleScorecardDone}
            onCancel={() => update({ step: 'venue' })}
          />
        )}

        {state.step === 'combination' && state.selectedClub && (
          <CombinationStep
            club={state.selectedClub}
            dbCombinations={dbCombinations}
            onSelect={selectCombination}
            allCourses={allCourses}
          />
        )}

        {state.step === 'players' && (
          <PlayersStep
            players={state.players}
            groupSize={state.groupSize}
            groupAssignments={state.groupAssignments}
            onChange={players => update({ players })}
            onGroupAssignmentsChange={groupAssignments => update({ groupAssignments })}
            onNext={proceedFromPlayers}
          />
        )}

        {state.step === 'settings' && (
          <SettingsStep
            state={state}
            onUpdate={update}
            onSubmit={handleSubmit}
            submitting={isPending}
            combinationTees={combinationTees}
            allCourses={allCourses}
          />
        )}
      </div>
    </div>
  )
}
