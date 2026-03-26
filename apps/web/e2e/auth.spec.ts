/**
 * Auth flow regression tests.
 * These use a fresh browser context (no saved auth state) to test
 * the login/logout cycle end-to-end.
 */
import { test, expect } from '@playwright/test'

// Override storageState — these tests need a fresh (unauthenticated) context
test.use({ storageState: { cookies: [], origins: [] } })

test('can sign in with email and password', async ({ page }) => {
  const email = process.env.E2E_EMAIL!
  const password = process.env.E2E_PASSWORD!

  await page.goto('/auth/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/play/, { timeout: 15_000 })
})

test('wrong password shows error message', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('#email', 'notareal@example.com')
  await page.fill('#password', 'wrongpassword123')
  await page.click('button[type="submit"]')

  // Error text should appear — Supabase returns "Invalid login credentials"
  await expect(page.locator('.error-text')).toBeVisible({ timeout: 10_000 })
})

test('submit button disabled when fields are empty', async ({ page }) => {
  await page.goto('/auth/login')
  const submit = page.getByRole('button', { name: /sign in/i })
  await expect(submit).toBeDisabled()
})

test('mode toggles between sign in and create account', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()

  await page.getByRole('button', { name: /already have an account/i }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
