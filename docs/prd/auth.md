# PRD: Authentication

**Module:** `auth`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

LX2 needs a secure authentication system that supports both society golfers (who expect frictionless sign-in) and club staff (who need account-level security). Society golfers often sign up on the course while standing on the first tee, so the primary flow must be fast -- a single tap on "Continue with Google" rather than a lengthy registration form. Email/password is needed as a fallback for users who do not have or do not want to use a Google account.

Authentication also needs to establish the user's identity in the database so that RLS policies can enforce row-level access control across all scoring, event, and profile data.

## Goal

Provide Google OAuth as the primary sign-in flow and email/password as secondary, backed by Supabase Auth, with automatic user profile creation on first sign-in and comprehensive RLS policies protecting all user data.

## Users

- **Primary:** Society golfers signing up for events and entering scores
- **Secondary:** Club organisers and staff accessing the club console (club.lx2.golf)

## Core requirements

### Must have

- **Google OAuth** as primary sign-in method via Supabase Auth `signInWithOAuth({ provider: 'google' })`
- **Email/password** as secondary sign-in method via `signUp` and `signInWithPassword`
- Auth callback route (`/auth/callback`) that exchanges the OAuth code for a session
- **Automatic user upsert** on first sign-in: callback uses `createAdminClient()` (service_role) to upsert into `public.users` with `display_name` from Google's `full_name` metadata
- Service_role for user creation because `public.users` has no INSERT policy (writes restricted to server-side admin actions to prevent spoofing)
- Redirect preservation: `?redirect=/play` parameter carried through the OAuth flow so users land where they intended
- Sign-in / sign-up mode toggle on the login page
- Email confirmation flow for email/password sign-ups
- Suspense boundary around the auth form (uses `useSearchParams`)

### Should have

- Profile completion prompt if `display_name` or `handicap_index` is missing after first sign-in
- "Remember me" / persistent session (Supabase handles this via refresh tokens)
- Loading states for Google redirect and email/password submission

### Won't have (this phase)

- Apple Sign-In
- Magic link / passwordless email
- Two-factor authentication (2FA)
- Social login beyond Google (Facebook, X, etc.)
- Account deletion self-service (manual process via support)

## Technical implementation

### Auth flow (Google OAuth)

1. User clicks "Continue with Google" on `/auth/login`
2. Client calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback?redirect=/play' } })`
3. Supabase redirects to Google consent screen
4. Google redirects back to `/auth/callback?code=...&redirect=/play`
5. Server route exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
6. Server fetches user metadata via `supabase.auth.getUser()`
7. Server upserts into `public.users` using `createAdminClient()` (service_role bypasses RLS)
8. Server redirects to the preserved `redirect` path (default `/play`)

### Auth flow (email/password)

- **Sign up**: `supabase.auth.signUp({ email, password })` -- user receives confirmation email, then signs in
- **Sign in**: `supabase.auth.signInWithPassword({ email, password })` -- client-side redirect to `/play`

### RLS policy architecture

Comprehensive RLS policies on all tables, enforced via `auth.uid()`:

- **users**: own-row SELECT and UPDATE only. No INSERT policy (server-side only). Cross-user search via `search_user_profiles()` SECURITY DEFINER function that exposes only `id`, `display_name`, `handicap_index`
- **events**: public events visible to all authenticated users; private events visible to organiser and participants
- **event_players**: visible to organiser (all players including anonymous) or to linked participants (non-anonymous peers only)
- **scorecards**: visible to organiser or any linked participant in the event
- **hole_scores**: read by organiser or participants; write by own-scorecard player or organiser (marker mode)
- **courses/course_holes/course_tees**: SELECT by all authenticated; write by service_role only
- **Reference data** (loops, loop_holes, combination_tees, etc.): SELECT true for all authenticated

### Key security patterns

- `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and is only called server-side (route handlers, server actions)
- `createClient()` uses the anon key and respects RLS
- Anonymous (guest) players have `user_id = NULL` in `event_players` -- their writes go through server actions using service_role
- `search_user_profiles()` is a SECURITY DEFINER function that bypasses RLS on `users` but enforces auth check internally and restricts returned columns

## Open questions

- [ ] Should we add Apple Sign-In for iOS PWA users?
- [ ] Do we need an account linking flow if a user signs up with email then later wants to connect Google?
- [ ] How to handle the club console auth -- same Supabase project with role-based access, or separate?

## Links

- Login page: `apps/web/src/app/auth/login/page.tsx`
- Auth callback: `apps/web/src/app/auth/callback/route.ts`
- Supabase client: `apps/web/src/lib/supabase/client.ts`
- Supabase server: `apps/web/src/lib/supabase/server.ts`
- Admin client: `apps/web/src/lib/supabase/admin.ts`
- RLS policies: `packages/db/migrations/001_rls_policies.sql`
- Schema: `packages/db/migrations/000_initial_schema.sql`
