'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { getRecentlyPlayedWith, searchUsersForEvent, addPlayerToEvent } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickerPlayer {
  id: string
  displayName: string
  handicapIndex: number | null
  avatarUrl: string | null
}

interface SelectedSlot {
  id: string | null    // null = unregistered
  displayName: string
  handicapIndex: number | null
  avatarUrl: string | null
}

interface Props {
  eventId: string
  groupLabel: string
  flightNumber: number
  groupSize: number
  existingCount: number      // how many already in this group
  onDone: () => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlayerPickerSheet({
  eventId,
  groupLabel,
  flightNumber,
  groupSize,
  existingCount,
  onDone,
  onCancel,
}: Props) {
  const [recentPlayers, setRecentPlayers] = useState<PickerPlayer[]>([])
  const [searchResults, setSearchResults] = useState<PickerPlayer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [selected, setSelected] = useState<SelectedSlot[]>([])
  const [showUnregisteredForm, setShowUnregisteredForm] = useState(false)
  const [unregName, setUnregName] = useState('')
  const [unregHcp, setUnregHcp] = useState('')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slotsAvailable = groupSize - existingCount
  const slotsRemaining = slotsAvailable - selected.length

  // Load recently played with on mount
  useEffect(() => {
    getRecentlyPlayedWith(eventId).then(players => {
      setRecentPlayers(players)
      setLoadingRecent(false)
    }).catch(() => setLoadingRecent(false))
  }, [eventId])

  // Debounced search
  const handleSearchInput = (q: string) => {
    setSearchQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const results = await searchUsersForEvent(eventId, q)
      setSearchResults(results)
      setSearching(false)
    }, 300)
  }

  const isSelected = (userId: string) => selected.some(s => s.id === userId)

  const togglePlayer = (player: PickerPlayer) => {
    if (isSelected(player.id)) {
      setSelected(prev => prev.filter(s => s.id !== player.id))
    } else if (slotsRemaining > 0) {
      setSelected(prev => [...prev, {
        id: player.id,
        displayName: player.displayName,
        handicapIndex: player.handicapIndex,
        avatarUrl: player.avatarUrl,
      }])
    }
  }

  const removeSelected = (idx: number) => {
    setSelected(prev => prev.filter((_, i) => i !== idx))
  }

  const addUnregistered = () => {
    if (!unregName.trim() || slotsRemaining <= 0) return
    const hcp = parseFloat(unregHcp)
    setSelected(prev => [...prev, {
      id: null,
      displayName: unregName.trim(),
      handicapIndex: !isNaN(hcp) ? hcp : null,
      avatarUrl: null,
    }])
    setUnregName('')
    setUnregHcp('')
    setShowUnregisteredForm(false)
  }

  const handleDone = () => {
    if (selected.length === 0) {
      onDone()
      return
    }
    startTransition(async () => {
      for (const player of selected) {
        await addPlayerToEvent(eventId, {
          userId: player.id,
          displayName: player.displayName,
          handicapIndex: player.handicapIndex ?? 0,
          flightNumber,
        })
      }
      onDone()
    })
  }

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  // Filter out already-selected users from the display lists
  const selectedIds = new Set(selected.filter(s => s.id).map(s => s.id))
  const filteredRecent = recentPlayers.filter(p => !selectedIds.has(p.id))
  const filteredSearch = searchResults.filter(p => !selectedIds.has(p.id))

  return (
    <>
      <style>{`
        .pps-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: #fff;
          display: flex; flex-direction: column;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          animation: pps-slide-up 0.25s cubic-bezier(0.2, 0, 0, 1);
        }
        @keyframes pps-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .pps-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
          border-bottom: 1px solid #E0EBE0;
          flex-shrink: 0;
        }
        .pps-header-title {
          font-family: var(--font-dm-serif), serif;
          font-weight: 400; font-size: 1.25rem; color: #1A2E1A;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .pps-header-sub {
          font-size: 0.8125rem; color: #6B8C6B;
          text-align: center; margin-top: 2px;
        }
        .pps-done-btn {
          padding: 8px 20px; border: none; border-radius: 12px;
          background: #0D631B; color: #fff;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer; transition: background 0.15s;
        }
        .pps-done-btn:hover { background: #0a4f15; }
        .pps-done-btn:disabled { opacity: 0.6; cursor: default; }

        .pps-search-bar {
          padding: 12px 20px;
          border-bottom: 1px solid #E0EBE0;
          flex-shrink: 0;
        }
        .pps-search-input {
          width: 100%; padding: 10px 14px 10px 38px;
          border: 1.5px solid #E0EBE0; border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; color: #1A2E1A;
          background: #F2F5F0; outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }
        .pps-search-input:focus {
          border-color: #0D631B; background: #fff;
        }
        .pps-search-input::placeholder { color: #6B8C6B; }
        .pps-search-wrap {
          position: relative;
        }
        .pps-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #6B8C6B; pointer-events: none;
        }

        .pps-slots {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid #E0EBE0;
          overflow-x: auto; flex-shrink: 0;
        }
        .pps-slot {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          min-width: 56px;
        }
        .pps-slot-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          position: relative; overflow: visible;
        }
        .pps-slot-avatar.filled {
          background: linear-gradient(135deg, rgba(13,99,27,0.15) 0%, rgba(61,107,26,0.1) 100%);
          border: 2.5px solid #0D631B;
          color: #0D631B;
        }
        .pps-slot-avatar.empty {
          border: 2px dashed #C8D4C8;
          background: transparent;
          color: #C8D4C8;
        }
        .pps-slot-avatar img {
          width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
        }
        .pps-slot-remove {
          position: absolute; top: -4px; right: -4px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #dc2626; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0; color: #fff;
        }
        .pps-slot-name {
          font-size: 0.6875rem; color: #1A2E1A; font-weight: 500;
          max-width: 56px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; text-align: center;
        }

        .pps-body {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .pps-section-label {
          padding: 14px 20px 8px;
          font-size: 0.75rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          background: #F2F5F0;
          border-bottom: 1px solid #E0EBE0;
          position: sticky; top: 0; z-index: 1;
        }

        .pps-add-unreg {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid #E0EBE0;
          cursor: pointer; transition: background 0.12s;
        }
        .pps-add-unreg:hover { background: #F2F5F0; }
        .pps-add-unreg-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: #0D631B; color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pps-add-unreg-text {
          font-size: 0.9375rem; font-weight: 500; color: #1A2E1A;
        }

        .pps-unreg-form {
          padding: 14px 20px;
          border-bottom: 1px solid #E0EBE0;
          display: flex; flex-direction: column; gap: 10px;
          background: #F2F5F0;
        }
        .pps-unreg-row {
          display: flex; gap: 10px;
        }
        .pps-unreg-input {
          flex: 1; padding: 10px 14px;
          border: 1.5px solid #E0EBE0; border-radius: 10px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; color: #1A2E1A;
          background: #fff; outline: none;
          box-sizing: border-box;
        }
        .pps-unreg-input:focus { border-color: #0D631B; }
        .pps-unreg-actions {
          display: flex; gap: 8px;
        }
        .pps-unreg-cancel {
          flex: 1; padding: 10px; border: 1.5px solid #E0EBE0; border-radius: 10px;
          background: #fff; color: #6B8C6B;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 500;
          cursor: pointer;
        }
        .pps-unreg-add {
          flex: 1; padding: 10px; border: none; border-radius: 10px;
          background: #0D631B; color: #fff;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer;
        }
        .pps-unreg-add:disabled { opacity: 0.5; cursor: default; }

        .pps-player-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(224,235,224,0.6);
          cursor: pointer; transition: background 0.12s;
          user-select: none;
        }
        .pps-player-row:hover { background: #F2F5F0; }
        .pps-player-row:active { background: #e8ede6; }
        .pps-player-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700;
          flex-shrink: 0; overflow: hidden;
          background: linear-gradient(135deg, rgba(13,99,27,0.12) 0%, rgba(61,107,26,0.08) 100%);
          color: #0D631B;
        }
        .pps-player-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pps-player-info {
          flex: 1; min-width: 0;
        }
        .pps-player-name {
          font-size: 0.9375rem; font-weight: 500; color: #1A2E1A;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pps-player-meta {
          font-size: 0.8125rem; color: #6B8C6B;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pps-player-check {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid #C8D4C8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s;
        }
        .pps-player-check.checked {
          border-color: #0D631B; background: #0D631B;
        }

        .pps-empty {
          padding: 24px 20px; text-align: center;
          font-size: 0.875rem; color: #6B8C6B;
        }

        .pps-loading-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #6B8C6B;
          margin: 0 2px;
          animation: pps-dot 1s ease-in-out infinite;
        }
        .pps-loading-dot:nth-child(2) { animation-delay: 0.15s; }
        .pps-loading-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pps-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="pps-overlay">
        {/* Header */}
        <div className="pps-header">
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="pps-header-title">{groupLabel}</div>
            <div className="pps-header-sub">
              {existingCount + selected.length}/{groupSize}
            </div>
          </div>
          <button
            className="pps-done-btn"
            onClick={handleDone}
            disabled={isPending}
          >
            {isPending ? 'Adding\u2026' : 'Done'}
          </button>
        </div>

        {/* Search bar */}
        <div className="pps-search-bar">
          <div className="pps-search-wrap">
            <svg className="pps-search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="pps-search-input"
              placeholder="Search from all users"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* Selected player slots */}
        <div className="pps-slots">
          {selected.map((s, i) => (
            <div key={`sel-${i}`} className="pps-slot">
              <div className="pps-slot-avatar filled">
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.displayName} />
                ) : (
                  initials(s.displayName)
                )}
                <button
                  className="pps-slot-remove"
                  onClick={() => removeSelected(i)}
                  aria-label={`Remove ${s.displayName}`}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <span className="pps-slot-name">
                {s.displayName.split(' ')[0]}
              </span>
            </div>
          ))}
          {Array.from({ length: slotsRemaining }, (_, i) => (
            <div key={`empty-${i}`} className="pps-slot">
              <div className="pps-slot-avatar empty">
                <span style={{ fontSize: '0.875rem' }}>{existingCount + selected.length + i + 1}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="pps-body">

          {/* Add unregistered player */}
          {slotsRemaining > 0 && !showUnregisteredForm && (
            <div
              className="pps-add-unreg"
              onClick={() => setShowUnregisteredForm(true)}
            >
              <div className="pps-add-unreg-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="pps-add-unreg-text">Add unregistered player</span>
            </div>
          )}

          {/* Unregistered player form */}
          {showUnregisteredForm && (
            <div className="pps-unreg-form">
              <div className="pps-unreg-row">
                <input
                  className="pps-unreg-input"
                  type="text"
                  placeholder="Player name"
                  value={unregName}
                  onChange={e => setUnregName(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUnregistered() } }}
                />
                <input
                  className="pps-unreg-input"
                  type="number"
                  placeholder="HCP"
                  value={unregHcp}
                  onChange={e => setUnregHcp(e.target.value)}
                  min={0}
                  max={54}
                  step={0.1}
                  style={{ maxWidth: 80 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUnregistered() } }}
                />
              </div>
              <div className="pps-unreg-actions">
                <button
                  className="pps-unreg-cancel"
                  onClick={() => { setShowUnregisteredForm(false); setUnregName(''); setUnregHcp('') }}
                >
                  Cancel
                </button>
                <button
                  className="pps-unreg-add"
                  onClick={addUnregistered}
                  disabled={!unregName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <>
              <div className="pps-section-label">Search results</div>
              {searching && (
                <div className="pps-empty">
                  <span className="pps-loading-dot" />
                  <span className="pps-loading-dot" />
                  <span className="pps-loading-dot" />
                </div>
              )}
              {!searching && filteredSearch.length === 0 && (
                <div className="pps-empty">No users found</div>
              )}
              {!searching && filteredSearch.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  checked={isSelected(p.id)}
                  disabled={slotsRemaining <= 0 && !isSelected(p.id)}
                  onToggle={() => togglePlayer(p)}
                />
              ))}
            </>
          )}

          {/* Recently played with */}
          {searchQuery.trim().length < 2 && (
            <>
              <div className="pps-section-label">Recently played with</div>
              {loadingRecent && (
                <div className="pps-empty">
                  <span className="pps-loading-dot" />
                  <span className="pps-loading-dot" />
                  <span className="pps-loading-dot" />
                </div>
              )}
              {!loadingRecent && filteredRecent.length === 0 && (
                <div className="pps-empty">No recent co-players found</div>
              )}
              {!loadingRecent && filteredRecent.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  checked={isSelected(p.id)}
                  disabled={slotsRemaining <= 0 && !isSelected(p.id)}
                  onToggle={() => togglePlayer(p)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── PlayerRow ───────────────────────────────────────────────────────────────

function PlayerRow({
  player,
  checked,
  disabled,
  onToggle,
}: {
  player: PickerPlayer
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const initials = player.displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className="pps-player-row"
      onClick={disabled ? undefined : onToggle}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      <div className="pps-player-avatar">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.displayName} />
        ) : (
          initials
        )}
      </div>
      <div className="pps-player-info">
        <div className="pps-player-name">{player.displayName}</div>
        {player.handicapIndex !== null && (
          <div className="pps-player-meta">{player.handicapIndex.toFixed(1)}</div>
        )}
      </div>
      <div className={`pps-player-check ${checked ? 'checked' : ''}`}>
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}
