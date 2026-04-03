'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { COURSES, getCourse } from '@/lib/courses'
import type { Course, CourseHole } from '@/lib/courses'
import { startRound, searchUsers } from './actions'
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

function defaultNtpHoles(courseId: string): number[] {
  const course = getCourse(courseId)
  if (!course) return []
  const par3 = course.holes.find(h => h.par === 3)
  return par3 ? [par3.num] : []
}

function defaultLdHoles(courseId: string): number[] {
  const course = getCourse(courseId)
  if (!course) return []
  const par5s = course.holes.filter(h => h.par === 5).map(h => h.num)
  if (par5s.length > 0) return [par5s[0]!]
  return course.holes.filter(h => h.par === 4).map(h => h.num).slice(0, 1)
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const FIRST_COURSE = COURSES[0]!.id

// ── Shared components ──────────────────────────────────────────────────────────

// Step order for stepper: Course=0, Players=1, Settings=2
function stepIndex(step: Step): number {
  if (step === 'venue' || step === 'scorecard-upload') return 0
  if (step === 'players') return 1
  return 2 // combination + settings both show as last step
}

function StepBar({ step }: { step: Step }) {
  const current = stepIndex(step)
  const isAllDone = step === 'settings'
  const steps = ['Course', 'Players', 'Settings']

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '0 1.25rem 1.5rem', position: 'relative',
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
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: FE.white, padding: '1rem 1.25rem',
      boxShadow: '0 -2px 8px rgba(26, 28, 28, 0.06)', zIndex: 50,
    }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        {children}
      </div>
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

// Auto-detect user's likely continent from timezone
function guessUserContinent(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz.startsWith('Europe/')) return 'Europe'
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'Oceania'
    if (tz.startsWith('America/')) return 'North America'
    if (tz.startsWith('Asia/')) return 'Asia'
    if (tz.startsWith('Africa/')) return 'Africa'
  } catch { /* ignore */ }
  return ''
}

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
  const continents = [...new Set(venues.map(v => v.continent))].sort()

  // Auto-detect continent from timezone on mount
  const [continent, setContinent] = useState(() => {
    const guess = guessUserContinent()
    return continents.includes(guess) ? guess : ''
  })
  const [country, setCountry] = useState('')
  const [search, setSearch] = useState('')

  // Derive countries from venues in selected continent
  const countries = [...new Set(
    venues
      .filter(v => !continent || v.continent === continent)
      .map(v => v.country)
  )].sort()

  const filtered = venues.filter(v => {
    if (continent && v.continent !== continent) return false
    if (country && v.country !== country) return false
    if (!search) return true
    return v.club.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase()) ||
      v.country.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <div style={{ padding: '0 1.25rem', paddingBottom: 100 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 24, color: FE.forestPrimary, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
            Where are you playing?
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary }}>
            Select a golf club
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <select
              value={continent}
              onChange={e => { setContinent(e.target.value); setCountry('') }}
              style={dropdownStyle}
              aria-label="Filter by continent"
            >
              <option value="">All continents</option>
              {continents.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {countries.length > 1 && (
            <div style={{ flex: 1 }}>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={dropdownStyle}
                aria-label="Filter by country"
              >
                <option value="">All countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Search clubs or country" />

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
                  display: 'flex', gap: '1rem', padding: '1.25rem',
                  background: selected ? 'rgba(13, 99, 27, 0.05)' : FE.white,
                  borderRadius: 16, cursor: 'pointer', marginBottom: '1rem',
                  boxShadow: FE.shadowFloat,
                  borderLeft: selected ? `4px solid ${FE.greenDark}` : '4px solid transparent',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = FE.shadowHover }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat }}
              >
                {/* Venue icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="3" x2="5" y2="21" stroke={FE.greenDark} strokeWidth="2" strokeLinecap="round"/>
                    <path d="M5 3 L19 8 L5 13 Z" fill={FE.greenDark}/>
                    <line x1="3" y1="21" x2="8" y2="21" stroke={FE.greenDark} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 18, color: FE.onPrimary, marginBottom: '0.25rem' }}>
                    {venueDisplayName(venue.club)}
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 14, color: FE.onTertiary, lineHeight: 1.4 }}>
                    {venue.location}, {venue.country} · {venue.count} {venue.count === 1 ? 'course' : 'courses'}
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: font.body, fontSize: 15, color: FE.onTertiary }}>
              No clubs found matching &ldquo;{search}&rdquo;
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
            display: 'flex', gap: '1rem', padding: '1.25rem',
            background: FE.white, borderRadius: 16, cursor: 'pointer',
            boxShadow: FE.shadowFloat, border: `1px dashed rgba(13, 99, 27, 0.3)`,
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = FE.shadowHover; e.currentTarget.style.borderColor = FE.greenDark }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat; e.currentTarget.style.borderColor = 'rgba(13, 99, 27, 0.3)' }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="13" rx="2" stroke={FE.greenDark} strokeWidth="1.5"/>
              <circle cx="12" cy="12.5" r="3" stroke={FE.greenDark} strokeWidth="1.5"/>
              <circle cx="17" cy="9" r="1" fill={FE.greenDark}/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 18, color: FE.greenDark, marginBottom: '0.25rem' }}>
              Add a course
            </div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: FE.onTertiary, lineHeight: 1.4 }}>
              Photograph a scorecard and we&apos;ll extract the data
            </div>
          </div>
        </div>
      </div>

      <BottomBar>
        <PrimaryButton onClick={onNext} disabled={!selectedClub}>
          Next: Players
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PrimaryButton>
      </BottomBar>
    </>
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
  const [editingGroup, setEditingGroup] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editHcp, setEditHcp] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; displayName: string; handicapIndex: number | null }[]>([])
  const [searching, setSearching] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Initialize groups: put user (index 0) in group 1
  useEffect(() => {
    if (groupAssignments.length === 0) {
      onGroupAssignmentsChange([[0]])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus name input when editing starts
  useEffect(() => {
    if (editingGroup !== null) {
      requestAnimationFrame(() => nameRef.current?.focus())
    }
  }, [editingGroup])

  const cancelEditing = () => {
    setEditingGroup(null)
    setEditName('')
    setEditHcp('')
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const confirmAdd = (groupIdx: number, name: string, hcp: string) => {
    if (!name.trim()) return
    const newPlayer: Player = { name: name.trim(), handicapIndex: hcp, isUser: false, gender: 'm', teeOverride: null }
    const newPlayers = [...players, newPlayer]
    const newIdx = newPlayers.length - 1
    const newGroups = groupAssignments.map(g => [...g])
    if (!newGroups[groupIdx]) newGroups[groupIdx] = []
    newGroups[groupIdx]!.push(newIdx)
    onChange(newPlayers)
    onGroupAssignmentsChange(newGroups)
    cancelEditing()
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

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await searchUsers(q)
    setSearchResults(results)
    setSearching(false)
  }

  const selectSearchResult = (groupIdx: number, user: { displayName: string; handicapIndex: number | null }) => {
    confirmAdd(groupIdx, user.displayName, user.handicapIndex?.toString() ?? '')
  }

  const canProceed = players[0]?.name.trim() !== ''

  const compactInput: React.CSSProperties = { ...inputFieldStyle, padding: '8px 10px', fontSize: 14, borderRadius: 10 }

  return (
    <>
      <div style={{ padding: '0 1.25rem', paddingBottom: 100 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 24, color: FE.forestPrimary, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
            Who&rsquo;s playing?
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary, lineHeight: 1.5 }}>
            Add players to your groups
          </p>
        </div>

        {/* Group cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupAssignments.map((playerIndices, gIdx) => {
            const emptySlots = Math.max(0, groupSize - playerIndices.length - (editingGroup === gIdx ? 1 : 0))
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

                  {/* Inline add-player form */}
                  {editingGroup === gIdx && (
                    <div style={{
                      border: `2px solid ${FE.greenDark}`,
                      borderRadius: 12, padding: '10px',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                      {showSearch ? (
                        <>
                          <input
                            type="text" value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search by name\u2026" autoFocus
                            enterKeyHint="done"
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            style={compactInput}
                          />
                          {searching && <div style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary }}>Searching\u2026</div>}
                          {searchResults.length > 0 && (
                            <div style={{ border: FE.borderGhost, borderRadius: 8, overflow: 'hidden' }}>
                              {searchResults.map(u => (
                                <button key={u.id} onClick={() => selectSearchResult(gIdx, u)} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  width: '100%', padding: '8px 10px', background: FE.white, border: 'none',
                                  borderBottom: '1px solid rgba(26,28,28,0.06)', cursor: 'pointer', fontFamily: font.body,
                                }}>
                                  <span style={{ fontWeight: 500, fontSize: 13, color: FE.onPrimary }}>{u.displayName}</span>
                                  {u.handicapIndex !== null && <span style={{ fontSize: 12, color: FE.onTertiary }}>{u.handicapIndex}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setShowSearch(false)} style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                            &larr; Manual entry
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            ref={nameRef}
                            type="text" value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Name"
                            enterKeyHint="next"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`edit-hcp-${gIdx}`)?.focus() } }}
                            style={compactInput}
                          />
                          <input
                            id={`edit-hcp-${gIdx}`}
                            type="number" value={editHcp}
                            onChange={e => setEditHcp(e.target.value)}
                            placeholder="HCP" min={0} max={54} step={0.1}
                            enterKeyHint="done"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmAdd(gIdx, editName, editHcp) } }}
                            style={compactInput}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setShowSearch(true); setSearchQuery('') }} style={{
                              flex: 1, padding: '6px', borderRadius: 8, border: FE.borderGhost,
                              background: 'transparent', fontFamily: font.body, fontSize: 12,
                              color: FE.berryTertiary, cursor: 'pointer',
                            }}>
                              Search
                            </button>
                            <button onClick={cancelEditing} style={{
                              flex: 1, padding: '6px', borderRadius: 8, border: FE.borderGhost,
                              background: 'transparent', fontFamily: font.body, fontSize: 12,
                              color: FE.onTertiary, cursor: 'pointer',
                            }}>
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmAdd(gIdx, editName, editHcp)}
                              disabled={!editName.trim()}
                              style={{
                                flex: 1, padding: '6px', borderRadius: 8, border: 'none',
                                background: editName.trim() ? FE.greenDark : 'rgba(26,28,28,0.12)',
                                fontFamily: font.body, fontSize: 12, fontWeight: 600,
                                color: editName.trim() ? '#fff' : FE.onTertiary,
                                cursor: editName.trim() ? 'pointer' : 'default',
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Empty add-player slots */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                      key={`empty-${gIdx}-${i}`}
                      onClick={() => { cancelEditing(); setEditingGroup(gIdx) }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && (() => { cancelEditing(); setEditingGroup(gIdx) })()}
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
    </>
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

  const selectedCourse = courses.find(c => c.id === selectedId)

  return (
    <>
      <div style={{ padding: '0 1.25rem', paddingBottom: 100 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 24, color: FE.forestPrimary, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
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
          {selectedCourse ? `Continue with ${shortName(selectedCourse.name)}` : 'Select a combination'}
          {selectedId && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </PrimaryButton>
      </BottomBar>
    </>
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
    <>
      <div style={{ padding: '0 1.25rem', paddingBottom: 100 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 24, color: FE.forestPrimary, letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
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

          {/* Tee selector */}
          {course.tees.length > 1 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <SettingLabel>Tee</SettingLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {course.tees.map(tee => {
                  const swatch = TEE_COLOUR_MAP[tee] ?? { bg: '#ccc', border: '#ccc' }
                  const selected = state.tee === tee
                  return (
                    <label key={tee} onClick={() => onUpdate({ tee })} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                    }}>
                      {/* Radio indicator */}
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: selected ? `2px solid ${FE.greenDark}` : '2px solid rgba(26,28,28,0.25)',
                        background: 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease-in-out',
                      }}>
                        {selected && (
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: FE.greenDark }} />
                        )}
                      </div>
                      {/* Tee colour swatch */}
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: swatch.bg, border: `2px solid ${swatch.border}`,
                      }} />
                      <span style={{ fontFamily: font.body, fontSize: 15, color: FE.onPrimary, flex: 1 }}>
                        {tee}
                      </span>
                    </label>
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
                    const crDisplay = playerCrSlope ? playerCrSlope.course_rating.toFixed(1) : (hasCourseRating ? displayCR.toFixed(1) : '—')
                    const srDisplay = playerCrSlope ? playerCrSlope.slope_rating : (hasCourseRating ? displaySlope : '—')

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
    </>
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

  // Step order: venue → players → combination → settings
  const goBack = () => {
    if (state.step === 'scorecard-upload') update({ step: 'venue' })
    else if (state.step === 'players') update({ step: 'venue' })
    else if (state.step === 'combination') update({ step: 'players' })
    else if (state.step === 'settings') update({ step: 'combination' })
  }

  const selectVenue = (club: string) => update({ selectedClub: club })

  const proceedToPlayers = () => {
    if (state.selectedClub) update({ step: 'players' })
  }

  const handleScorecardDone = (data: ExtractedCourseData, uploadId: string) => {
    // Build a temporary Course object from the extracted data using the first tee
    const primaryTee = data.tees[0]
    if (!primaryTee) return

    const tempId = `upload-${uploadId}`
    const holes: CourseHole[] = primaryTee.holes.map(h => ({
      num: h.hole, par: h.par, si: h.si, yards: h.yards,
      teeYards: Object.fromEntries(
        data.tees.map(t => {
          const match = t.holes.find(th => th.hole === h.hole)
          return [t.teeName, match?.yards ?? h.yards]
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
    }

    // Add to COURSES so the rest of the wizard can find it
    if (!COURSES.find(c => c.id === tempId)) {
      COURSES.push(tempCourse)
    }
    setUploadedCourses(prev => [...prev, tempCourse])

    // Select this venue and jump to players
    update({
      selectedClub: tempCourse.club,
      courseId: tempId,
      tee: primaryTee.teeName,
      step: 'players',
    })
  }

  const proceedFromPlayers = () => {
    update({ step: 'combination' })
  }

  const selectCombination = (courseId: string, dbComboId: string | null) => {
    const newNtpHoles = defaultNtpHoles(courseId)
    const newLdHoles = defaultLdHoles(courseId)
    const ntpEnabled = state.ntpEnabled && newNtpHoles.length > 0
    update({
      courseId, dbCombinationId: dbComboId,
      tee: defaultTee(courseId),
      ntpEnabled,
      ldEnabled: state.ldEnabled,
      ntpHoles: ntpEnabled ? newNtpHoles : [],
      ldHoles: state.ldEnabled ? newLdHoles : [],
      step: 'settings',
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
    <div style={{ minHeight: '100dvh', background: FE.sageBg, fontFamily: font.body, color: FE.onPrimary }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center' }}>
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
            color: '#991B1B', lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        {/* Steps */}
        {state.step === 'venue' && (
          <VenueStep
            selectedClub={state.selectedClub}
            onSelect={selectVenue}
            onNext={proceedToPlayers}
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

        {state.step === 'combination' && state.selectedClub && (
          <CombinationStep
            club={state.selectedClub}
            dbCombinations={dbCombinations}
            onSelect={selectCombination}
            allCourses={allCourses}
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
