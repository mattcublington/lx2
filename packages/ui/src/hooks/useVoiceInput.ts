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

      if (finalText) setTranscript(finalText)
      setInterimTranscript(interimText)
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
