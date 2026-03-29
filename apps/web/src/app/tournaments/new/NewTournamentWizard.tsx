'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createTournament } from './actions'
import type { WizardCombo } from './page'
import BottomNav from '@/components/BottomNav'

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Details', 'Rounds', 'Review'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoundDraft {
  id: string
  date: string
  combinationId: string
  eventName: string
  nameEdited: boolean
  courseSearch: string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  displayName: string
  handicapIndex: number | null
  combinations: WizardCombo[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEventName(
  combinationId: string,
  format: 'stableford' | 'strokeplay',
  date: string,
  combinations: WizardCombo[],
): string {
  const combo = combinations.find(c => c.id === combinationId)
  if (!combo) return ''
  const short = combo.name.split('—').pop()?.trim() ?? combo.name
  const fmtLabel = format === 'stableford' ? 'Stableford' : 'Stroke Play'
  const d = new Date(date + 'T12:00:00')
  const dateLbl = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${short} · ${fmtLabel} · ${dateLbl}`
}

function makeRound(date: string): RoundDraft {
  return {
    id: Math.random().toString(36).slice(2),
    date,
    combinationId: '',
    eventName: '',
    nameEdited: false,
    courseSearch: '',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewTournamentWizard({
  displayName: _displayName,
  handicapIndex: _handicapIndex,
  combinations,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]!

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [name, setName]         = useState('')
  const [format, setFormat]     = useState<'stableford' | 'strokeplay'>('stableford')
  const [allowancePct, setAllowancePct] = useState(95)
  const [groupSize, setGroupSize]       = useState<2 | 3 | 4>(4)
  const [dnsPolicy, setDnsPolicy]       = useState<'exclude' | 'penalty'>('exclude')
  const [rounds, setRounds]     = useState<RoundDraft[]>([makeRound(today), makeRound(today)])
  const [error, setError]       = useState('')

  // ── Round helpers ──────────────────────────────────────────────────────────

  const updateRound = (id: string, patch: Partial<RoundDraft>) => {
    setRounds(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, ...patch }
      // Auto-generate event name unless manually edited
      if (!updated.nameEdited && (patch.combinationId !== undefined || patch.date !== undefined)) {
        updated.eventName = buildEventName(updated.combinationId, format, updated.date, combinations)
      }
      return updated
    }))
  }

  const addRound = () => {
    const lastDate = rounds[rounds.length - 1]?.date ?? today
    setRounds(prev => [...prev, makeRound(lastDate)])
  }

  const removeRound = (id: string) => {
    setRounds(prev => prev.filter(r => r.id !== id))
  }

  // When format changes, regenerate all non-manually-edited round names
  const handleFormatChange = (f: 'stableford' | 'strokeplay') => {
    setFormat(f)
    setAllowancePct(f === 'stableford' ? 95 : 100)
    setRounds(prev => prev.map(r => {
      if (r.nameEdited || !r.combinationId) return r
      return { ...r, eventName: buildEventName(r.combinationId, f, r.date, combinations) }
    }))
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const canNextStep1 = name.trim().length > 0

  const canNextStep2 = rounds.length >= 2
    && rounds.every(r => r.date && r.combinationId)

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setError('')
    startTransition(async () => {
      try {
        const id = await createTournament({
          name: name.trim(),
          format,
          dnsPolicy,
          handicapAllowancePct: allowancePct,
          groupSize,
          rounds: rounds.map((r, i) => ({
            roundNumber: i + 1,
            date: r.date,
            combinationId: r.combinationId,
            eventName: r.eventName || buildEventName(r.combinationId, format, r.date, combinations),
          })),
        })
        router.push(`/tournaments/${id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create tournament')
      }
    })
  }

  // ── Summary helpers ────────────────────────────────────────────────────────

  const formatLabel = format === 'stableford' ? 'Stableford' : 'Stroke Play'
  const dnsPolicyLabel = dnsPolicy === 'exclude' ? 'Exclude missed rounds' : 'Assign penalty score'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ── Hero Banner ── */
        .ntw-banner {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
        }
        .ntw-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .ntw-banner-overlay {
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
        .ntw-banner-content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1rem 1.25rem;
        }
        .ntw-back {
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
        .ntw-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .ntw-banner-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.75rem, 4vw, 2.25rem);
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        @media (min-width: 768px) {
          .ntw-banner { height: 180px; }
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
        .ntw-search {
          position: relative;
          margin-bottom: 12px;
        }
        .ntw-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6B8C6B;
        }
        .ntw-search-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          border: 1.5px solid #E0EBE0;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          outline: none;
          box-sizing: border-box;
          background: #F2F5F0;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ntw-search-input:focus {
          border-color: #0D631B;
          box-shadow: 0 0 0 3px rgba(13, 99, 27, 0.1);
        }
        .ntw-course-card {
          display: flex;
          gap: 12px;
          padding: 12px 14px;
          background: #fff;
          border-radius: 12px;
          cursor: pointer;
          margin-bottom: 8px;
          border: 1.5px solid #E0EBE0;
          border-left: 4px solid transparent;
          transition: all 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ntw-course-card:hover {
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.08);
          transform: translateY(-1px);
        }
        .ntw-course-card.selected {
          border-left-color: #0D631B;
          background: rgba(13, 99, 27, 0.04);
        }
        .ntw-course-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Format / size chips ── */
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

        /* ── Round card ── */
        .ntw-round-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #E0EBE0;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .ntw-round-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: #F2F5F0;
          border-bottom: 1px solid #E0EBE0;
        }
        .ntw-round-body {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ntw-remove-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1.5px solid #fecaca; background: #fff;
          color: #dc2626; font-size: 1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .ntw-remove-btn:hover { background: #fef2f2; }

        /* ── Summary ── */
        .summary-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 10px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .summary-row:last-child { border-bottom: none; }

        /* ── Row field ── */
        .row-field { margin-bottom: 0; }
      `}</style>

      {/* ── Hero Banner ── */}
      <div className="ntw-banner">
        <Image
          src="/hero.jpg"
          alt="Golf course"
          fill
          priority
          className="ntw-banner-img"
          sizes="100vw"
          quality={90}
        />
        <div className="ntw-banner-overlay" />
        <div className="ntw-banner-content">
          <Link href="/tournaments" className="ntw-back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <h1 className="ntw-banner-title">New tournament</h1>
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
              width: step >= 3
                ? 'calc(100% - 32px)'
                : `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%`,
            }} />

            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3
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

          {/* ─────────────── STEP 1: Details ─────────────── */}
          {step === 1 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div>
                <label className="wiz-label">Tournament name</label>
                <input
                  className="wiz-input"
                  type="text"
                  value={name}
                  placeholder="e.g. Club Championship 2026"
                  onChange={e => setName(e.target.value)}
                />
              </div>

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
                  {format === 'stableford' ? 'Points-based scoring across all rounds.' : 'Cumulative stroke count across all rounds.'}
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
                <label className="wiz-label" style={{ marginBottom: 10 }}>DNS policy</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['exclude', 'penalty'] as const).map(p => (
                    <button
                      key={p}
                      className={`format-chip${dnsPolicy === p ? ' selected' : ''}`}
                      onClick={() => setDnsPolicy(p)}
                    >
                      {p === 'exclude' ? 'Exclude missed rounds' : 'Assign penalty score'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B8C6B', marginTop: 6, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {dnsPolicy === 'exclude'
                    ? 'Players who miss a round are excluded from the overall standings.'
                    : 'Players who miss a round receive a worst-score penalty for that round.'}
                </div>
              </div>

            </div>
          )}

          {/* ─────────────── STEP 2: Rounds ─────────────── */}
          {step === 2 && (
            <div>
              {rounds.map((round, idx) => (
                <RoundCard
                  key={round.id}
                  round={round}
                  roundNumber={idx + 1}
                  today={today}
                  combinations={combinations}
                  canRemove={rounds.length > 2}
                  onUpdate={patch => updateRound(round.id, patch)}
                  onRemove={() => removeRound(round.id)}
                />
              ))}

              {/* Add round button */}
              <button
                onClick={addRound}
                style={{
                  width: '100%', padding: '14px', border: '2px dashed #E0EBE0',
                  borderRadius: 14, background: 'transparent',
                  fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '0.9375rem',
                  fontWeight: 500, color: '#0D631B', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#0D631B'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,99,27,0.03)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#E0EBE0'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add round
              </button>

              {rounds.length < 2 && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 10,
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  fontSize: '0.8125rem', color: '#92400e',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}>
                  A tournament requires at least 2 rounds.
                </div>
              )}
            </div>
          )}

          {/* ─────────────── STEP 3: Review ─────────────── */}
          {step === 3 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px 28px 24px' }}>
              <div style={{ marginBottom: 20, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>
                  {rounds.length} rounds
                </div>
              </div>

              <div>
                {[
                  ['Format',           `${formatLabel} · ${allowancePct}% allowance`],
                  ['Group size',       `${groupSize}-ball`],
                  ['DNS policy',       dnsPolicyLabel],
                ].map(([k, v]) => (
                  <div key={k} className="summary-row">
                    <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>{k}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A2E1A' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Rounds summary */}
              <div style={{ marginTop: 20 }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: 600, color: '#374151',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Rounds
                </div>
                {rounds.map((round, idx) => {
                  const combo = combinations.find(c => c.id === round.combinationId)
                  const shortName = combo?.name.split('—').pop()?.trim() ?? combo?.name ?? '—'
                  const dateStr = round.date
                    ? new Date(round.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'
                  return (
                    <div key={round.id} className="summary-row">
                      <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>Round {idx + 1}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A2E1A', textAlign: 'right' }}>
                        {shortName} &middot; {dateStr}
                      </span>
                    </div>
                  )
                })}
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
                onClick={() => setStep((step - 1) as 1 | 2)}
                style={{
                  padding: '13px 24px', border: '1.5px solid #E0EBE0', borderRadius: 12,
                  background: '#fff', fontSize: '0.9375rem', fontWeight: 500,
                  fontFamily: 'var(--font-dm-sans), sans-serif', color: '#1A2E1A', cursor: 'pointer',
                }}
              >
                Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 2 | 3)}
                disabled={step === 1 ? !canNextStep1 : !canNextStep2}
                style={{
                  padding: '13px 32px', border: 'none', borderRadius: 12,
                  background: (step === 1 ? canNextStep1 : canNextStep2) ? '#0D631B' : '#9ca3af',
                  fontSize: '0.9375rem', fontWeight: 600,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  color: '#fff', cursor: (step === 1 ? canNextStep1 : canNextStep2) ? 'pointer' : 'default',
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

// ── RoundCard sub-component ────────────────────────────────────────────────────

interface RoundCardProps {
  round: RoundDraft
  roundNumber: number
  today: string
  combinations: WizardCombo[]
  canRemove: boolean
  onUpdate: (patch: Partial<RoundDraft>) => void
  onRemove: () => void
}

function RoundCard({ round, roundNumber, today, combinations, canRemove, onUpdate, onRemove }: RoundCardProps) {
  const filtered = combinations.filter(c => {
    if (!round.courseSearch) return true
    const q = round.courseSearch.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q)
  })

  return (
    <div className="ntw-round-card">
      <div className="ntw-round-header">
        <span style={{
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 700, fontSize: '0.9375rem', color: '#1A2E1A',
        }}>
          Round {roundNumber}
        </span>
        {canRemove && (
          <button className="ntw-remove-btn" onClick={onRemove} title="Remove round" aria-label="Remove round">
            ×
          </button>
        )}
      </div>
      <div className="ntw-round-body">

        {/* Date */}
        <div>
          <label className="wiz-label">Date</label>
          <input
            className="wiz-input"
            type="date"
            value={round.date}
            min={today}
            onChange={e => onUpdate({ date: e.target.value })}
            style={{ width: 'auto', minWidth: 180 }}
          />
        </div>

        {/* Course search + cards */}
        <div>
          <label className="wiz-label">Course</label>
          {combinations.length === 0 ? (
            <div style={{ padding: '14px', borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '0.875rem', color: '#92400e', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              No courses available.
            </div>
          ) : (
            <>
              {combinations.length > 4 && (
                <div className="ntw-search">
                  <svg className="ntw-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    className="ntw-search-input"
                    type="text"
                    value={round.courseSearch}
                    onChange={e => onUpdate({ courseSearch: e.target.value })}
                    placeholder="Search courses"
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {filtered.map(c => {
                  const selected = round.combinationId === c.id
                  const shortN = c.name.split('—').pop()?.trim() ?? c.name
                  return (
                    <div
                      key={c.id}
                      className={`ntw-course-card${selected ? ' selected' : ''}`}
                      onClick={() => onUpdate({ combinationId: c.id })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && onUpdate({ combinationId: c.id })}
                    >
                      <div className="ntw-course-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <line x1="5" y1="3" x2="5" y2="21" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M5 3 L19 8 L5 13 Z" fill="#0D631B"/>
                          <line x1="3" y1="21" x2="8" y2="21" stroke="#0D631B" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1A2E1A', marginBottom: 1 }}>
                          {shortN}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B8C6B' }}>
                          {c.courseName} &middot; {c.holes} holes
                        </div>
                      </div>
                      {selected && (
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: '#0D631B', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          alignSelf: 'center',
                        }}>
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
                {round.courseSearch && filtered.length === 0 && (
                  <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    No courses matching &ldquo;{round.courseSearch}&rdquo;
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Auto-generated event name */}
        <div>
          <label className="wiz-label">
            Event name
            <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>(auto-generated)</span>
          </label>
          <input
            className="wiz-input"
            type="text"
            value={round.eventName}
            placeholder="Will be set from course + format + date"
            onChange={e => onUpdate({ eventName: e.target.value, nameEdited: true })}
          />
        </div>

      </div>
    </div>
  )
}
