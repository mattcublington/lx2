interface HoleDotProps {
  holeNumber: number
  par: number
  grossStroke: number | null
  pointValue: number | null
  format: 'stableford' | 'strokeplay'
  isContest: boolean
}

export function HoleDot({ holeNumber, par, grossStroke, pointValue, format, isContest }: HoleDotProps) {
  const played = grossStroke !== null

  let bg = 'transparent'
  let textColor = '#c0c0c0'
  let border = '1.5px solid #E0EBE0'
  let label = ''

  if (played) {
    border = 'none'
    if (format === 'stableford' && pointValue !== null) {
      label = String(pointValue)
      if (pointValue >= 3)       { bg = '#0D631B'; textColor = '#fff' }
      else if (pointValue === 2) { bg = '#D1FAE5'; textColor = '#065F46' }
      else if (pointValue === 1) { bg = '#FEF3C7'; textColor = '#92400E' }
      else                       { bg = '#FEE2E2'; textColor = '#B91C1C' }
    } else if (format === 'strokeplay') {
      const rel = (grossStroke ?? 0) - par
      label = String(grossStroke)
      if (rel <= -1)      { bg = '#0D631B'; textColor = '#fff' }
      else if (rel === 0) { bg = '#D1FAE5'; textColor = '#065F46' }
      else if (rel === 1) { bg = '#FEF3C7'; textColor = '#92400E' }
      else                { bg = '#FEE2E2'; textColor = '#B91C1C' }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{
        fontSize: '0.5rem',
        color: isContest ? '#f59e0b' : '#c0ccbf',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        lineHeight: 1,
        fontWeight: isContest ? 700 : 400,
        letterSpacing: '-0.02em',
      }}>
        {isContest ? '★' : holeNumber}
      </span>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: bg,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.625rem',
        fontWeight: 700,
        color: textColor,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {label}
      </div>
    </div>
  )
}
