'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createEvent } from './actions'
import type { WizardCombo, CombinationTee, ComboHole } from './page'

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Course & date', 'Format', 'Contests', 'Review'] as const

const TEE_SWATCH: Record<string, { bg: string; border?: string; text: string }> = {
  'Yellow':        { bg: '#ca8a04', text: '#fff' },
  'Yellow/Purple': { bg: 'linear-gradient(90deg, #ca8a04 50%, #7c3aed 50%)', text: '#fff' },
  'Red/Black':     { bg: 'linear-gradient(90deg, #dc2626 50%, #1f2937 50%)', text: '#fff' },
  'White':         { bg: '#f9fafb', border: '#d1d5db', text: '#374151' },
  'Green':         { bg: '#15803d', text: '#fff' },
  'Red':           { bg: '#dc2626', text: '#fff' },
  'Blue':          { bg: '#2563eb', text: '#fff' },
  'Orange':        { bg: '#ea580c', text: '#fff' },
  'Purple':        { bg: '#7c3aed', text: '#fff' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  displayName: string
  handicapIndex: number | null
  combinations: WizardCombo[]
  combinationTees: CombinationTee[]
  combinationHoles: Record<string, ComboHole[]>
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewEventWizard({
  displayName,
  handicapIndex,
  combinations,
  combinationTees,
  combinationHoles,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]!

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState<1 | 2 | 3 | 4>(1)
  const [eventName, setEventName]         = useState('')
  const [nameEdited, setNameEdited]       = useState(false)
  const [date, setDate]                   = useState(today)
  const [combinationId, setCombinationId] = useState('')
  const [format, setFormat]               = useState<'stableford' | 'strokeplay'>('stableford')
  const [allowancePct, setAllowancePct]   = useState(95)
  const [groupSize, setGroupSize]         = useState<2 | 3 | 4>(4)
  const [maxPlayersStr, setMaxPlayersStr] = useState('')
  const [ntpHoles, setNtpHoles]           = useState<number[]>([])
  const [ldHoles, setLdHoles]             = useState<number[]>([])
  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false)
  const [entryFeeStr, setEntryFeeStr]     = useState('')
  const [myHcpStr, setMyHcpStr]           = useState(handicapIndex !== null ? String(handicapIndex) : '')
  const [error, setError]                 = useState('')

  // Auto-generate event name from combination + format + date
  useEffect(() => {
    if (nameEdited || !combinationId) return
    const combo = combinations.find(c => c.id === combinationId)
    if (!combo) return
    const short = combo.name.split('—').pop()?.trim() ?? combo.name
    const fmtLabel = format === 'stableford' ? 'Stableford' : 'Stroke Play'
    const d = new Date(date + 'T12:00:00')
    const dateLbl = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    setEventName(`${short} · ${fmtLabel} · ${dateLbl}`)
  }, [combinationId, format, date, nameEdited, combinations])

  // Derived
  const holes        = combinationId ? (combinationHoles[combinationId] ?? []) : []
  const selectedCombo = combinations.find(c => c.id === combinationId)
  const availableTees = [...new Map(
    combinationTees
      .filter(t => t.combination_id === combinationId)
      .map(t => [t.tee_colour, t]),
  ).values()]

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleNtp = (h: number) =>
    setNtpHoles(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort((a, b) => a - b))

  const toggleLd = (h: number) =>
    setLdHoles(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort((a, b) => a - b))

  const handleFormatChange = (f: 'stableford' | 'strokeplay') => {
    setFormat(f)
    setAllowancePct(f === 'stableford' ? 95 : 100)
  }

  const canNext = step === 1 ? (!!eventName.trim() && !!date && !!combinationId) : true

  const handleCreate = () => {
    setError('')
    startTransition(async () => {
      try {
        const eventId = await createEvent({
          eventName:            eventName.trim(),
          date,
          combinationId,
          format,
          handicapAllowancePct: allowancePct,
          groupSize,
          maxPlayers:           maxPlayersStr ? parseInt(maxPlayersStr, 10) : null,
          ntpHoles,
          ldHoles,
          entryFeePence:        entryFeeEnabled && entryFeeStr
                                  ? Math.round(parseFloat(entryFeeStr) * 100)
                                  : null,
          organiserHandicap:    myHcpStr ? parseFloat(myHcpStr) : null,
        })
        router.push(`/events/${eventId}/manage`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create event')
      }
    })
  }

  // Summary helpers for Step 4
  const formatLabel   = format === 'stableford' ? 'Stableford' : 'Stroke Play'
  const feeLabel      = entryFeeEnabled && entryFeeStr ? `£${parseFloat(entryFeeStr).toFixed(2)}` : 'Free'
  const ntpLabel      = ntpHoles.length ? ntpHoles.map(h => `Hole ${h}`).join(', ') : 'None'
  const ldLabel       = ldHoles.length  ? ldHoles.map(h => `Hole ${h}`).join(', ')  : 'None'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .wiz-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #d1d5db; border-radius: 10px;
          font-size: 0.9375rem; font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A; outline: none; box-sizing: border-box;
          transition: border-color 0.15s; background: #fff;
        }
        .wiz-input:focus { border-color: #0D631B; }
        .wiz-label {
          display: block; font-size: 0.8125rem; font-weight: 500;
          color: #374151; margin-bottom: 6px; font-family: var(--font-dm-sans), sans-serif;
        }
        .combo-card {
          padding: 16px; border: 2px solid #E0EBE0; border-radius: 14px;
          background: #fff; cursor: pointer; transition: all 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .combo-card:hover { border-color: #0D631B; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13,99,27,0.12); }
        .combo-card.selected { border-color: #0D631B; background: #F0F9F1; }
        .hole-chip {
          width: 40px; height: 40px; border-radius: 10px; border: 1.5px solid #d1d5db;
          background: #fff; font-size: 0.8125rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-dm-sans), sans-serif; transition: all 0.12s;
          color: #1A2E1A;
        }
        .hole-chip:hover { border-color: #0D631B; }
        .hole-chip.ntp-suggested { border-color: #f97316; color: #f97316; background: #fff7ed; }
        .hole-chip.ld-suggested  { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
        .hole-chip.ntp-selected  { background: #f97316; border-color: #f97316; color: #fff; }
        .hole-chip.ld-selected   { background: #2563eb; border-color: #2563eb; color: #fff; }
        .row-field { margin-bottom: 20px; }
        .summary-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 10px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .summary-row:last-child { border-bottom: none; }
        .format-chip {
          flex: 1; padding: 12px 0; border: 2px solid #E0EBE0; border-radius: 10px;
          background: #fff; font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
          color: #1A2E1A;
        }
        .format-chip.selected { border-color: #0D631B; background: #F0F9F1; color: #0D631B; font-weight: 600; }
        .size-chip {
          width: 56px; height: 44px; border: 2px solid #E0EBE0; border-radius: 10px;
          background: #fff; font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
          color: #1A2E1A;
        }
        .size-chip.selected { border-color: #0D631B; background: #F0F9F1; color: #0D631B; font-weight: 600; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#0a1f0a', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/play" style={{ textDecoration: 'none', color: '#6B8C6B', fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            ← Back
          </Link>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          <span style={{ width: 48 }} />
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ background: '#F2F5F0', minHeight: 'calc(100dvh - 60px)', padding: '32px 32px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Page title */}
          <h1 style={{
            fontFamily: 'var(--font-dm-serif), serif', fontWeight: 400,
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', color: '#1A2E1A',
            margin: '0 0 8px', letterSpacing: '-0.02em',
          }}>
            New event
          </h1>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4
              const isActive   = n === step
              const isComplete = n < step
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => isComplete ? setStep(n) : undefined}
                    disabled={!isComplete}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: isComplete ? 'pointer' : 'default',
                      padding: 0, fontFamily: 'var(--font-dm-sans), sans-serif',
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      background: isActive ? '#0D631B' : isComplete ? '#E0EBE0' : '#E0EBE0',
                      color: isActive ? '#fff' : isComplete ? '#0D631B' : '#9ca3af',
                      transition: 'all 0.15s',
                    }}>
                      {isComplete ? '✓' : n}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#1A2E1A' : '#6B8C6B',
                      display: 'none',
                    }}
                      className="step-label"
                    >
                      {label}
                    </span>
                  </button>
                  {i < 3 && <div style={{ width: 24, height: 1, background: '#E0EBE0' }} />}
                </div>
              )
            })}
            <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              {STEP_LABELS[step - 1]}
            </span>
          </div>

          {/* ─────────────── STEP 1: Course & date ─────────────── */}
          {step === 1 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px' }}>
              <div className="row-field">
                <label className="wiz-label">Event name</label>
                <input
                  className="wiz-input"
                  type="text"
                  value={eventName}
                  placeholder="e.g. Sunday Stableford · 20 Apr"
                  onChange={e => { setEventName(e.target.value); setNameEdited(true) }}
                />
              </div>

              <div className="row-field">
                <label className="wiz-label">Date</label>
                <input
                  className="wiz-input"
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: 'auto', minWidth: 180 }}
                />
              </div>

              <div className="row-field" style={{ marginBottom: 0 }}>
                <label className="wiz-label">Course</label>
                {combinations.length === 0 ? (
                  <div style={{ padding: '20px', borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '0.875rem', color: '#92400e', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    No courses found in the database. Please contact support to add courses.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 4 }}>
                    {combinations.map(c => (
                      <button
                        key={c.id}
                        className={`combo-card${combinationId === c.id ? ' selected' : ''}`}
                        onClick={() => { setCombinationId(c.id); setNtpHoles([]); setLdHoles([]) }}
                      >
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', marginBottom: 2 }}>
                          {c.name.split('—').pop()?.trim() ?? c.name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#6B8C6B' }}>
                          {c.courseName} &middot; Par {c.par}
                        </div>
                        {combinationId === c.id && (
                          <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#0D631B', fontWeight: 600 }}>✓ Selected</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tee selector — shown once a combination is selected */}
              {combinationId && availableTees.length > 0 && (
                <div className="row-field" style={{ marginTop: 20, marginBottom: 0 }}>
                  <label className="wiz-label">Tees (informational)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {availableTees.map(t => {
                      const sw = TEE_SWATCH[t.tee_colour] ?? { bg: '#6b7280', text: '#fff' }
                      return (
                        <div
                          key={t.tee_colour}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 10,
                            border: '1.5px solid #E0EBE0', background: '#fff',
                            fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '0.8125rem',
                          }}
                        >
                          <span style={{
                            width: 14, height: 14, borderRadius: '50%',
                            background: sw.bg, border: sw.border ? `1px solid ${sw.border}` : undefined,
                            flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 500, color: '#1A2E1A' }}>{t.tee_colour}</span>
                          {t.slope_rating && (
                            <span style={{ color: '#6B8C6B' }}>
                              SR {t.slope_rating} / CR {t.course_rating}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────── STEP 2: Format ─────────────── */}
          {step === 2 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label className="wiz-label" style={{ marginBottom: 10 }}>Format</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['stableford', 'strokeplay'] as const).map(f => (
                    <button
                      key={f}
                      className={`format-chip${format === f ? ' selected' : ''}`}
                      onClick={() => handleFormatChange(f)}
                    >
                      {f === 'stableford' ? 'Stableford' : 'Stroke Play'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B8C6B', marginTop: 6, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {format === 'stableford' ? 'Points-based scoring. Most popular for society rounds.' : 'Count every shot. No handicap points.'}
                </div>
              </div>

              <div>
                <label className="wiz-label">Handicap allowance (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    className="wiz-input"
                    type="number"
                    min={0} max={100} step={5}
                    value={allowancePct}
                    onChange={e => setAllowancePct(parseInt(e.target.value, 10) || 0)}
                    style={{ width: 100 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    {format === 'stableford' ? 'Standard: 95%' : 'Standard: 100%'}
                  </span>
                </div>
              </div>

              <div>
                <label className="wiz-label" style={{ marginBottom: 10 }}>Group size</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([2, 3, 4] as const).map(n => (
                    <button
                      key={n}
                      className={`size-chip${groupSize === n ? ' selected' : ''}`}
                      onClick={() => setGroupSize(n)}
                    >
                      {n}-ball
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="wiz-label">Max players <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                <input
                  className="wiz-input"
                  type="number"
                  min={1}
                  value={maxPlayersStr}
                  placeholder="No limit"
                  onChange={e => setMaxPlayersStr(e.target.value)}
                  style={{ width: 140 }}
                />
              </div>

              <div>
                <label className="wiz-label">Your handicap index</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    className="wiz-input"
                    type="number"
                    min={0}
                    max={54}
                    step={0.1}
                    value={myHcpStr}
                    placeholder="e.g. 18.4"
                    onChange={e => setMyHcpStr(e.target.value)}
                    style={{ width: 120 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    {handicapIndex !== null ? `Profile: ${handicapIndex}` : 'Not set in profile'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── STEP 3: Contests & fees ─────────────── */}
          {step === 3 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* NTP holes */}
              <div>
                <label className="wiz-label" style={{ marginBottom: 4 }}>
                  Nearest the pin holes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Select par 3 holes. <span style={{ color: '#f97316' }}>●</span> = par 3
                </p>
                {holes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {holes.map(h => {
                      const isPar3    = h.par === 3
                      const isSelected = ntpHoles.includes(h.hole)
                      return (
                        <button
                          key={h.hole}
                          className={`hole-chip${isSelected ? ' ntp-selected' : isPar3 ? ' ntp-suggested' : ''}`}
                          onClick={() => toggleNtp(h.hole)}
                          title={`Hole ${h.hole} — Par ${h.par}`}
                        >
                          {h.hole}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                      <button
                        key={h}
                        className={`hole-chip${ntpHoles.includes(h) ? ' ntp-selected' : ''}`}
                        onClick={() => toggleNtp(h)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* LD holes */}
              <div>
                <label className="wiz-label" style={{ marginBottom: 4 }}>
                  Longest drive holes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Select par 4 or 5 holes. <span style={{ color: '#2563eb' }}>●</span> = par 4/5
                </p>
                {holes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {holes.map(h => {
                      const isLongHole = h.par >= 4
                      const isSelected  = ldHoles.includes(h.hole)
                      return (
                        <button
                          key={h.hole}
                          className={`hole-chip${isSelected ? ' ld-selected' : isLongHole ? ' ld-suggested' : ''}`}
                          onClick={() => toggleLd(h.hole)}
                          title={`Hole ${h.hole} — Par ${h.par}`}
                        >
                          {h.hole}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                      <button
                        key={h}
                        className={`hole-chip${ldHoles.includes(h) ? ' ld-selected' : ''}`}
                        onClick={() => toggleLd(h)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Entry fee */}
              <div>
                <label className="wiz-label" style={{ marginBottom: 10 }}>Entry fee</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <button
                    className={`format-chip${!entryFeeEnabled ? ' selected' : ''}`}
                    style={{ flex: 'none', width: 80 }}
                    onClick={() => setEntryFeeEnabled(false)}
                  >
                    Free
                  </button>
                  <button
                    className={`format-chip${entryFeeEnabled ? ' selected' : ''}`}
                    style={{ flex: 'none', width: 80 }}
                    onClick={() => setEntryFeeEnabled(true)}
                  >
                    Paid
                  </button>
                </div>
                {entryFeeEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>£</span>
                    <input
                      className="wiz-input"
                      type="number"
                      min={0} step={0.50}
                      value={entryFeeStr}
                      placeholder="0.00"
                      onChange={e => setEntryFeeStr(e.target.value)}
                      style={{ width: 120 }}
                    />
                    <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>per player</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 4: Review ─────────────── */}
          {step === 4 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px' }}>
              <div style={{ marginBottom: 20, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 4 }}>{eventName}</div>
                <div style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                {[
                  ['Course',    selectedCombo?.courseName ?? '—'],
                  ['Combination', selectedCombo?.name.split('—').pop()?.trim() ?? '—'],
                  ['Format',    `${formatLabel} · ${allowancePct}% allowance`],
                  ['Group size', `${groupSize}-ball`],
                  ['Max players', maxPlayersStr || 'No limit'],
                  ['NTP holes',  ntpLabel],
                  ['LD holes',   ldLabel],
                  ['Your HCP',   myHcpStr ? myHcpStr : 'Not set'],
                  ['Entry fee',  feeLabel],
                ].map(([k, v]) => (
                  <div key={k} className="summary-row">
                    <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>{k}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A2E1A' }}>{v}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.875rem', color: '#dc2626', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'space-between' }}>
            {step > 1 ? (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
                style={{
                  padding: '13px 24px', border: '1.5px solid #E0EBE0', borderRadius: 12,
                  background: '#fff', fontSize: '0.9375rem', fontWeight: 500,
                  fontFamily: 'var(--font-dm-sans), sans-serif', color: '#1A2E1A', cursor: 'pointer',
                }}
              >
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as 2 | 3 | 4)}
                disabled={!canNext}
                style={{
                  padding: '13px 32px', border: 'none', borderRadius: 12,
                  background: canNext ? '#0D631B' : '#9ca3af',
                  fontSize: '0.9375rem', fontWeight: 600,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  color: '#fff', cursor: canNext ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isPending}
                style={{
                  padding: '13px 32px', border: 'none', borderRadius: 12,
                  background: isPending ? '#9ca3af' : '#0D631B',
                  fontSize: '0.9375rem', fontWeight: 600,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  color: '#fff', cursor: isPending ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {isPending ? 'Creating…' : 'Create event'}
              </button>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
