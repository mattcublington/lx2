/**
 * Voice transcript parser for golf scoring.
 *
 * Three-tier parsing: this is Tier 1 (local regex, handles ~85% of inputs).
 * Returns a confidence score — if < 0.8, the caller should use Tier 2 (LLM).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VoiceHoleContext {
  holeNumber: number
  par: number
  strokeIndex: number
}

export interface GroupPlayerInfo {
  id: string
  displayName: string
  nicknames?: string[]
}

export interface ParsedOwnScore {
  player: 'self'
  score: number | null    // null = pick up / NR
  putts?: number
  gir?: boolean
  fairwayHit?: boolean
  missDirection?: 'left' | 'right' | 'short' | 'long'
  bunkerShots?: number
  penalties?: number
  upAndDown?: boolean
  sandSave?: boolean
  notes?: string
  confidence: number
}

export interface ParsedPlayerScore {
  player: string          // matched player ID
  playerName: string      // display name used in transcript
  score: number | null
  confidence: number
}

export interface VoiceParseResult {
  ownScore: ParsedOwnScore | null
  playerScores: ParsedPlayerScore[]
  unparsed: string[]
  overallConfidence: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Relative-to-par offsets for score words */
const SCORE_WORDS: Record<string, number | 'ace' | 'pickup'> = {
  'albatross':     -3,
  'eagle':         -2,
  'birdie':        -1,
  'par':            0,
  'bogey':          1,
  'bogie':          1,
  'double bogey':   2,
  'double bogie':   2,
  'double':         2,
  'triple bogey':   3,
  'triple bogie':   3,
  'triple':         3,
  'quadruple':      4,
  'quad':           4,
  'ace':           'ace',
  'hole in one':   'ace',
  'hole-in-one':   'ace',
  'pick up':       'pickup',
  'picked up':     'pickup',
  'pickup':        'pickup',
  'pick-up':       'pickup',
  'no return':     'pickup',
  'n r':           'pickup',
  'nr':            'pickup',
}

const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13,
}

const SELF_PREFIXES = /^(?:i\s+(?:got|had|made|scored|shot)|i'm|my\s+score\s+(?:is|was))\s+/i

const PUTT_PATTERN = /(\d+|one|two|three|four|five)\s*putts?/i
const GIR_PATTERN = /(?:gir|green\s+in\s+reg(?:ulation)?|hit\s+the\s+green|on\s+the\s+green)/i
const FAIRWAY_HIT_PATTERN = /(?:hit\s+the\s+fairway|fairway\s+hit|found\s+the\s+fairway)/i
const FAIRWAY_MISS_PATTERN = /(?:missed?\s+(?:the\s+)?fairway)\s*(left|right)?/i
const MISS_GREEN_PATTERN = /missed?\s+(?:the\s+)?green\s*(left|right|short|long)?/i

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordToNumber(word: string): number | null {
  const n = NUMBER_WORDS[word.toLowerCase()]
  if (n !== undefined) return n
  const parsed = parseInt(word, 10)
  return isNaN(parsed) ? null : parsed
}

function resolveScore(token: string, par: number): { score: number | null; confidence: number } | null {
  // Check multi-word score terms first (longest match)
  for (const [phrase, offset] of Object.entries(SCORE_WORDS)) {
    if (token === phrase || token.startsWith(phrase + ' ') || token.endsWith(' ' + phrase)) {
      if (offset === 'ace') return { score: 1, confidence: 1.0 }
      if (offset === 'pickup') return { score: null, confidence: 1.0 }
      return { score: par + (offset as number), confidence: 1.0 }
    }
  }
  return null
}

/**
 * Match a name fragment against the group players list.
 * Returns the matched player or null.
 */
function matchPlayer(fragment: string, players: GroupPlayerInfo[]): GroupPlayerInfo | null {
  const lower = fragment.toLowerCase().trim()
  if (!lower) return null

  for (const p of players) {
    const names = [p.displayName, ...(p.nicknames ?? [])]
    for (const name of names) {
      if (name.toLowerCase() === lower) return p
    }
  }
  // Partial match: first name of displayName
  for (const p of players) {
    const firstName = p.displayName.split(' ')[0]?.toLowerCase()
    if (firstName && firstName === lower) return p
    const names = p.nicknames ?? []
    for (const name of names) {
      if (name.toLowerCase().startsWith(lower) && lower.length >= 3) return p
    }
  }
  return null
}

function extractPutts(text: string): number | undefined {
  const m = text.match(PUTT_PATTERN)
  if (!m) return undefined
  return wordToNumber(m[1]!) ?? undefined
}

function extractGir(text: string): boolean | undefined {
  if (GIR_PATTERN.test(text)) return true
  if (MISS_GREEN_PATTERN.test(text)) return false
  return undefined
}

function extractFairway(text: string): { hit?: boolean; direction?: 'left' | 'right' | 'short' | 'long' } {
  if (FAIRWAY_HIT_PATTERN.test(text)) return { hit: true }
  const miss = text.match(FAIRWAY_MISS_PATTERN)
  if (miss) {
    const dir = miss[1] as 'left' | 'right' | undefined
    return dir ? { hit: false, direction: dir } : { hit: false }
  }
  return {}
}

function extractMissDirection(text: string): 'left' | 'right' | 'short' | 'long' | undefined {
  const m = text.match(MISS_GREEN_PATTERN)
  if (m && m[1]) return m[1] as 'left' | 'right' | 'short' | 'long'
  const f = text.match(FAIRWAY_MISS_PATTERN)
  if (f && f[1]) return f[1] as 'left' | 'right'
  return undefined
}

function buildNotes(text: string): string | undefined {
  const missGreen = text.match(MISS_GREEN_PATTERN)
  if (missGreen) {
    const dir = missGreen[1] ? ` ${missGreen[1]}` : ''
    return `Missed green${dir}`
  }
  return undefined
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a voice transcript into structured score data.
 *
 * @param transcript - Raw speech-to-text output
 * @param hole - Current hole context (par, SI)
 * @param groupPlayers - Other players in the group (for name matching)
 * @returns Parsed result with confidence scores
 */
export function parseVoiceScore(
  transcript: string,
  hole: VoiceHoleContext,
  groupPlayers: GroupPlayerInfo[],
): VoiceParseResult {
  const text = normalise(transcript)
  const { par } = hole

  let ownScore: ParsedOwnScore | null = null
  const playerScores: ParsedPlayerScore[] = []
  const unparsed: string[] = []

  // ── Step 1: Split into segments by player name boundaries ─────────────
  // We try to identify segments: self-referencing parts and "PlayerName score" parts

  // First, detect and remove self-referencing prefix
  let selfSegment = ''
  let remaining = text

  // Check for explicit self-reference
  const selfMatch = remaining.match(SELF_PREFIXES)
  if (selfMatch) {
    remaining = remaining.slice(selfMatch[0].length)
  }

  // Split remaining text by player name occurrences
  const playerNamePositions: { player: GroupPlayerInfo; start: number; name: string }[] = []

  for (const p of groupPlayers) {
    const allNames = [p.displayName, ...(p.nicknames ?? [])]
    for (const name of allNames) {
      const lower = name.toLowerCase()
      let idx = remaining.indexOf(lower)
      while (idx !== -1) {
        // Make sure it's a word boundary
        const before = idx === 0 || /\s/.test(remaining[idx - 1]!)
        const after = idx + lower.length >= remaining.length || /\s/.test(remaining[idx + lower.length]!)
        if (before && after) {
          playerNamePositions.push({ player: p, start: idx, name: lower })
        }
        idx = remaining.indexOf(lower, idx + 1)
      }
    }
    // Also try first name only
    const firstName = p.displayName.split(' ')[0]?.toLowerCase()
    if (firstName && firstName.length >= 3) {
      let idx = remaining.indexOf(firstName)
      while (idx !== -1) {
        const before = idx === 0 || /\s/.test(remaining[idx - 1]!)
        const after = idx + firstName.length >= remaining.length || /\s/.test(remaining[idx + firstName.length]!)
        if (before && after) {
          // Don't double-add if already matched by nickname
          const alreadyMatched = playerNamePositions.some(
            pos => pos.player.id === p.id && Math.abs(pos.start - idx) < 3
          )
          if (!alreadyMatched) {
            playerNamePositions.push({ player: p, start: idx, name: firstName })
          }
        }
        idx = remaining.indexOf(firstName, idx + 1)
      }
    }
  }

  // Sort by position
  playerNamePositions.sort((a, b) => a.start - b.start)

  // Deduplicate — keep only one match per player (first occurrence)
  const seenPlayers = new Set<string>()
  const uniquePositions = playerNamePositions.filter(p => {
    if (seenPlayers.has(p.player.id)) return false
    seenPlayers.add(p.player.id)
    return true
  })

  // Extract self-segment (everything before first player name)
  if (uniquePositions.length > 0) {
    selfSegment = remaining.slice(0, uniquePositions[0]!.start).trim()
  } else {
    selfSegment = remaining
  }

  // If there was a self-prefix, the self-segment definitely refers to the marker
  const hasSelfPrefix = selfMatch !== null

  // ── Step 2: Parse own score ────────────────────────────────────────────

  if (selfSegment) {
    const ownResult = parseScoreFragment(selfSegment, par)

    if (ownResult || hasSelfPrefix) {
      const putts = extractPutts(selfSegment)
      const gir = extractGir(selfSegment)
      const fairway = extractFairway(selfSegment)
      const missDir = extractMissDirection(selfSegment)
      const notes = buildNotes(selfSegment)

      ownScore = {
        player: 'self',
        score: ownResult?.score ?? null,
        confidence: ownResult?.confidence ?? 0.5,
        ...(putts !== undefined && { putts }),
        ...(gir !== undefined && { gir }),
        ...(fairway.hit !== undefined && { fairwayHit: fairway.hit }),
        ...(missDir !== undefined && { missDirection: missDir }),
        ...(notes !== undefined && { notes }),
      }
    } else if (uniquePositions.length === 0) {
      // No players found and no own score — might be gibberish or just a number
      const num = wordToNumber(selfSegment.split(/\s+/)[0]!)
      if (num !== null && num >= 1 && num <= 13) {
        ownScore = {
          player: 'self',
          score: num,
          confidence: 0.7, // lower confidence for bare number (could be for a player)
        }
      } else {
        unparsed.push(selfSegment)
      }
    }
  }

  // ── Step 3: Parse player scores ────────────────────────────────────────

  for (let i = 0; i < uniquePositions.length; i++) {
    const pos = uniquePositions[i]!
    const nextStart = i + 1 < uniquePositions.length
      ? uniquePositions[i + 1]!.start
      : remaining.length

    const afterName = remaining.slice(pos.start + pos.name.length, nextStart).trim()
    const scoreResult = parseScoreFragment(afterName, par)

    if (scoreResult) {
      playerScores.push({
        player: pos.player.id,
        playerName: pos.player.displayName,
        score: scoreResult.score,
        confidence: scoreResult.confidence,
      })
    } else {
      // Check for "picked up" / "no return" for this player
      const pickup = /pick(?:ed)?\s*up|no\s*return|nr/i.test(afterName)
      if (pickup) {
        playerScores.push({
          player: pos.player.id,
          playerName: pos.player.displayName,
          score: null,
          confidence: 1.0,
        })
      } else {
        unparsed.push(`${pos.player.displayName}: ${afterName}`)
      }
    }
  }

  // ── Step 4: Calculate overall confidence ───────────────────────────────

  const allConfidences: number[] = []
  if (ownScore) allConfidences.push(ownScore.confidence)
  for (const ps of playerScores) allConfidences.push(ps.confidence)

  let overallConfidence = allConfidences.length > 0
    ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
    : 0

  // If we have group players but didn't capture any of their scores,
  // penalise confidence to trigger LLM fallback — the transcript likely
  // contains player names the regex parser couldn't match.
  if (groupPlayers.length > 0 && playerScores.length === 0 && text.length > 20) {
    overallConfidence = Math.min(overallConfidence, 0.6)
  }

  return { ownScore, playerScores, unparsed, overallConfidence }
}

// ─── Fragment parser ─────────────────────────────────────────────────────────

/**
 * Parse a text fragment for a score value (score word or number).
 */
function parseScoreFragment(
  fragment: string,
  par: number,
): { score: number | null; confidence: number } | null {
  const text = fragment.trim().toLowerCase()
  if (!text) return null

  // Try multi-word score phrases first (longest match wins)
  const sortedPhrases = Object.keys(SCORE_WORDS).sort((a, b) => b.length - a.length)
  for (const phrase of sortedPhrases) {
    if (text === phrase || text.startsWith(phrase + ' ') || text.includes(' ' + phrase + ' ') || text.endsWith(' ' + phrase)) {
      const offset = SCORE_WORDS[phrase]!
      if (offset === 'ace') return { score: 1, confidence: 1.0 }
      if (offset === 'pickup') return { score: null, confidence: 1.0 }
      return { score: par + (offset as number), confidence: 1.0 }
    }
  }

  // Try bare number (word or digit)
  const words = text.split(/\s+/)
  for (const w of words) {
    const num = wordToNumber(w)
    if (num !== null && num >= 1 && num <= 13) {
      return { score: num, confidence: 0.9 }
    }
  }

  return null
}
