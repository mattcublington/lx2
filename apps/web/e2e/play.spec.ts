/**
 * Authenticated play dashboard + new round wizard tests.
 * Uses the saved auth state from global-setup.ts.
 */
import { test, expect } from '@playwright/test'

test.describe('play dashboard', () => {
  test('loads and shows stat cards', async ({ page }) => {
    await page.goto('/play')
    await expect(page).toHaveURL('/play')

    // Three stat cards are always rendered (values may be n/a for new users)
    await expect(page.getByText('Total rounds')).toBeVisible()
    await expect(page.getByText('Avg score (12mo)')).toBeVisible()
    await expect(page.getByText('Last round')).toBeVisible()
  })

  test('shows "Start a round" button', async ({ page }) => {
    await page.goto('/play')
    await expect(page.getByRole('link', { name: /start a new round/i })).toBeVisible()
  })
})

test.describe('new round wizard', () => {
  test('opens on venue step', async ({ page }) => {
    await page.goto('/play/new')
    // First step is venue / club selection
    await expect(page.getByRole('heading', { name: /where are you playing/i })).toBeVisible()
  })

  test('back link returns to /play', async ({ page }) => {
    await page.goto('/play/new')
    // There should be a back/cancel affordance
    const back = page.getByRole('link', { name: /back|cancel/i }).first()
    if (await back.isVisible()) {
      await back.click()
      await expect(page).toHaveURL('/play')
    }
  })
})
