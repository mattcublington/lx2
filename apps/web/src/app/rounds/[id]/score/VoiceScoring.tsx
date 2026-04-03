'use client'
import { useState, useEffect, useCallback } from 'react'
import { useVoiceInput } from '@lx2/ui'
import { parseVoiceScore } from '@lx2/scoring'
import type { VoiceHoleContext, GroupPlayerInfo, VoiceParseResult } from '@lx2/scoring'
import VoiceConfirm from './VoiceConfirm'
import type { ConfirmedScore } from './VoiceConfirm'

type VoiceState = 'idle' | 'listening' | 'parsing' | 'confirm' | 'confirmed'

interface VoiceScoringProps {
  hole: VoiceHoleContext
  groupPlayers: GroupPlayerInfo[]
  format: 'stableford' | 'strokeplay' | 'matchplay'
  playingHandicap: number
  hcShots: number
  markerName: string
  holeNumber: number
  par: number
  onScoresConfirmed: (scores: ConfirmedScore[]) => void
  onCancel: () => void
}

const LLM_CONFIDENCE_THRESHOLD = 0.8

export default function VoiceScoring({
  hole,
  groupPlayers,
  format,
  playingHandicap,
  hcShots,
  markerName,
  holeNumber,
  par,
  onScoresConfirmed,
  onCancel,
}: VoiceScoringProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null)
  const [confirmedMessage, setConfirmedMessage] = useState('')

  const { isListening, transcript, interimTranscript, startListening, stopListening, error: voiceError } = useVoiceInput()

  // When recording stops and we have a transcript, parse it
  useEffect(() => {
    if (state === 'listening' && !isListening && transcript) {
      setState('parsing')
      handleParse(transcript)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript, state])

  const handleParse = useCallback(async (text: string) => {
    const result = parseVoiceScore(text, hole, groupPlayers)

    if (result.overallConfidence >= LLM_CONFIDENCE_THRESHOLD) {
      setParseResult(result)
      setState('confirm')
      return
    }

    // Tier 2: LLM fallback
    try {
      const resp = await fetch('/api/parse-voice-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          hole: { number: hole.holeNumber, par: hole.par, strokeIndex: hole.strokeIndex },
          players: groupPlayers.map(p => ({ id: p.id, name: p.displayName })),
        }),
      })

      if (resp.ok) {
        const llmResult = await resp.json() as VoiceParseResult
        setParseResult(llmResult)
        setState('confirm')
      } else {
        // LLM failed — fall back to whatever the local parser got
        setParseResult(result)
        setState('confirm')
      }
    } catch {
      // Network error — use local parser result
      setParseResult(result)
      setState('confirm')
    }
  }, [hole, groupPlayers])

  const handleMicTap = useCallback(() => {
    if (state === 'idle') {
      startListening()
      setState('listening')
    } else if (state === 'listening') {
      stopListening()
    }
  }, [state, startListening, stopListening])

  const handleConfirm = useCallback((scores: ConfirmedScore[]) => {
    const total = scores.length
    setConfirmedMessage(`Hole ${holeNumber} saved`)
    setState('confirmed')
    setTimeout(() => {
      onScoresConfirmed(scores)
    }, 1500)
  }, [holeNumber, onScoresConfirmed])

  const handleReRecord = useCallback(() => {
    setParseResult(null)
    startListening()
    setState('listening')
  }, [startListening])

  // ── Render: Confirm screen ─────────────────────────────────────────────
  if (state === 'confirm' && parseResult) {
    return (
      <div className="vs-overlay">
        <style>{STYLES}</style>
        <div className="vs-sheet">
          <VoiceConfirm
            ownScore={parseResult.ownScore}
            playerScores={parseResult.playerScores}
            par={par}
            holeNumber={holeNumber}
            playingHandicap={playingHandicap}
            hcShots={hcShots}
            markerName={markerName}
            format={format}
            onConfirm={handleConfirm}
            onReRecord={handleReRecord}
          />
        </div>
      </div>
    )
  }

  // ── Render: Confirmed ──────────────────────────────────────────────────
  if (state === 'confirmed') {
    return (
      <div className="vs-overlay">
        <style>{STYLES}</style>
        <div className="vs-confirmed">
          <div className="vs-check-circle">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <span className="vs-confirmed-text">{confirmedMessage}</span>
        </div>
      </div>
    )
  }

  // ── Render: Idle + Listening + Parsing ─────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      {/* Mic button */}
      <div className="vs-mic-area">
        <button
          className={`vs-mic-btn ${state === 'listening' ? 'vs-mic-active' : ''}`}
          onClick={handleMicTap}
          disabled={state === 'parsing'}
        >
          {state === 'parsing' ? (
            <div className="vs-spinner" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          )}
        </button>

        {state === 'idle' && (
          <span className="vs-hint">Tap to score by voice</span>
        )}

        {state === 'listening' && (
          <div className="vs-listening">
            <span className="vs-listening-label">Listening...</span>
            <div className="vs-transcript-live">
              {interimTranscript || transcript || 'Speak now...'}
            </div>
            <div className="vs-example">
              &ldquo;I got a bogey, two putts. Dave par, Rich five, Tommo four.&rdquo;
            </div>
          </div>
        )}

        {state === 'parsing' && (
          <div className="vs-parsing">
            <div className="vs-transcript-final">{transcript}</div>
            <span className="vs-parsing-label">Parsing scores...</span>
          </div>
        )}

        {voiceError && (
          <span className="vs-error">{voiceError}</span>
        )}
      </div>
    </>
  )
}

const STYLES = `
  .vs-mic-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
  }
  .vs-mic-btn {
    width: 56px; height: 56px;
    border-radius: 50%;
    border: none;
    background: #0D631B;
    color: #FFFFFF;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(13,99,27,0.25);
  }
  .vs-mic-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(13,99,27,0.35);
  }
  .vs-mic-btn:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }
  .vs-mic-active {
    background: #E24B4A;
    box-shadow: 0 4px 16px rgba(226,75,74,0.35);
    animation: vs-pulse 1.5s ease-in-out infinite;
  }
  .vs-mic-active:hover {
    box-shadow: 0 6px 20px rgba(226,75,74,0.45);
  }
  @keyframes vs-pulse {
    0%, 100% { box-shadow: 0 4px 16px rgba(226,75,74,0.35); }
    50% { box-shadow: 0 4px 24px rgba(226,75,74,0.55); }
  }
  .vs-hint {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.75rem;
    color: #72786E;
  }
  .vs-listening {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }
  .vs-listening-label {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #E24B4A;
  }
  .vs-transcript-live {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    color: #1A2E1A;
    text-align: center;
    min-height: 1.5rem;
    padding: 0.5rem 0;
  }
  .vs-example {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    color: #72786E;
    background: #F0F4EC;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    text-align: center;
    font-style: italic;
  }
  .vs-parsing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .vs-transcript-final {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.875rem;
    color: #1A2E1A;
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    text-align: center;
  }
  .vs-parsing-label {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    color: #72786E;
  }
  .vs-spinner {
    width: 24px; height: 24px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #FFFFFF;
    border-radius: 50%;
    animation: vs-spin 0.6s linear infinite;
  }
  @keyframes vs-spin {
    to { transform: rotate(360deg); }
  }
  .vs-error {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.75rem;
    color: #E24B4A;
  }
  .vs-overlay {
    position: fixed; inset: 0;
    background: rgba(26,28,28,0.6);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .vs-sheet {
    background: #F0F4EC;
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    animation: vs-sheet-up 0.28s cubic-bezier(0.2,0,0,1);
    padding-bottom: env(safe-area-inset-bottom);
  }
  @keyframes vs-sheet-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .vs-confirmed {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    height: 100%;
    animation: vs-fade-in 0.3s ease;
  }
  @keyframes vs-fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .vs-check-circle {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: #0D631B;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(13,99,27,0.3);
  }
  .vs-confirmed-text {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1.5rem;
    color: #FFFFFF;
  }
`
