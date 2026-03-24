import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { enqueueScore, getQueuedScores, deleteQueuedScore, migrateFromLocalStorage } from '@/lib/offline-queue'

// Reset IndexedDB to a fresh instance before each test
beforeEach(() => {
  // @ts-expect-error — assigning fake implementation to global
  global.indexedDB = new IDBFactory()
})

describe('enqueueScore', () => {
  it('stores a score entry', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4 })
  })

  it('overwrites an existing entry for the same hole (upsert)', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 5, queued_at: 2000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].gross_strokes).toBe(5)
  })

  it('stores null gross_strokes for a pickup', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 3, gross_strokes: null, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results[0].gross_strokes).toBeNull()
  })
})

describe('getQueuedScores', () => {
  it('returns only scores for the given scorecard_id', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc2', hole_number: 1, gross_strokes: 5, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].scorecard_id).toBe('sc1')
  })

  it('returns empty array when no entries exist', async () => {
    const results = await getQueuedScores('nonexistent')
    expect(results).toEqual([])
  })
})

describe('deleteQueuedScore', () => {
  it('removes a specific hole entry', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 2, gross_strokes: 3, queued_at: 1000 })
    await deleteQueuedScore('sc1', 1)
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].hole_number).toBe(2)
  })

  it('is a no-op if the entry does not exist', async () => {
    await expect(deleteQueuedScore('sc1', 99)).resolves.toBeUndefined()
  })
})

describe('migrateFromLocalStorage', () => {
  it('migrates legacy queue entries to IndexedDB and clears localStorage', async () => {
    const legacyKey = 'lx2_offline_queue_sc1'
    // @ts-expect-error — localStorage is available in jsdom environment
    global.localStorage = {
      getItem: (key: string) => key === legacyKey
        ? JSON.stringify([{ holeInRound: 1, value: 4 }, { holeInRound: 2, value: null }])
        : null,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }
    await migrateFromLocalStorage('sc1')
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(2)
    expect(results.find(r => r.hole_number === 1)?.gross_strokes).toBe(4)
    expect(results.find(r => r.hole_number === 2)?.gross_strokes).toBeNull()
    // @ts-expect-error
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(legacyKey)
  })

  it('does nothing when no legacy key exists', async () => {
    // @ts-expect-error
    global.localStorage = { getItem: () => null, removeItem: vi.fn(), setItem: vi.fn() }
    await expect(migrateFromLocalStorage('sc1')).resolves.toBeUndefined()
    const results = await getQueuedScores('sc1')
    expect(results).toEqual([])
  })
})
