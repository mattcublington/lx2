'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createEvent, type EventFormData } from './actions'
import { searchCourses, getCourse, type Course } from '@/lib/courses'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  wrap: { maxWidth: 560, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif', color: '#111', minHeight: '100vh', background: '#FAFBF8' } as React.CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 } as React.CSSProperties,
  input: { width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' } as React.CSSProperties,
  section: { marginBottom: 20 } as React.CSSProperties,
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 } as React.CSSProperties,
  radio: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  error: { fontSize: 13, color: '#dc2626', marginTop: 8 } as React.CSSProperties,
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ['Event details', 'Format & scoring', 'Side contests & fees']
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: done || active ? '#1D9E75' : '#e5e7eb', transition: 'background 0.2s' }} />
            <div style={{ fontSize: 11, color: done || active ? '#1D9E75' : '#9ca3af', fontWeight: active ? 600 : 400, textAlign: 'center' }}>{s}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Radio option ─────────────────────────────────────────────────────────────

function RadioOption({ label, sub, checked, onClick }: { label: string; sub?: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" style={{ flex: '1 1 140px', padding: '12px 14px', border: checked ? '2px solid #1D9E75' : '1.5px solid #d1d5db', borderRadius: 10, background: checked ? '#E8F5EE' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: checked ? '#0F6E56' : '#111' }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
    </button>
  )
}

// ─── Hole selector ────────────────────────────────────────────────────────────

function HoleSelector({ label, hint, selected, onChange, course, highlightPar }: {
  label: string; hint: string; selected: number[]; onChange: (h: number[]) => void; course: Course; highlightPar: number[]
}) {
  const toggle = (n: number) => {
    onChange(selected.includes(n) ? selected.filter(h => h !== n) : [...selected, n].sort((a, b) => a - b))
  }
  return (
    <div style={S.section}>
      <label style={S.label}>{label}</label>
      <div style={S.hint}>{hint}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {course.holes.map(h => {
          const isHighlight = highlightPar.includes(h.par)
          const isSel = selected.includes(h.num)
          return (
            <button key={h.num} type="button" onClick={() => toggle(h.num)} style={{
              width: 42, height: 42, borderRadius: 8, border: isSel ? '2px solid #1D9E75' : isHighlight ? '1.5px solid #1D9E7560' : '1.5px solid #e5e7eb',
              background: isSel ? '#1D9E75' : isHighlight ? '#E8F5EE' : '#fff',
              color: isSel ? '#fff' : '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
            }}>
              <span>{h.num}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>p{h.par}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

const defaultAllowance = { stableford: 0.95, strokeplay: 1.0, matchplay: 1.0 }

export default function NewEventPage() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [tee, setTee] = useState('')

  // Step 2
  const [format, setFormat] = useState<'stableford' | 'strokeplay' | 'matchplay'>('stableford')
  const [allowancePct, setAllowancePct] = useState(0.95)
  const [groupSize, setGroupSize] = useState(4)
  const [maxPlayers, setMaxPlayers] = useState('')

  // Step 3
  const [ntpHoles, setNtpHoles] = useState<number[]>([])
  const [ldHoles, setLdHoles] = useState<number[]>([])
  const [hasFee, setHasFee] = useState(false)
  const [feePounds, setFeePounds] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const handleCourseSearch = (q: string) => {
    setCourseQuery(q)
    setSelectedCourse(null)
    setCourseResults(searchCourses(q))
  }

  const selectCourse = (course: Course) => {
    setSelectedCourse(course)
    setCourseQuery(course.name)
    setCourseResults([])
    setTee(course.tees[0] ?? '')
    // Pre-populate NTP on par 3s, LD on first par 5
    setNtpHoles(course.holes.filter(h => h.par === 3).map(h => h.num))
    setLdHoles(course.holes.filter(h => h.par === 5).slice(0, 1).map(h => h.num))
  }

  const handleFormatChange = (f: typeof format) => {
    setFormat(f)
    setAllowancePct(defaultAllowance[f])
  }

  const canNext1 = name.trim() && date && selectedCourse && tee
  const canNext2 = true
  const canSubmit = true

  const handleSubmit = async () => {
    if (!selectedCourse) return
    setSaving(true)
    setFormError('')
    try {
      const data: EventFormData = {
        name: name.trim(),
        date,
        courseId: selectedCourse.id,
        tee,
        format,
        handicapAllowancePct: allowancePct,
        groupSize,
        maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
        entryFeePence: hasFee && feePounds ? Math.round(parseFloat(feePounds) * 100) : null,
        ntpHoles,
        ldHoles,
        isPublic,
      }
      await createEvent(data)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, textDecoration: 'none', color: '#111' }}>
          LX<span style={{ color: '#1D9E75' }}>2</span>
        </Link>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>New event</div>
      </div>

      <Steps current={step} />

      {/* ── Step 1: Event details ── */}
      {step === 0 && (
        <div>
          <div style={S.section}>
            <label style={S.label}>Event name</label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)}
              placeholder="Sunday Stableford, Club Monthly Medal…" autoFocus />
          </div>

          <div style={S.section}>
            <label style={S.label}>Date</label>
            <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div style={{ ...S.section, position: 'relative' }}>
            <label style={S.label}>Course</label>
            <input style={S.input} value={courseQuery} onChange={e => handleCourseSearch(e.target.value)}
              placeholder="Search by course or club name…" />
            {courseResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 10, zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {courseResults.map(c => (
                  <button key={c.id} onClick={() => selectCourse(c)} type="button"
                    style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', borderBottom: '0.5px solid #f3f4f6', background: '#fff', cursor: 'pointer', display: 'block' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.location}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedCourse && <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 4 }}>✓ {selectedCourse.holes.length} holes · Par {selectedCourse.par} · Slope {selectedCourse.slopeRating}</div>}
          </div>

          {selectedCourse && (
            <div style={S.section}>
              <label style={S.label}>Tee</label>
              <div style={S.radio}>
                {selectedCourse.tees.map(t => (
                  <RadioOption key={t} label={t} checked={tee === t} onClick={() => setTee(t)} />
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setStep(1)} disabled={!canNext1}
            style={{ width: '100%', padding: '14px 0', background: canNext1 ? '#1D9E75' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: canNext1 ? 'pointer' : 'default', marginTop: 8 }}>
            Next: Format & scoring →
          </button>
        </div>
      )}

      {/* ── Step 2: Format & scoring ── */}
      {step === 1 && (
        <div>
          <div style={S.section}>
            <label style={S.label}>Format</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RadioOption label="Stableford" sub="Points per hole based on net score vs par. Most popular." checked={format === 'stableford'} onClick={() => handleFormatChange('stableford')} />
              <RadioOption label="Stroke play" sub="Lowest total net strokes wins." checked={format === 'strokeplay'} onClick={() => handleFormatChange('strokeplay')} />
              <RadioOption label="Match play" sub="Hole-by-hole contest. Best of 18." checked={format === 'matchplay'} onClick={() => handleFormatChange('matchplay')} />
            </div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Handicap allowance</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={0.5} max={1} step={0.05} value={allowancePct}
                onChange={e => setAllowancePct(parseFloat(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ fontSize: 15, fontWeight: 600, minWidth: 40 }}>{Math.round(allowancePct * 100)}%</span>
            </div>
            <div style={S.hint}>95% is standard for Stableford. 100% for stroke play and match play.</div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Group size</label>
            <div style={S.radio}>
              {[2, 3, 4].map(n => (
                <RadioOption key={n} label={`${n}-ball`} checked={groupSize === n} onClick={() => setGroupSize(n)} />
              ))}
            </div>
          </div>

          <div style={S.section}>
            <label style={S.label}>Max players <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <input style={{ ...S.input, maxWidth: 120 }} type="number" min={2} max={200}
              value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} placeholder="No limit" />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep(0)} type="button"
              style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#374151' }}>
              ← Back
            </button>
            <button onClick={() => setStep(2)} type="button"
              style={{ flex: 2, padding: '14px 0', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Next: Side contests →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Side contests & fees ── */}
      {step === 2 && selectedCourse && (
        <div>
          <HoleSelector
            label="Nearest the Pin holes"
            hint="Tap holes to designate NTP contests. Par 3s highlighted."
            selected={ntpHoles} onChange={setNtpHoles}
            course={selectedCourse} highlightPar={[3]}
          />

          <HoleSelector
            label="Longest Drive holes"
            hint="Tap holes to designate LD contests. Par 4s and 5s highlighted."
            selected={ldHoles} onChange={setLdHoles}
            course={selectedCourse} highlightPar={[4, 5]}
          />

          <div style={S.section}>
            <label style={S.label}>Entry fee</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <RadioOption label="Free" checked={!hasFee} onClick={() => setHasFee(false)} />
              <RadioOption label="Paid" checked={hasFee} onClick={() => setHasFee(true)} />
            </div>
            {hasFee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, color: '#6b7280' }}>£</span>
                <input style={{ ...S.input, maxWidth: 120 }} type="number" min={0} step={0.5}
                  value={feePounds} onChange={e => setFeePounds(e.target.value)} placeholder="10.00" />
                <span style={{ fontSize: 14, color: '#6b7280' }}>per player</span>
              </div>
            )}
          </div>

          <div style={S.section}>
            <label style={S.label}>Visibility</label>
            <div style={S.radio}>
              <RadioOption label="Private" sub="Invite only via link" checked={!isPublic} onClick={() => setIsPublic(false)} />
              <RadioOption label="Public" sub="Anyone can find and join" checked={isPublic} onClick={() => setIsPublic(true)} />
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#374151' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Event summary</div>
            <div>{name} · {date}</div>
            <div>{selectedCourse.name} · {tee} tees</div>
            <div style={{ textTransform: 'capitalize' }}>{format} · {Math.round(allowancePct * 100)}% handicap</div>
            <div>{groupSize}-ball{maxPlayers ? ` · max ${maxPlayers} players` : ''}</div>
            {ntpHoles.length > 0 && <div>NTP: holes {ntpHoles.join(', ')}</div>}
            {ldHoles.length > 0 && <div>LD: holes {ldHoles.join(', ')}</div>}
            <div>{hasFee && feePounds ? `£${feePounds} entry fee` : 'Free event'}</div>
          </div>

          {formError && <div style={S.error}>{formError}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} type="button"
              style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#374151' }}>
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '14px 0', background: saving ? '#9ca3af' : '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Creating event…' : 'Create event →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
