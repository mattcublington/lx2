/**
 * Offline queue — go offline, score holes, reconnect, verify sync.
 *
 * Strategy:
 *  1. Navigate to an active score-entry page (requires a round created in this session
 *     or E2E_SCORE_URL pointing to a valid scorecard URL).
 *  2. Use page.context().setOffline(true) to cut the network.
 *  3. Enter scores via the UI — ScoreEntryLive queues them to IndexedDB.
 *  4. Verify the offline indicator appears.
 *  5. Restore the network — the drain loop should sync queued entries.
 *  6. Verify the indicator clears and scores are confirmed.
 *
 * When E2E_SCORE_URL is not set, the tests that require a real scorecard are skipped
 * and only the IndexedDB unit-level assertions run via page.evaluate().
 */
import { test, expect } from '@playwright/test'

const SCORE_URL = process.env.E2E_SCORE_URL

// ─── IndexedDB helpers (executed in the browser context) ─────────────────────

async function getQueuedCount(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, scorecardId: string): Promise<number> {
  return page.evaluate((id: string) => {
    return new Promise<number>((resolve, reject) => {
      const req = indexedDB.open('lx2', 1)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('offline_scores')) { db.close(); resolve(0); return }
        const tx = db.transaction('offline_scores', 'readonly')
        const all = tx.objectStore('offline_scores').getAll()
        all.onsuccess = () => {
          db.close()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser eval
          resolve((all.result as any[]).filter((e: { scorecard_id: string }) => e.scorecard_id === id).length)
        }
        all.onerror = () => { db.close(); reject(all.error) }
      }
    })
  }, scorecardId)
}

// ─── Tests that work without a real scorecard ─────────────────────────────────

test.describe('offline queue — IndexedDB in-browser', () => {
  test('can write and read entries from IndexedDB', async ({ page }) => {
    // Load any page so we have a browser context with IndexedDB
    await page.goto('/play')

    const count = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('lx2', 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('offline_scores')) {
            db.createObjectStore('offline_scores', { keyPath: ['scorecard_id', 'hole_number'] })
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('offline_scores', 'readwrite')
          tx.objectStore('offline_scores').put({
            scorecard_id: 'e2e-test-sc',
            hole_number: 1,
            gross_strokes: 4,
            queued_at: Date.now(),
          })
          tx.oncomplete = () => {
            // Read it back
            const tx2 = db.transaction('offline_scores', 'readonly')
            const all = tx2.objectStore('offline_scores').getAll()
            all.onsuccess = () => {
              db.close()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser eval
              resolve((all.result as any[]).filter((e: { scorecard_id: string }) => e.scorecard_id === 'e2e-test-sc').length)
            }
          }
          tx.onerror = () => { db.close(); reject(tx.error) }
        }
        req.onerror = () => reject(req.error)
      })
    })

    expect(count).toBe(1)
  })

  test('navigator.onLine reflects context offline state', async ({ page, context }) => {
    await page.goto('/play')

    // Confirm online
    const onlineInitially = await page.evaluate(() => navigator.onLine)
    expect(onlineInitially).toBe(true)

    // Go offline
    await context.setOffline(true)
    const offlineNow = await page.evaluate(() => navigator.onLine)
    expect(offlineNow).toBe(false)

    // Restore
    await context.setOffline(false)
    const onlineAgain = await page.evaluate(() => navigator.onLine)
    expect(onlineAgain).toBe(true)
  })
})

// ─── Tests that require an active score-entry page ────────────────────────────

test.describe('offline queue — score entry', () => {
  test.beforeEach(({ }, testInfo) => {
    if (!SCORE_URL) {
      testInfo.skip(true, 'E2E_SCORE_URL not set — skipping score-entry offline tests')
    }
  })

  test('entering a score while offline queues it to IndexedDB', async ({ page, context }) => {
    await page.goto(SCORE_URL!)

    // Wait for the score entry UI to fully load
    await page.locator('.sc-bar').waitFor({ state: 'visible', timeout: 10_000 })

    // Extract scorecard ID from the page URL: /rounds/<id>/score
    const url = page.url()
    const scorecardId = url.match(/\/rounds\/([^/]+)\/score/)?.[1] ?? 'unknown'

    // Count queued entries before going offline
    const beforeCount = await getQueuedCount(page, scorecardId)

    // Go offline
    await context.setOffline(true)

    // Tap a score button (value "4" on the current hole)
    const scoreBtn = page.getByRole('button', { name: /^4$/ }).first()
    if (await scoreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scoreBtn.click()
    } else {
      // Try pressing a number key on the score pad
      await page.keyboard.press('4')
    }

    // Give ScoreEntryLive a moment to enqueue
    await page.waitForTimeout(500)

    // The offline indicator should appear
    await expect(
      page.getByText(/offline|not connected|syncing/i).or(page.locator('[data-testid="offline-indicator"]')),
    ).toBeVisible({ timeout: 5000 })

    // The queue should have grown by 1
    const afterCount = await getQueuedCount(page, scorecardId)
    expect(afterCount).toBeGreaterThan(beforeCount)

    // Restore network
    await context.setOffline(false)

    // The sync drains the queue — count should return to 0 (or same as before)
    await page.waitForTimeout(3000) // allow drain loop to run
    const syncedCount = await getQueuedCount(page, scorecardId)
    expect(syncedCount).toBeLessThanOrEqual(beforeCount)
  })

  test('offline indicator disappears after reconnect', async ({ page, context }) => {
    await page.goto(SCORE_URL!)
    await page.locator('.sc-bar').waitFor({ state: 'visible', timeout: 10_000 })

    // Go offline and back online
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)

    // Offline indicator should clear
    await expect(
      page.getByText(/offline|not connected/i),
    ).not.toBeVisible({ timeout: 8000 })
  })
})
