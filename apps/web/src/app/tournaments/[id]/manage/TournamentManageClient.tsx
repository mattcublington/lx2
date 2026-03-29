'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addRound,
  removeRound,
  reorderRounds,
  finaliseTournament,
  unfinaliseTournament,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Round {
  id: string
  name: string
  date: string
  finalised: boolean
  round_number: number
  courseName: string | null
}

export interface CourseCombination {
  id: string
  name: string
}

interface Props {
  tournamentId: string
  rounds: Round[]
  combinations: CourseCombination[]
  finalised: boolean
  format: string
  handicapAllowancePct: number
}

// ── Remove / Reorder buttons ──────────────────────────────────────────────────

function RoundControls({
  round,
  isFirst,
  isLast,
  tournamentId,
  allRounds,
  onMutate,
}: {
  round: Round
  isFirst: boolean
  isLast: boolean
  tournamentId: string
  allRounds: Round[]
  onMutate: () => void
}) {
  const [removing, startRemove] = useTransition()
  const [moving, startMove] = useTransition()

  function handleRemove() {
    startRemove(async () => {
      try {
        await removeRound(tournamentId, round.id)
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  function handleMove(direction: 'up' | 'down') {
    startMove(async () => {
      const sorted = [...allRounds].sort((a, b) => a.round_number - b.round_number)
      const idx = sorted.findIndex(r => r.id === round.id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return

      const swapRound = sorted[swapIdx]
      const idxRound = sorted[idx]
      if (!swapRound || !idxRound) return

      const newOrder = sorted.map((r, i) => {
        if (i === idx) return { eventId: r.id, roundNumber: swapRound.round_number }
        if (i === swapIdx) return { eventId: r.id, roundNumber: idxRound.round_number }
        return { eventId: r.id, roundNumber: r.round_number }
      })

      try {
        await reorderRounds(tournamentId, newOrder)
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <div className="mg-round-actions">
      <button
        className="mg-btn-icon"
        onClick={() => handleMove('up')}
        disabled={isFirst || moving}
        title="Move up"
        aria-label="Move round up"
      >
        ↑
      </button>
      <button
        className="mg-btn-icon"
        onClick={() => handleMove('down')}
        disabled={isLast || moving}
        title="Move down"
        aria-label="Move round down"
      >
        ↓
      </button>
      <button
        className="mg-btn-remove"
        onClick={handleRemove}
        disabled={removing}
      >
        {removing ? 'Removing…' : 'Remove'}
      </button>
    </div>
  )
}

// ── Add Round form ────────────────────────────────────────────────────────────

function AddRoundForm({
  tournamentId,
  combinations,
  handicapAllowancePct,
  onMutate,
}: {
  tournamentId: string
  combinations: CourseCombination[]
  handicapAllowancePct: number
  onMutate: () => void
}) {
  const [date, setDate] = useState('')
  const [combinationId, setCombinationId] = useState(combinations[0]?.id ?? '')
  const [eventName, setEventName] = useState('')
  const [pending, startAdd] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !combinationId) return

    const combo = combinations.find(c => c.id === combinationId)
    const name = eventName.trim() || (combo ? `${combo.name} — Round` : 'Round')

    startAdd(async () => {
      try {
        await addRound(tournamentId, {
          date,
          combinationId,
          eventName: name,
          handicapAllowancePct,
          groupSize: 4,
        })
        setDate('')
        setEventName('')
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <form className="mg-add-form" onSubmit={handleSubmit}>
      <div className="mg-form-row">
        <div className="mg-form-field">
          <label className="mg-form-label" htmlFor="mg-round-name">Round name (optional)</label>
          <input
            id="mg-round-name"
            className="mg-form-input"
            type="text"
            placeholder="e.g. Summer Cup — Round 3"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
          />
        </div>
        <div className="mg-form-field">
          <label className="mg-form-label" htmlFor="mg-round-date">Date</label>
          <input
            id="mg-round-date"
            className="mg-form-input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
        <div className="mg-form-field">
          <label className="mg-form-label" htmlFor="mg-round-course">Course</label>
          <select
            id="mg-round-course"
            className="mg-form-select"
            value={combinationId}
            onChange={e => setCombinationId(e.target.value)}
            required
          >
            {combinations.length === 0 && (
              <option value="" disabled>No courses available</option>
            )}
            {combinations.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        className="mg-btn-add"
        type="submit"
        disabled={pending || !date || !combinationId}
      >
        {pending ? 'Adding…' : '+ Add Round'}
      </button>
    </form>
  )
}

// ── Finalise / Reopen button ──────────────────────────────────────────────────

function FinaliseButton({
  tournamentId,
  finalised,
  onMutate,
}: {
  tournamentId: string
  finalised: boolean
  onMutate: () => void
}) {
  const [pending, start] = useTransition()

  function handleClick() {
    start(async () => {
      try {
        if (finalised) {
          await unfinaliseTournament(tournamentId)
        } else {
          if (!confirm('Finalise this tournament? Scores will be locked.')) return
          await finaliseTournament(tournamentId)
        }
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <button
      className={finalised ? 'mg-btn-reopen' : 'mg-btn-finalise'}
      onClick={handleClick}
      disabled={pending}
    >
      {pending
        ? finalised ? 'Reopening…' : 'Finalising…'
        : finalised ? 'Reopen Tournament' : 'Finalise Tournament'}
    </button>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export default function TournamentManageClient({
  tournamentId,
  rounds: initialRounds,
  combinations,
  finalised,
  format,
  handicapAllowancePct,
}: Props) {
  const router = useRouter()
  const [rounds, setRounds] = useState<Round[]>(initialRounds)

  function refresh() {
    router.refresh()
  }

  const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number)

  const FORMAT_LABEL: Record<string, string> = {
    stableford: 'Stableford',
    strokeplay: 'Stroke Play',
    matchplay: 'Match Play',
  }

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  // Keep local rounds in sync when server refreshes (via key on parent)
  // The router.refresh() triggers a re-render of the server component which
  // passes fresh initialRounds down.

  return (
    <>
      {/* ── Tournament info row ── */}
      <div className="mg-card">
        <div className="mg-card-label">Tournament info</div>
        <div className="mg-meta-row">
          <span className="mg-meta-key">Format</span>
          <span className="mg-meta-val">{FORMAT_LABEL[format] ?? format}</span>
        </div>
        <div className="mg-meta-row">
          <span className="mg-meta-key">Handicap allowance</span>
          <span className="mg-meta-val">{handicapAllowancePct}%</span>
        </div>
        <div className="mg-meta-row">
          <span className="mg-meta-key">Status</span>
          <span className="mg-meta-val">{finalised ? 'Finalised' : 'In progress'}</span>
        </div>
      </div>

      {/* ── Rounds list ── */}
      <div className="mg-card mg-card-full">
        <div className="mg-card-label" style={{ marginBottom: 12 }}>
          Rounds ({sorted.length})
        </div>
        {sorted.length === 0 ? (
          <div className="mg-empty">No rounds added yet. Use the form below to add the first round.</div>
        ) : (
          <div className="mg-round-list">
            {sorted.map((round, i) => {
              const statusLabel = round.finalised ? 'Finalised'
                : round.date < new Date().toISOString().slice(0, 10) ? 'Past'
                : 'Upcoming'
              const statusClass = round.finalised ? 'mg-badge-finalised'
                : statusLabel === 'Past' ? 'mg-badge-past'
                : 'mg-badge-upcoming'

              return (
                <div key={round.id} className="mg-round-row">
                  <div className="mg-round-info">
                    <div className="mg-round-label">Round {round.round_number}</div>
                    <div className="mg-round-name">{round.name}</div>
                    <div className="mg-round-meta">
                      {formatDate(round.date)}
                      {round.courseName && <> &middot; {round.courseName}</>}
                    </div>
                    <span className={`mg-badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="mg-round-right">
                    <a
                      href={`/events/${round.id}/manage`}
                      className="mg-btn-event-manage"
                    >
                      Manage round →
                    </a>
                    {!finalised && (
                      <RoundControls
                        round={round}
                        isFirst={i === 0}
                        isLast={i === sorted.length - 1}
                        tournamentId={tournamentId}
                        allRounds={rounds}
                        onMutate={refresh}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add round ── */}
      {!finalised && (
        <div className="mg-card mg-card-full">
          <div className="mg-card-label" style={{ marginBottom: 12 }}>Add a round</div>
          <AddRoundForm
            tournamentId={tournamentId}
            combinations={combinations}
            handicapAllowancePct={handicapAllowancePct}
            onMutate={refresh}
          />
        </div>
      )}

      {/* ── Finalise / Reopen ── */}
      <div className="mg-card mg-card-full">
        <div className="mg-card-label" style={{ marginBottom: 8 }}>
          {finalised ? 'Tournament completed' : 'Complete tournament'}
        </div>
        <p className="mg-card-desc">
          {finalised
            ? 'This tournament is finalised. Reopen to allow further changes.'
            : 'Finalise the tournament once all rounds are complete. Scores will be locked.'}
        </p>
        <FinaliseButton
          tournamentId={tournamentId}
          finalised={finalised}
          onMutate={refresh}
        />
      </div>
    </>
  )
}
