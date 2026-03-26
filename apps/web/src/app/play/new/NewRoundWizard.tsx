'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { COURSES, getCourse } from '@/lib/courses'
import { startRound, searchUsers } from './actions'

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
}

type Step = 'venue' | 'players' | 'combination' | 'settings'

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
  ntpHoles: number[]
  ldHoles: number[]
  allowancePct: number
  balls: string[]
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const FE = {
  forestPrimary: '#1A2E1A',
  greenDark: '#2D5016',
  greenLight: '#3D6B1A',
  sageBg: '#F0F4EC',
  white: '#FFFFFF',
  onPrimary: '#1A1C1C',
  onSecondary: '#44483E',
  onTertiary: '#72786E',
  berryTertiary: '#923357',
  shadowFloat: '0 4px 12px rgba(26, 28, 28, 0.04)',
  shadowHover: '0 6px 16px rgba(26, 28, 28, 0.08)',
  borderGhost: '1px solid rgba(26, 28, 28, 0.12)',
  gradientGreen: 'linear-gradient(135deg, #2D5016 0%, #3D6B1A 100%)',
} as const

const font = {
  display: "'Manrope', sans-serif",
  body: "'Lexend', sans-serif",
} as const

// ── Tee colour maps ────────────────────────────────────────────────────────────

const TEE_SWATCH: Record<string, { bg: string; border?: string; text: string }> = {
  'Green':         { bg: '#15803d', text: '#fff' },
  'White':         { bg: '#f9fafb', border: '#d1d5db', text: '#374151' },
  'Yellow/Purple': { bg: 'linear-gradient(90deg, #ca8a04 50%, #7c3aed 50%)', text: '#fff' },
  'Red/Black':     { bg: 'linear-gradient(90deg, #dc2626 50%, #1f2937 50%)', text: '#fff' },
  'Yellow':        { bg: '#ca8a04', text: '#fff' },
  'Purple':        { bg: '#7c3aed', text: '#fff' },
  'Red':           { bg: '#dc2626', text: '#fff' },
  'Blue':          { bg: '#2563eb', text: '#fff' },
  'Orange':        { bg: '#ea580c', text: '#fff' },
  'Gold':          { bg: '#b45309', text: '#fff' },
}

const TEE_TO_DB_COLOUR: Record<string, string> = {
  'Green': 'Green', 'White': 'White', 'Yellow/Purple': 'Purple',
  'Red/Black': 'Black', 'Yellow': 'Yellow', 'Purple': 'Purple',
  'Black': 'Black', 'Red': 'Red', 'Blue': 'Blue',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getVenues() {
  const seen = new Set<string>()
  const venues: { club: string; location: string; count: number }[] = []
  for (const c of COURSES) {
    if (!seen.has(c.club)) {
      seen.add(c.club)
      venues.push({ club: c.club, location: c.location, count: COURSES.filter(x => x.club === c.club).length })
    }
  }
  return venues
}

function getCoursesForClub(club: string) {
  return COURSES.filter(c => c.club === club)
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
  return course.holes.filter(h => h.par === 3).map(h => h.num).slice(0, 3)
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
  if (step === 'venue') return 0
  if (step === 'players') return 1
  return 2 // combination + settings both show as step 3
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
        width: isAllDone ? 'calc(100% - 2.5rem - 32px)' : current === 1 ? '50%' : current === 0 ? '0%' : '100%',
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
              boxShadow: active ? '0 0 0 4px rgba(45, 80, 22, 0.1)' : 'none',
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
        boxShadow: disabled ? 'none' : '0 8px 24px rgba(45, 80, 22, 0.15)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(45, 80, 22, 0.25)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = disabled ? 'none' : '0 8px 24px rgba(45, 80, 22, 0.15)' }}
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
        style={{
          width: '100%', padding: '0.875rem 1rem 0.875rem 3rem',
          background: FE.white, border: FE.borderGhost, borderRadius: 16,
          fontFamily: font.body, fontSize: 16, color: FE.onPrimary,
          boxShadow: FE.shadowFloat, outline: 'none', boxSizing: 'border-box',
          transition: 'all 0.2s ease-in-out',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.1)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = FE.shadowFloat }}
      />
    </div>
  )
}

// ── Screen 1: Course Selection ─────────────────────────────────────────────────

function VenueStep({
  selectedClub,
  onSelect,
  onNext,
}: {
  selectedClub: string | null
  onSelect: (club: string) => void
  onNext: () => void
}) {
  const [search, setSearch] = useState('')
  const venues = getVenues()
  const filtered = venues.filter(v =>
    !search || v.club.toLowerCase().includes(search.toLowerCase()) ||
    v.location.toLowerCase().includes(search.toLowerCase())
  )

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

        <SearchInput value={search} onChange={setSearch} placeholder="Search clubs" />

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
                  background: selected ? 'rgba(45, 80, 22, 0.05)' : FE.white,
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
                  background: 'linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%)',
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
                    {venue.location} · {venue.count} combinations
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

        <p style={{ fontFamily: font.body, fontSize: 14, color: FE.onTertiary, textAlign: 'center', lineHeight: 1.5 }}>
          More courses coming soon. Got a course to add?{' '}
          <a href="mailto:hello@lx2.golf" style={{ color: FE.greenDark, fontWeight: 500, textDecoration: 'none' }}>
            Let us know
          </a>
        </p>
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

// ── Player sub-components ───────────────────────────────────────────────────────

function AddPlayerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: FE.white, border: 'none', borderRadius: 16, cursor: 'pointer', boxShadow: FE.shadowFloat, transition: 'all 0.2s ease-in-out' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = FE.shadowHover; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = FE.shadowFloat; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(240, 244, 236, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M4 10H16" stroke={FE.greenDark} strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
      <span style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>{label}</span>
    </button>
  )
}

function PlayerCard({
  playerId, playerIndex, players, searchIdx, searchQuery, searchResults, searching,
  onUpdate, onSearch, onSetSearchIdx, onClearSearch, onRemove,
}: {
  playerId: string
  playerIndex: number
  players: Player[]
  searchIdx: number | null
  searchQuery: string
  searchResults: { id: string; displayName: string; handicapIndex: number | null }[]
  searching: boolean
  onUpdate: (index: number, field: keyof Player, value: string) => void
  onSearch: (q: string) => void
  onSetSearchIdx: (idx: number) => void
  onClearSearch: () => void
  onRemove: () => void
}) {
  return (
    <div style={{ background: FE.white, borderRadius: 16, padding: '1rem', boxShadow: FE.shadowFloat }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button onClick={onRemove} style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Remove
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor={`${playerId}-name`} style={{ display: 'block', fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>Name</label>
          <input
            id={`${playerId}-name`} type="text" value={players[playerIndex]?.name ?? ''}
            onChange={e => onUpdate(playerIndex, 'name', e.target.value)}
            placeholder="Enter name" style={inputFieldStyle}
            onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.08)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        <div style={{ width: 80 }}>
          <label htmlFor={`${playerId}-hcp`} style={{ display: 'block', fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>HCP</label>
          <input
            id={`${playerId}-hcp`} type="number" value={players[playerIndex]?.handicapIndex ?? ''}
            onChange={e => onUpdate(playerIndex, 'handicapIndex', e.target.value)}
            placeholder="18" min={0} max={54} step={0.1} style={inputFieldStyle}
            onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.08)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
      </div>
      {searchIdx === playerIndex ? (
        <div>
          <input
            type="text" value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by name…" autoFocus
            style={{ ...inputFieldStyle, borderColor: FE.greenDark, boxShadow: '0 0 0 3px rgba(45,80,22,0.08)' }}
          />
          {searching && <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, padding: '6px 2px' }}>Searching…</div>}
          {searchResults.length > 0 && (
            <div style={{ border: FE.borderGhost, borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <button key={u.id} onClick={() => {
                  onUpdate(playerIndex, 'name', u.displayName)
                  onUpdate(playerIndex, 'handicapIndex', u.handicapIndex?.toString() ?? '')
                  onClearSearch()
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px', background: FE.white, border: 'none', borderBottom: `1px solid rgba(26,28,28,0.06)`, cursor: 'pointer', fontFamily: font.body }}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: FE.onPrimary }}>{u.displayName}</span>
                  {u.handicapIndex !== null && <span style={{ fontSize: 13, color: FE.onTertiary }}>HCP {u.handicapIndex}</span>}
                </button>
              ))}
            </div>
          )}
          <button onClick={onClearSearch} style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4 }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => onSetSearchIdx(playerIndex)} style={{ fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.berryTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Search existing players
        </button>
      )}
    </div>
  )
}

// ── Screen 2: Player Management ────────────────────────────────────────────────

function PlayersStep({
  players,
  onChange,
  onNext,
}: {
  players: Player[]
  onChange: (players: Player[]) => void
  onNext: () => void
}) {
  const [showP3, setShowP3] = useState(false)
  const [showP4, setShowP4] = useState(false)
  const [searchIdx, setSearchIdx] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; displayName: string; handicapIndex: number | null }[]>([])
  const [searching, setSearching] = useState(false)

  const update = (index: number, field: keyof Player, value: string) => {
    const next = [...players]
    next[index] = { ...next[index]!, [field]: value }
    onChange(next)
  }

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await searchUsers(q)
    setSearchResults(results)
    setSearching(false)
  }

  const canProceed = () => {
    const you = players[0]
    if (!you?.name.trim()) return false
    return true
  }

  return (
    <>
      <div style={{ padding: '0 1.25rem', paddingBottom: 100 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 24, color: FE.forestPrimary, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
            Who&rsquo;s playing?
          </h1>
          <p style={{ margin: 0, fontFamily: font.body, fontSize: 16, color: FE.onSecondary, lineHeight: 1.5 }}>
            Add up to 4 players
          </p>
        </div>

        {/* You — read-only */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel>YOU</SectionLabel>
          <div style={{ background: FE.white, borderRadius: 16, padding: '1rem', boxShadow: FE.shadowFloat }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font.display, fontWeight: 700, fontSize: 16, color: FE.greenDark,
                }}>
                  {initials(players[0]?.name || 'You')}
                </div>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 15, color: FE.onPrimary }}>
                  {players[0]?.name || 'You'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player 2 — always shown with input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel>PLAYER 2</SectionLabel>
          <div style={{ background: FE.white, borderRadius: 16, padding: '1rem', boxShadow: FE.shadowFloat }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="p2-name" style={{ display: 'block', fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>Name</label>
                <input
                  id="p2-name" type="text" value={players[1]?.name ?? ''}
                  onChange={e => update(1, 'name', e.target.value)}
                  placeholder="Enter name" style={inputFieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ width: 80 }}>
                <label htmlFor="p2-hcp" style={{ display: 'block', fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.onPrimary, marginBottom: '0.5rem' }}>HCP</label>
                <input
                  id="p2-hcp" type="number" value={players[1]?.handicapIndex ?? ''}
                  onChange={e => update(1, 'handicapIndex', e.target.value)}
                  placeholder="18" min={0} max={54} step={0.1}
                  style={inputFieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = FE.greenDark; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,28,28,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>
            {searchIdx === 1 ? (
              <div>
                <input
                  type="text" value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by name…" autoFocus
                  style={{ ...inputFieldStyle, borderColor: FE.greenDark, boxShadow: '0 0 0 3px rgba(45,80,22,0.08)' }}
                />
                {searching && <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, padding: '6px 2px' }}>Searching…</div>}
                {searchResults.length > 0 && (
                  <div style={{ border: FE.borderGhost, borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                    {searchResults.map(u => (
                      <button key={u.id} onClick={() => {
                        update(1, 'name', u.displayName)
                        update(1, 'handicapIndex', u.handicapIndex?.toString() ?? '')
                        setSearchIdx(null); setSearchQuery(''); setSearchResults([])
                      }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '10px 12px', background: FE.white,
                        border: 'none', borderBottom: `1px solid rgba(26,28,28,0.06)`, cursor: 'pointer',
                        fontFamily: font.body,
                      }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: FE.onPrimary }}>{u.displayName}</span>
                        {u.handicapIndex !== null && <span style={{ fontSize: 13, color: FE.onTertiary }}>HCP {u.handicapIndex}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setSearchIdx(null); setSearchQuery(''); setSearchResults([]) }}
                  style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchIdx(1)} style={{
                fontFamily: font.body, fontWeight: 500, fontSize: 14, color: FE.berryTertiary,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Search existing players
              </button>
            )}
          </div>
        </div>

        {/* Player 3 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel>PLAYER 3</SectionLabel>
          {showP3 ? (
            <PlayerCard
              playerId="p3" playerIndex={2} players={players}
              searchIdx={searchIdx} searchQuery={searchQuery} searchResults={searchResults} searching={searching}
              onUpdate={update} onSearch={handleSearch}
              onSetSearchIdx={setSearchIdx} onClearSearch={() => { setSearchIdx(null); setSearchQuery(''); setSearchResults([]) }}
              onRemove={() => {
                const next = [...players]
                next[2] = { name: '', handicapIndex: '', isUser: false, gender: 'm', teeOverride: null }
                onChange(next)
                setShowP3(false)
                setShowP4(false)
              }}
            />
          ) : (
            <AddPlayerButton label="Add player 3" onClick={() => setShowP3(true)} />
          )}
        </div>

        {/* Player 4 — only show option once P3 is added */}
        {showP3 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <SectionLabel>PLAYER 4</SectionLabel>
            {showP4 ? (
              <PlayerCard
                playerId="p4" playerIndex={3} players={players}
                searchIdx={searchIdx} searchQuery={searchQuery} searchResults={searchResults} searching={searching}
                onUpdate={update} onSearch={handleSearch}
                onSetSearchIdx={setSearchIdx} onClearSearch={() => { setSearchIdx(null); setSearchQuery(''); setSearchResults([]) }}
                onRemove={() => {
                  const next = [...players]
                  next[3] = { name: '', handicapIndex: '', isUser: false, gender: 'm', teeOverride: null }
                  onChange(next)
                  setShowP4(false)
                }}
              />
            ) : (
              <AddPlayerButton label="Add player 4" onClick={() => setShowP4(true)} />
            )}
          </div>
        )}
      </div>

      <BottomBar>
        <PrimaryButton onClick={onNext} disabled={!canProceed()}>
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
}: {
  club: string
  dbCombinations: DbCombo[] | null
  onSelect: (courseId: string, dbComboId: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const courses = getCoursesForClub(club)

  const findDbCombo = (courseId: string): string | null => {
    if (!dbCombinations || dbCombinations.length === 0) return null
    const course = COURSES.find(c => c.id === courseId)
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
                  background: selected ? 'rgba(45, 80, 22, 0.05)' : FE.white,
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
                      background: 'linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%)',
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

// ── Module-level constants ─────────────────────────────────────────────────────

const inputFieldStyle: React.CSSProperties = {
  width: '100%', padding: '0.875rem 1rem',
  background: '#FFFFFF', border: '1px solid rgba(26, 28, 28, 0.12)', borderRadius: 12,
  fontFamily: "'Lexend', sans-serif", fontSize: 16, color: '#1A1C1C',
  outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s ease-in-out',
}

const dropdownStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem',
  border: '1px solid rgba(26, 28, 28, 0.12)', borderRadius: 12,
  fontFamily: "'Lexend', sans-serif", fontSize: 15, color: '#1A1C1C',
  background: `#FFFFFF url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2372786E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.75rem center`,
  appearance: 'none', paddingRight: '2.5rem',
  cursor: 'pointer', outline: 'none',
}

// Uppercase section label for player sections (YOU, PLAYER 2, etc.)
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase',
      color: FE.onTertiary, letterSpacing: '0.05em', marginBottom: '0.75rem',
    }}>
      {children}
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

const BALL_COLOURS = [
  { key: 'White', bg: '#FFFFFF', border: 'rgba(26,28,28,0.2)' },
  { key: 'Yellow', bg: '#FCD34D', border: '#FCD34D' },
  { key: 'Purple', bg: '#A78BFA', border: '#A78BFA' },
  { key: 'Red', bg: '#EF4444', border: '#EF4444' },
  { key: 'Black', bg: '#1A1C1C', border: '#1A1C1C' },
]

function SettingsStep({
  state,
  onUpdate,
  onSubmit,
  submitting,
  combinationTees,
}: {
  state: WizardState
  onUpdate: (partial: Partial<WizardState>) => void
  onSubmit: () => void
  submitting: boolean
  combinationTees: CombinationTee[]
}) {
  const [advOpen, setAdvOpen] = useState(false)
  const course = getCourse(state.courseId)
  if (!course) return <div>Course not found</div>

  const par3Holes = course.holes.filter(h => h.par === 3).map(h => h.num)
  const par5Holes = course.holes.filter(h => h.par === 5).map(h => h.num)
  const anyHoles = course.holes.map(h => h.num)
  const toggle = (list: number[], hole: number) =>
    list.includes(hole) ? list.filter(h => h !== hole) : [...list, hole].sort((a, b) => a - b)
  const toggleBall = (ball: string) => {
    const balls = state.balls ?? ['White']
    onUpdate({ balls: balls.includes(ball) ? balls.filter(b => b !== ball) : [...balls, ball] })
  }

  const hasCourseRating = course.courseRating > 0 && course.slopeRating > 0
  const dbColour = TEE_TO_DB_COLOUR[state.tee] ?? state.tee
  const teeCrSlope = state.dbCombinationId
    ? combinationTees.find(t => t.combination_id === state.dbCombinationId && t.tee_colour === dbColour && t.gender === 'm')
    : undefined
  const displayCR = teeCrSlope ? teeCrSlope.course_rating : course.courseRating
  const displaySlope = teeCrSlope ? teeCrSlope.slope_rating : course.slopeRating

  const activePlayers = state.players.filter((p, i) => i === 0 || p.name.trim() !== '')
  const balls = state.balls ?? ['White']

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

          {/* Balls */}
          <div style={{ marginBottom: '1.5rem' }}>
            <SettingLabel>Balls</SettingLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {BALL_COLOURS.map(ball => {
                const checked = balls.includes(ball.key)
                return (
                  <label key={ball.key} onClick={() => toggleBall(ball.key)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      border: checked ? `2px solid ${FE.greenDark}` : '2px solid rgba(26,28,28,0.20)',
                      background: checked ? FE.greenDark : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease-in-out',
                    }}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: ball.bg, border: `2px solid ${ball.border}`,
                    }} />
                    <span style={{ fontFamily: font.body, fontSize: 15, color: FE.onPrimary, flex: 1 }}>
                      {ball.key}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Handicap / Course Rating */}
          {hasCourseRating && (
            <div style={{ marginBottom: '1.5rem' }}>
              <SettingLabel>Handicap</SettingLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.5rem' }}>
                    Course Rating
                  </div>
                  <input type="text" value={typeof displayCR === 'number' ? displayCR.toFixed(1) : displayCR} readOnly
                    style={{ width: '100%', padding: '0.875rem', border: FE.borderGhost, borderRadius: 12, fontFamily: font.body, fontSize: 16, color: FE.onPrimary, background: FE.white, boxSizing: 'border-box' as const, outline: 'none' }} />
                </div>
                <div>
                  <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: FE.onTertiary, marginBottom: '0.5rem' }}>
                    Slope Rating
                  </div>
                  <input type="text" value={displaySlope} readOnly
                    style={{ width: '100%', padding: '0.875rem', border: FE.borderGhost, borderRadius: 12, fontFamily: font.body, fontSize: 16, color: FE.onPrimary, background: FE.white, boxSizing: 'border-box' as const, outline: 'none' }} />
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
                            background: 'linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%)',
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

              {/* NTP holes */}
              {par3Holes.length > 0 && (
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
                          background: active ? 'rgba(45,80,22,0.1)' : FE.white,
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

              {/* Longest drive */}
              <div>
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
                        background: active ? 'rgba(45,80,22,0.1)' : FE.white,
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
            </div>
          </div>
        </div>
      </div>

      <BottomBar>
        <PrimaryButton onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Creating round…' : 'Start round'}
        </PrimaryButton>
      </BottomBar>
    </>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export default function NewRoundWizard({ displayName, handicapIndex, dbCombinations, combinationTees }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<WizardState>({
    step: 'venue',
    selectedClub: null,
    courseId: FIRST_COURSE,
    dbCombinationId: null,
    players: [
      { name: displayName, handicapIndex: handicapIndex?.toString() ?? '', isUser: true, gender: 'm', teeOverride: null },
      { name: '', handicapIndex: '', isUser: false, gender: 'm', teeOverride: null },
      { name: '', handicapIndex: '', isUser: false, gender: 'm', teeOverride: null },
      { name: '', handicapIndex: '', isUser: false, gender: 'm', teeOverride: null },
    ],
    format: 'stableford',
    tee: defaultTee(FIRST_COURSE),
    roundType: '18',
    ntpHoles: defaultNtpHoles(FIRST_COURSE),
    ldHoles: defaultLdHoles(FIRST_COURSE),
    allowancePct: 100,
    balls: ['White'],
  })

  const update = (partial: Partial<WizardState>) => setState(s => ({ ...s, ...partial }))

  // Step order: venue → players → combination → settings
  const goBack = () => {
    if (state.step === 'players') update({ step: 'venue' })
    else if (state.step === 'combination') update({ step: 'players' })
    else if (state.step === 'settings') update({ step: 'combination' })
  }

  const selectVenue = (club: string) => update({ selectedClub: club })

  const proceedToPlayers = () => {
    if (state.selectedClub) update({ step: 'players' })
  }

  const proceedToCombination = () => update({ step: 'combination' })

  const selectCombination = (courseId: string, dbComboId: string | null) => {
    update({
      courseId, dbCombinationId: dbComboId,
      tee: defaultTee(courseId),
      ntpHoles: defaultNtpHoles(courseId),
      ldHoles: defaultLdHoles(courseId),
      step: 'settings',
    })
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      try {
        const activePlayers = state.players
          .filter(p => p.isUser || (p.name.trim() !== '' && p.handicapIndex !== ''))
          .map(p => ({
            name: p.name.trim(),
            handicapIndex: parseFloat(p.handicapIndex) || 0,
            isUser: p.isUser,
          }))

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
          />
        )}

        {state.step === 'players' && (
          <PlayersStep
            players={state.players}
            onChange={players => update({ players })}
            onNext={proceedToCombination}
          />
        )}

        {state.step === 'combination' && state.selectedClub && (
          <CombinationStep
            club={state.selectedClub}
            dbCombinations={dbCombinations}
            onSelect={selectCombination}
          />
        )}

        {state.step === 'settings' && (
          <SettingsStep
            state={state}
            onUpdate={update}
            onSubmit={handleSubmit}
            submitting={isPending}
            combinationTees={combinationTees}
          />
        )}
      </div>
    </div>
  )
}
