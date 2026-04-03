'use client'
import { useState } from 'react'

interface VoiceCorrectionProps {
  playerName: string
  initialScore: number | null
  par: number
  onSave: (score: number | null) => void
  onCancel: () => void
}

function scoreName(gross: number, par: number): string {
  const diff = gross - par
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

export default function VoiceCorrection({ playerName, initialScore, par, onSave, onCancel }: VoiceCorrectionProps) {
  const [score, setScore] = useState<number | null>(initialScore)

  return (
    <>
      <style>{STYLES}</style>
      <div className="vc-wrap">
        <div className="vc-header">
          <span className="vc-back" onClick={onCancel}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </span>
          <span className="vc-title">{playerName}</span>
        </div>

        <div className="vc-score-display">
          {score === null ? (
            <span className="vc-score-big vc-pickup">P/U</span>
          ) : (
            <span className="vc-score-big">{score}</span>
          )}
          {score !== null && (
            <span className="vc-score-label">{scoreName(score, par)}</span>
          )}
        </div>

        <div className="vc-stepper">
          <button
            className="vc-step-btn"
            onClick={() => setScore(s => s !== null && s > 1 ? s - 1 : s)}
            disabled={score === null || score <= 1}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
          </button>
          <button
            className="vc-step-btn"
            onClick={() => setScore(s => s !== null && s < 13 ? s + 1 : s)}
            disabled={score === null || score >= 13}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        </div>

        <div className="vc-actions">
          <button
            className="vc-pickup-btn"
            onClick={() => setScore(s => s === null ? par : null)}
          >
            {score === null ? 'Set score' : 'Pick up'}
          </button>
        </div>

        <button className="vc-save-btn" onClick={() => onSave(score)}>
          Save and return
        </button>
      </div>
    </>
  )
}

const STYLES = `
  .vc-wrap {
    padding: 1.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  .vc-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }
  .vc-back {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #44483E;
    cursor: pointer;
    transition: background 0.15s;
  }
  .vc-back:hover { background: rgba(26,28,28,0.06); }
  .vc-title {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1.25rem;
    color: #1A2E1A;
  }
  .vc-score-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0;
  }
  .vc-score-big {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 4rem;
    line-height: 1;
    color: #1A2E1A;
    letter-spacing: -0.02em;
  }
  .vc-score-big.vc-pickup {
    font-size: 2.5rem;
    color: #72786E;
  }
  .vc-score-label {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: #0D631B;
    background: rgba(13,99,27,0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 24px;
  }
  .vc-stepper {
    display: flex;
    gap: 2rem;
  }
  .vc-step-btn {
    width: 56px; height: 56px;
    border-radius: 50%;
    border: 2px solid #E0EBE0;
    background: #FFFFFF;
    color: #1A2E1A;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .vc-step-btn:hover:not(:disabled) {
    border-color: #0D631B;
    background: rgba(13,99,27,0.05);
    transform: translateY(-1px);
  }
  .vc-step-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .vc-actions {
    display: flex;
    gap: 0.75rem;
  }
  .vc-pickup-btn {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #72786E;
    background: none;
    border: 1.5px solid #E0EBE0;
    border-radius: 10px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .vc-pickup-btn:hover { border-color: #72786E; color: #1A2E1A; }
  .vc-save-btn {
    width: 100%;
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.9375rem;
    padding: 0.875rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 12px rgba(13,99,27,0.2);
  }
  .vc-save-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(13,99,27,0.3);
  }
`
