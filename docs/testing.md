# LX2 — Testing Strategy & Test Inventory

## Overview

Three layers of testing:

| Layer | Tool | Scope | Run command |
|-------|------|-------|-------------|
| Unit | Vitest | Pure logic (scoring, queue) | `npm run test` |
| Integration | Vitest (jsdom) | Browser APIs (IndexedDB) | `npm run test` |
| E2E | Playwright | Full user flows (auth, dashboard) | `cd apps/web && npx playwright test` |

CI runs all three layers on every push to `main`.

---

## Unit & Integration Tests

### `packages/scoring/src/__tests__/handicap.test.ts`

Tests the WHS handicap allocation engine.

| Test | What it guards |
|------|---------------|
| Standard slope (113) returns handicap index unchanged | Baseline: no adjustment on a standard-rated course |
| Higher slope increases playing handicap | Slope scaling works in the right direction |
| HC 18 gives exactly 1 stroke per hole | Even stroke distribution at exactly 18 |
| HC 19 gives 2 strokes on SI 1, 1 on rest | Extra stroke goes to the hardest hole (SI 1) |
| HC 0 gives no strokes | Zero handicap edge case |

### `packages/scoring/src/__tests__/stableford.test.ts`

Tests the Stableford points calculation.

| Test | What it guards |
|------|---------------|
| Par on every hole with zero handicap = 36 points | Baseline: par = 2pts per hole |
| Birdie = 3 points | Birdie scoring is correct |
| Double bogey or worse = 0 points | Score floor (no negative points) |
| Pick-up (null) = 0 points, no NR | Null gross strokes treated as pick-up, not NR |
| 18 handicap: bogey = 2pts per hole | Stroke allocation interacts correctly with scoring |

### `apps/web/src/__tests__/offline-queue.test.ts`

Tests the IndexedDB offline score queue (critical for PWA offline use).

| Test | What it guards |
|------|---------------|
| Stores a score entry | Basic write works |
| Overwrites existing entry for same hole (upsert) | Editing a score updates rather than duplicates |
| Stores null gross_strokes for a pickup | Null values survive the round-trip |
| Returns only scores for the given scorecard_id | Isolation between rounds |
| Returns empty array when no entries exist | Safe empty state |
| Removes a specific hole entry | Delete works without affecting other holes |
| No-op if entry does not exist | Safe to delete non-existent entry |
| Migrates legacy localStorage entries to IndexedDB | Backwards compat for users upgrading from old client |
| Does nothing when no legacy key exists | Migration is safe to call idempotently |

---

## E2E Tests (Playwright)

Run against a live dev server (`http://localhost:3000`). Require `E2E_EMAIL` and `E2E_PASSWORD` env vars pointing to a dedicated test account in Supabase.

### Setup

`apps/web/e2e/global-setup.ts` — runs once before all authenticated tests. Logs in via the email/password form and saves browser state (cookies + localStorage) to `e2e/.auth/user.json`. All tests in the `chromium` project reuse this state.

### `apps/web/e2e/public.spec.ts` — Public pages (no auth)

| Test | What it guards |
|------|---------------|
| Homepage loads | Title contains "LX2", page renders |
| Login page renders sign-in form | Email input, password input, submit button visible |
| Unauthenticated /play redirects to login | Auth guard on dashboard works |
| Unauthenticated /play/new redirects to login | Auth guard on new round wizard works |

### `apps/web/e2e/auth.spec.ts` — Auth flow

| Test | What it guards |
|------|---------------|
| Can sign in with email and password | Full login flow succeeds, redirects to /play |
| Wrong password shows error message | Error state renders (`.error-text` visible) |
| Submit button disabled when fields are empty | Form validation prevents empty submission |
| Mode toggles between sign in and create account | UI toggle works in both directions |

### `apps/web/e2e/play.spec.ts` — Dashboard & new round wizard

| Test | What it guards |
|------|---------------|
| Play dashboard loads and shows stat cards | All three stat cards render (Total rounds, Avg score, Best score) |
| Shows "Start a round" button | Primary CTA is present |
| New round wizard opens on venue step | First step renders after navigation |
| Back link returns to /play | Cancel/back navigation works |

---

## Running tests

```bash
# All unit + integration tests (all packages)
npm run test

# Watch mode (scoring package)
cd packages/scoring && npm run test:watch

# Watch mode (web app)
cd apps/web && npx vitest

# All E2E tests (requires dev server + test account)
cd apps/web && npx playwright test

# E2E — public tests only (no test account needed)
cd apps/web && npx playwright test --project=public

# E2E — with interactive UI
cd apps/web && npx playwright test --ui

# E2E — specific file
cd apps/web && npx playwright test e2e/auth.spec.ts
```

---

## When to add a test

| Situation | Action |
|-----------|--------|
| Fixed a bug in scoring/handicap logic | Add a case to the relevant `__tests__` file before pushing |
| Fixed a bug in offline queue | Add a case to `offline-queue.test.ts` |
| Fixed an auth or redirect bug | Add a case to `auth.spec.ts` or `public.spec.ts` |
| Added a new user-facing flow | Add a happy-path E2E test once the flow stabilises |
| Changed UI layout/styling only | No test needed |

---

## Environment setup for E2E

1. Create a dedicated test user in Supabase (Authentication → Users → Add user)
2. Add to `apps/web/.env.local`:
   ```
   E2E_EMAIL=e2e@lx2.golf
   E2E_PASSWORD=your-test-password
   ```
3. Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` to GitHub repo secrets for CI

The `e2e/.auth/` directory and `playwright-report/` are gitignored — never commit auth tokens.
