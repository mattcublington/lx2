'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createMerit } from './actions'
import type { WizardEvent, WizardTournament } from './page'
import BottomNav from '@/components/BottomNav'
import { PRESETS } from '@/lib/merit/presets'

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Details', 'Points', 'Events', 'Review'] as const
const CURRENT_YEAR = new Date().getFullYear()

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntryDraft {
  id: string
  type: 'event' | 'tournament'
  refId: string
  name: string
  multiplier: number
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  displayName: string
  events: WizardEvent[]
  tournaments: WizardTournament[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewMeritWizard({ events, tournaments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]                     = useState<1 | 2 | 3 | 4>(1)
  const [name, setName]                     = useState('')
  const [seasonYear, setSeasonYear]         = useState(CURRENT_YEAR)
  const [bestOf, setBestOf]                 = useState<string>('')
  const [participationPts, setParticipation] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [templateRows, setTemplateRows]     = useState<Array<{ pos: string; pts: number }>>(
    Object.entries(PRESETS['standard']?.template ?? {}).map(([pos, pts]) => ({ pos, pts }))
  )
  const [entries, setEntries]               = useState<EntryDraft[]>([])
  const [error, setError]                   = useState('')

  // ── Template helpers ───────────────────────────────────────────────────────

  const applyPreset = (key: string) => {
    const preset = PRESETS[key]
    if (!preset) return
    setSelectedPreset(key)
    setParticipation(preset.participation)
    setTemplateRows(Object.entries(preset.template).map(([pos, pts]) => ({ pos, pts })))
  }

  const updateTemplateRow = (index: number, field: 'pos' | 'pts', value: string) => {
    setTemplateRows(prev => {
      const next = [...prev]
      const row = next[index]
      if (!row) return prev
      if (field === 'pts') {
        next[index] = { ...row, pts: parseFloat(value) || 0 }
      } else {
        next[index] = { ...row, pos: value }
      }
      return next
    })
    setSelectedPreset(null)
  }

  const buildTemplate = (): Record<string, number> => {
    const t: Record<string, number> = {}
    for (const row of templateRows) {
      if (row.pos.trim()) t[row.pos.trim()] = row.pts
    }
    return t
  }

  // ── Entry helpers ──────────────────────────────────────────────────────────

  const toggleEntry = (type: 'event' | 'tournament', refId: string, refName: string) => {
    const exists = entries.find(e => e.type === type && e.refId === refId)
    if (exists) {
      setEntries(prev => prev.filter(e => !(e.type === type && e.refId === refId)))
    } else {
      setEntries(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        type,
        refId,
        name: refName,
        multiplier: 1.0,
      }])
    }
  }

  const updateMultiplier = (id: string, value: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, multiplier: parseFloat(value) || 1.0 } : e
    ))
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const canNext1 = name.trim().length > 0 && seasonYear >= 2000 && seasonYear <= 2100
  const canNext2 = templateRows.length > 0 && templateRows.some(r => r.pos.trim())

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setError('')
    startTransition(async () => {
      try {
        const bestOfVal = bestOf.trim() ? parseInt(bestOf, 10) : null
        const id = await createMerit({
          name: name.trim(),
          seasonYear,
          bestOf: bestOfVal,
          participationPoints: participationPts,
          pointsTemplate: buildTemplate(),
          entries: entries.map(e => {
            const entry: { eventId?: string; tournamentId?: string; multiplier: number } = {
              multiplier: e.multiplier,
            }
            if (e.type === 'event') entry.eventId = e.refId
            else entry.tournamentId = e.refId
            return entry
          }),
        })
        router.push(`/merit/${id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create Order of Merit')
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ── Hero Banner ── */
        .nmw-banner {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
        }
        .nmw-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .nmw-banner-overlay {
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
        .nmw-banner-content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1rem 1.25rem;
        }
        .nmw-back {
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
        .nmw-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .nmw-banner-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.5rem, 4vw, 2rem);
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        @media (min-width: 768px) {
          .nmw-banner { height: 180px; }
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

        /* ── Preset chips ── */
        .preset-chip {
          padding: 10px 16px;
          border: 2px solid #E0EBE0;
          border-radius: 10px;
          background: #fff;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          color: #1A2E1A;
        }
        .preset-chip.selected {
          border-color: #0D631B;
          background: #F0F9F1;
          color: #0D631B;
          font-weight: 600;
        }

        /* ── Template table ── */
        .tmpl-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
        }
        .tmpl-table th {
          text-align: left;
          padding: 8px 10px;
          font-weight: 600;
          color: #6B8C6B;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E0EBE0;
        }
        .tmpl-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #F2F5F0;
        }
        .tmpl-table input {
          padding: 6px 10px;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .tmpl-table input:focus { border-color: #0D631B; }

        /* ── Entry cards ── */
        .entry-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: #fff;
          border: 1.5px solid #E0EBE0;
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .entry-card:last-child { margin-bottom: 0; }
        .entry-card.selected {
          border-color: #0D631B;
          background: rgba(13, 99, 27, 0.04);
        }
        .entry-card-check {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid #E0EBE0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
          background: #fff;
        }
        .entry-card.selected .entry-card-check {
          background: #0D631B;
          border-color: #0D631B;
        }
        .entry-card-info { flex: 1; min-width: 0; }
        .entry-card-name {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1A2E1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .entry-card-meta {
          font-size: 0.8125rem;
          color: #6B8C6B;
          margin-top: 2px;
        }
        .multiplier-input {
          width: 72px;
          padding: 6px 8px;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: var(--font-dm-sans), sans-serif;
          text-align: center;
          outline: none;
          transition: border-color 0.15s;
          background: #fff;
          flex-shrink: 0;
        }
        .multiplier-input:focus { border-color: #0D631B; }

        /* ── Summary ── */
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 10px 0;
          border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .summary-row:last-child { border-bottom: none; }

        /* ── Nav buttons ── */
        .wiz-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          gap: 12px;
        }
        .wiz-btn-back {
          padding: 12px 24px;
          background: #fff;
          color: #1A2E1A;
          border: 1.5px solid #E0EBE0;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .wiz-btn-back:hover {
          background: #F2F5F0;
          border-color: #C8D4C8;
        }
        .wiz-btn-next {
          padding: 12px 28px;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(13, 99, 27, 0.2);
        }
        .wiz-btn-next:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13, 99, 27, 0.28);
        }
        .wiz-btn-next:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .wiz-btn-skip {
          padding: 12px 20px;
          background: transparent;
          color: #6B8C6B;
          border: none;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.15s;
        }
        .wiz-btn-skip:hover { color: #1A2E1A; }

        /* ── Badge ── */
        .multiplier-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(13, 99, 27, 0.1);
          color: #0D631B;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── Hero Banner ── */}
      <div className="nmw-banner">
        <Image
          src="/hero.jpg"
          alt="Golf course"
          fill
          priority
          className="nmw-banner-img"
          sizes="100vw"
          quality={90}
        />
        <div className="nmw-banner-overlay" />
        <div className="nmw-banner-content">
          <Link href="/merit" className="nmw-back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <h1 className="nmw-banner-title">New Order of Merit</h1>
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
            <div style={{
              position: 'absolute', top: 16, left: 16, right: 16,
              height: 2, background: 'rgba(26, 28, 28, 0.12)', zIndex: 0,
            }} />
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
                  onClick={() => { if (isComplete) setStep(n) }}
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
                <label className="wiz-label" htmlFor="merit-name">Order of Merit name</label>
                <input
                  id="merit-name"
                  className="wiz-input"
                  type="text"
                  value={name}
                  placeholder="e.g. Club Order of Merit 2026"
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="wiz-label" htmlFor="merit-year">Season year</label>
                <input
                  id="merit-year"
                  className="wiz-input"
                  type="number"
                  min={2000}
                  max={2100}
                  value={seasonYear}
                  onChange={e => setSeasonYear(parseInt(e.target.value, 10) || CURRENT_YEAR)}
                  style={{ width: 120 }}
                />
              </div>

              <div>
                <label className="wiz-label" htmlFor="merit-bestof">Best of (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    id="merit-bestof"
                    className="wiz-input"
                    type="number"
                    min={1}
                    value={bestOf}
                    placeholder="All events"
                    onChange={e => setBestOf(e.target.value)}
                    style={{ width: 140 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    Leave blank to count all events
                  </span>
                </div>
              </div>

              <div>
                <label className="wiz-label" htmlFor="merit-participation">Participation points per event</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    id="merit-participation"
                    className="wiz-input"
                    type="number"
                    min={0}
                    value={participationPts}
                    onChange={e => setParticipation(parseInt(e.target.value, 10) || 0)}
                    style={{ width: 100 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    Awarded to every player who competes
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ─────────────── STEP 2: Points Template ─────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Preset picker */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px 24px 20px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Start from a preset
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      className={`preset-chip${selectedPreset === key ? ' selected' : ''}`}
                      onClick={() => applyPreset(key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable table */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Points table — edit as needed
                </div>
                <table className="tmpl-table">
                  <thead>
                    <tr>
                      <th>Position / Key</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            type="text"
                            value={row.pos}
                            onChange={e => updateTemplateRow(i, 'pos', e.target.value)}
                            placeholder="e.g. 1 or default"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={row.pts}
                            onChange={e => updateTemplateRow(i, 'pts', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Use <code>default</code> as the key for all positions not explicitly listed.
                </div>
              </div>

            </div>
          )}

          {/* ─────────────── STEP 3: Add Events/Tournaments ─────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Events */}
              {events.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Single-Round Tournaments
                  </div>
                  {events.map(ev => {
                    const isSelected = entries.some(e => e.type === 'event' && e.refId === ev.id)
                    const entry = entries.find(e => e.type === 'event' && e.refId === ev.id)
                    return (
                      <div key={ev.id} className={`entry-card${isSelected ? ' selected' : ''}`} onClick={() => toggleEntry('event', ev.id, ev.name)}>
                        <div className="entry-card-check">
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="entry-card-info">
                          <div className="entry-card-name">{ev.name}</div>
                          <div className="entry-card-meta">{ev.date} &middot; {ev.format}</div>
                        </div>
                        {isSelected && entry && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>x</span>
                            <input
                              type="number"
                              className="multiplier-input"
                              min={0.1}
                              step={0.5}
                              value={entry.multiplier}
                              onChange={e => updateMultiplier(entry.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tournaments */}
              {tournaments.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Tournaments
                  </div>
                  {tournaments.map(t => {
                    const isSelected = entries.some(e => e.type === 'tournament' && e.refId === t.id)
                    const entry = entries.find(e => e.type === 'tournament' && e.refId === t.id)
                    return (
                      <div key={t.id} className={`entry-card${isSelected ? ' selected' : ''}`} onClick={() => toggleEntry('tournament', t.id, t.name)}>
                        <div className="entry-card-check">
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="entry-card-info">
                          <div className="entry-card-name">{t.name}</div>
                          <div className="entry-card-meta">{t.roundCount} {t.roundCount === 1 ? 'round' : 'rounds'} &middot; {t.format}</div>
                        </div>
                        {isSelected && entry && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>x</span>
                            <input
                              type="number"
                              className="multiplier-input"
                              min={0.1}
                              step={0.5}
                              value={entry.multiplier}
                              onChange={e => updateMultiplier(entry.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {events.length === 0 && tournaments.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '32px 24px', textAlign: 'center', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '0.875rem' }}>
                  No events or tournaments found. You can add them later from the manage page.
                </div>
              )}

            </div>
          )}

          {/* ─────────────── STEP 4: Review ─────────────── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Settings summary */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, fontSize: '1.125rem', color: '#1A2E1A', marginBottom: 16 }}>
                  Settings
                </div>
                <div className="summary-row">
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>Name</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>{name}</span>
                </div>
                <div className="summary-row">
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>Season</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>{seasonYear}</span>
                </div>
                <div className="summary-row">
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>Best of</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    {bestOf.trim() ? `Top ${bestOf} events` : 'All events'}
                  </span>
                </div>
                <div className="summary-row">
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>Participation points</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>{participationPts} pts</span>
                </div>
              </div>

              {/* Points template summary */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, fontSize: '1.125rem', color: '#1A2E1A', marginBottom: 16 }}>
                  Points Template
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {templateRows.filter(r => r.pos.trim()).map((row, i) => (
                    <div key={i} style={{
                      padding: '6px 12px',
                      background: '#F2F5F0',
                      borderRadius: 8,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      fontSize: '0.8125rem',
                      color: '#1A2E1A',
                    }}>
                      {row.pos === 'default' ? 'Other' : `P${row.pos}`}: <strong>{row.pts}pts</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entries summary */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, fontSize: '1.125rem', color: '#1A2E1A', marginBottom: 16 }}>
                  Included Events ({entries.length})
                </div>
                {entries.length === 0 ? (
                  <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                    No events selected. You can add them from the manage page.
                  </div>
                ) : (
                  entries.map(e => (
                    <div key={e.id} className="summary-row">
                      <span style={{ fontSize: '0.875rem', color: '#1A2E1A', fontFamily: 'var(--font-dm-sans), sans-serif' }}>{e.name}</span>
                      <span className="multiplier-badge">{e.multiplier}x</span>
                    </div>
                  ))
                )}
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 10, color: '#dc2626', fontSize: '0.875rem',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}>
                  {error}
                </div>
              )}

            </div>
          )}

          {/* ── Navigation ── */}
          <div className="wiz-nav">
            {step > 1 ? (
              <button className="wiz-btn-back" onClick={() => setStep(prev => (prev - 1) as 1 | 2 | 3 | 4)}>
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button
                className="wiz-btn-next"
                onClick={() => setStep(2)}
                disabled={!canNext1}
              >
                Next: Points
              </button>
            )}

            {step === 2 && (
              <button
                className="wiz-btn-next"
                onClick={() => setStep(3)}
                disabled={!canNext2}
              >
                Next: Events
              </button>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="wiz-btn-skip" onClick={() => setStep(4)}>
                  Skip
                </button>
                <button className="wiz-btn-next" onClick={() => setStep(4)}>
                  Next: Review
                </button>
              </div>
            )}

            {step === 4 && (
              <button
                className="wiz-btn-next"
                onClick={handleCreate}
                disabled={isPending}
              >
                {isPending ? 'Creating…' : 'Create Order of Merit'}
              </button>
            )}
          </div>

        </div>
      </main>

      <BottomNav active="events" />
    </>
  )
}
