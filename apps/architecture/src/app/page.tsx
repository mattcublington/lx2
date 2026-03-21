'use client'
import LX2Architecture from './LX2Architecture'

export default function ArchitecturePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4EC' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '28px 0 4px' }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 22, color: '#666', letterSpacing: -0.5 }}>
            LX<span style={{ color: '#2E7D32' }}>2</span>
          </div>
          <div style={{ fontFamily: "'Lexend', sans-serif", fontSize: 13, color: '#6B8C6B', fontWeight: 300 }}>
            Platform architecture
          </div>
          <div style={{ marginLeft: 'auto', fontFamily: "'Lexend', sans-serif", fontSize: 11, color: '#A0B898', letterSpacing: '0.04em' }}>
            v0.2 · March 2026
          </div>
        </div>
        <LX2Architecture />
      </div>
    </div>
  )
}
