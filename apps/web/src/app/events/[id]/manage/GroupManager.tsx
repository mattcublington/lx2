'use client'

import { useState, useTransition } from 'react'
import { generateGroups, updateGroup, assignPlayerToGroup } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Group {
  id: string
  flight_number: number
  tee_time: string | null
  start_hole: number
  label: string | null
}

interface Player {
  id: string
  display_name: string
  handicap_index: number
  flight_number: number | null
}

interface Props {
  eventId: string
  groups: Group[]
  players: Player[]   // confirmed players only
  groupSize: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupLabel(g: Group) {
  return g.label ?? `Group ${g.flight_number}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const font = 'var(--font-dm-sans), sans-serif'

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #E0EBE0',
  overflow: 'hidden',
}

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  background: '#F2F5F0',
  borderBottom: '1px solid #E0EBE0',
  gap: 12,
  flexWrap: 'wrap' as const,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1.5px solid #E0EBE0',
  borderRadius: 8,
  fontSize: '0.8125rem',
  fontFamily: font,
  color: '#1A2E1A',
  background: '#fff',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  paddingRight: 28,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B8C6B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

const playerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 20px',
  borderBottom: '1px solid #f0f4f0',
  gap: 10,
  fontFamily: font,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 18px',
  border: 'none',
  borderRadius: 10,
  background: '#0D631B',
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: 600,
  fontFamily: font,
  cursor: 'pointer',
  transition: 'background 0.15s',
  whiteSpace: 'nowrap' as const,
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '9px 18px',
  border: '1.5px solid #E0EBE0',
  borderRadius: 10,
  background: '#fff',
  color: '#6B8C6B',
  fontSize: '0.875rem',
  fontWeight: 500,
  fontFamily: font,
  cursor: 'pointer',
  transition: 'background 0.15s',
  whiteSpace: 'nowrap' as const,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupManager({ eventId, groups: initialGroups, players: initialPlayers, groupSize }: Props) {
  const [isPending, startTransition] = useTransition()
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)

  const numGroupsEstimate = Math.ceil(initialPlayers.length / groupSize)
  const hasGroups = groups.length > 0

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleGenerate() {
    startTransition(async () => {
      await generateGroups(eventId)
      // Server will revalidate and the page re-renders with fresh data from the server.
      // Client state gets refreshed on next page load; no local optimistic update needed
      // for generate since everything changes.
    })
  }

  function handleTimeChange(group: Group, value: string) {
    const newTime = value || null
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, tee_time: newTime } : g))
    startTransition(async () => {
      await updateGroup(eventId, group.id, { tee_time: newTime })
    })
  }

  function handleStartHoleChange(group: Group, value: number) {
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, start_hole: value } : g))
    startTransition(async () => {
      await updateGroup(eventId, group.id, { start_hole: value })
    })
  }

  function handleAssign(playerId: string, flightNumber: number | null) {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, flight_number: flightNumber } : p))
    startTransition(async () => {
      await assignPlayerToGroup(eventId, playerId, flightNumber)
    })
  }

  const unassigned = players.filter(p => p.flight_number === null)

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!hasGroups) {
    return (
      <div style={cardStyle}>
        <div style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: font }}>
            Groups
          </div>
          {initialPlayers.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B8C6B', fontFamily: font, lineHeight: 1.5 }}>
              No confirmed players yet. Confirm players first, then generate groups.
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6B8C6B', fontFamily: font, lineHeight: 1.5 }}>
                Generate groups to auto-sort your {initialPlayers.length} confirmed {initialPlayers.length === 1 ? 'player' : 'players'} into {numGroupsEstimate} {groupSize}-ball {numGroupsEstimate === 1 ? 'group' : 'groups'}. You can adjust tee times and move players between groups afterwards.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isPending}
                style={{ ...primaryBtnStyle, opacity: isPending ? 0.7 : 1 }}
              >
                {isPending ? 'Generating…' : `Generate ${numGroupsEstimate} group${numGroupsEstimate === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Groups view ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>
          Groups · {groups.length} × {groupSize}-ball
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          style={{ ...ghostBtnStyle, fontSize: '0.8125rem', padding: '6px 14px', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Working…' : 'Re-generate'}
        </button>
      </div>

      {/* Group cards */}
      {groups.map(group => {
        const groupPlayers = players.filter(p => p.flight_number === group.flight_number)
        return (
          <div key={group.id} style={cardStyle}>

            {/* Group header row */}
            <div style={groupHeaderStyle}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', fontFamily: font }}>
                {groupLabel(group)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>

                {/* Tee time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B8C6B', fontFamily: font }}>Tee</span>
                  <input
                    type="time"
                    value={group.tee_time ?? ''}
                    onChange={e => handleTimeChange(group, e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Start hole */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B8C6B', fontFamily: font }}>Hole</span>
                  <select
                    value={group.start_hole}
                    onChange={e => handleStartHoleChange(group, Number(e.target.value))}
                    style={selectStyle}
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Player rows */}
            {groupPlayers.length === 0 ? (
              <div style={{ padding: '12px 20px', fontSize: '0.8125rem', color: '#9ca3af', fontFamily: font }}>
                No players assigned
              </div>
            ) : (
              groupPlayers.map((player, idx) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={idx}
                  groups={groups}
                  isLast={idx === groupPlayers.length - 1}
                  onAssign={handleAssign}
                />
              ))
            )}
          </div>
        )
      })}

      {/* Unassigned players */}
      {unassigned.length > 0 && (
        <div style={cardStyle}>
          <div style={{ padding: '12px 20px 4px', fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af', fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f0f4f0' }}>
            Unassigned ({unassigned.length})
          </div>
          {unassigned.map((player, idx) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={idx}
              groups={groups}
              isLast={idx === unassigned.length - 1}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

    </div>
  )
}

// ─── PlayerRow ────────────────────────────────────────────────────────────────

function PlayerRow({
  player,
  index,
  groups,
  isLast,
  onAssign,
}: {
  player: Player
  index: number
  groups: Group[]
  isLast: boolean
  onAssign: (playerId: string, flightNumber: number | null) => void
}) {
  return (
    <div style={{ ...playerRowStyle, borderBottom: isLast ? 'none' : '1px solid #f0f4f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%', background: '#F2F5F0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6875rem', fontWeight: 700, color: '#6B8C6B',
        }}>
          {index + 1}
        </span>
        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.display_name}
        </span>
        <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', flexShrink: 0 }}>
          {Number(player.handicap_index).toFixed(1)}
        </span>
      </div>

      {/* Group assignment dropdown */}
      <select
        value={player.flight_number ?? ''}
        onChange={e => onAssign(player.id, e.target.value ? Number(e.target.value) : null)}
        style={{ ...selectStyle, fontSize: '0.8125rem', flexShrink: 0 }}
      >
        <option value="">— Unassigned</option>
        {groups.map(g => (
          <option key={g.flight_number} value={g.flight_number}>
            {groupLabel(g)}
          </option>
        ))}
      </select>
    </div>
  )
}
