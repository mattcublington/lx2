// IndexedDB-backed offline score queue.
// Replaces the localStorage queue previously in ScoreEntryLive.tsx.

const DB_NAME = 'lx2'
const DB_VERSION = 1
const STORE = 'offline_scores'

export interface QueueEntry {
  scorecard_id: string
  hole_number: number
  gross_strokes: number | null
  queued_at: number // Date.now()
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: ['scorecard_id', 'hole_number'] })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Upsert a score entry. Overwrites any existing entry for the same scorecard+hole. */
export async function enqueueScore(entry: QueueEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** Return all queued entries for a given scorecard, in insertion order. */
export async function getQueuedScores(scorecardId: string): Promise<QueueEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      db.close()
      resolve((req.result as QueueEntry[]).filter(e => e.scorecard_id === scorecardId))
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** Delete a single queued entry after it has been successfully synced. */
export async function deleteQueuedScore(scorecardId: string, holeNumber: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete([scorecardId, holeNumber])
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/**
 * One-time migration from legacy localStorage queue.
 * Safe to call on every mount — uses put() so double-runs are idempotent.
 */
export async function migrateFromLocalStorage(scorecardId: string): Promise<void> {
  const key = `lx2_offline_queue_${scorecardId}`
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{ holeInRound: number; value: number | null }>
    for (const e of entries) {
      await enqueueScore({
        scorecard_id: scorecardId,
        hole_number: e.holeInRound,
        gross_strokes: e.value,
        queued_at: Date.now(),
      })
    }
    localStorage.removeItem(key)
  } catch { /* ignore — storage unavailable or malformed JSON */ }
}
