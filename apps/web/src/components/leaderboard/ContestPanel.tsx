import type { PlayerData } from '@lx2/leaderboard'

interface ContestPanelProps {
  type: 'ntp' | 'ld'
  holeNumbers: number[]
  players: PlayerData[]
}

const CONTEST_LABEL = { ntp: 'Nearest the Pin', ld: 'Longest Drive' }
const CONTEST_EMOJI = { ntp: '🎯', ld: '🏌️' }
const CONTEST_COLOR = { ntp: { bg: '#FEF3C7', text: '#92400E', border: '#fde68a' }, ld: { bg: '#DBEAFE', text: '#1E40AF', border: '#bfdbfe' } }

export function ContestPanel({ type, holeNumbers, players }: ContestPanelProps) {
  if (holeNumbers.length === 0) return null

  const colors = CONTEST_COLOR[type]

  // Players who have won this contest
  const winners = players.filter(p =>
    p.badges.some(b => b.type === type),
  )

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: '16px 20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: winners.length > 0 ? 12 : 0,
      }}>
        <span style={{ fontSize: '1.125rem' }}>{CONTEST_EMOJI[type]}</span>
        <span style={{
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 700,
          fontSize: '0.875rem',
          color: colors.text,
          letterSpacing: '-0.01em',
        }}>
          {CONTEST_LABEL[type]}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: colors.text,
          opacity: 0.7,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          {holeNumbers.map(h => `H${h}`).join(', ')}
        </span>
      </div>

      {winners.length === 0 ? (
        <p style={{
          margin: 0,
          fontSize: '0.8125rem',
          color: colors.text,
          opacity: 0.6,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          No winner recorded yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {winners.map(p => {
            const winnerBadges = p.badges.filter(b => b.type === type)
            return (
              <div key={p.eventPlayerId} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: colors.text,
                }}>
                  {p.displayName}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: colors.text,
                  opacity: 0.7,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}>
                  {winnerBadges.map(b => `H${b.holeNumber}`).join(', ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
