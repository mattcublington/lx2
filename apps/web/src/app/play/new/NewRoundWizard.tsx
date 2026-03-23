'use client'
import { useState, useTransition } from 'react'
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

type Step = 'course' | 'players' | 'settings'

interface Player {
  name: string
  handicapIndex: string
  isUser: boolean
}

interface WizardState {
  step: Step
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

// ── Helpers ────────────────────────────────────────────────────────────────────

// Extract the short combination label, e.g. "Red / Yellow" from full name
function shortName(name: string): string {
  // "Cumberwell Park — Red/Yellow" → "Red / Yellow"
  const after = name.split('—').pop()?.trim() ?? name
  return after.replace('/', ' / ')
}

// Group courses by their loop pair label (first segment before '/')
function groupCourses() {
  const groups: Record<string, typeof COURSES> = {}
  for (const c of COURSES) {
    const label = shortName(c.name).split('/')[0]?.trim() ?? 'Other'
    if (!groups[label]) groups[label] = []
    groups[label].push(c)
  }
  return groups
}

function defaultTee(courseId: string): string {
  const course = getCourse(courseId)
  if (!course) return 'Yellow'
  if (course.tees.includes('Yellow')) return 'Yellow'
  return course.tees[0] ?? 'Yellow'
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
  // fallback: first par-4
  const par4s = course.holes.filter(h => h.par === 4).map(h => h.num)
  return par4s.length > 0 ? [par4s[0]!] : []
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepPills({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'course', label: 'Course' },
    { key: 'players', label: 'Players' },
    { key: 'settings', label: 'Settings' },
  ]
  const order: Record<Step, number> = { course: 0, players: 1, settings: 2 }
  const current = order[step]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 20px',
    }}>
      {steps.map((s, i) => {
        const done = order[s.key] < current
        const active = s.key === step
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: active ? '#0D631B' : done ? '#3a7d44' : '#E8ECE4',
                color: active || done ? '#fff' : '#9CA9A1',
                fontSize: '0.6875rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: "'Manrope', sans-serif",
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: active ? 600 : 400,
                color: active ? '#1A2E1A' : done ? '#3a7d44' : '#9CA9A1',
                fontFamily: "'Manrope', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 1,
                background: done ? '#3a7d44' : '#E8ECE4',
                margin: '0 8px',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Course picker ──────────────────────────────────────────────────────

function CourseStep({
  dbCombinations,
  onSelect,
}: {
  dbCombinations: DbCombo[] | null
  onSelect: (courseId: string, dbComboId: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const groups = groupCourses()

  const matchesSearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase())

  const findDbCombo = (course: typeof COURSES[number]): string | null => {
    if (!dbCombinations || dbCombinations.length === 0) return null
    // Match by the short name embedded in the course name
    const short = shortName(course.name)
    const match = dbCombinations.find(dc =>
      shortName(dc.name) === short || dc.name === course.name
    )
    return match?.id ?? null
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: '1.375rem',
          letterSpacing: '-0.025em',
          color: '#1A2E1A',
          marginBottom: 4,
        }}>
          Which course?
        </div>
        <div style={{ fontSize: '0.9375rem', color: '#6B8C6B', fontWeight: 300 }}>
          Cumberwell Park
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search courses…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '11px 14px',
          border: '1.5px solid #E8ECE4',
          borderRadius: '0.75rem',
          fontSize: '0.9375rem',
          fontFamily: "'Lexend', sans-serif",
          color: '#1A2E1A',
          background: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 20,
        }}
      />

      {/* Course groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(groups).map(([groupLabel, courses]) => {
          const visible = courses.filter(c => matchesSearch(c.name))
          if (visible.length === 0) return null
          return (
            <div key={groupLabel}>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#9CA9A1',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: 8,
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: '#fff',
                        border: '1.5px solid #E8ECE4',
                        borderRadius: '0.875rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{
                          fontFamily: "'Manrope', sans-serif",
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          color: '#1A2E1A',
                          marginBottom: 2,
                        }}>
                          {label}
                        </div>
                        <div style={{
                          fontSize: '0.8125rem',
                          color: '#9CA9A1',
                          fontWeight: 300,
                        }}>
                          Par {course.par}
                          {hasWhs && ` · CR ${course.courseRating} · Slope ${course.slopeRating}`}
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        fontFamily: "'Manrope', sans-serif",
                        background: hasWhs ? '#E8F5EE' : '#F3F4F6',
                        color: hasWhs ? '#0D631B' : '#9CA3AF',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}>
                        {hasWhs ? 'WHS ✓' : 'No WHS data'}
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
  const [revealed, setRevealed] = useState(
    // reveal rows that are already filled
    Math.max(1, players.filter((p, i) => i > 0 && p.name).length + 1)
  )

  const update = (index: number, field: keyof Player, value: string) => {
    const next = [...players]
    next[index] = { ...next[index]!, [field]: value }
    onChange(next)
  }

  const canProceed = () => {
    // All revealed non-user players must have name + valid handicap
    for (let i = 1; i <= revealed; i++) {
      const p = players[i]
      if (!p) continue
      if (p.name && (p.handicapIndex === '' || Number(p.handicapIndex) < 0 || Number(p.handicapIndex) > 54)) {
        return false
      }
    }
    return true
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '11px 12px',
    border: '1.5px solid #E8ECE4',
    borderRadius: '0.625rem',
    fontSize: '0.9375rem',
    fontFamily: "'Lexend', sans-serif",
    color: '#1A2E1A',
    background: '#fff',
    outline: 'none',
    minWidth: 0,
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: '1.375rem',
          letterSpacing: '-0.025em',
          color: '#1A2E1A',
          marginBottom: 4,
        }}>
          Who's playing?
        </div>
        <div style={{ fontSize: '0.9375rem', color: '#6B8C6B', fontWeight: 300 }}>
          Add up to 4 players
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Current user — always shown */}
        <div style={{
          background: '#E8F5EE',
          border: '1.5px solid rgba(13,99,27,0.2)',
          borderRadius: '0.875rem',
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#0D631B',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: "'Manrope', sans-serif",
            marginBottom: 8,
          }}>
            You
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={players[0]?.name ?? ''}
              onChange={e => update(0, 'name', e.target.value)}
              placeholder="Your name"
              style={{ ...inputStyle, background: '#fff' }}
            />
            <input
              type="number"
              value={players[0]?.handicapIndex ?? ''}
              onChange={e => update(0, 'handicapIndex', e.target.value)}
              placeholder="HCP"
              min={0}
              max={54}
              step={0.1}
              style={{ ...inputStyle, width: 72, flex: 'none' }}
            />
          </div>
        </div>

        {/* Additional players */}
        {[1, 2, 3].map(i => {
          if (i > revealed) return null
          const p = players[i]
          const isVisible = i <= revealed

          if (!isVisible) return null

          return (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1.5px solid #E8ECE4',
                borderRadius: '0.875rem',
                padding: '14px 16px',
              }}
            >
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#9CA9A1',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: 8,
              }}>
                Player {i + 1}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={p?.name ?? ''}
                  onChange={e => update(i, 'name', e.target.value)}
                  placeholder="Name"
                  style={inputStyle}
                />
                <input
                  type="number"
                  value={p?.handicapIndex ?? ''}
                  onChange={e => update(i, 'handicapIndex', e.target.value)}
                  placeholder="HCP"
                  min={0}
                  max={54}
                  step={0.1}
                  style={{ ...inputStyle, width: 72, flex: 'none' }}
                />
              </div>
            </div>
          )
        })}

        {/* Add player button */}
        {revealed < 3 && (
          <button
            onClick={() => setRevealed(r => r + 1)}
            style={{
              padding: '14px 16px',
              background: 'transparent',
              border: '1.5px dashed #D1D9CC',
              borderRadius: '0.875rem',
              fontSize: '0.9rem',
              color: '#6B8C6B',
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            + Add player {revealed + 1}
          </button>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed()}
        style={{
          width: '100%',
          marginTop: 28,
          padding: '16px 0',
          background: canProceed() ? '#0D631B' : '#D1D9CC',
          color: '#fff',
          border: 'none',
          borderRadius: '0.875rem',
          fontSize: '1rem',
          fontWeight: 700,
          fontFamily: "'Manrope', sans-serif",
          cursor: canProceed() ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        Next →
      </button>
    </div>
  )
}

// ── Step 3: Settings ───────────────────────────────────────────────────────────

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
  const anyHoles = course.holes.map(h => h.num)

  const toggleHole = (list: number[], hole: number): number[] =>
    list.includes(hole) ? list.filter(h => h !== hole) : [...list, hole].sort((a, b) => a - b)

  const formats: { key: 'stableford' | 'strokeplay' | 'matchplay'; label: string }[] = [
    { key: 'stableford', label: 'Stableford' },
    { key: 'strokeplay', label: 'Stroke Play' },
    { key: 'matchplay', label: 'Match Play' },
  ]

  const pillBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 4px',
    border: active ? '2px solid #0D631B' : '1.5px solid #E8ECE4',
    borderRadius: '0.625rem',
    background: active ? '#E8F5EE' : '#fff',
    color: active ? '#0D631B' : '#6B8C6B',
    fontSize: '0.8125rem',
    fontWeight: active ? 700 : 400,
    fontFamily: "'Manrope', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.1s',
    textAlign: 'center' as const,
  })

  const holeChip = (hole: number, active: boolean, onClick: () => void): React.ReactNode => (
    <button
      key={hole}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: '0.5rem',
        border: active ? '2px solid #0D631B' : '1.5px solid #E8ECE4',
        background: active ? '#E8F5EE' : '#fff',
        color: active ? '#0D631B' : '#6B8C6B',
        fontSize: '0.875rem',
        fontWeight: active ? 700 : 400,
        fontFamily: "'Manrope', sans-serif",
        cursor: 'pointer',
      }}
    >
      {hole}
    </button>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: '1.375rem',
          letterSpacing: '-0.025em',
          color: '#1A2E1A',
          marginBottom: 4,
        }}>
          Round settings
        </div>
        <div style={{ fontSize: '0.9375rem', color: '#6B8C6B', fontWeight: 300 }}>
          {course.name.split('—').pop()?.trim()} · Par {course.par}
        </div>
      </div>

      {/* Format */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#374151',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 8,
        }}>
          Format
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {formats.map(f => (
            <button
              key={f.key}
              onClick={() => onUpdate({ format: f.key })}
              style={pillBtn(state.format === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tee */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#374151',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 8,
        }}>
          Tees
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {course.tees.map(tee => (
            <button
              key={tee}
              onClick={() => onUpdate({ tee })}
              style={pillBtn(state.tee === tee)}
            >
              {tee}
            </button>
          ))}
        </div>
      </div>

      {/* Round type — only if course has 9-hole option (all Cumberwell combos are 18-hole;
          Par 3 loop is technically 9 holes repeated, but COURSES only lists 18-hole configs.
          We still show the toggle for UX, but default 18.) */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#374151',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 8,
        }}>
          Round length
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['18', '9'] as const).map(rt => (
            <button
              key={rt}
              onClick={() => onUpdate({ roundType: rt })}
              style={pillBtn(state.roundType === rt)}
            >
              {rt} holes
            </button>
          ))}
        </div>
      </div>

      {/* Handicap allowance */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#374151',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 8,
        }}>
          Handicap allowance
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={state.allowancePct}
            onChange={e => onUpdate({ allowancePct: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <div style={{
            minWidth: 48,
            textAlign: 'center',
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            color: '#0D631B',
          }}>
            {state.allowancePct}%
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9CA9A1', marginTop: 4 }}>
          {state.allowancePct === 95 ? 'WHS competition standard (95%)' : `${state.allowancePct}% of handicap index`}
        </div>
      </div>

      {/* Side contests — collapsible */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setSideOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '14px 16px',
            background: '#fff',
            border: '1.5px solid #E8ECE4',
            borderRadius: sideOpen ? '0.875rem 0.875rem 0 0' : '0.875rem',
            cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#1A2E1A',
          }}
        >
          <span>Side contests</span>
          <span style={{ color: '#9CA9A1', fontSize: '0.75rem' }}>
            {sideOpen ? '▲' : '▼'}
          </span>
        </button>

        {sideOpen && (
          <div style={{
            background: '#fff',
            border: '1.5px solid #E8ECE4',
            borderTop: 'none',
            borderRadius: '0 0 0.875rem 0.875rem',
            padding: '16px',
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#374151',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: 10,
              }}>
                Nearest the pin (par 3s)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {par3Holes.map(hole =>
                  holeChip(
                    hole,
                    state.ntpHoles.includes(hole),
                    () => onUpdate({ ntpHoles: toggleHole(state.ntpHoles, hole) })
                  )
                )}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#374151',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: 10,
              }}>
                Longest drive
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(par5Holes.length > 0 ? par5Holes : anyHoles).map(hole =>
                  holeChip(
                    hole,
                    state.ldHoles.includes(hole),
                    () => onUpdate({ ldHoles: toggleHole(state.ldHoles, hole) })
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '18px 0',
          background: submitting ? '#9CA3AF' : '#0D631B',
          color: '#fff',
          border: 'none',
          borderRadius: '0.875rem',
          fontSize: '1.0625rem',
          fontWeight: 700,
          fontFamily: "'Manrope', sans-serif",
          cursor: submitting ? 'default' : 'pointer',
          transition: 'background 0.15s',
          boxShadow: submitting ? 'none' : '0 4px 16px rgba(13,99,27,0.28)',
        }}
      >
        {submitting ? 'Creating round…' : 'Start round →'}
      </button>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

const FIRST_COURSE = COURSES[0]!.id

export default function NewRoundWizard({
  displayName,
  handicapIndex,
  dbCombinations,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<WizardState>({
    step: 'course',
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

  const selectCourse = (courseId: string, dbComboId: string | null) => {
    update({
      courseId,
      dbCombinationId: dbComboId,
      tee: defaultTee(courseId),
      ntpHoles: defaultNtpHoles(courseId),
      ldHoles: defaultLdHoles(courseId),
      step: 'players',
    })
  }

  const goBack = () => {
    if (state.step === 'players') update({ step: 'course' })
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

        await startRound({
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  const stepOrder: Record<Step, number> = { course: 0, players: 1, settings: 2 }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAFBF8',
      fontFamily: "'Lexend', system-ui, sans-serif",
      color: '#1A2E1A',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E8ECE4',
          background: '#FAFBF8',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {state.step !== 'course' ? (
            <button
              onClick={goBack}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.9375rem',
                color: '#0D631B',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: "'Lexend', sans-serif",
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← Back
            </button>
          ) : (
            <a
              href="/play"
              style={{
                fontSize: '0.9375rem',
                color: '#0D631B',
                textDecoration: 'none',
                fontWeight: 600,
                fontFamily: "'Lexend', sans-serif",
              }}
            >
              ← Back
            </a>
          )}

          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.0625rem',
            letterSpacing: '-0.02em',
            color: '#1A2E1A',
          }}>
            LX<span style={{ color: '#0D631B' }}>2</span>
          </div>

          <div style={{ width: 48 }} /> {/* spacer */}
        </div>

        {/* Step progress */}
        <div style={{ padding: '14px 0 0' }}>
          <StepPills step={state.step} />
        </div>

        {/* Step content */}
        <div style={{ padding: '24px 20px 40px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              color: '#991B1B',
              marginBottom: 20,
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {state.step === 'course' && (
            <CourseStep
              dbCombinations={dbCombinations}
              onSelect={selectCourse}
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

        {/* Hidden step index for context */}
        <div style={{ display: 'none' }}>{stepOrder[state.step]}</div>
      </div>
    </div>
  )
}
