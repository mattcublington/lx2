'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addEntry, removeEntry, updateMultiplier, completeMerit, reopenMerit } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MeritEntry {
  id: string
  label: string
  date: string | null
  type: 'event' | 'tournament'
  refId: string
  multiplier: number
}

export interface AvailableItem {
  id: string
  name: string
  type: 'event' | 'tournament'
  date?: string
}

interface Props {
  meritId: string
  meritName: string
  status: string
  entries: MeritEntry[]
  available: AvailableItem[]
}

// ── Remove button ─────────────────────────────────────────────────────────────

function RemoveEntryButton({ meritId, entryId, onMutate }: {
  meritId: string
  entryId: string
  onMutate: () => void
}) {
  const [pending, start] = useTransition()

  function handleRemove() {
    if (!confirm('Remove this entry?')) return
    start(async () => {
      try {
        await removeEntry(meritId, entryId)
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <button
      className="mm-btn-remove"
      onClick={handleRemove}
      disabled={pending}
    >
      {pending ? '…' : 'Remove'}
    </button>
  )
}

// ── Multiplier inline editor ──────────────────────────────────────────────────

function MultiplierEditor({ meritId, entryId, initialValue, onMutate }: {
  meritId: string
  entryId: string
  initialValue: number
  onMutate: () => void
}) {
  const [value, setValue] = useState(String(initialValue))
  const [pending, start] = useTransition()

  function handleBlur() {
    const num = parseFloat(value)
    if (isNaN(num) || num === initialValue) return
    start(async () => {
      try {
        await updateMultiplier(meritId, entryId, num)
        onMutate()
      } catch (e) {
        alert((e as Error).message)
        setValue(String(initialValue))
      }
    })
  }

  return (
    <input
      type="number"
      className="mm-multiplier-input"
      min={0.1}
      step={0.5}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={handleBlur}
      disabled={pending}
      title="Points multiplier"
    />
  )
}

// ── Add entry form ────────────────────────────────────────────────────────────

function AddEntryForm({ meritId, available, onMutate }: {
  meritId: string
  available: AvailableItem[]
  onMutate: () => void
}) {
  const [selectedId, setSelectedId] = useState(available[0]?.id ?? '')
  const [multiplier, setMultiplier] = useState('1')
  const [pending, start] = useTransition()

  if (available.length === 0) {
    return (
      <div className="mm-empty-available">
        All available events and tournaments are already included.
      </div>
    )
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const item = available.find(a => a.id === selectedId)
    if (!item) return
    const mult = parseFloat(multiplier) || 1.0

    start(async () => {
      try {
        const entryData: { eventId?: string; tournamentId?: string; multiplier: number } = { multiplier: mult }
        if (item.type === 'event') entryData.eventId = item.id
        else entryData.tournamentId = item.id
        await addEntry(meritId, entryData)
        setMultiplier('1')
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <form className="mm-add-form" onSubmit={handleAdd}>
      <div className="mm-form-row">
        <div className="mm-form-field" style={{ flex: 2 }}>
          <label className="mm-form-label" htmlFor="mm-select-item">Event / Tournament</label>
          <select
            id="mm-select-item"
            className="mm-form-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            required
          >
            {available.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.type === 'tournament' ? ' (Tournament)' : ''}{a.date ? ` — ${a.date}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mm-form-field" style={{ flex: 1, minWidth: 100 }}>
          <label className="mm-form-label" htmlFor="mm-multiplier">Multiplier</label>
          <input
            id="mm-multiplier"
            className="mm-form-input"
            type="number"
            min={0.1}
            step={0.5}
            value={multiplier}
            onChange={e => setMultiplier(e.target.value)}
          />
        </div>
      </div>
      <button
        className="mm-btn-add"
        type="submit"
        disabled={pending || !selectedId}
      >
        {pending ? 'Adding…' : '+ Add Entry'}
      </button>
    </form>
  )
}

// ── Complete / Reopen button ──────────────────────────────────────────────────

function CompleteButton({ meritId, status, onMutate }: {
  meritId: string
  status: string
  onMutate: () => void
}) {
  const [pending, start] = useTransition()
  const isCompleted = status === 'completed'

  function handleClick() {
    start(async () => {
      try {
        if (isCompleted) {
          await reopenMerit(meritId)
        } else {
          if (!confirm('Mark this Order of Merit as completed?')) return
          await completeMerit(meritId)
        }
        onMutate()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <button
      className={isCompleted ? 'mm-btn-reopen' : 'mm-btn-complete'}
      onClick={handleClick}
      disabled={pending}
    >
      {pending
        ? isCompleted ? 'Reopening…' : 'Completing…'
        : isCompleted ? 'Reopen Order of Merit' : 'Mark as Completed'}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MeritManageClient({
  meritId,
  meritName: _meritName,
  status,
  entries: initialEntries,
  available,
}: Props) {
  const router = useRouter()
  const [entries] = useState<MeritEntry[]>(initialEntries)

  function refresh() {
    router.refresh()
  }

  return (
    <>
      {/* Entry list */}
      <div className="mm-card mm-card-full">
        <div className="mm-card-label" style={{ marginBottom: 12 }}>
          Entries ({entries.length})
        </div>
        {entries.length === 0 ? (
          <div className="mm-empty">No entries added yet. Use the form below to add events or tournaments.</div>
        ) : (
          <div className="mm-entry-list">
            {entries.map(entry => (
              <div key={entry.id} className="mm-entry-row">
                <div className="mm-entry-info">
                  <div className="mm-entry-name">{entry.label}</div>
                  {entry.date && (
                    <div className="mm-entry-meta">{entry.date}</div>
                  )}
                  <span className={`mm-badge mm-badge-${entry.type}`}>
                    {entry.type === 'event' ? 'Event' : 'Tournament'}
                  </span>
                </div>
                <div className="mm-entry-right">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                      Multiplier:
                    </span>
                    <MultiplierEditor
                      meritId={meritId}
                      entryId={entry.id}
                      initialValue={entry.multiplier}
                      onMutate={refresh}
                    />
                  </div>
                  <RemoveEntryButton
                    meritId={meritId}
                    entryId={entry.id}
                    onMutate={refresh}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add entry */}
      <div className="mm-card mm-card-full">
        <div className="mm-card-label" style={{ marginBottom: 12 }}>Add an event or tournament</div>
        <AddEntryForm
          meritId={meritId}
          available={available}
          onMutate={refresh}
        />
      </div>

      {/* Complete / Reopen */}
      <div className="mm-card mm-card-full">
        <div className="mm-card-label" style={{ marginBottom: 8 }}>
          {status === 'completed' ? 'Order of Merit completed' : 'Complete Order of Merit'}
        </div>
        <p className="mm-card-desc">
          {status === 'completed'
            ? 'This Order of Merit is completed. Reopen to allow further changes.'
            : 'Mark as completed once the season is over.'}
        </p>
        <CompleteButton
          meritId={meritId}
          status={status}
          onMutate={refresh}
        />
      </div>
    </>
  )
}
