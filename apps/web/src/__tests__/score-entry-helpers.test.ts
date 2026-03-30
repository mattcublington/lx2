import { describe, it, expect } from 'vitest'
import {
  allocateStrokes,
  pts,
  ptsLabel,
  strokeResult,
  scoreReducer,
  type AllocateHole,
  type ScoreState,
} from '@/lib/score-entry-helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** 9 holes with SI 1–9. */
function makeHoles(count: number): AllocateHole[] {
  return Array.from({ length: count }, (_, i) => ({
    holeInRound: i + 1,
    siM: i + 1, // SI 1 = hardest
  }))
}

const HOLES_9 = makeHoles(9)
const HOLES_18 = makeHoles(18)

function initialState(overrides: Partial<ScoreState> = {}): ScoreState {
  return {
    hole: 0,
    scores: {},
    pickups: {},
    showNTP: false,
    ntpResults: {},
    ldResults: {},
    showCard: false,
    ...overrides,
  }
}

// ─── allocateStrokes ──────────────────────────────────────────────────────────

describe('allocateStrokes', () => {
  it('gives 0 shots to every hole for scratch (hc=0)', () => {
    const result = allocateStrokes(0, HOLES_9)
    for (let h = 1; h <= 9; h++) {
      expect(result[h]).toBe(0)
    }
  })

  it('gives 1 shot to each hole for 18-handicap over 18 holes', () => {
    const result = allocateStrokes(18, HOLES_18)
    for (let h = 1; h <= 18; h++) {
      expect(result[h]).toBe(1)
    }
  })

  it('gives 1 shot only to the SI-1 hole for hc=1', () => {
    const result = allocateStrokes(1, HOLES_9)
    expect(result[1]).toBe(1) // SI 1 = hole 1
    for (let h = 2; h <= 9; h++) {
      expect(result[h]).toBe(0)
    }
  })

  it('gives 2 shots to SI-1 hole for hc=10 over 9 holes', () => {
    // 9 holes, hc=10 → first pass gives 1 to all 9, second pass starts again SI order
    const result = allocateStrokes(10, HOLES_9)
    expect(result[1]).toBe(2) // SI 1 (hardest) gets 2nd shot
    for (let h = 2; h <= 9; h++) {
      expect(result[h]).toBe(1)
    }
  })

  it('skips holes with siM === null', () => {
    const holes: AllocateHole[] = [
      { holeInRound: 1, siM: null },
      { holeInRound: 2, siM: 1 },
      { holeInRound: 3, siM: 2 },
    ]
    const result = allocateStrokes(2, holes)
    expect(result[1]).toBe(0) // no SI, never receives shots
    expect(result[2]).toBe(1)
    expect(result[3]).toBe(1)
  })

  it('handles hc=0 with null SI holes gracefully', () => {
    const holes: AllocateHole[] = [
      { holeInRound: 1, siM: null },
      { holeInRound: 2, siM: null },
    ]
    const result = allocateStrokes(0, holes)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })
})

// ─── pts ──────────────────────────────────────────────────────────────────────

describe('pts — stableford points', () => {
  // par 4, 0 hc shots (scratch hole)
  it('scores 0 pts (blob) for double bogey or worse', () => {
    expect(pts(6, 4, 0)).toBe(0) // +2 relative par
    expect(pts(9, 4, 0)).toBe(0) // +5
  })

  it('scores 1 pt for bogey', () => {
    expect(pts(5, 4, 0)).toBe(1) // net = 5 − 0 = 5, d = 5−4 = 1
  })

  it('scores 2 pts for par', () => {
    expect(pts(4, 4, 0)).toBe(2)
  })

  it('scores 3 pts for birdie', () => {
    expect(pts(3, 4, 0)).toBe(3)
  })

  it('scores 4 pts for eagle', () => {
    expect(pts(2, 4, 0)).toBe(4)
  })

  it('scores 5 pts for albatross or better', () => {
    expect(pts(1, 4, 0)).toBe(5)
    expect(pts(1, 5, 0)).toBe(5) // hole-in-one on par 5
  })

  it('applies handicap shots correctly (1 shot on SI-1)', () => {
    // gross 5 on par 4 with 1 hc shot → net 4 → par → 2pts
    expect(pts(5, 4, 1)).toBe(2)
    // gross 4 on par 4 with 1 hc shot → net 3 → birdie → 3pts
    expect(pts(4, 4, 1)).toBe(3)
  })
})

// ─── ptsLabel ─────────────────────────────────────────────────────────────────

describe('ptsLabel — stableford label', () => {
  it('returns blob format when pts=0', () => {
    // gross 8, par 4, 0 shots → net 8, blob
    expect(ptsLabel(0, 8, 4, 0)).toBe('blob · net 8')
  })

  it('returns "1pt" (not "1pts") for 1-point hole', () => {
    // gross 5, par 4, 0 shots → net 5, bogey, 1pt
    expect(ptsLabel(1, 5, 4, 0)).toBe('1pt · net bogey')
  })

  it('returns "Npts" for N > 1', () => {
    expect(ptsLabel(2, 4, 4, 0)).toBe('2pts · net par')
    expect(ptsLabel(3, 3, 4, 0)).toBe('3pts · net birdie')
    expect(ptsLabel(4, 2, 4, 0)).toBe('4pts · net eagle')
    expect(ptsLabel(5, 1, 4, 0)).toBe('5pts · net albatross')
  })

  it('handles double bogey term', () => {
    expect(ptsLabel(0, 6, 4, 0)).toBe('blob · net 6') // double → blob (0 pts)
  })

  it('handles triple+ term correctly', () => {
    // gross 8, par 4, 1 hc shot → net 7, triple+ (but still 0pts → blob)
    expect(ptsLabel(0, 8, 4, 1)).toBe('blob · net 7')
  })
})

// ─── strokeResult ─────────────────────────────────────────────────────────────

describe('strokeResult — gross label', () => {
  it('labels results relative to par', () => {
    expect(strokeResult(2, 5)).toBe('Albatross') // −3
    expect(strokeResult(3, 5)).toBe('Eagle')     // −2
    expect(strokeResult(3, 4)).toBe('Birdie')    // −1
    expect(strokeResult(4, 4)).toBe('Par')       // 0
    expect(strokeResult(5, 4)).toBe('Bogey')     // +1
    expect(strokeResult(6, 4)).toBe('Double')    // +2
    expect(strokeResult(7, 4)).toBe('+3')        // +3
    expect(strokeResult(9, 4)).toBe('+5')        // +5
  })

  it('labels hole-in-one on par 3 as Eagle (1 − 3 = −2)', () => {
    expect(strokeResult(1, 3)).toBe('Eagle')
  })

  it('labels 1 under par 5 as Eagle', () => {
    expect(strokeResult(4, 5)).toBe('Birdie')    // −1
    expect(strokeResult(3, 5)).toBe('Eagle')     // −2
  })
})

// ─── scoreReducer ─────────────────────────────────────────────────────────────

describe('scoreReducer', () => {
  it('SCORE: records stroke and clears pickup flag', () => {
    const s = initialState({ pickups: { 1: true } })
    const next = scoreReducer(s, { type: 'SCORE', holeInRound: 1, v: 4 })
    expect(next.scores[1]).toBe(4)
    expect(next.pickups[1]).toBe(false)
  })

  it('PICKUP: sets score to null and flags pickup', () => {
    const s = initialState({ scores: { 2: 5 } })
    const next = scoreReducer(s, { type: 'PICKUP', holeInRound: 2 })
    expect(next.scores[2]).toBeNull()
    expect(next.pickups[2]).toBe(true)
  })

  it('UNDO: clears score and pickup flag', () => {
    const s = initialState({ scores: { 3: 4 }, pickups: { 3: true } })
    const next = scoreReducer(s, { type: 'UNDO', holeInRound: 3 })
    expect(next.scores[3]).toBeNull()
    expect(next.pickups[3]).toBe(false)
  })

  it('SET_HOLE: changes hole index and clears NTP overlay', () => {
    const s = initialState({ hole: 2, showNTP: true })
    const next = scoreReducer(s, { type: 'SET_HOLE', idx: 5 })
    expect(next.hole).toBe(5)
    expect(next.showNTP).toBe(false)
  })

  it('NEXT: advances hole by 1 up to maxIdx', () => {
    const s = initialState({ hole: 3 })
    expect(scoreReducer(s, { type: 'NEXT', maxIdx: 17 }).hole).toBe(4)
    // clamps at maxIdx
    const atMax = initialState({ hole: 17 })
    expect(scoreReducer(atMax, { type: 'NEXT', maxIdx: 17 }).hole).toBe(17)
  })

  it('SKIP_C: advances hole and clears NTP overlay', () => {
    const s = initialState({ hole: 2, showNTP: true })
    const next = scoreReducer(s, { type: 'SKIP_C', maxIdx: 17 })
    expect(next.hole).toBe(3)
    expect(next.showNTP).toBe(false)
  })

  it('SAVE_C ntp: saves NTP result and advances', () => {
    const s = initialState({ hole: 4 })
    const next = scoreReducer(s, { type: 'SAVE_C', ct: 'ntp', holeNum: 5, dist: '3m', maxIdx: 17 })
    expect(next.ntpResults[5]).toBe('3m')
    expect(next.hole).toBe(5)
    expect(next.showNTP).toBe(false)
  })

  it('SAVE_C ld: saves LD result and advances', () => {
    const s = initialState({ hole: 6 })
    const next = scoreReducer(s, { type: 'SAVE_C', ct: 'ld', holeNum: 7, dist: '280y', maxIdx: 17 })
    expect(next.ldResults[7]).toBe('280y')
    expect(next.hole).toBe(7)
  })

  it('TOGGLE_CARD: flips showCard', () => {
    const s = initialState({ showCard: false })
    expect(scoreReducer(s, { type: 'TOGGLE_CARD' }).showCard).toBe(true)
    expect(scoreReducer({ ...s, showCard: true }, { type: 'TOGGLE_CARD' }).showCard).toBe(false)
  })

  it('does not mutate existing state', () => {
    const s = initialState()
    const next = scoreReducer(s, { type: 'SCORE', holeInRound: 1, v: 5 })
    expect(s.scores[1]).toBeUndefined()
    expect(next.scores[1]).toBe(5)
  })
})
