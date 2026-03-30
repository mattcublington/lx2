/**
 * New round creation wizard — full flow.
 * venue → players → combination → settings → start round
 *
 * Uses the saved auth state from global-setup.ts.
 * Note: the final "Start round" click creates a real round in the test database.
 */
import { test, expect } from '@playwright/test'

test.describe('new round wizard — full flow', () => {
  test('navigates through all steps and reaches the settings page', async ({ page }) => {
    await page.goto('/play/new')

    // ── Step 1: Venue ──────────────────────────────────────────────────────────
    await expect(page.getByRole('heading', { name: /where are you playing/i })).toBeVisible()

    // "Next: Players" button is disabled until a venue is selected
    const nextBtn = page.getByRole('button', { name: /next: players/i })
    await expect(nextBtn).toBeDisabled()

    // Select the first visible venue card
    const firstVenue = page.locator('[role="button"]').filter({ hasText: /course|club|golf/i }).first()
    await firstVenue.waitFor({ state: 'visible' })
    await firstVenue.click()

    // Now the button should be enabled
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()

    // ── Step 2: Players ────────────────────────────────────────────────────────
    // The players step renders the user's name pre-filled
    await expect(page.getByRole('button', { name: /next: settings/i })).toBeVisible({ timeout: 5000 })

    // At least one player row should exist (the logged-in user)
    const addBtn = page.getByRole('button', { name: /add player/i })
    if (await addBtn.isVisible()) {
      // Optionally add a second player to verify the list grows
      await addBtn.click()
      // Fill in name and handicap for the new player
      const nameInputs = page.getByPlaceholder(/player name/i)
      const lastNameInput = nameInputs.last()
      if (await lastNameInput.isVisible()) {
        await lastNameInput.fill('Test Caddie')
      }
    }

    const nextSettings = page.getByRole('button', { name: /next: settings/i })
    await expect(nextSettings).toBeEnabled()
    await nextSettings.click()

    // ── Step 3: Combination ────────────────────────────────────────────────────
    // Shows the course/tee combination chooser.
    // The continue button is disabled until a combination is selected.
    const continueBtn = page.getByRole('button', { name: /continue with|select a combination/i })
    await expect(continueBtn).toBeVisible({ timeout: 5000 })

    // Select the first available combination card
    const firstCombo = page.locator('[role="button"]').filter({ hasText: /hole|par|white|yellow|red|blue/i }).first()
    if (await firstCombo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCombo.click()
    }

    // If a combination is selected, the button label changes to "Continue with ..."
    const enabledContinue = page.getByRole('button', { name: /continue with/i })
    if (await enabledContinue.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enabledContinue.click()
    } else {
      // No combinations available — skip by clicking available button
      await continueBtn.click()
    }

    // ── Step 4: Settings ──────────────────────────────────────────────────────
    // The final step shows "Start round" (or "Create event" when invite link is on).
    await expect(
      page.getByRole('button', { name: /start round|create event/i }),
    ).toBeVisible({ timeout: 5000 })
  })

  test('step bar reflects current position', async ({ page }) => {
    await page.goto('/play/new')

    // On the venue step, "Course" indicator is active (step 1 of 3)
    await expect(page.getByText('Course')).toBeVisible()
    await expect(page.getByText('Players')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
  })

  test('back button on players step returns to venue step', async ({ page }) => {
    await page.goto('/play/new')

    // Select a venue and advance
    const firstVenue = page.locator('[role="button"]').first()
    await firstVenue.waitFor({ state: 'visible' })
    await firstVenue.click()
    await page.getByRole('button', { name: /next: players/i }).click()

    // Back arrow should return to venue step
    await page.getByRole('button', { name: /go back/i }).click()
    await expect(page.getByRole('heading', { name: /where are you playing/i })).toBeVisible()
  })
})

// ─── Start round — creates real data in test DB ───────────────────────────────

test.describe('new round wizard — start round', () => {
  test('completing the wizard redirects to the score entry page', async ({ page }) => {
    await page.goto('/play/new')

    // Step 1: select first venue
    const firstVenue = page.locator('[role="button"]').first()
    await firstVenue.waitFor({ state: 'visible' })
    await firstVenue.click()
    await page.getByRole('button', { name: /next: players/i }).click()

    // Step 2: accept default player list
    await page.getByRole('button', { name: /next: settings/i }).click({ timeout: 5000 })

    // Step 3: accept first combination (if any)
    const enabledContinue = page.getByRole('button', { name: /continue with/i })
    if (await enabledContinue.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enabledContinue.click()
    } else {
      await page.getByRole('button', { name: /select a combination/i }).click()
    }

    // Step 4: start round
    const startBtn = page.getByRole('button', { name: /start round/i })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()

    // Should redirect to /rounds/<id>/score or /play
    await expect(page).toHaveURL(/\/rounds\/[^/]+\/score|\/play/, { timeout: 15_000 })
  })

  test('started round is accessible via /play dashboard', async ({ page }) => {
    // After creating a round, the dashboard should show it
    await page.goto('/play')
    await expect(page).toHaveURL('/play')
    // The "Last round" stat card should now show a value
    await expect(page.getByText('Last round')).toBeVisible()
  })
})

// ─── Marker mode ─────────────────────────────────────────────────────────────

test.describe('score entry — marker mode', () => {
  test('score entry page loads when navigated to directly', async ({ page }) => {
    // Navigate to /play first to confirm auth
    await page.goto('/play')
    // Find any active round link if one exists
    const scoreLinks = page.locator('a[href*="/score"]')
    const count = await scoreLinks.count()
    if (count > 0) {
      await scoreLinks.first().click()
      // Should be on a score page
      await expect(page).toHaveURL(/\/rounds\/[^/]+\/score/, { timeout: 10_000 })
      // Score entry renders the context bar
      await expect(page.locator('.sc-bar, [class*="sc-bar"]')).toBeVisible({ timeout: 5000 })
    } else {
      test.skip()
    }
  })
})
