'use client'
import { useState } from 'react'
import { blueprints, type ServiceBlueprint, type BlueprintStep, type BPStatus } from './LX2Blueprints'

const STATUS_COLORS: Record<BPStatus, { bg: string; color: string; label: string }> = {
  done:     { bg: '#DCFCE7', color: '#15803D', label: 'done' },
  building: { bg: '#FEF3C7', color: '#B45309', label: 'building' },
  planned:  { bg: '#F3F4F6', color: '#6B7280', label: 'planned' },
}

const LAYERS = [
  { key: 'evidence',   label: 'Evidence',     bg: '#EBF4FF', borderColor: '#BFDBFE', textColor: '#1D4ED8', icon: '📎' },
  { key: 'userAction', label: 'User action',  bg: '#F0FDF4', borderColor: '#BBF7D0', textColor: '#15803D', icon: '👤' },
  { key: 'frontstage', label: 'Frontstage',   bg: '#F7FEE7', borderColor: '#D9F99D', textColor: '#4D7C0F', icon: '🖥️' },
  { key: 'VISIBILITY', label: '── Line of visibility ──', bg: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#9CA3AF', icon: '' },
  { key: 'backstage',  label: 'Backstage',    bg: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E', icon: '⚙️' },
  { key: 'systems',    label: 'Support systems', bg: '#F5F3FF', borderColor: '#DDD6FE', textColor: '#6D28D9', icon: '🔌' },
  { key: 'notes',      label: 'Notes / gaps', bg: '#FFF1F2', borderColor: '#FECDD3', textColor: '#BE123C', icon: '⚠️' },
] as const

type LayerKey = typeof LAYERS[number]['key']

function cellContent(step: BlueprintStep, layerKey: LayerKey): string[] | string | null {
  switch (layerKey) {
    case 'evidence':   return step.evidence
    case 'userAction': return step.userAction
    case 'frontstage': return step.frontstage
    case 'backstage':  return step.backstage
    case 'systems':    return step.systems
    case 'notes':      return step.notes ?? []
    case 'VISIBILITY': return null
  }
}

function StepHeader({ step }: { step: BlueprintStep }) {
  const sc = STATUS_COLORS[step.status]
  return (
    <div style={{ padding: '10px 12px', borderBottom: '0.5px solid #E5E7EB' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A2E1A', fontFamily: "'DM Sans', sans-serif", marginBottom: 4, lineHeight: 1.3 }}>
        {step.label}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontFamily: "'DM Sans', sans-serif" }}>
        {sc.label}
      </span>
    </div>
  )
}

function Cell({ step, layer }: { step: BlueprintStep; layer: typeof LAYERS[number] }) {
  const content = cellContent(step, layer.key)

  // Line of visibility — dashed divider
  if (layer.key === 'VISIBILITY') {
    return (
      <td style={{ padding: '4px 12px', background: '#F9FAFB', borderRight: '0.5px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: "'DM Sans', sans-serif", letterSpacing: 1 }}>
          - - - - - - - - - - -
        </span>
      </td>
    )
  }

  const items = Array.isArray(content) ? content : content ? [content] : []

  return (
    <td style={{ padding: '10px 12px', verticalAlign: 'top', background: layer.bg, borderRight: '0.5px solid #E5E7EB', minWidth: 220, maxWidth: 260 }}>
      {items.length === 0
        ? <span style={{ fontSize: 11, color: '#D1D5DB', fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif" }}>—</span>
        : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {items.map((item, i) => (
              <li key={i} style={{ fontSize: 11, color: layer.textColor, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: i < items.length - 1 ? 4 : 0, paddingLeft: 12, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: 3, width: 4, height: 4, borderRadius: '50%', background: layer.borderColor, display: 'inline-block' }} />
                {item}
              </li>
            ))}
          </ul>
        )
      }
    </td>
  )
}

function BlueprintTable({ blueprint }: { blueprint: ServiceBlueprint }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '0.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 16 }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '100%' }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {/* Sticky label column header */}
            <th style={{ width: 130, minWidth: 130, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', fontFamily: "'DM Sans', sans-serif", borderRight: '0.5px solid #E5E7EB', borderBottom: '0.5px solid #E5E7EB', position: 'sticky', left: 0, background: '#F9FAFB', zIndex: 10 }}>
              Layer
            </th>
            {blueprint.steps.map(step => (
              <th key={step.id} style={{ minWidth: 220, maxWidth: 260, padding: 0, borderRight: '0.5px solid #E5E7EB', borderBottom: '0.5px solid #E5E7EB', verticalAlign: 'top', background: '#F9FAFB' }}>
                <StepHeader step={step} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LAYERS.map((layer, li) => (
            <tr key={layer.key} style={{ borderBottom: layer.key === 'VISIBILITY' ? '1.5px dashed #D1D5DB' : '0.5px solid #E5E7EB' }}>
              {/* Layer label — sticky */}
              <td style={{
                padding: '10px 12px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                color: layer.key === 'VISIBILITY' ? '#9CA3AF' : layer.textColor,
                background: layer.key === 'VISIBILITY' ? '#F9FAFB' : layer.bg,
                borderRight: '0.5px solid #E5E7EB',
                position: 'sticky',
                left: 0,
                zIndex: 5,
                whiteSpace: 'nowrap',
              }}>
                {layer.icon && <span style={{ marginRight: 5 }}>{layer.icon}</span>}
                {layer.label}
              </td>

              {blueprint.steps.map(step => (
                <Cell key={step.id} step={step} layer={layer} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function BlueprintView() {
  const [activeId, setActiveId] = useState(blueprints[0].id)
  const active = blueprints.find(b => b.id === activeId) ?? blueprints[0]

  return (
    <div style={{ marginBottom: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#6B8C6B', margin: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
          Full service blueprints — each step shows what the user does, what&apos;s visible on screen (frontstage), and what runs behind the scenes (backstage).
          The dashed line marks the <strong>line of visibility</strong>: above it is what users see; below it is invisible to them.
        </p>
      </div>

      {/* Blueprint selector pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {blueprints.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveId(b.id)}
            style={{
              fontSize: 12,
              padding: '7px 16px',
              borderRadius: 99,
              border: 'none',
              background: activeId === b.id ? '#1A2E1A' : '#F3F4F6',
              color: activeId === b.id ? '#fff' : '#6B7280',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: activeId === b.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Blueprint description */}
      <p style={{ fontSize: 12, color: '#6B8C6B', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
        {active.description}
      </p>

      {/* Step count + status summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        {(['done', 'building', 'planned'] as BPStatus[]).map(s => {
          const count = active.steps.filter(st => st.status === s).length
          if (!count) return null
          const sc = STATUS_COLORS[s]
          return (
            <span key={s} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: sc.bg, color: sc.color, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              {count} {sc.label}
            </span>
          )
        })}
      </div>

      <BlueprintTable blueprint={active} />

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LAYERS.filter(l => l.key !== 'VISIBILITY').map(layer => (
          <div key={layer.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: layer.textColor, background: layer.bg, border: `0.5px solid ${layer.borderColor}`, borderRadius: 8, padding: '3px 10px', fontFamily: "'DM Sans', sans-serif" }}>
            {layer.icon && <span>{layer.icon}</span>}
            <span>{layer.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9CA3AF', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8, padding: '3px 10px', fontFamily: "'DM Sans', sans-serif" }}>
          <span>── line of visibility ──</span>
        </div>
      </div>
    </div>
  )
}
