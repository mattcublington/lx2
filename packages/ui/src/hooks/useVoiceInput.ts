'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export interface UseVoiceInputReturn {
  /** Whether the microphone is actively listening */
  isListening: boolean
  /** Final confirmed transcript */
  transcript: string
  /** Live interim transcript (updates as user speaks) */
  interimTranscript: string
  /** Start listening for voice input */
  startListening: () => void
  /** Stop listening */
  stopListening: () => void
  /** Error message if something went wrong */
  error: string | null
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean
}

// ─── Golf-aware transcript correction ───────────────────────────────────────
// The Web Speech API doesn't know golf terms. We use two layers:
//   1. Exact regex rewrites for the most common/critical mishearings
//   2. Phonetic matching (Soundex) so any word that SOUNDS like a golf term
//      gets corrected automatically — no need to enumerate every variant.

// Soundex: maps a word to a 4-char phonetic code. Words that sound alike
// produce the same code (e.g. "bogey" and "boogie" both → B200).
function soundex(word: string): string {
  const s = word.toUpperCase().replace(/[^A-Z]/g, '')
  if (!s) return ''
  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  }
  let code = s[0]!
  let prev = map[s[0]!] ?? '0'
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = map[s[i]!] ?? '0'
    if (c !== '0' && c !== prev) code += c
    prev = c
  }
  return code.padEnd(4, '0')
}

// Golf vocabulary: the canonical word and common non-golf words that share
// its soundex (to avoid false replacements of everyday English).
const GOLF_DICTIONARY: { word: string; code: string; protect: Set<string> }[] = [
  'bogey', 'birdie', 'eagle', 'albatross', 'par',
  'putt', 'putts', 'putter',
  'fairway', 'bunker', 'wedge', 'chip', 'hook', 'slice', 'shank',
  'driver', 'iron', 'hybrid', 'rough', 'hazard', 'penalty',
  'gimme', 'mulligan', 'stableford', 'dormie', 'divot',
].map(w => ({
  word: w,
  code: soundex(w),
  // Common English words that share the same soundex — never replace these
  protect: new Set<string>(),
}))

// Build a lookup from soundex code → golf term (first match wins)
const SOUNDEX_LOOKUP = new Map<string, string>()
for (const entry of GOLF_DICTIONARY) {
  if (!SOUNDEX_LOOKUP.has(entry.code)) {
    SOUNDEX_LOOKUP.set(entry.code, entry.word)
  }
}

// Words that must NEVER be replaced by phonetic matching, even if they
// share a soundex with a golf term. These are common English words that
// appear naturally in speech.
const PHONETIC_BLOCKLIST = new Set([
  // share soundex with "par"
  'per', 'pair', 'pure', 'poor', 'prayer',
  // share soundex with "hook"/"hack"
  'he', 'hi', 'hey', 'how', 'who', 'ha',
  // share soundex with "chip"
  'cheap', 'chap', 'chef',
  // share soundex with "iron"
  'earn', 'urn',
  // general words that could false-match
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'it', 'in', 'on',
  'i', 'my', 'me', 'we', 'be', 'do', 'so', 'go', 'no', 'up',
  'got', 'get', 'had', 'has', 'did', 'was', 'with', 'that', 'this',
  'hit', 'miss', 'left', 'right', 'short', 'long',
  'dave', 'rich', 'matt', 'tom', 'mike', 'john', 'mark', 'paul',
  'shot', 'shots', 'score', 'scored', 'hole', 'green', 'tee',
])

// Layer 1: exact regex rewrites for critical/contextual corrections
const EXACT_CORRECTIONS: [RegExp, string][] = [
  // Putts — highest-priority because "butts" is the #1 complaint
  [/\bbutts\b/gi, 'putts'],
  [/\bbutt\b/gi, 'putt'],
  [/\bputs\b/gi, 'putts'],
  [/\bparts?\b/gi, 'putts'],
  [/\bbutter\b/gi, 'putter'],

  // Score terms with tricky vowel shifts phonetic matching might miss
  [/\bpaws?\b/gi, 'par'],
  [/\bpower\b/gi, 'par'],

  // Multi-word / contextual
  [/\bgreen and regulation\b/gi, 'green in regulation'],
  [/\bfair way\b/gi, 'fairway'],
  [/\bpicked? ?up\b/gi, 'picked up'],
  [/\bstable ?ford\b/gi, 'stableford'],

  // Numbers — context-sensitive
  [/\bto\b(?=\s+putts?\b)/gi, 'two'],
  [/\btoo\b(?=\s+putts?\b)/gi, 'two'],
  [/\bwon\b/gi, 'one'],
  [/\bate\b/gi, 'eight'],

  // Acronyms
  [/\bgir\b/gi, 'GIR'],
]

// Context-sensitive: only replace "for" → "four" when it follows a name or comma
const FOR_TO_FOUR = /(?:,\s*|\b(?:[A-Z][a-z]+)\s+)for\b/gi

function correctGolfTranscript(raw: string): string {
  let text = raw

  // Layer 1: exact regex rewrites
  for (const [pattern, replacement] of EXACT_CORRECTIONS) {
    text = text.replace(pattern, replacement)
  }

  // Context-sensitive "for" → "four"
  text = text.replace(FOR_TO_FOUR, (match) => match.replace(/for$/i, 'four'))

  // Layer 2: phonetic matching — replace words that sound like golf terms
  text = text.replace(/\b[a-zA-Z]{3,}\b/g, (word) => {
    const lower = word.toLowerCase()
    // Skip if it's already a known golf term or a blocked common word
    if (SOUNDEX_LOOKUP.has(soundex(lower)) &&
        SOUNDEX_LOOKUP.get(soundex(lower)) === lower) {
      return word
    }
    if (PHONETIC_BLOCKLIST.has(lower)) return word

    const code = soundex(lower)
    const golfWord = SOUNDEX_LOOKUP.get(code)
    if (golfWord && golfWord !== lower) {
      // Preserve original capitalisation pattern
      if (word[0] === word[0]!.toUpperCase()) {
        return golfWord.charAt(0).toUpperCase() + golfWord.slice(1)
      }
      return golfWord
    }
    return word
  })

  return text
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const SILENCE_TIMEOUT_MS = 8000

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }, SILENCE_TIMEOUT_MS)
  }, [clearSilenceTimer])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
    }
    isListeningRef.current = false
    setIsListening(false)
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser')
      return
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'en-GB'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer()

      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!
        const text = result[0]!.transcript
        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      if (finalText) setTranscript(correctGolfTranscript(finalText))
      setInterimTranscript(correctGolfTranscript(interimText))
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are not real errors — they happen on normal stop
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech recognition error: ${event.error}`)
      isListeningRef.current = false
      setIsListening(false)
      clearSilenceTimer()
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
      clearSilenceTimer()
    }

    recognitionRef.current = recognition
    isListeningRef.current = true
    setIsListening(true)

    try {
      recognition.start()
      resetSilenceTimer()
    } catch {
      setError('Failed to start speech recognition')
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [isSupported, resetSilenceTimer, clearSilenceTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer()
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [clearSilenceTimer])

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error,
    isSupported,
  }
}
