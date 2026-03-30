'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createEvent } from './actions'
import type { WizardCombo, CombinationTee, ComboHole } from './page'
import BottomNav from '@/components/BottomNav'

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
  const [predictionsEnabled, setPredictionsEnabled] = useState(false)
  const [startingCreditsStr, setStartingCreditsStr] = useState('1000')
  const [error, setError]                 = useState('')
  const [courseSearch, setCourseSearch]   = useState('')

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
          predictionsEnabled:   predictionsEnabled,
          startingCredits:      startingCreditsStr ? parseInt(startingCreditsStr, 10) : 1000,
        })
        router.push(`/events/${eventId}/manage`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create tournament')
      }
    })
  }

  // Summary helpers for Step 4
  const formatLabel   = format === 'stableford' ? 'Stableford' : 'Stroke Play'
  const feeLabel      = entryFeeEnabled && entryFeeStr ? `£${parseFloat(entryFeeStr).toFixed(2)}` : 'Free'
  const ntpLabel      = ntpHoles.length ? ntpHoles.map(h => `Hole ${h}`).join(', ') : 'None'
  const ldLabel       = ldHoles.length  ? ldHoles.map(h => `Hole ${h}`).join(', ')  : 'None'
  const predLabel     = predictionsEnabled ? `On · ${startingCreditsStr || '1000'} credits` : 'Off'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ── Hero Banner ── */
        .nev-banner {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
        }
        .nev-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .nev-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.55) 0%,
            rgba(10, 31, 10, 0.25) 50%,
            rgba(10, 31, 10, 0.15) 100%
          );
          z-index: 1;
        }
        .nev-banner-content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1rem 1.25rem;
        }
        .nev-back {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .nev-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .nev-banner-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.75rem, 4vw, 2.25rem);
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        @media (min-width: 768px) {
          .nev-banner { height: 180px; }
        }

        /* ── Form fields ── */
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

        /* ── Course selection ── */
        .nev-search {
          position: relative;
          margin-bottom: 16px;
        }
        .nev-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6B8C6B;
        }
        .nev-search-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #E0EBE0;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          outline: none;
          box-sizing: border-box;
          background: #fff;
          box-shadow: 0 2px 8px rgba(26, 28, 28, 0.04);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .nev-search-input:focus {
          border-color: #0D631B;
          box-shadow: 0 0 0 3px rgba(13, 99, 27, 0.1);
        }
        .nev-course-card {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: #fff;
          border-radius: 14px;
          cursor: pointer;
          margin-bottom: 10px;
          box-shadow: 0 2px 8px rgba(26, 28, 28, 0.04);
          border-left: 4px solid transparent;
          transition: all 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .nev-course-card:hover {
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.08);
          transform: translateY(-1px);
        }
        .nev-course-card.selected {
          border-left-color: #0D631B;
          background: rgba(13, 99, 27, 0.04);
        }
        .nev-course-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
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

      {/* ── Hero Banner ── */}
      <div className="nev-banner">
        <Image
          src="/hero.jpg"
          alt="Golf course"
          fill
          priority
          className="nev-banner-img"
          sizes="100vw"
          quality={90}
        />
        <div className="nev-banner-overlay" />
        <div className="nev-banner-content">
          <Link href="/events" className="nev-back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <h1 className="nev-banner-title">New tournament</h1>
        </div>
      </div>

      {/* ── Body ── */}
      <main style={{ background: '#F2F5F0', minHeight: 'calc(100dvh - 160px)', padding: '32px 32px 120px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Step indicator */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            position: 'relative', marginBottom: 32,
          }}>
            {/* Background progress line */}
            <div style={{
              position: 'absolute', top: 16, left: 16, right: 16,
              height: 2, background: 'rgba(26, 28, 28, 0.12)', zIndex: 0,
            }} />
            {/* Filled progress line */}
            <div style={{
              position: 'absolute', top: 16, left: 16,
              height: 2, background: '#0D631B', zIndex: 1,
              transition: 'width 0.3s ease-in-out',
              width: step >= 4
                ? 'calc(100% - 32px)'
                : `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%`,
            }} />

            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4
              const isComplete = n < step
              const isActive   = n === step
              return (
                <button
                  key={n}
                  onClick={() => isComplete ? setStep(n) : undefined}
                  disabled={!isComplete}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    zIndex: 2, flex: 1, background: 'none', border: 'none', padding: 0,
                    cursor: isComplete ? 'pointer' : 'default',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: isComplete || isActive ? 'linear-gradient(135deg, #0D631B 0%, #0a4f15 100%)' : '#FFFFFF',
                    border: isComplete || isActive ? 'none' : '2px solid rgba(26, 28, 28, 0.12)',
                    boxShadow: isActive ? '0 0 0 4px rgba(13, 99, 27, 0.1)' : 'none',
                    transition: 'all 0.2s ease-in-out',
                  }}>
                    {isComplete ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFFFFF' }} />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 14, color: '#72786E' }}>
                        {n}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 500,
                    color: isComplete || isActive ? '#0D631B' : '#72786E',
                    transition: 'color 0.2s',
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ─────────────── STEP 1: Course & date ─────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tournament details card */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px' }}>
                <div className="row-field">
                  <label className="wiz-label">Tournament name</label>
                  <input
                    className="wiz-input"
                    type="text"
                    value={eventName}
                    placeholder="e.g. Sunday Stableford · 20 Apr"
                    onChange={e => { setEventName(e.target.value); setNameEdited(true) }}
                  />
                </div>
                <div className="row-field" style={{ marginBottom: 0 }}>
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
              </div>

              {/* Course selection */}
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-dm-serif), serif', fontWeight: 400,
                  fontSize: '1.25rem', color: '#1A2E1A', margin: '0 0 12px',
                }}>
                  Select course
                </h2>
                {combinations.length === 0 ? (
                  <div style={{ padding: '20px', borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '0.875rem', color: '#92400e', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    No courses found in the database. Please contact support to add courses.
                  </div>
                ) : (
                  <>
                    {combinations.length > 4 && (
                      <div className="nev-search">
                        <svg className="nev-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                          className="nev-search-input"
                          type="text"
                          value={courseSearch}
                          onChange={e => setCourseSearch(e.target.value)}
                          placeholder="Search courses"
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {combinations
                        .filter(c => {
                          if (!courseSearch) return true
                          const q = courseSearch.toLowerCase()
                          return c.name.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q)
                        })
                        .map(c => {
                          const selected = combinationId === c.id
                          const shortN = c.name.split('—').pop()?.trim() ?? c.name
                          return (
                            <div
                              key={c.id}
                              className={`nev-course-card${selected ? ' selected' : ''}`}
                              onClick={() => { setCombinationId(c.id); setNtpHoles([]); setLdHoles([]) }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => e.key === 'Enter' && (setCombinationId(c.id), setNtpHoles([]), setLdHoles([]))}
                            >
                              <div className="nev-course-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                  <line x1="5" y1="3" x2="5" y2="21" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M5 3 L19 8 L5 13 Z" fill="#0D631B"/>
                                  <line x1="3" y1="21" x2="8" y2="21" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1A2E1A', marginBottom: 2 }}>
                                  {shortN}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#6B8C6B' }}>
                                  {c.courseName} &middot; Par {c.par}
                                </div>
                              </div>
                              {selected && (
                                <div style={{
                                  width: 24, height: 24, borderRadius: '50%',
                                  background: '#0D631B', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  alignSelf: 'center',
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      {courseSearch && combinations.filter(c => {
                        const q = courseSearch.toLowerCase()
                        return c.name.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q)
                      }).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                          No courses matching &ldquo;{courseSearch}&rdquo;
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Tee info — shown once a combination is selected */}
                {combinationId && availableTees.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <label className="wiz-label">Available tees</label>
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

              {/* Predictions betting */}
              <div>
                <label className="wiz-label" style={{ marginBottom: 4 }}>
                  Predictions &amp; betting
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                    background: '#0D631B', color: '#fff', fontSize: '0.6875rem',
                    fontWeight: 700, letterSpacing: '0.04em', verticalAlign: 'middle',
                  }}>
                    PRO
                  </span>
                </label>
                <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.5 }}>
                  AI bookie sets live odds. Players bet virtual credits on outright winner, head-to-heads, over/unders, and more.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <button
                    className={`format-chip${!predictionsEnabled ? ' selected' : ''}`}
                    style={{ flex: 'none', width: 80 }}
                    onClick={() => setPredictionsEnabled(false)}
                  >
                    Off
                  </button>
                  <button
                    className={`format-chip${predictionsEnabled ? ' selected' : ''}`}
                    style={{ flex: 'none', width: 80 }}
                    onClick={() => setPredictionsEnabled(true)}
                  >
                    On
                  </button>
                </div>
                {predictionsEnabled && (
                  <div style={{ background: '#F0F9F1', borderRadius: 12, padding: '16px 18px', border: '1px solid #E0EBE0' }}>
                    <label className="wiz-label">Starting credits per player</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="wiz-input"
                        type="number"
                        min={100} max={10000} step={100}
                        value={startingCreditsStr}
                        onChange={e => setStartingCreditsStr(e.target.value)}
                        style={{ width: 120 }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>credits</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.4 }}>
                      Max bet: 20% of bankroll. Markets auto-generated from the field. Settled on finalisation.
                    </p>
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
                  ['Predictions', predLabel],
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
                {isPending ? 'Creating…' : 'Create tournament'}
              </button>
            )}
          </div>

        </div>
      </main>

      <BottomNav active="events" />
    </>
  )
}
