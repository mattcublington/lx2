'use client'
import { useState, useReducer, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { PLAYER_COLOURS } from '@/lib/player-colours'
import type { ScoringHole, GroupPlayer } from './page'
import { enqueueScore, getQueuedScores, deleteQueuedScore, migrateFromLocalStorage } from '@/lib/offline-queue'

// Prevents concurrent drain runs per scorecard if the user toggles offline→online rapidly.
// Keyed by scorecardId so multiple mounted instances don't block each other.
const draining = new Set<string>()

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Props {
  scorecardId: string
  playerName: string
  handicapIndex: number
  format: 'stableford' | 'strokeplay' | 'matchplay'
  allowancePct: number
  roundType: '18' | '9'
  holes: ScoringHole[]
  initialScores: Record<number, number | null>
  initialPickups: Record<number, boolean>
  ntpHoles: number[]
  ldHoles: number[]
  selectedTee: string
  eventName: string
  eventDate: string
  groupPlayers: GroupPlayer[]
  initialHole?: number
}

interface State {
  hole: number                              // 0-based index into holes[]
  scores: Record<number, number | null>    // holeInRound → gross_strokes
  pickups: Record<number, boolean>         // holeInRound → is pickup
  showNTP: boolean
  ntpResults: Record<number, string>
  ldResults: Record<number, string>
  showCard: boolean
}

type Action =
  | { type: 'SCORE'; holeInRound: number; v: number }
  | { type: 'PICKUP'; holeInRound: number }
  | { type: 'UNDO'; holeInRound: number }
  | { type: 'SET_HOLE'; idx: number }
  | { type: 'NEXT'; maxIdx: number }
  | { type: 'SKIP_C'; maxIdx: number }
  | { type: 'SAVE_C'; ct: 'ntp' | 'ld'; holeNum: number; dist: string; maxIdx: number }
  | { type: 'TOGGLE_CARD' }

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function allocateStrokes(hc: number, holes: ScoringHole[]): Record<number, number> {
  const result: Record<number, number> = {}
  for (const h of holes) result[h.holeInRound] = 0

  const order = holes
    .filter(h => h.siM !== null)
    .map(h => ({ hir: h.holeInRound, si: h.siM! }))
    .sort((a, b) => a.si - b.si)

  let remaining = hc
  while (remaining > 0) {
    for (const o of order) {
      if (remaining <= 0) break
      result[o.hir] = (result[o.hir] ?? 0) + 1
      remaining--
    }
  }
  return result
}

function pts(gross: number, par: number, hcShots: number): number {
  const d = (gross - hcShots) - par
  return d >= 2 ? 0 : d === 1 ? 1 : d === 0 ? 2 : d === -1 ? 3 : d === -2 ? 4 : 5
}

function ptsLabel(p: number, gross: number, par: number, hcShots: number): string {
  const net = gross - hcShots
  const diff = net - par
  const term = diff <= -3 ? 'albatross'
    : diff === -2 ? 'eagle'
    : diff === -1 ? 'birdie'
    : diff === 0 ? 'par'
    : diff === 1 ? 'bogey'
    : diff === 2 ? 'double'
    : 'triple+'
  if (p === 0) return `blob · net ${net}`
  return `${p === 1 ? '1pt' : p + 'pts'} · net ${term}`
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SCORE': {
      const scores = { ...s.scores, [a.holeInRound]: a.v }
      const pickups = { ...s.pickups, [a.holeInRound]: false }
      return { ...s, scores, pickups }
    }
    case 'PICKUP': {
      const scores = { ...s.scores, [a.holeInRound]: null }
      const pickups = { ...s.pickups, [a.holeInRound]: true }
      return { ...s, scores, pickups }
    }
    case 'UNDO': {
      const scores = { ...s.scores, [a.holeInRound]: null }
      const pickups = { ...s.pickups, [a.holeInRound]: false }
      return { ...s, scores, pickups }
    }
    case 'SET_HOLE': return { ...s, hole: a.idx, showNTP: false }
    case 'NEXT': {
      return { ...s, hole: Math.min(a.maxIdx, s.hole + 1), showNTP: false }
    }
    case 'SKIP_C': return { ...s, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    case 'SAVE_C': {
      const k = a.ct === 'ntp' ? 'ntpResults' : 'ldResults'
      return { ...s, [k]: { ...s[k], [a.holeNum]: a.dist }, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    }
    case 'TOGGLE_CARD': return { ...s, showCard: !s.showCard }
    default: return s
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width: 42, height: 46, borderRadius: 10, border: '1.5px solid',
  background: '#fff', fontSize: 22, fontWeight: 500,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const bigStep: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #d0d8cc',
  background: '#fff', fontSize: 22, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7c6b',
}
const thS: React.CSSProperties = {
  padding: '5px 5px', textAlign: 'center', color: '#8a9a8a', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap',
}
const tdS: React.CSSProperties = { padding: '6px 5px', textAlign: 'center', fontSize: 12 }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoreEntryLive(props: Props) {
  const {
    scorecardId, playerName, handicapIndex, format, allowancePct,
    holes, initialScores, initialPickups, ntpHoles, ldHoles,
    selectedTee, eventName, eventDate, groupPlayers,
    initialHole = 0,
  } = props

  const router = useRouter()

  // Is the organiser scoring for a guest? (current scorecard doesn't belong to the current user)
  const isMyScorecard = groupPlayers.find(p => p.scorecardId === scorecardId)?.isCurrentUser ?? true

  // Live scores for all players in the group, keyed by scorecardId
  // { [scorecardId]: { [holeNumber]: gross_strokes | null } }
  const [liveScores, setLiveScores] = useState<Record<string, Record<number, number | null>>>(() => {
    const init: Record<string, Record<number, number | null>> = {}
    for (const p of groupPlayers) init[p.scorecardId] = { ...p.initialScores }
    return init
  })

  const maxIdx = holes.length - 1

  const [s, d] = useReducer(reducer, {
    hole: initialHole,
    scores: initialScores,
    pickups: initialPickups,
    showNTP: false,
    ntpResults: {},
    ldResults: {},
    showCard: false,
  })

  const [flash, setFlash] = useState<{ label: string; color: string } | null>(null)
  const [cDist, setCDist] = useState('')
  const [stepValue, setStepValue] = useState<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Supabase browser client (stable reference)
  const sb = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  ).current

  // One-time migration from legacy localStorage queue
  useEffect(() => {
    migrateFromLocalStorage(scorecardId)
  }, [scorecardId])

  // Realtime: subscribe to hole_scores for all scorecards in the group
  useEffect(() => {
    if (groupPlayers.length === 0) return
    const ids = groupPlayers.map(p => p.scorecardId).filter(Boolean)
    if (ids.length === 0) return

    const channel = sb
      .channel('group-hole-scores')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hole_scores' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { scorecard_id: string; hole_number: number; gross_strokes: number | null } | undefined
          if (!row || !ids.includes(row.scorecard_id)) return
          setLiveScores(prev => {
            const next = { ...(prev[row.scorecard_id] ?? {}) }
            if (payload.eventType === 'DELETE') {
              delete next[row.hole_number]
            } else {
              next[row.hole_number] = row.gross_strokes ?? null
            }
            return { ...prev, [row.scorecard_id]: next }
          })
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb])

  // Drain offline queue when we come back online
  const drainQueue = useCallback(async () => {
    if (draining.has(scorecardId)) return
    draining.add(scorecardId)
    window.dispatchEvent(new CustomEvent('lx2:sync-start'))
    try {
      const queue = await getQueuedScores(scorecardId)
      for (const entry of queue) {
        const { error } = await sb.from('hole_scores').upsert({
          scorecard_id: scorecardId,
          hole_number: entry.hole_number,
          gross_strokes: entry.gross_strokes,
        }, { onConflict: 'scorecard_id,hole_number' })
        if (!error) {
          await deleteQueuedScore(scorecardId, entry.hole_number)
        }
        // On error: leave in IndexedDB, retry on next online event
      }
    } finally {
      draining.delete(scorecardId)
      window.dispatchEvent(new CustomEvent('lx2:sync-complete'))
    }
  }, [sb, scorecardId])

  // Trigger drain directly from the online event
  useEffect(() => {
    window.addEventListener('online', drainQueue)
    return () => window.removeEventListener('online', drainQueue)
  }, [drainQueue])

  // Derived values
  const hole = holes[s.hole]!
  const isNTP = ntpHoles.includes(hole.holeInRound)
  const isLD = ldHoles.includes(hole.holeInRound)
  const isPickup = s.pickups[hole.holeInRound] ?? false
  const currentScore = s.scores[hole.holeInRound] ?? null

  // Effective handicap after allowance.
  // allowancePct is stored as a decimal fraction (0.95 = 95%), not a percentage.
  const effectiveHc = Math.round(handicapIndex * allowancePct)
  const strokesPerHole = allocateStrokes(effectiveHc, holes)
  const hcOnHole = strokesPerHole[hole.holeInRound] ?? 0

  useEffect(() => { setStepValue(currentScore) }, [s.hole, currentScore])

  // Running totals for the current user (uses local reducer state — no realtime lag)
  function getRunningTotal() {
    let totalPts = 0
    let totalStrokes = 0
    let holesPlayed = 0
    for (const h of holes) {
      const sc = s.scores[h.holeInRound]
      const pu = s.pickups[h.holeInRound]
      if (pu) { holesPlayed++; continue }
      if (sc != null) {
        holesPlayed++
        if (format === 'stableford') {
          totalPts += pts(sc, h.par, strokesPerHole[h.holeInRound] ?? 0)
        } else {
          totalStrokes += sc
        }
      }
    }
    return { totalPts, totalStrokes, holesPlayed }
  }

  // Running totals for any player (uses liveScores — null key = not scored, null value = pickup)
  function getPlayerTotal(playerScores: Record<number, number | null>, hcIndex: number) {
    const effHc = Math.round(hcIndex * allowancePct)
    const spH = allocateStrokes(effHc, holes)
    let totalPts = 0
    let totalStrokes = 0
    let holesPlayed = 0
    for (const h of holes) {
      if (!(h.holeInRound in playerScores)) continue // hole not yet scored
      holesPlayed++
      const sc = playerScores[h.holeInRound]
      if (sc == null) continue // pickup/NR — counts as played, 0 pts
      if (format === 'stableford') {
        totalPts += pts(sc, h.par, spH[h.holeInRound] ?? 0)
      } else {
        totalStrokes += sc
      }
    }
    return { totalPts, totalStrokes, holesPlayed }
  }

  // Persist to hole_scores. gross_strokes=null means NR/pickup (no separate column).
  async function persistScore(holeInRound: number, value: number | null) {
    const entry = { scorecard_id: scorecardId, hole_number: holeInRound, gross_strokes: value, queued_at: Date.now() }
    if (!navigator.onLine) {
      await enqueueScore(entry)
      return
    }
    const { error } = await sb.from('hole_scores').upsert({
      scorecard_id: scorecardId,
      hole_number: holeInRound,
      gross_strokes: value,
    }, { onConflict: 'scorecard_id,hole_number' })
    if (error) {
      await enqueueScore(entry)
    }
  }

  function tapScore(value: number) {
    const p = pts(value, hole.par, hcOnHole)
    d({ type: 'SCORE', holeInRound: hole.holeInRound, v: value })
    persistScore(hole.holeInRound, value)

    if (format === 'stableford') {
      // Flash stays until user navigates — no auto-dismiss timer
      if (flashTimer.current) clearTimeout(flashTimer.current)
      setFlash({ label: ptsLabel(p, value, hole.par, hcOnHole), color: p >= 3 ? '#3a7d44' : p === 0 ? '#b43c3c' : '#6b7c6b' })
    }

    // Prefetch the next player's page immediately so navigation feels instant
    if (groupPlayers.length > 1) {
      const currentHoleNum = hole.holeInRound
      const nextUnscored = groupPlayers.find(pl => {
        if (!pl.scorecardId || pl.scorecardId === scorecardId) return false
        return !(currentHoleNum in (liveScores[pl.scorecardId] ?? {}))
      })
      if (nextUnscored) {
        router.prefetch(`/rounds/${nextUnscored.scorecardId}/score?hole=${currentHoleNum}`)
      }
    }
  }

  function tapPickup() {
    d({ type: 'PICKUP', holeInRound: hole.holeInRound })
    persistScore(hole.holeInRound, null)
  }

  function handleNext() {
    setFlash(null)
    const isContest = ntpHoles.includes(hole.holeInRound) || ldHoles.includes(hole.holeInRound)
    const hasScore = currentScore !== null || isPickup
    if (isContest && hasScore && !s.showNTP) {
      // Show contest overlay instead of advancing
      d({ type: 'SET_HOLE', idx: s.hole }) // keep same hole, will set showNTP below via a small trick
      // We manually set showNTP by dispatching NEXT which checks internally
      // Use a local flag approach: trigger contest overlay inline
      setShowContestOverlay(true)
      return
    }
    // Marker mode: if multiple players and someone on this hole hasn't been scored yet,
    // navigate to them before advancing. liveScores keyed by scorecardId + holeInRound.
    if (groupPlayers.length > 1) {
      const currentHoleNum = hole.holeInRound
      const nextUnscored = groupPlayers.find(p => {
        if (!p.scorecardId || p.scorecardId === scorecardId) return false
        return !(currentHoleNum in (liveScores[p.scorecardId] ?? {}))
      })
      if (nextUnscored) {
        router.push(`/rounds/${nextUnscored.scorecardId}/score?hole=${currentHoleNum}`)
        return
      }
    }
    d({ type: 'NEXT', maxIdx })
  }

  // Contest overlay state (separate from reducer to keep reducer pure)
  const [showContestOverlay, setShowContestOverlay] = useState(false)

  function skipContest() {
    setShowContestOverlay(false)
    d({ type: 'NEXT', maxIdx })
  }

  function saveContest() {
    if (!cDist) return
    const ct: 'ntp' | 'ld' = ntpHoles.includes(hole.holeInRound) ? 'ntp' : 'ld'
    d({ type: 'SAVE_C', ct, holeNum: hole.holeInRound, dist: cDist, maxIdx })
    setCDist('')
    setShowContestOverlay(false)
  }

  const quickVals = [hole.par - 1, hole.par, hole.par + 1, hole.par + 2, hole.par + 3].filter(v => v >= 1)
  const { totalPts, totalStrokes, holesPlayed } = getRunningTotal()
  const yards = hole.yards[selectedTee] ?? null

  // Scorecard view
  if (s.showCard) {
    const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
    const outPar = holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0)
    const inPar = holes.slice(9).reduce((sum, h) => sum + h.par, 0)

    function holeTotal(from: number, to: number) {
      if (format === 'stableford') {
        let p = 0
        for (let i = from; i < to; i++) {
          const h = holes[i]!
          const sc = s.scores[h.holeInRound]
          if (sc != null && !s.pickups[h.holeInRound]) p += pts(sc, h.par, strokesPerHole[h.holeInRound] ?? 0)
        }
        return p > 0 ? String(p) : '–'
      } else {
        let st = 0; let any = false
        for (let i = from; i < to; i++) {
          const h = holes[i]!
          const sc = s.scores[h.holeInRound]
          if (sc != null && !s.pickups[h.holeInRound]) { st += sc; any = true }
        }
        return any ? String(st) : '–'
      }
    }

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#FAFBF8', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a2e1a', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #e8ece4' }}>
          <button onClick={() => d({ type: 'TOGGLE_CARD' })} style={{ background: 'none', border: 'none', fontSize: 14, color: '#3a7d44', fontWeight: 600, cursor: 'pointer' }}>← Scoring</button>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Scorecard</div>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: '8px 12px 4px', fontSize: 12, color: '#6b7c6b' }}>
          {eventName} · {eventDate} · HC {effectiveHc}
        </div>
        <div style={{ overflowX: 'auto', padding: '4px', WebkitOverflowScrolling: 'touch' as const }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 320, width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #d0d8cc' }}>
                <th style={thS}>#</th>
                <th style={thS}>Par</th>
                <th style={thS}>SI</th>
                <th style={thS}>Yds</th>
                <th style={{ ...thS, color: '#3a7d44' }}>{playerName.split(' ')[0]}</th>
                {format === 'stableford' && <th style={{ ...thS, color: '#3a7d44' }}>Pts</th>}
              </tr>
            </thead>
            <tbody>
              {holes.map((h, i) => {
                const sc = s.scores[h.holeInRound]
                const pu = s.pickups[h.holeInRound]
                const p = sc != null ? pts(sc, h.par, strokesPerHole[h.holeInRound] ?? 0) : null
                const cur = i === s.hole
                return (
                  <tr key={h.holeInRound}
                    style={{ borderBottom: '1px solid #f0f4ec', background: cur ? '#f5f9f2' : 'transparent', cursor: 'pointer' }}
                    onClick={() => { d({ type: 'SET_HOLE', idx: i }); d({ type: 'TOGGLE_CARD' }) }}>
                    <td style={{ ...tdS, fontWeight: 600 }}>{h.holeInRound}</td>
                    <td style={tdS}>{h.par}</td>
                    <td style={{ ...tdS, color: '#8a9a8a' }}>{h.siM ?? '–'}</td>
                    <td style={{ ...tdS, color: '#8a9a8a' }}>{h.yards[selectedTee] ?? '–'}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: pu ? '#aaa' : sc != null ? '#1a2e1a' : '#ddd' }}>
                      {pu ? 'NR' : sc != null ? sc : '–'}
                    </td>
                    {format === 'stableford' && (
                      <td style={{ ...tdS, fontWeight: 600, color: p != null && p >= 3 ? '#3a7d44' : p === 0 ? '#c44' : '#888' }}>
                        {pu ? '0' : p != null ? p : '–'}
                      </td>
                    )}
                  </tr>
                )
              })}
              {holes.length >= 9 && (
                <>
                  <tr style={{ borderTop: '2px solid #d0d8cc', fontWeight: 700 }}>
                    <td style={tdS}>Out</td>
                    <td style={tdS}>{outPar}</td>
                    <td /><td />
                    <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(0, 9)}</td>
                    {format === 'stableford' && <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(0, 9)}</td>}
                  </tr>
                  {holes.length >= 18 && (
                    <tr style={{ borderTop: '1px solid #e0e6dc', fontWeight: 700 }}>
                      <td style={tdS}>In</td>
                      <td style={tdS}>{inPar}</td>
                      <td /><td />
                      <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(9, 18)}</td>
                      {format === 'stableford' && <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(9, 18)}</td>}
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #d0d8cc', fontWeight: 700 }}>
                    <td style={tdS}>Total</td>
                    <td style={tdS}>{totalPar}</td>
                    <td /><td />
                    <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(0, holes.length)}</td>
                    {format === 'stableford' && <td style={{ ...tdS, color: '#3a7d44' }}>{holeTotal(0, holes.length)}</td>}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', background: '#FAFBF8', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a2e1a', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* "Scoring for guest" banner — shown when organiser is on someone else's scorecard */}
      {!isMyScorecard && (
        <div style={{ background: '#fff8e6', borderBottom: '1px solid #f0c040', padding: '6px 14px', fontSize: 12, color: '#7a5500', textAlign: 'center', fontWeight: 500 }}>
          Scoring for {playerName}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 8px', borderBottom: '1px solid #e8ece4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>LX<span style={{ color: '#3a7d44' }}>2</span></div>
          <div style={{ fontSize: 12, color: '#6b7c6b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {format === 'stableford' && holesPlayed > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3a7d44', background: '#e8f0e4', padding: '3px 10px', borderRadius: 8 }}>
              {totalPts}pts
            </div>
          )}
          {format !== 'stableford' && holesPlayed > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3a7d44', background: '#e8f0e4', padding: '3px 10px', borderRadius: 8 }}>
              {totalStrokes}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#8a9a8a' }}>
            {holesPlayed > 0 ? `thru ${holesPlayed}` : `HC ${effectiveHc}`}
          </div>
        </div>
      </div>

      {/* Hole navigation strip */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 6px', gap: 4 }}>
        <button
          onClick={() => { setFlash(null); d({ type: 'SET_HOLE', idx: Math.max(0, s.hole - 1) }) }}
          disabled={s.hole === 0}
          style={{ ...navBtn, color: s.hole === 0 ? '#d0d8cc' : '#4a5e4a', borderColor: s.hole === 0 ? '#eee' : '#d0d8cc', cursor: s.hole === 0 ? 'default' : 'pointer' }}>
          ‹
        </button>

        <div style={{ display: 'flex', gap: 5, flex: 1, justifyContent: 'center' }}>
          {(() => {
            let st = Math.max(0, s.hole - 1)
            if (st + 4 > holes.length) st = Math.max(0, holes.length - 4)
            return holes.slice(st, st + 4).map((h, vi) => {
              const i = st + vi
              const cur = i === s.hole
              const hasSc = s.scores[h.holeInRound] != null || s.pickups[h.holeInRound]
              const isContest = ntpHoles.includes(h.holeInRound) || ldHoles.includes(h.holeInRound)
              return (
                <button key={h.holeInRound}
                  onClick={() => { setFlash(null); d({ type: 'SET_HOLE', idx: i }) }}
                  style={{ flex: 1, height: 46, maxWidth: 74, borderRadius: 10, border: cur ? '2.5px solid #3a7d44' : `1.5px solid ${hasSc ? 'rgba(58,125,68,0.4)' : '#d0d8cc'}`, background: cur ? '#e8f0e4' : hasSc ? 'rgba(58,125,68,0.05)' : '#fff', color: cur ? '#2a5e30' : hasSc ? '#3a7d44' : '#6b7c6b', fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span>{h.holeInRound}</span>
                  {hasSc && !cur && <span style={{ fontSize: 9, opacity: 0.5, marginTop: -2 }}>✓</span>}
                  {isContest && (
                    <div style={{ position: 'absolute', top: 3, right: 4, width: 6, height: 6, borderRadius: '50%', background: ntpHoles.includes(h.holeInRound) ? '#e67e22' : '#3498db' }} />
                  )}
                </button>
              )
            })
          })()}
        </div>

        <button
          onClick={() => { setFlash(null); d({ type: 'SET_HOLE', idx: Math.min(maxIdx, s.hole + 1) }) }}
          disabled={s.hole === maxIdx}
          style={{ ...navBtn, color: s.hole === maxIdx ? '#d0d8cc' : '#4a5e4a', borderColor: s.hole === maxIdx ? '#eee' : '#d0d8cc', cursor: s.hole === maxIdx ? 'default' : 'pointer' }}>
          ›
        </button>
      </div>

      {/* Hole header */}
      <div style={{ textAlign: 'center', padding: '2px 16px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: -0.5 }}>Hole {hole.holeInRound}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 3 }}>
          {[
            { l: 'Par', v: hole.par },
            { l: 'SI', v: hole.siM ?? '–' },
            ...(yards !== null ? [{ l: 'Yds', v: yards }] : []),
          ].map(x => (
            <div key={x.l}>
              <span style={{ fontSize: 10, color: '#8a9a8a', textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{x.l} </span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{x.v}</span>
            </div>
          ))}
          {hcOnHole > 0 && (
            <div>
              <span style={{ fontSize: 10, color: '#8a9a8a', textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Shots </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#3a7d44' }}>+{hcOnHole}</span>
            </div>
          )}
        </div>
        {(isNTP || isLD) && (
          <div style={{ display: 'inline-flex', background: isNTP ? '#fef3e2' : '#e8f4fd', color: isNTP ? '#b8660b' : '#1a6da0', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, marginTop: 3 }}>
            {isNTP ? 'Nearest the pin' : 'Longest drive'}
          </div>
        )}
      </div>

      {/* Score entry area */}
      <div style={{ flex: 1, padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
        {flash && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: flash.color + '14', color: flash.color, border: `1.5px solid ${flash.color}30`, padding: '4px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, zIndex: 5, whiteSpace: 'nowrap' }}>
            {flash.label}
          </div>
        )}

        {!isPickup ? (
          <>
            <div style={{ width: 96, height: 96, borderRadius: 20, background: currentScore != null ? '#3a7d44' : stepValue != null ? '#3a7d44' : '#f0f4ec', color: (currentScore != null || stepValue != null) ? '#fff' : '#b0bab0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 700, opacity: currentScore != null ? 0.5 : 1 }}>
              {currentScore ?? stepValue ?? '–'}
            </div>

            {currentScore != null && (
              <div style={{ fontSize: 12, color: '#8a9a8a' }}>
                Score saved
                <button
                  onClick={() => { d({ type: 'UNDO', holeInRound: hole.holeInRound }); persistScore(hole.holeInRound, null); setStepValue(null) }}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#b43c3c', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  undo
                </button>
              </div>
            )}

            {currentScore == null && (
              <>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {quickVals.map(v => (
                    <button key={v} onClick={() => tapScore(v)}
                      style={{ width: 54, height: 54, borderRadius: 14, border: '1.5px solid #3a7d4440', background: '#fff', color: '#3a7d44', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                  <button onClick={() => setStepValue(Math.max(1, (stepValue ?? hole.par) - 1))} style={bigStep}>−</button>
                  <div style={{ width: 48, textAlign: 'center', fontSize: 24, fontWeight: 700, color: stepValue != null && !quickVals.includes(stepValue) ? '#3a7d44' : '#ccc' }}>
                    {stepValue != null && !quickVals.includes(stepValue) ? stepValue : ''}
                  </div>
                  <button onClick={() => setStepValue(Math.min(15, (stepValue ?? hole.par) + 1))} style={bigStep}>+</button>
                  {stepValue != null && !quickVals.includes(stepValue) && (
                    <button onClick={() => tapScore(stepValue)}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#3a7d44', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      Save {stepValue}
                    </button>
                  )}
                </div>
                <button onClick={tapPickup}
                  style={{ padding: '8px 20px', border: '1px solid #d0d8cc', borderRadius: 10, background: 'transparent', fontSize: 13, color: '#8a9a8a', cursor: 'pointer', minHeight: 42 }}>
                  Pick up / NR
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 16, color: '#8a9a8a', marginBottom: 8 }}>No return</div>
            <button
              onClick={() => { d({ type: 'UNDO', holeInRound: hole.holeInRound }); persistScore(hole.holeInRound, null) }}
              style={{ padding: '8px 20px', border: '1px solid #d0d8cc', borderRadius: 8, background: '#fff', fontSize: 13, color: '#b43c3c', cursor: 'pointer' }}>
              Undo NR
            </button>
          </div>
        )}
      </div>

      {/* Next hole button */}
      <div style={{ padding: '0 16px 8px' }}>
        <button
          onClick={handleNext}
          disabled={s.hole === maxIdx && (currentScore === null && !isPickup)}
          style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 12, background: (currentScore !== null || isPickup) ? '#3a7d44' : '#e8f0e4', color: (currentScore !== null || isPickup) ? '#fff' : '#8a9a8a', fontSize: 15, fontWeight: 600, cursor: (currentScore !== null || isPickup) ? 'pointer' : 'default' }}>
          {s.hole === maxIdx ? 'Finish round' : 'Next hole →'}
        </button>
      </div>

      {/* Group leaderboard — one row per player, sorted by score */}
      <div style={{ padding: '0 8px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}
        data-player-count={groupPlayers.length}>
        {(() => {
          // Build sortable rows — current user uses local reducer state (no realtime lag)
          // For current user: only include holes that are scored or pickup (not undone/empty)
          const myScores: Record<number, number | null> = {}
          for (const h of holes) {
            if (s.pickups[h.holeInRound]) myScores[h.holeInRound] = null
            else if (s.scores[h.holeInRound] != null) myScores[h.holeInRound] = s.scores[h.holeInRound]!
          }

          // Normalize: current user first so they always get colour index 0 (green)
          const orderedPlayers = [
            ...groupPlayers.filter(p => p.isCurrentUser),
            ...groupPlayers.filter(p => !p.isCurrentUser),
          ]

          const rows = orderedPlayers.map((p, colorIdx) => {
            const scores = p.isCurrentUser ? myScores : (liveScores[p.scorecardId] ?? {})
            const { totalPts, totalStrokes, holesPlayed: hp } = getPlayerTotal(scores, p.handicapIndex)
            return { ...p, totalPts, totalStrokes, holesPlayed: hp, colorIdx }
          }).sort((a, b) =>
            format === 'stableford'
              ? (b.totalPts - a.totalPts) || (b.holesPlayed - a.holesPlayed)
              : (a.totalStrokes - b.totalStrokes) || (b.holesPlayed - a.holesPlayed)
          )

          return rows.map(p => {
            const initials = p.displayName.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            const effHc = Math.round(p.handicapIndex * allowancePct)
            const isScoringThis = p.scorecardId === scorecardId
            const canTap = !isScoringThis && p.scorecardId !== ''
            const playerColor = PLAYER_COLOURS[Math.min(p.colorIdx, PLAYER_COLOURS.length - 1)]!
            return (
              <div key={p.scorecardId || p.displayName}
                onClick={canTap ? () => router.push(`/rounds/${p.scorecardId}/score`) : undefined}
                style={{
                  display: 'flex',
                  borderRadius: 10,
                  border: isScoringThis ? `2px solid ${playerColor}` : '1px solid #e0e6dc',
                  background: isScoringThis ? `${playerColor}12` : '#fff',
                  padding: '7px 12px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: canTap ? 'pointer' : 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: playerColor, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isScoringThis ? playerColor : '#1a2e1a' }}>
                    {p.displayName.split(' ')[0] || p.displayName}
                  </span>
                  {canTap && <span style={{ fontSize: 10, color: '#6B8C6B', opacity: 0.7 }}>tap to score →</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p.holesPlayed > 0 ? (
                    format === 'stableford'
                      ? <span style={{ fontWeight: 700, color: isScoringThis ? playerColor : '#1a2e1a', fontSize: 14 }}>{p.totalPts} pts</span>
                      : <span style={{ fontWeight: 700, color: isScoringThis ? playerColor : '#1a2e1a', fontSize: 14 }}>{p.totalStrokes}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#8a9a8a' }}>HC {effHc}</span>
                  )}
                  {p.holesPlayed > 0 && <div style={{ fontSize: 10, color: '#8a9a8a' }}>thru {p.holesPlayed}</div>}
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Scorecard button */}
      <div style={{ padding: '4px 10px 20px' }}>
        <button onClick={() => d({ type: 'TOGGLE_CARD' })}
          style={{ width: '100%', padding: '14px 0', border: '1.5px solid #3a7d44', borderRadius: 12, background: '#e8f0e4', color: '#2a5e30', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Scorecard
          {holesPlayed > 0 && (
            <span style={{ fontSize: 12, fontWeight: 400, color: '#6b9b6b' }}>· thru {holesPlayed}</span>
          )}
        </button>
      </div>

      {/* Contest overlay */}
      {showContestOverlay && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '2px solid #3a7d44', padding: '14px 14px 28px', zIndex: 10, borderRadius: '14px 14px 0 0', boxShadow: '0 -6px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {isNTP ? 'Nearest the Pin' : 'Longest Drive'} — Hole {hole.holeInRound}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Distance"
              value={cDist}
              onChange={e => setCDist(e.target.value)}
              style={{ flex: 1, padding: '11px 12px', border: '1.5px solid #d0d8cc', borderRadius: 8, fontSize: 16, fontWeight: 500 }}
            />
            <span style={{ fontSize: 13, color: '#6b7c6b' }}>yds</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={skipContest}
              style={{ flex: 1, padding: '13px 0', border: '1px solid #d0d8cc', borderRadius: 10, background: '#fff', fontSize: 14, color: '#6b7c6b', cursor: 'pointer' }}>
              Skip
            </button>
            <button onClick={saveContest}
              style={{ flex: 2, padding: '13px 0', border: 'none', borderRadius: 10, background: '#3a7d44', fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
