interface LiveIndicatorProps {
  connected: boolean
}

export function LiveIndicator({ connected }: LiveIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: connected ? '#0D631B' : '#9ca3af',
        display: 'inline-block',
        flexShrink: 0,
        animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{
        fontSize: '0.6875rem',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        fontWeight: 700,
        color: connected ? '#0D631B' : '#9ca3af',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
      }}>
        {connected ? 'Live' : 'Connecting…'}
      </span>
    </div>
  )
}
