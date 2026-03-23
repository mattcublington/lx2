'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { COURSES, getCourse } from '@/lib/courses'
import { startRound } from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DbCombo {
  id: string
  name: string
  par: number
  holes: number
  course_id: string
}

interface Props {
  userId: string
  displayName: string
  handicapIndex: number | null
  dbCombinations: DbCombo[] | null
}

type Step = 'venue' | 'combination' | 'players' | 'settings'

interface Player {
  name: string
  handicapIndex: string
  isUser: boolean
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
}

// ── Tee colours ────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

// All unique clubs from the COURSES list
function getVenues() {
  const seen = new Set<string>()
  const venues: { club: string; location: string; count: number }[] = []
  for (const c of COURSES) {
    if (!seen.has(c.club)) {
      seen.add(c.club)
      venues.push({
        club: c.club,
        location: c.location,
        count: COURSES.filter(x => x.club === c.club).length,
      })
    }
  }
  return venues
}

// Courses for a specific club
function getCoursesForClub(club: string) {
  return COURSES.filter(c => c.club === club)
}

// Short label: "Cumberwell Park — Red/Yellow" → "Red / Yellow"
function shortName(name: string): string {
  const after = name.split('—').pop()?.trim() ?? name
  return after.replace('/', ' / ')
}

// Club display name (drop "Golf Club" etc for brevity in some places)
function venueDisplayName(club: string): string {
  return club.replace(/ Golf Club$/i, '').replace(/ GC$/i, '')
}

function defaultTee(courseId: string): string {
  const course = getCourse(courseId)
  if (!course) return 'White'
  if (course.tees.includes('White')) return 'White'
  return course.tees[0] ?? 'White'
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
  const par4s = course.holes.filter(h => h.par === 4).map(h => h.num)
  return par4s.length > 0 ? [par4s[0]!] : []
}

const FIRST_COURSE = COURSES[0]!.id

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEP_LABELS: { key: Step | 'course'; label: string }[] = [
  { key: 'venue',  label: 'Course'  },
  { key: 'players', label: 'Players' },
  { key: 'settings', label: 'Settings' },
]

function StepBar({ step }: { step: Step }) {
  // Combine venue + combination into one "Course" step visually
  const order = (s: Step) => s === 'venue' || s === 'combination' ? 0 : s === 'players' ? 1 : 2
  const current = order(step)

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
      {STEP_LABELS.map((s, i) => {
        const idx = i
        const done = idx < current
        const active = idx === current
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: active ? '#0D631B' : done ? '#0D631B' : '#E4EDE4',
                color: active || done ? '#fff' : '#9CA9A1',
                fontSize: '0.625rem',
                fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}>
                {done ? '✓' : idx + 1}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: active ? 600 : 400,
                color: active ? '#1A2E1A' : done ? '#0D631B' : '#9CA9A1',
                transition: 'color 0.2s',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 1.5,
                background: done ? '#0D631B' : '#E4EDE4',
                margin: '0 8px',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1a: Venue picker ──────────────────────────────────────────────────────

function VenueStep({ onSelect }: { onSelect: (club: string) => void }) {
  const [search, setSearch] = useState('')
  const venues = getVenues()
  const filtered = venues.filter(v =>
    !search || v.club.toLowerCase().includes(search.toLowerCase()) ||
    v.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', fontWeight: 400, color: '#1A2E1A', letterSpacing: '-0.01em', marginBottom: 4 }}>
          Where are you playing?
        </h2>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#6B8C6B', fontWeight: 400 }}>
          Select a golf club
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search clubs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px 12px 40px',
            border: '1.5px solid #E4EDE4', borderRadius: '12px',
            fontSize: '0.9375rem', fontFamily: "'DM Sans', sans-serif",
            color: '#1A2E1A', background: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#1A2E1A" strokeWidth="1.5"/>
          <path d="M10.5 10.5 L14 14" stroke="#1A2E1A" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(venue => (
          <button
            key={venue.club}
            onClick={() => onSelect(venue.club)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 18px',
              background: '#fff', border: '1.5px solid #E4EDE4',
              borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D631B'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,99,27,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4EDE4'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {/* Flag icon */}
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: '#E8F5EE', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="4" y1="2" x2="4" y2="20" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 2 L18 7 L4 12 Z" fill="#0D631B"/>
                <line x1="2" y1="20" x2="8" y2="20" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700, fontSize: '1rem', color: '#1A2E1A',
                marginBottom: 2, fontFamily: "'DM Sans', sans-serif",
              }}>
                {venueDisplayName(venue.club)}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#7a9a7a' }}>
                {venue.location} · {venue.count} combinations
              </div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
              <path d="M1 1 L6 6 L1 11" stroke="#1A2E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CA9A1', fontSize: '0.9375rem' }}>
            No clubs found matching &quot;{search}&quot;
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: '14px 16px', background: '#F9FBF7', borderRadius: '12px', border: '1px solid #E4EDE4' }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#7a9a7a', lineHeight: 1.5 }}>
          More courses coming soon. <span style={{ color: '#0D631B', fontWeight: 600 }}>Got a course to add?</span>
        </p>
      </div>
    </div>
  )
}

// ── Step 1b: Combination picker ────────────────────────────────────────────────

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
  const courses = getCoursesForClub(club)

  const findDbCombo = (course: typeof COURSES[number]): string | null => {
    if (!dbCombinations || dbCombinations.length === 0) return null
    const short = shortName(course.name)
    const match = dbCombinations.find(dc =>
      shortName(dc.name) === short || dc.name === course.name
    )
    return match?.id ?? null
  }

  // Group by first loop
  const groups: Record<string, typeof COURSES> = {}
  for (const c of courses) {
    const label = shortName(c.name).split('/')[0]?.trim() ?? 'Other'
    if (!groups[label]) groups[label] = []
    groups[label].push(c)
  }

  const matchesSearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase())

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', fontWeight: 400, color: '#1A2E1A', letterSpacing: '-0.01em', marginBottom: 4 }}>
          Which combination?
        </h2>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#0D631B', fontWeight: 500 }}>
          {venueDisplayName(club)}
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search combinations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px 12px 40px',
            border: '1.5px solid #E4EDE4', borderRadius: '12px',
            fontSize: '0.9375rem', fontFamily: "'DM Sans', sans-serif",
            color: '#1A2E1A', background: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#1A2E1A" strokeWidth="1.5"/>
          <path d="M10.5 10.5 L14 14" stroke="#1A2E1A" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(groups).map(([groupLabel, groupCourses]) => {
          const visible = groupCourses.filter(c => matchesSearch(shortName(c.name)))
          if (visible.length === 0) return null
          return (
            <div key={groupLabel}>
              <div style={{
                fontSize: '0.6875rem', fontWeight: 700,
                color: '#9aaa9a', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                {groupLabel} loop
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visible.map(course => {
                  const hasWhs = course.slopeRating > 0
                  const label = shortName(course.name)
                  return (
                    <button
                      key={course.id}
                      onClick={() => onSelect(course.id, findDbCombo(course))}
                      style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: '#fff', border: '1.5px solid #E4EDE4',
                        borderRadius: '14px', cursor: 'pointer',
                        textAlign: 'left', width: '100%', gap: 12,
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D631B'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(13,99,27,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4EDE4'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: '0.9375rem',
                          color: '#1A2E1A', marginBottom: 3,
                          fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#9aaa9a' }}>
                          Par {course.par}
                          {hasWhs && ` · CR ${course.courseRating} · Slope ${course.slopeRating}`}
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px', borderRadius: '9999px',
                        fontSize: '0.6875rem', fontWeight: 700,
                        background: hasWhs ? '#E8F5EE' : '#F3F4F6',
                        color: hasWhs ? '#0D631B' : '#9CA3AF',
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {hasWhs ? 'WHS ✓' : 'No WHS'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Players ────────────────────────────────────────────────────────────

function PlayersStep({
  players,
  onChange,
  onNext,
}: {
  players: Player[]
  onChange: (players: Player[]) => void
  onNext: () => void
}) {
  const [revealed, setRevealed] = useState(1)

  const update = (index: number, field: keyof Player, value: string) => {
    const next = [...players]
    next[index] = { ...next[index]!, [field]: value }
    onChange(next)
  }

  const canProceed = () => {
    const you = players[0]
    if (!you?.name.trim()) return false
    for (let i = 1; i < revealed + 1; i++) {
      const p = players[i]
      if (!p) continue
      if (p.name.trim() && (p.handicapIndex === '' || Number(p.handicapIndex) < 0)) return false
    }
    return true
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '12px 12px',
    border: '1.5px solid #E4EDE4', borderRadius: '10px',
    fontSize: '0.9375rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1A2E1A', background: '#fff', outline: 'none', minWidth: 0,
    boxSizing: 'border-box' as const,
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', fontWeight: 400, color: '#1A2E1A', letterSpacing: '-0.01em', marginBottom: 4 }}>
          Who&rsquo;s playing?
        </h2>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#6B8C6B' }}>
          Add up to 4 players
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* You */}
        <div style={{ background: '#E8F5EE', border: '1.5px solid rgba(13,99,27,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0D631B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            You
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={players[0]?.name ?? ''} onChange={e => update(0, 'name', e.target.value)}
              placeholder="Your name" style={{ ...inputStyle, background: '#fff' }} />
            <input type="number" value={players[0]?.handicapIndex ?? ''} onChange={e => update(0, 'handicapIndex', e.target.value)}
              placeholder="HCP" min={0} max={54} step={0.1}
              style={{ ...inputStyle, width: 72, flex: 'none' }} />
          </div>
        </div>

        {/* Additional players */}
        {[1, 2, 3].slice(0, revealed).map(i => (
          <div key={i} style={{ background: '#fff', border: '1.5px solid #E4EDE4', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9CA9A1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Player {i + 1}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={players[i]?.name ?? ''} onChange={e => update(i, 'name', e.target.value)}
                placeholder="Name" style={inputStyle} />
              <input type="number" value={players[i]?.handicapIndex ?? ''} onChange={e => update(i, 'handicapIndex', e.target.value)}
                placeholder="HCP" min={0} max={54} step={0.1}
                style={{ ...inputStyle, width: 72, flex: 'none' }} />
            </div>
          </div>
        ))}

        {revealed < 3 && (
          <button onClick={() => setRevealed(r => r + 1)} style={{
            padding: '14px 16px', background: 'transparent',
            border: '1.5px dashed #D1D9CC', borderRadius: '14px',
            fontSize: '0.875rem', color: '#6B8C6B', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textAlign: 'left',
          }}>
            + Add player {revealed + 1}
          </button>
        )}
      </div>

      <button onClick={onNext} disabled={!canProceed()} style={{
        width: '100%', marginTop: 28, padding: '16px 0',
        background: canProceed() ? '#0D631B' : '#D1D9CC',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontSize: '1rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
        cursor: canProceed() ? 'pointer' : 'default',
        boxShadow: canProceed() ? '0 4px 16px rgba(13,99,27,0.25)' : 'none',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}>
        Next: Settings →
      </button>
    </div>
  )
}

// ── Step 3: Settings ───────────────────────────────────────────────────────────

function TeeButton({ tee, active, onClick }: { tee: string; active: boolean; onClick: () => void }) {
  const swatch = TEE_SWATCH[tee] ?? { bg: '#9CA3AF', text: '#fff' }
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      border: active ? '2px solid #0D631B' : '1.5px solid #E4EDE4',
      borderRadius: '10px',
      background: active ? '#E8F5EE' : '#fff',
      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
      transition: 'all 0.1s',
    }}>
      <span style={{
        display: 'inline-block', width: 14, height: 14,
        borderRadius: '50%',
        background: swatch.bg,
        border: swatch.border ? `1px solid ${swatch.border}` : undefined,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: '0.875rem', fontWeight: active ? 700 : 400, color: active ? '#0D631B' : '#374151' }}>
        {tee}
      </span>
    </button>
  )
}

function SettingsStep({
  state,
  onUpdate,
  onSubmit,
  submitting,
}: {
  state: WizardState
  onUpdate: (partial: Partial<WizardState>) => void
  onSubmit: () => void
  submitting: boolean
}) {
  const [sideOpen, setSideOpen] = useState(false)
  const course = getCourse(state.courseId)
  if (!course) return <div>Course not found</div>

  const par3Holes = course.holes.filter(h => h.par === 3).map(h => h.num)
  const par5Holes = course.holes.filter(h => h.par === 5).map(h => h.num)
  const anyHoles  = course.holes.map(h => h.num)

  const toggle = (list: number[], hole: number) =>
    list.includes(hole) ? list.filter(h => h !== hole) : [...list, hole].sort((a, b) => a - b)

  const formats = [
    { key: 'stableford' as const, label: 'Stableford' },
    { key: 'strokeplay'  as const, label: 'Stroke Play' },
    { key: 'matchplay'   as const, label: 'Match Play' },
  ]

  const fieldLabel = (label: string) => (
    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </div>
  )

  const pillBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '11px 4px',
    border: active ? '2px solid #0D631B' : '1.5px solid #E4EDE4',
    borderRadius: '10px',
    background: active ? '#E8F5EE' : '#fff',
    color: active ? '#0D631B' : '#6B8C6B',
    fontSize: '0.8125rem', fontWeight: active ? 700 : 400,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer', transition: 'all 0.1s', textAlign: 'center' as const,
  })

  const holeChip = (hole: number, active: boolean, onClick: () => void) => (
    <button key={hole} onClick={onClick} style={{
      width: 40, height: 40, borderRadius: '8px',
      border: active ? '2px solid #0D631B' : '1.5px solid #E4EDE4',
      background: active ? '#E8F5EE' : '#fff',
      color: active ? '#0D631B' : '#6B8C6B',
      fontSize: '0.875rem', fontWeight: active ? 700 : 400,
      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
    }}>
      {hole}
    </button>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', fontWeight: 400, color: '#1A2E1A', letterSpacing: '-0.01em', marginBottom: 4 }}>
          Round settings
        </h2>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#0D631B', fontWeight: 500 }}>
          {shortName(course.name)} · Par {course.par}
        </p>
      </div>

      {/* Format */}
      <div style={{ marginBottom: 20 }}>
        {fieldLabel('Format')}
        <div style={{ display: 'flex', gap: 6 }}>
          {formats.map(f => (
            <button key={f.key} onClick={() => onUpdate({ format: f.key })} style={pillBtn(state.format === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tees */}
      <div style={{ marginBottom: 20 }}>
        {fieldLabel('Tees')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {course.tees.map(tee => (
            <TeeButton key={tee} tee={tee} active={state.tee === tee} onClick={() => onUpdate({ tee })} />
          ))}
        </div>
      </div>

      {/* Round length */}
      <div style={{ marginBottom: 20 }}>
        {fieldLabel('Round length')}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['18', '9'] as const).map(rt => (
            <button key={rt} onClick={() => onUpdate({ roundType: rt })} style={pillBtn(state.roundType === rt)}>
              {rt} holes
            </button>
          ))}
        </div>
      </div>

      {/* Handicap allowance */}
      <div style={{ marginBottom: 20 }}>
        {fieldLabel('Handicap allowance')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min={50} max={100} step={5}
            value={state.allowancePct}
            onChange={e => onUpdate({ allowancePct: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#0D631B' }}
          />
          <div style={{ minWidth: 48, textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: '#0D631B', fontFamily: "'DM Sans', sans-serif" }}>
            {state.allowancePct}%
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9aaa9a', marginTop: 4 }}>
          {state.allowancePct === 95 ? 'WHS competition standard (95%)' : `${state.allowancePct}% of handicap index`}
        </div>
      </div>

      {/* Side contests */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setSideOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '14px 16px',
          background: '#fff', border: '1.5px solid #E4EDE4',
          borderRadius: sideOpen ? '12px 12px 0 0' : '12px',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600, fontSize: '0.9375rem', color: '#1A2E1A',
        }}>
          <span>Side contests</span>
          <span style={{ fontSize: '0.875rem', color: '#9CA9A1', transform: sideOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </button>

        {sideOpen && (
          <div style={{
            background: '#fff', border: '1.5px solid #E4EDE4',
            borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px',
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Nearest the pin <span style={{ color: '#9aaa9a', fontWeight: 400 }}>(par 3s)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {par3Holes.map(h => holeChip(h, state.ntpHoles.includes(h), () => onUpdate({ ntpHoles: toggle(state.ntpHoles, h) })))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Longest drive
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(par5Holes.length > 0 ? par5Holes : anyHoles).map(h => holeChip(h, state.ldHoles.includes(h), () => onUpdate({ ldHoles: toggle(state.ldHoles, h) })))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={onSubmit} disabled={submitting} style={{
        width: '100%', padding: '18px 0',
        background: submitting ? '#9CA3AF' : '#0D631B',
        color: '#fff', border: 'none', borderRadius: '14px',
        fontSize: '1.0625rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
        cursor: submitting ? 'default' : 'pointer',
        boxShadow: submitting ? 'none' : '0 6px 20px rgba(13,99,27,0.3)',
        transition: 'background 0.15s',
      }}>
        {submitting ? 'Creating round…' : 'Start round →'}
      </button>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export default function NewRoundWizard({ displayName, handicapIndex, dbCombinations }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<WizardState>({
    step: 'venue',
    selectedClub: null,
    courseId: FIRST_COURSE,
    dbCombinationId: null,
    players: [
      { name: displayName, handicapIndex: handicapIndex?.toString() ?? '', isUser: true },
      { name: '', handicapIndex: '', isUser: false },
      { name: '', handicapIndex: '', isUser: false },
      { name: '', handicapIndex: '', isUser: false },
    ],
    format: 'stableford',
    tee: defaultTee(FIRST_COURSE),
    roundType: '18',
    ntpHoles: defaultNtpHoles(FIRST_COURSE),
    ldHoles: defaultLdHoles(FIRST_COURSE),
    allowancePct: 95,
  })

  const update = (partial: Partial<WizardState>) => setState(s => ({ ...s, ...partial }))

  const selectVenue = (club: string) => update({ selectedClub: club, step: 'combination' })

  const selectCombination = (courseId: string, dbComboId: string | null) => {
    update({
      courseId, dbCombinationId: dbComboId,
      tee: defaultTee(courseId),
      ntpHoles: defaultNtpHoles(courseId),
      ldHoles: defaultLdHoles(courseId),
      step: 'players',
    })
  }

  const goBack = () => {
    if (state.step === 'combination') update({ step: 'venue' })
    if (state.step === 'players') update({ step: 'combination' })
    if (state.step === 'settings') update({ step: 'players' })
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

  return (
    <>


      <div style={{ minHeight: '100dvh', background: '#F2F5F0', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1A2E1A' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            background: '#F2F5F0',
            borderBottom: '1px solid #E4EDE4',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            {state.step !== 'venue' ? (
              <button onClick={goBack} style={{
                background: 'none', border: 'none', fontSize: '0.9375rem',
                color: '#0D631B', cursor: 'pointer', fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                ← Back
              </button>
            ) : (
              <a href="/play" style={{
                fontSize: '0.9375rem', color: '#0D631B',
                textDecoration: 'none', fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                ← Back
              </a>
            )}

            <Image
              src="/lx2-logo.svg"
              alt="LX2"
              width={48}
              height={24}
              style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(44%) saturate(500%) hue-rotate(80deg) brightness(90%)' }}
            />

            <div style={{ width: 48 }} />
          </div>

          {/* Step bar */}
          <div style={{ padding: '16px 0 0', background: '#F2F5F0' }}>
            <StepBar step={state.step} />
          </div>

          {/* Content */}
          <div style={{ padding: '24px 20px 48px' }}>
            {error && (
              <div style={{
                padding: '12px 16px', background: '#FEE2E2',
                border: '1px solid #FCA5A5', borderRadius: '10px',
                fontSize: '0.875rem', color: '#991B1B', marginBottom: 20, lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            {state.step === 'venue' && (
              <VenueStep onSelect={selectVenue} />
            )}

            {state.step === 'combination' && state.selectedClub && (
              <CombinationStep
                club={state.selectedClub}
                dbCombinations={dbCombinations}
                onSelect={selectCombination}
              />
            )}

            {state.step === 'players' && (
              <PlayersStep
                players={state.players}
                onChange={players => update({ players })}
                onNext={() => update({ step: 'settings' })}
              />
            )}

            {state.step === 'settings' && (
              <SettingsStep
                state={state}
                onUpdate={update}
                onSubmit={handleSubmit}
                submitting={isPending}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
