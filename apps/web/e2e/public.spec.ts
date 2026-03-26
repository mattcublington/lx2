/**
 * Public page tests — no authentication required.
 * Run by the 'public' Playwright project.
 */
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/LX2/)
})

test('login page renders sign-in form', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.locator('#email')).toBeVisible()
  await expect(page.locator('#password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('unauthenticated /play redirects to login', async ({ page }) => {
  await page.goto('/play')
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('unauthenticated /play/new redirects to login', async ({ page }) => {
  await page.goto('/play/new')
  await expect(page).toHaveURL(/\/auth\/login/)
})
