'use client'
import { useState } from 'react'
import { pts, ptsLabel } from '@/lib/score-entry-helpers'
import VoiceCorrection from './VoiceCorrection'
import type { ParsedOwnScore, ParsedPlayerScore } from '@lx2/scoring'

interface ConfirmedScore {
  playerId: string | 'self'
  displayName: string
  score: number | null
  putts?: number | undefined
  gir?: boolean | undefined
  fairwayHit?: boolean | undefined
  missDirection?: string | undefined
  bunkerShots?: number | undefined
  penalties?: number | undefined
  upAndDown?: boolean | undefined
  sandSave?: boolean | undefined
}

interface VoiceConfirmProps {
  ownScore: ParsedOwnScore | null
  playerScores: ParsedPlayerScore[]
  par: number
  holeNumber: number
  playingHandicap: number
  hcShots: number
  markerName: string
  format: 'stableford' | 'strokeplay' | 'matchplay'
  onConfirm: (scores: ConfirmedScore[]) => void
  onReRecord: () => void
}

export type { ConfirmedScore }

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

export default function VoiceConfirm({
  ownScore,
  playerScores,
  par,
  holeNumber,
  hcShots,
  markerName,
  format,
  onConfirm,
  onReRecord,
}: VoiceConfirmProps) {
  // Editable copies
  const [editOwnScore, setEditOwnScore] = useState(ownScore?.score ?? null)
  const [editPlayerScores, setEditPlayerScores] = useState(
    playerScores.map(ps => ({ ...ps }))
  )
  const [correcting, setCorrecting] = useState<{ type: 'self' } | { type: 'player'; index: number } | null>(null)

  if (correcting) {
    if (correcting.type === 'self') {
      return (
        <VoiceCorrection
          playerName={markerName}
          initialScore={editOwnScore}
          par={par}
          onSave={(s) => {
            setEditOwnScore(s)
            setCorrecting(null)
          }}
          onCancel={() => setCorrecting(null)}
        />
      )
    }
    const ps = editPlayerScores[correcting.index]!
    return (
      <VoiceCorrection
        playerName={ps.playerName}
        initialScore={ps.score}
        par={par}
        onSave={(s) => {
          setEditPlayerScores(prev => {
            const next = [...prev]
            next[correcting.index] = { ...next[correcting.index]!, score: s }
            return next
          })
          setCorrecting(null)
        }}
        onCancel={() => setCorrecting(null)}
      />
    )
  }

  const handleConfirm = () => {
    const scores: ConfirmedScore[] = []
    if (ownScore) {
      scores.push({
        playerId: 'self',
        displayName: markerName,
        score: editOwnScore,
        putts: ownScore.putts,
        gir: ownScore.gir,
        fairwayHit: ownScore.fairwayHit,
        missDirection: ownScore.missDirection,
      })
    }
    for (const ps of editPlayerScores) {
      scores.push({
        playerId: ps.player,
        displayName: ps.playerName,
        score: ps.score,
      })
    }
    onConfirm(scores)
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="vcf-wrap">
        <div className="vcf-header">
          <span className="vcf-hole">Hole {holeNumber}</span>
          <span className="vcf-par">Par {par}</span>
        </div>

        <div className="vcf-scores">
          {/* Own score — rich detail */}
          {ownScore && (
            <div className="vcf-row vcf-row-self" onClick={() => setCorrecting({ type: 'self' })}>
              <div className="vcf-row-left">
                <div className="vcf-avatar vcf-avatar-self">
                  {markerName.charAt(0).toUpperCase()}
                </div>
                <div className="vcf-row-info">
                  <span className="vcf-name">{markerName} <span className="vcf-you">(you)</span></span>
                  <div className="vcf-badges">
                    {editOwnScore !== null && (
                      <span className="vcf-badge vcf-badge-score">{scoreName(editOwnScore, par)}</span>
                    )}
                    {ownScore.putts !== undefined && (
                      <span className="vcf-badge">{ownScore.putts} putt{ownScore.putts !== 1 ? 's' : ''}</span>
                    )}
                    {ownScore.gir === true && <span className="vcf-badge vcf-badge-gir">GIR</span>}
                    {ownScore.gir === false && <span className="vcf-badge">No GIR</span>}
                    {ownScore.fairwayHit === true && <span className="vcf-badge">FIR</span>}
                    {ownScore.fairwayHit === false && ownScore.missDirection && (
                      <span className="vcf-badge">Miss {ownScore.missDirection}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="vcf-row-right">
                {editOwnScore !== null ? (
                  <>
                    <span className="vcf-gross">{editOwnScore}</span>
                    {format === 'stableford' && (
                      <span className="vcf-pts">{ptsLabel(pts(editOwnScore, par, hcShots), editOwnScore, par, hcShots)}</span>
                    )}
                  </>
                ) : (
                  <span className="vcf-pickup-label">Pick up</span>
                )}
                <svg className="vcf-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </div>
            </div>
          )}

          {/* Other players — gross + points */}
          {editPlayerScores.map((ps, i) => (
            <div key={ps.player} className="vcf-row" onClick={() => setCorrecting({ type: 'player', index: i })}>
              <div className="vcf-row-left">
                <div className="vcf-avatar" style={{ background: PLAYER_COLOURS[i % PLAYER_COLOURS.length] }}>
                  {ps.playerName.charAt(0).toUpperCase()}
                </div>
                <span className="vcf-name">{ps.playerName}</span>
              </div>
              <div className="vcf-row-right">
                {ps.score !== null ? (
                  <>
                    <span className="vcf-gross">{ps.score}</span>
                    {format === 'stableford' && (
                      <span className="vcf-pts">{pts(ps.score, par, 0)} pts</span>
                    )}
                  </>
                ) : (
                  <span className="vcf-pickup-label">Pick up</span>
                )}
                <svg className="vcf-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </div>
            </div>
          ))}
        </div>

        <p className="vcf-hint">Tap any score to edit manually</p>

        <div className="vcf-buttons">
          <button className="vcf-confirm-btn" onClick={handleConfirm}>
            Confirm all
          </button>
          <button className="vcf-rerecord-btn" onClick={onReRecord}>
            Re-record
          </button>
        </div>
      </div>
    </>
  )
}

const PLAYER_COLOURS = ['#2563EB', '#B85C2A', '#7C3AED']

const STYLES = `
  .vcf-wrap {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .vcf-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .vcf-hole {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1.25rem;
    color: #1A2E1A;
  }
  .vcf-par {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    color: #72786E;
    font-weight: 500;
  }
  .vcf-scores {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .vcf-row {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 12px;
    padding: 0.875rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }
  .vcf-row:hover {
    border-color: #0D631B;
    transform: translateY(-1px);
  }
  .vcf-row-self {
    border-color: rgba(13,99,27,0.3);
    background: rgba(13,99,27,0.03);
  }
  .vcf-row-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }
  .vcf-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    color: #FFFFFF;
    flex-shrink: 0;
  }
  .vcf-avatar-self {
    background: #0D631B;
  }
  .vcf-row-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .vcf-name {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.9375rem;
    color: #1A2E1A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vcf-you {
    font-weight: 400;
    font-size: 0.75rem;
    color: #72786E;
  }
  .vcf-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .vcf-badge {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #72786E;
    background: #F0F4EC;
    padding: 0.125rem 0.5rem;
    border-radius: 6px;
  }
  .vcf-badge-score {
    color: #0D631B;
    background: rgba(13,99,27,0.1);
  }
  .vcf-badge-gir {
    color: #0D631B;
    background: rgba(13,99,27,0.1);
  }
  .vcf-row-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .vcf-gross {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    color: #1A2E1A;
    line-height: 1;
  }
  .vcf-pts {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #0D631B;
    background: rgba(13,99,27,0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 24px;
    white-space: nowrap;
  }
  .vcf-pickup-label {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    color: #72786E;
    font-style: italic;
  }
  .vcf-edit-icon {
    color: #72786E;
    opacity: 0.5;
  }
  .vcf-hint {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.75rem;
    color: #72786E;
    text-align: center;
    margin: 0;
  }
  .vcf-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .vcf-confirm-btn {
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
  .vcf-confirm-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(13,99,27,0.3);
  }
  .vcf-rerecord-btn {
    width: 100%;
    background: #FFFFFF;
    color: #1A2E1A;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.875rem;
    padding: 0.75rem;
    border: 1.5px solid #E0EBE0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .vcf-rerecord-btn:hover {
    border-color: #72786E;
    transform: translateY(-1px);
  }
`
