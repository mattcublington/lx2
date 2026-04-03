import { describe, it, expect } from 'vitest'
import { parseVoiceScore } from './voice-parser.js'
import type { VoiceHoleContext, GroupPlayerInfo } from './voice-parser.js'

const PAR4: VoiceHoleContext = { holeNumber: 5, par: 4, strokeIndex: 9 }
const PAR3: VoiceHoleContext = { holeNumber: 7, par: 3, strokeIndex: 14 }
const PAR5: VoiceHoleContext = { holeNumber: 12, par: 5, strokeIndex: 3 }

const GROUP: GroupPlayerInfo[] = [
  { id: 'p1', displayName: 'Dave Thompson', nicknames: ['Dave', 'David'] },
  { id: 'p2', displayName: 'Rich Bailey', nicknames: ['Rich', 'Richard'] },
  { id: 'p3', displayName: 'Tom Wilson', nicknames: ['Tommo', 'Tom'] },
]

// ─── Own score words ─────────────────────────────────────────────────────────

describe('parseVoiceScore — own score words', () => {
  it('parses "par" on par 4 = 4', () => {
    const r = parseVoiceScore('par', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(4)
    expect(r.ownScore?.confidence).toBe(1.0)
  })

  it('parses "birdie" on par 4 = 3', () => {
    const r = parseVoiceScore('birdie', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(3)
    expect(r.ownScore?.confidence).toBe(1.0)
  })

  it('parses "bogey" on par 4 = 5', () => {
    const r = parseVoiceScore('bogey', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })

  it('parses "double bogey" on par 4 = 6', () => {
    const r = parseVoiceScore('double bogey', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(6)
  })

  it('parses "double" as double bogey on par 4 = 6', () => {
    const r = parseVoiceScore('double', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(6)
  })

  it('parses "triple" on par 4 = 7', () => {
    const r = parseVoiceScore('triple', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(7)
  })

  it('parses "eagle" on par 4 = 2', () => {
    const r = parseVoiceScore('eagle', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(2)
  })

  it('parses "eagle" on par 5 = 3', () => {
    const r = parseVoiceScore('eagle', PAR5, GROUP)
    expect(r.ownScore?.score).toBe(3)
  })

  it('parses "albatross" on par 5 = 2', () => {
    const r = parseVoiceScore('albatross', PAR5, GROUP)
    expect(r.ownScore?.score).toBe(2)
  })

  it('parses "ace" always = 1', () => {
    const r = parseVoiceScore('ace', PAR3, GROUP)
    expect(r.ownScore?.score).toBe(1)
  })

  it('parses "hole in one" = 1', () => {
    const r = parseVoiceScore('hole in one', PAR3, GROUP)
    expect(r.ownScore?.score).toBe(1)
  })

  it('parses "pick up" = null (pickup)', () => {
    const r = parseVoiceScore('pick up', PAR4, GROUP)
    expect(r.ownScore?.score).toBeNull()
    expect(r.ownScore?.confidence).toBe(1.0)
  })

  it('parses "picked up" = null', () => {
    const r = parseVoiceScore('picked up', PAR4, GROUP)
    expect(r.ownScore?.score).toBeNull()
  })

  it('parses "no return" = null', () => {
    const r = parseVoiceScore('no return', PAR4, GROUP)
    expect(r.ownScore?.score).toBeNull()
  })
})

// ─── Self-referencing prefix ─────────────────────────────────────────────────

describe('parseVoiceScore — self-referencing prefix', () => {
  it('parses "I got a bogey"', () => {
    const r = parseVoiceScore('I got a bogey', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })

  it('parses "I made birdie"', () => {
    const r = parseVoiceScore('I made birdie', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(3)
  })

  it('parses "I shot five"', () => {
    const r = parseVoiceScore('I shot five', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })
})

// ─── Numeric scores ──────────────────────────────────────────────────────────

describe('parseVoiceScore — numeric scores', () => {
  it('parses bare number word "four"', () => {
    const r = parseVoiceScore('four', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(4)
    expect(r.ownScore?.confidence).toBe(0.9)
  })

  it('parses bare digit "5"', () => {
    const r = parseVoiceScore('5', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })

  it('parses digit in context "I got 6"', () => {
    const r = parseVoiceScore('I got 6', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(6)
  })
})

// ─── Rich detail (putts, GIR, fairway) ───────────────────────────────────────

describe('parseVoiceScore — rich detail', () => {
  it('parses putts: "par two putts"', () => {
    const r = parseVoiceScore('par two putts', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(4)
    expect(r.ownScore?.putts).toBe(2)
  })

  it('parses putts with digit: "bogey 3 putts"', () => {
    const r = parseVoiceScore('bogey 3 putts', PAR4, GROUP)
    expect(r.ownScore?.putts).toBe(3)
  })

  it('parses "1 putt" (singular)', () => {
    const r = parseVoiceScore('birdie 1 putt', PAR4, GROUP)
    expect(r.ownScore?.putts).toBe(1)
  })

  it('parses GIR: "par green in regulation"', () => {
    const r = parseVoiceScore('par green in regulation', PAR4, GROUP)
    expect(r.ownScore?.gir).toBe(true)
  })

  it('parses GIR shorthand: "par GIR"', () => {
    const r = parseVoiceScore('par gir', PAR4, GROUP)
    expect(r.ownScore?.gir).toBe(true)
  })

  it('parses "hit the green" as GIR', () => {
    const r = parseVoiceScore('par hit the green', PAR4, GROUP)
    expect(r.ownScore?.gir).toBe(true)
  })

  it('parses missed green as GIR false', () => {
    const r = parseVoiceScore('bogey missed the green right', PAR4, GROUP)
    expect(r.ownScore?.gir).toBe(false)
    expect(r.ownScore?.missDirection).toBe('right')
  })

  it('parses "hit the fairway"', () => {
    const r = parseVoiceScore('par hit the fairway', PAR4, GROUP)
    expect(r.ownScore?.fairwayHit).toBe(true)
  })

  it('parses "missed fairway left"', () => {
    const r = parseVoiceScore('bogey missed fairway left', PAR4, GROUP)
    expect(r.ownScore?.fairwayHit).toBe(false)
  })

  it('builds notes from missed green', () => {
    const r = parseVoiceScore('bogey missed the green right', PAR4, GROUP)
    expect(r.ownScore?.notes).toBe('Missed green right')
  })
})

// ─── Other players ───────────────────────────────────────────────────────────

describe('parseVoiceScore — other players', () => {
  it('parses "Dave five"', () => {
    const r = parseVoiceScore('Dave five', PAR4, GROUP)
    expect(r.playerScores).toHaveLength(1)
    expect(r.playerScores[0]!.player).toBe('p1')
    expect(r.playerScores[0]!.score).toBe(5)
  })

  it('parses "Rich par"', () => {
    const r = parseVoiceScore('Rich par', PAR4, GROUP)
    expect(r.playerScores[0]!.player).toBe('p2')
    expect(r.playerScores[0]!.score).toBe(4)
  })

  it('parses "Tommo four"', () => {
    const r = parseVoiceScore('Tommo four', PAR4, GROUP)
    expect(r.playerScores[0]!.player).toBe('p3')
    expect(r.playerScores[0]!.score).toBe(4)
  })

  it('parses "Dave 5"', () => {
    const r = parseVoiceScore('Dave 5', PAR4, GROUP)
    expect(r.playerScores[0]!.score).toBe(5)
  })

  it('parses "Dave picked up"', () => {
    const r = parseVoiceScore('Dave picked up', PAR4, GROUP)
    expect(r.playerScores[0]!.score).toBeNull()
    expect(r.playerScores[0]!.confidence).toBe(1.0)
  })

  it('parses "Dave no return"', () => {
    const r = parseVoiceScore('Dave no return', PAR4, GROUP)
    expect(r.playerScores[0]!.score).toBeNull()
  })

  it('matches full name "Dave Thompson"', () => {
    const r = parseVoiceScore('Dave Thompson five', PAR4, GROUP)
    expect(r.playerScores[0]!.player).toBe('p1')
  })

  it('matches nickname "David"', () => {
    const r = parseVoiceScore('David five', PAR4, GROUP)
    expect(r.playerScores[0]!.player).toBe('p1')
  })
})

// ─── Combined utterances ─────────────────────────────────────────────────────

describe('parseVoiceScore — combined utterances', () => {
  it('parses own score + all three players', () => {
    const r = parseVoiceScore(
      'I got a bogey two putts missed the green Dave five Rich par Tommo four',
      PAR4, GROUP,
    )
    expect(r.ownScore?.score).toBe(5)
    expect(r.ownScore?.putts).toBe(2)
    expect(r.ownScore?.gir).toBe(false)
    expect(r.playerScores).toHaveLength(3)
    expect(r.playerScores[0]!.score).toBe(5)  // Dave
    expect(r.playerScores[1]!.score).toBe(4)  // Rich par
    expect(r.playerScores[2]!.score).toBe(4)  // Tommo
    expect(r.overallConfidence).toBeGreaterThan(0.8)
  })

  it('parses digit scores for multiple players: "Dave 5 Rich 3"', () => {
    const r = parseVoiceScore('Dave 5 Rich 3', PAR4, GROUP)
    expect(r.playerScores).toHaveLength(2)
    expect(r.playerScores[0]!.score).toBe(5)
    expect(r.playerScores[1]!.score).toBe(3)
  })

  it('parses score words for players: "Dave bogey Rich birdie"', () => {
    const r = parseVoiceScore('Dave bogey Rich birdie', PAR4, GROUP)
    expect(r.playerScores[0]!.score).toBe(5)
    expect(r.playerScores[1]!.score).toBe(3)
  })

  it('handles own score without prefix before player names', () => {
    const r = parseVoiceScore('bogey Dave five Rich par Tommo four', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
    expect(r.playerScores).toHaveLength(3)
  })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('parseVoiceScore — edge cases', () => {
  it('returns low confidence for gibberish', () => {
    const r = parseVoiceScore('something random here', PAR4, GROUP)
    expect(r.overallConfidence).toBeLessThan(0.8)
  })

  it('handles empty string', () => {
    const r = parseVoiceScore('', PAR4, GROUP)
    expect(r.ownScore).toBeNull()
    expect(r.playerScores).toHaveLength(0)
    expect(r.overallConfidence).toBe(0)
  })

  it('handles par on par 3 = 3', () => {
    const r = parseVoiceScore('par', PAR3, GROUP)
    expect(r.ownScore?.score).toBe(3)
  })

  it('handles par on par 5 = 5', () => {
    const r = parseVoiceScore('par', PAR5, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })

  it('handles "bogie" alternative spelling', () => {
    const r = parseVoiceScore('bogie', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
  })

  it('is case-insensitive', () => {
    const r = parseVoiceScore('BIRDIE', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(3)
  })

  it('handles punctuation in transcript', () => {
    const r = parseVoiceScore('I got a bogey, two putts.', PAR4, GROUP)
    expect(r.ownScore?.score).toBe(5)
    expect(r.ownScore?.putts).toBe(2)
  })

  it('no players in group — still parses own score', () => {
    const r = parseVoiceScore('par', PAR4, [])
    expect(r.ownScore?.score).toBe(4)
  })
})
