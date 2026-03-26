/**
 * Runs once before all tests in the 'chromium' project.
 * Logs in using email/password, saves the browser's cookie + localStorage
 * state to e2e/.auth/user.json so every test starts already authenticated.
 *
 * Requirements:
 *   - E2E_EMAIL and E2E_PASSWORD env vars (a dedicated test account in Supabase)
 *   - The app must be running (webServer in playwright.config.ts handles this)
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set.\n' +
      'Create a dedicated test account in Supabase and add these to .env.local or your CI secrets.'
    )
  }

  await page.goto('/auth/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to /play after successful login
  await expect(page).toHaveURL(/\/play/, { timeout: 15_000 })

  // Save auth state (cookies + localStorage) — reused by all tests
  await page.context().storageState({ path: AUTH_FILE })
})
